/**
 * ECOSYS-06: Broadcast-Before-Commit Race — schema migration
 *
 * Ecosystem/UTXO withdrawals broadcast on-chain BEFORE the DB reservation is
 * committed. A crash after broadcast but before commit leaves UTXOs re-selectable
 * (double-spend) and the broadcast hash lost (no idempotent retry). The fix
 * persists the broadcast hash and LOCKS the selected UTXOs in the same DB txn as
 * the broadcast, plus a boot-time recovery path. This script lays down the schema
 * those code changes rely on:
 *
 *   1. ecosystem_utxo.status: BOOLEAN  ->  ENUM('UNSPENT','LOCKED','SPENT')
 *      (data preserved: 0 -> 'UNSPENT', 1 -> 'SPENT'; new 'LOCKED' = reserved
 *       for an in-flight broadcast and therefore NOT re-selectable)
 *   2. transaction_ledger_applied: idempotency-guard bridge table so a private
 *      ledger decrement is applied at most once per (transactionId, walletId,
 *      currency, chain).
 *   3. index idx_status_trxid_recovery on `transaction` (status, trxId, createdAt)
 *      — fast scan for PROCESSING + broadcast rows during boot recovery.
 *   4. index idx_status_wallet_locked on `ecosystem_utxo` (status, walletId)
 *      — fast scan of LOCKED UTXOs during recovery/validation.
 *
 * NOTE on table names: the live ledger table is `transaction` (singular), NOT
 * `transactions` as some plan drafts wrote it. We target the real names here.
 *
 * Fully IDEMPOTENT: every DDL is guarded by an INFORMATION_SCHEMA existence
 * check, so a second run (with or without --apply) is a no-op. The boolean->ENUM
 * conversion only runs while the column is still a boolean/tinyint; once it is an
 * ENUM the conversion block is skipped entirely.
 *
 * DRY-RUN by default (reports exactly what it would change). Pass --apply to mutate.
 *   Report:  node backend/scripts/migration-ecosys06-broadcast-hash-lock.mjs
 *   Apply:   node backend/scripts/migration-ecosys06-broadcast-hash-lock.mjs --apply
 *
 * Run AFTER deploying the updated model files (which already declare the ENUM
 * status + txHashPending) and (ideally) while restarting the backend so the
 * schema matches. The boolean->ENUM step must run BEFORE sync({alter:true}) so
 * existing 0/1 values are preserved rather than coerced by Sequelize.
 */

import { config } from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { Sequelize, QueryTypes } from "sequelize";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
config({ path: path.join(__dirname, "../../.env") });

const APPLY = process.argv.includes("--apply");

// Real (live) table names. `transaction` is SINGULAR in this codebase.
const UTXO_TABLE = "ecosystem_utxo";
const TXN_TABLE = "transaction";
const LEDGER_TABLE = "transaction_ledger_applied";

const TXN_RECOVERY_INDEX = "idx_status_trxid_recovery";
const UTXO_LOCKED_INDEX = "idx_status_wallet_locked";

const ENUM_DEF =
  "ENUM('UNSPENT','LOCKED','SPENT') NOT NULL DEFAULT 'UNSPENT' " +
  "COMMENT 'UNSPENT=available, LOCKED=reserved for in-flight withdrawal, SPENT=confirmed on-chain'";

const sequelize = new Sequelize(
  process.env.DB_NAME || "platform",
  process.env.DB_USER || "root",
  process.env.DB_PASSWORD || "",
  {
    host: process.env.DB_HOST || "localhost",
    port: parseInt(process.env.DB_PORT || "3306"),
    dialect: "mysql",
    logging: false,
  }
);

async function tableExists(schema, table) {
  const rows = await sequelize.query(
    `SELECT COUNT(*) AS count FROM information_schema.TABLES
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?`,
    { replacements: [schema, table], type: QueryTypes.SELECT }
  );
  return Number(rows[0]?.count || 0) > 0;
}

async function columnType(schema, table, column) {
  const rows = await sequelize.query(
    `SELECT COLUMN_TYPE AS columnType FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
    { replacements: [schema, table, column], type: QueryTypes.SELECT }
  );
  return rows[0]?.columnType ?? null; // null => column absent
}

// Full metadata for a column, used to make a child FK column mirror its parent
// EXACTLY (type + charset + collation). A FK fails to form (errno 150) if the
// child column's type OR collation differs from the referenced column — e.g.
// `transaction.id` here is char(36)/utf8mb4_bin, not varchar(36)/..._unicode_ci.
async function columnMeta(schema, table, column) {
  const rows = await sequelize.query(
    `SELECT COLUMN_TYPE AS columnType, CHARACTER_SET_NAME AS charset, COLLATION_NAME AS collation
       FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
    { replacements: [schema, table, column], type: QueryTypes.SELECT }
  );
  return rows[0] ?? null; // null => column absent
}

