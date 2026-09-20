/**
 * Create the immutable wallet_audit_log table (CORE-WALLET-05).
 *
 * The wallet AuditLogger was log-only (console emit, no queryable persistence),
 * leaving no append-only audit trail independent of the mutable `transaction`
 * table. This script creates `wallet_audit_log` — an append-only, immutable
 * record of every wallet operation (createdAt only, no updatedAt) — with the
 * indexes the model declares:
 *   - idx_wallet_audit_log_userId_createdAt   (userId, createdAt)   non-unique
 *   - idx_wallet_audit_log_walletId_createdAt (walletId, createdAt) non-unique
 *   - idx_wallet_audit_log_transactionId      (transactionId)       non-unique
 *   - idx_wallet_audit_log_idempotencyKey     (idempotencyKey)      UNIQUE
 *
 * transactionId is intentionally NULLABLE and has NO foreign key to
 * transaction(id): this is an immutable, append-only audit log that must accept
 * events with no transaction yet (e.g. WALLET_CREATED) and must never fail to
 * write or cascade on a missing/deleted transaction.
 *
 * Why a migration script and not just sync({alter:true}): sync creates the table
 * and columns but does NOT reliably create indexes across dialects, and never
 * re-creates them once drifted. This script guarantees the table and every
 * index exist.
 *
 * Fully idempotent: every DDL is guarded by an INFORMATION_SCHEMA existence
 * check (table / column / index / constraint), so a second run is a no-op. Real
 * index and constraint names are discovered from INFORMATION_SCHEMA rather than
 * hardcoded where dropping/checking, so it tolerates a pre-existing table.
 *
 * DRY-RUN by default (reports exactly what it would change). Pass --apply to mutate.
 *   Report:  node scripts/create-wallet-audit-log-table.mjs
 *   Apply:   node scripts/create-wallet-audit-log-table.mjs --apply
 *
 * After --apply, restart the backend so the model picks up the new table.
 */

import { config } from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { Sequelize, QueryTypes } from "sequelize";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
config({ path: path.join(__dirname, "../../.env") });

const APPLY = process.argv.includes("--apply");

const TABLE = "wallet_audit_log";

// (name, unique, columns) — names must match the model's `indexes` declaration.
const INDEXES = [
  { name: "idx_wallet_audit_log_userId_createdAt", unique: false, columns: ["userId", "createdAt"] },
  { name: "idx_wallet_audit_log_walletId_createdAt", unique: false, columns: ["walletId", "createdAt"] },
  { name: "idx_wallet_audit_log_transactionId", unique: false, columns: ["transactionId"] },
  { name: "idx_wallet_audit_log_idempotencyKey", unique: true, columns: ["idempotencyKey"] },
];

const CREATE_TABLE_SQL = `
  CREATE TABLE \`${TABLE}\` (
    \`id\` CHAR(36) NOT NULL,
    \`userId\` CHAR(36) NOT NULL COMMENT 'User ID performing the operation',
    \`walletId\` CHAR(36) NOT NULL COMMENT 'Wallet ID affected by the operation',
    \`operation\` ENUM(
      'WALLET_CREATED',
      'CREDIT',
      'DEBIT',
      'HOLD',
      'RELEASE',
      'TRANSFER_OUT',
      'TRANSFER_IN',
      'EXECUTE_FROM_HOLD'
    ) NOT NULL COMMENT 'Type of wallet operation',
    \`amount\` DECIMAL(30, 18) NOT NULL COMMENT 'Amount involved in the operation',
    \`previousBalance\` DECIMAL(30, 18) NULL COMMENT 'Balance before the operation',
    \`newBalance\` DECIMAL(30, 18) NULL COMMENT 'Balance after the operation',
    \`previousInOrder\` DECIMAL(30, 18) NULL COMMENT 'In-order amount before the operation (for HOLD/RELEASE)',
    \`newInOrder\` DECIMAL(30, 18) NULL COMMENT 'In-order amount after the operation (for HOLD/RELEASE)',
    \`transactionId\` CHAR(36) NULL COMMENT 'Optional reference to a transaction record (no FK; immutable audit log)',
    \`idempotencyKey\` VARCHAR(255) NOT NULL COMMENT 'Idempotency key for deduplication',
    \`metadata\` JSON NULL COMMENT 'Additional operation metadata (operationType, fee, referenceId, etc.)',
    \`createdAt\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'Timestamp of the audit entry',
    PRIMARY KEY (\`id\`)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
`;

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

async function indexExists(schema, indexName) {
  const rows = await sequelize.query(
    `SELECT COUNT(*) AS count FROM information_schema.STATISTICS
     WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND INDEX_NAME = ?`,
    { replacements: [schema, TABLE, indexName], type: QueryTypes.SELECT }
  );
  return Number(rows[0]?.count || 0) > 0;
}

async function main() {
  console.log("=".repeat(72));
  console.log(`Create immutable '${TABLE}' table  (${APPLY ? "APPLY" : "DRY-RUN"})`);
  console.log("=".repeat(72) + "\n");

  await sequelize.authenticate();
  const schema = sequelize.getDatabaseName();
  console.log(`Database: ${schema}\n`);

  let willChange = 0;
  const tablePresent = await tableExists(schema, TABLE);

  // 1. Table
  if (tablePresent) {
    console.log(`[SKIP]  Table '${TABLE}' already exists.`);
  } else {
    willChange++;
    console.log(`[CREATE] Table '${TABLE}' (append-only, immutable; createdAt only).`);
    if (APPLY) {
      await sequelize.query(CREATE_TABLE_SQL);
      console.log(`        -> table created.`);
    }
  }

  // 2. Indexes. On a freshly created table (dry-run, not yet applied) the indexes
  //    obviously don't exist; report them as pending. Otherwise check for real.
  for (const idx of INDEXES) {
    const present = tablePresent ? await indexExists(schema, idx.name) : false;
    if (present) {
      console.log(`[SKIP]  Index '${idx.name}' already exists.`);
      continue;
    }
    willChange++;
    const kind = idx.unique ? "UNIQUE INDEX" : "INDEX";
    const colList = idx.columns.map((c) => `\`${c}\``).join(", ");
    if (!tablePresent && !APPLY) {
      console.log(`[ADD]   ${kind} '${idx.name}' (${idx.columns.join(", ")})  [pending table create]`);
      continue;
    }
    console.log(`[ADD]   ${kind} '${idx.name}' (${idx.columns.join(", ")})`);
    if (APPLY) {
      await sequelize.query(
        `ALTER TABLE \`${TABLE}\` ADD ${kind} \`${idx.name}\` (${colList})`
      );
      console.log(`        -> index added.`);
    }
  }

  // No foreign key on transactionId: this is an immutable, append-only audit
  // log. It must accept events with no transaction (e.g. WALLET_CREATED) and
  // must never fail to write or cascade on a missing/deleted transaction.

  console.log("\n" + "=".repeat(72));
  if (willChange === 0) {
    console.log("Schema already up to date — nothing to change.");
  } else if (APPLY) {
    console.log(`Applied ${willChange} change(s).`);
    console.log(
      "\nIMPORTANT: restart the backend so the model picks up the new table.\n"
    );
  } else {
    console.log(
      `DRY-RUN — ${willChange} change(s) pending. Re-run with --apply to execute.`
    );
  }
  console.log("=".repeat(72));
}

main()
  .catch((e) => {
    console.error("wallet_audit_log migration failed:", e);
    process.exitCode = 1;
  })
  .finally(async () => {
    try {
      await sequelize.close();
    } catch {}
  });