async function indexExists(schema, table, index) {
  const rows = await sequelize.query(
    `SELECT COUNT(*) AS count FROM information_schema.STATISTICS
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND INDEX_NAME = ?`,
    { replacements: [schema, table, index], type: QueryTypes.SELECT }
  );
  return Number(rows[0]?.count || 0) > 0;
}

async function main() {
  console.log("=".repeat(70));
  console.log(
    `ECOSYS-06 broadcast-hash + UTXO-lock migration  (${APPLY ? "APPLY" : "DRY-RUN"})`
  );
  console.log("=".repeat(70) + "\n");

  await sequelize.authenticate();
  const schema = sequelize.getDatabaseName();
  console.log(`Database: ${schema}\n`);

  let willChange = 0;

  // ---------------------------------------------------------------------------
  // 1. ecosystem_utxo.status : BOOLEAN/TINYINT -> ENUM('UNSPENT','LOCKED','SPENT')
  //    Preserve existing data (0 -> UNSPENT, 1 -> SPENT) via a temporary backup
  //    column, because the CHANGE COLUMN to ENUM would otherwise drop the 0/1
  //    semantics. Only runs while the column is still boolean.
  // ---------------------------------------------------------------------------
  if (!(await tableExists(schema, UTXO_TABLE))) {
    console.log(
      `[SKIP]  Table '${UTXO_TABLE}' absent (ecosystem extension not installed) — UTXO steps skipped.`
    );
  } else {
    const utxoStatusType = await columnType(schema, UTXO_TABLE, "status");
    const backupNow =
      (await columnType(schema, UTXO_TABLE, "status_backup")) !== null;
    // A prior (crashed) run may have left the column mid-conversion as VARCHAR.
    const isVarcharMidConvert =
      utxoStatusType !== null && /^varchar/i.test(utxoStatusType) && backupNow;
    if (utxoStatusType === null) {
      console.log(
        `[WARN]  Column '${UTXO_TABLE}.status' not found — skipping ENUM conversion.`
      );
    } else if (
      !/^enum\(/i.test(utxoStatusType) &&
      !/tinyint|bool/i.test(utxoStatusType) &&
      !isVarcharMidConvert
    ) {
      console.log(
        `[WARN]  '${UTXO_TABLE}.status' is '${utxoStatusType}', not boolean or enum — leaving untouched for manual review.`
      );
    } else {
      // CRASH-SAFE: the corrective 0->UNSPENT / 1->SPENT mapping and the backup
      // drop are driven by whether `status_backup` still exists — NOT by the
      // column type — so a crash at ANY point of the conversion is fully
      // recovered on re-run (tinyint, varchar-intermediate, or enum state).
      //
      // STRICT-MODE-SAFE: a direct CHANGE COLUMN tinyint -> ENUM is rejected by
      // MySQL under STRICT_TRANS_TABLES ("Data truncated for column 'status'"),
      // because 0/1 are not members of the target ENUM. The conversion therefore
      // goes tinyint -> VARCHAR (0/1 become the strings '0'/'1'), rewrites the
      // values to their labels, and only THEN tightens the column to ENUM — by
      // which point every value is a valid member in any sql_mode.
      const needsConvert = /tinyint|bool/i.test(utxoStatusType);
      if (needsConvert || backupNow) {
        willChange++;
        console.log(
          needsConvert
            ? `[ALTER] '${UTXO_TABLE}.status' ${utxoStatusType} -> ENUM('UNSPENT','LOCKED','SPENT')  (0->UNSPENT, 1->SPENT)`
            : isVarcharMidConvert
              ? `[FIX]   '${UTXO_TABLE}.status' resuming interrupted conversion (varchar intermediate) -> ENUM`
              : `[FIX]   '${UTXO_TABLE}.status' finishing ENUM mapping + backup cleanup (recovering a prior partial run)`
        );
        if (APPLY) {
          if (needsConvert) {
            if (!backupNow) {
              await sequelize.query(
                `ALTER TABLE \`${UTXO_TABLE}\` ADD COLUMN \`status_backup\` TINYINT(1) NULL DEFAULT NULL AFTER \`status\``
              );
            }
            // Snapshot the raw 0/1 values, then widen the type to VARCHAR
            // (a lossless cast in every sql_mode).
            await sequelize.query(
              `UPDATE \`${UTXO_TABLE}\` SET \`status_backup\` = \`status\``
            );
            await sequelize.query(
              `ALTER TABLE \`${UTXO_TABLE}\` CHANGE COLUMN \`status\` \`status\` VARCHAR(20) NOT NULL DEFAULT 'UNSPENT'`
            );
          }
          // While the column is the VARCHAR intermediate, rewrite every value to
          // a valid ENUM label BEFORE tightening the type (strict-mode safety).
          if (
            /^varchar/i.test(
              (await columnType(schema, UTXO_TABLE, "status")) || ""
            )
          ) {
            if (
              (await columnType(schema, UTXO_TABLE, "status_backup")) !== null
            ) {
              await sequelize.query(
                `UPDATE \`${UTXO_TABLE}\` SET \`status\` = 'UNSPENT' WHERE \`status_backup\` = 0`
              );
              await sequelize.query(
                `UPDATE \`${UTXO_TABLE}\` SET \`status\` = 'SPENT' WHERE \`status_backup\` = 1`
              );
            }
            // Defensive catch-all for rows without a snapshot (e.g. inserted
            // mid-migration): '1'/'true' means spent, anything else unspent.
            await sequelize.query(
              `UPDATE \`${UTXO_TABLE}\` SET \`status\` = 'SPENT' WHERE \`status\` IN ('1','true','TRUE')`
            );
            await sequelize.query(
              `UPDATE \`${UTXO_TABLE}\` SET \`status\` = 'UNSPENT' WHERE \`status\` NOT IN ('UNSPENT','LOCKED','SPENT')`
            );
            await sequelize.query(
              `ALTER TABLE \`${UTXO_TABLE}\` CHANGE COLUMN \`status\` \`status\` ${ENUM_DEF}`
            );
          }
          // Apply/recover the value mapping while the backup snapshot survives,
          // then drop it. (No-op re-affirmation on the happy path; the real
          // recovery mechanism for a crash after the ENUM change.)
          if ((await columnType(schema, UTXO_TABLE, "status_backup")) !== null) {
            await sequelize.query(
              `UPDATE \`${UTXO_TABLE}\` SET \`status\` = 'UNSPENT' WHERE \`status_backup\` = 0`
            );
            await sequelize.query(
              `UPDATE \`${UTXO_TABLE}\` SET \`status\` = 'SPENT' WHERE \`status_backup\` = 1`
            );
            await sequelize.query(
              `ALTER TABLE \`${UTXO_TABLE}\` DROP COLUMN \`status_backup\``
            );
            console.log(`        -> status ENUM mapping applied and backup dropped.`);
          }
        }
      } else {
        console.log(
          `[SKIP]  '${UTXO_TABLE}.status' is already ENUM (${utxoStatusType}).`
        );
      }
    }

    // -------------------------------------------------------------------------
    // 3b. ecosystem_utxo.lockedTxId — the broadcast txid that reserved a UTXO,
    //     so LOCKED->SPENT promotion is scoped to a single withdrawal (removes
    //     reliance on a single-threaded withdrawal queue under concurrency).
    //     (Additive nullable column; sync({alter}) would also add it, but adding
    //     it here keeps the migration self-contained.)
    // -------------------------------------------------------------------------
    if ((await columnType(schema, UTXO_TABLE, "lockedTxId")) !== null) {
      console.log(`[SKIP]  '${UTXO_TABLE}.lockedTxId' already exists.`);
    } else {
      willChange++;
      console.log(`[ADD]   '${UTXO_TABLE}.lockedTxId' VARCHAR(191) NULL`);
      if (APPLY) {
        await sequelize.query(
          `ALTER TABLE \`${UTXO_TABLE}\` ADD COLUMN \`lockedTxId\` VARCHAR(191) NULL DEFAULT NULL COMMENT 'ECOSYS-06: broadcast txid that LOCKED this UTXO' AFTER \`status\``
        );
        console.log(`        -> lockedTxId column added.`);
      }
    }

    // -------------------------------------------------------------------------
    // 4. ecosystem_utxo index (status, walletId) for LOCKED recovery scans.
    // -------------------------------------------------------------------------
    if (await indexExists(schema, UTXO_TABLE, UTXO_LOCKED_INDEX)) {
      console.log(
        `[SKIP]  Index '${UTXO_LOCKED_INDEX}' already exists on '${UTXO_TABLE}'.`
      );
    } else {
      willChange++;
      console.log(
        `[ADD]   Index '${UTXO_LOCKED_INDEX}' (status, walletId) on '${UTXO_TABLE}'`
      );
      if (APPLY) {
        await sequelize.query(
          `ALTER TABLE \`${UTXO_TABLE}\` ADD INDEX \`${UTXO_LOCKED_INDEX}\` (\`status\`, \`walletId\`)`
        );
        console.log(`        -> index added.`);
      }
    }
  }

  // ---------------------------------------------------------------------------
  // 2. transaction_ledger_applied idempotency-guard table.
  //    UNIQUE(transactionId, walletId, currency, chain) makes a duplicate
  //    decrement a constraint violation rather than a silent double-spend.
  // ---------------------------------------------------------------------------
  const txnTablePresent = await tableExists(schema, TXN_TABLE);
  if (await tableExists(schema, LEDGER_TABLE)) {
    console.log(`[SKIP]  Table '${LEDGER_TABLE}' already exists.`);
  } else {
    willChange++;
    console.log(
      `[CREATE] Table '${LEDGER_TABLE}' (idempotency guard for ledger decrements)`
    );
    if (APPLY) {
      // FK to transaction(id) only if the parent table exists; otherwise create
      // the guard table without the FK so the migration still completes.
      //
      // CRITICAL: the FK column `transactionId` must mirror `transaction.id`'s
      // type AND collation EXACTLY, or InnoDB rejects the constraint with
      // errno 150 ("incorrectly formed"). In this codebase `transaction.id` is
      // char(36)/utf8mb4_bin — NOT the varchar(36)/utf8mb4_unicode_ci we'd get
      // from the table default. So we read the parent column and reproduce it.
      const parentId = txnTablePresent
        ? await columnMeta(schema, TXN_TABLE, "id")
        : null;
      let txnIdColDef = "VARCHAR(36)";
      if (parentId?.columnType) {
        txnIdColDef = parentId.columnType.toUpperCase();
        if (parentId.charset) txnIdColDef += ` CHARACTER SET ${parentId.charset}`;
        if (parentId.collation) txnIdColDef += ` COLLATE ${parentId.collation}`;
      }
      const fkClause =
        txnTablePresent && parentId
          ? `,\n    CONSTRAINT \`fk_ledger_applied_txn\` FOREIGN KEY (\`transactionId\`) REFERENCES \`${TXN_TABLE}\`(\`id\`) ON DELETE CASCADE ON UPDATE CASCADE`
          : "";
      await sequelize.query(
        `CREATE TABLE \`${LEDGER_TABLE}\` (
    \`id\` VARCHAR(36) NOT NULL DEFAULT (UUID()),
    \`transactionId\` ${txnIdColDef} NOT NULL,
    \`walletId\` VARCHAR(36) NOT NULL,
    \`currency\` VARCHAR(50) NOT NULL,
    \`chain\` VARCHAR(50) NOT NULL,
    \`appliedAt\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (\`id\`),
    UNIQUE KEY \`unique_tx_ledger_applied\` (\`transactionId\`, \`walletId\`, \`currency\`, \`chain\`)${fkClause}
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    COMMENT='Guards private ledger decrements against idempotent double-application'`
      );
      console.log(
        `        -> table created${fkClause ? " with FK to transaction(id)." : " (no FK; transaction table absent)."}`
      );
    }
  }

  // ---------------------------------------------------------------------------
  // 3. transaction index (status, trxId, createdAt) for boot recovery scans.
  // ---------------------------------------------------------------------------
  if (!txnTablePresent) {
    console.log(
      `[SKIP]  Table '${TXN_TABLE}' absent — recovery index skipped.`
    );
  } else if (await indexExists(schema, TXN_TABLE, TXN_RECOVERY_INDEX)) {
    console.log(
      `[SKIP]  Index '${TXN_RECOVERY_INDEX}' already exists on '${TXN_TABLE}'.`
    );
  } else {
    willChange++;
    console.log(
      `[ADD]   Index '${TXN_RECOVERY_INDEX}' (status, trxId, createdAt) on '${TXN_TABLE}'`
    );
    if (APPLY) {
      await sequelize.query(
        `ALTER TABLE \`${TXN_TABLE}\` ADD INDEX \`${TXN_RECOVERY_INDEX}\` (\`status\`, \`trxId\`, \`createdAt\`)`
      );
      console.log(`        -> index added.`);
    }
  }

  console.log("\n" + "=".repeat(70));
  if (willChange === 0) {
    console.log("Schema already up to date — nothing to change.");
  } else if (APPLY) {
    console.log(`Applied ${willChange} change(s).`);
    console.log(
      "\nIMPORTANT: restart the backend so the models pick up the new schema.\n"
    );
  } else {
    console.log(
      `DRY-RUN — ${willChange} change(s) pending. Re-run with --apply to execute.`
    );
  }
  console.log("=".repeat(70));
}

main()
  .catch((e) => {
    console.error("ECOSYS-06 migration failed:", e);
    process.exitCode = 1;
  })
  .finally(async () => {
    try {
      await sequelize.close();
    } catch {}
  });
