/**
 * De-duplicate nft_sale.transactionHash + add UNIQUE index
 *
 * NFT-10-model: `nft_sale.transactionHash` lacked a UNIQUE constraint, so two
 * concurrent buys/settles for the SAME blockchain transaction could both pass
 * the non-locking `isTransactionHashUsed()` check and each create a duplicate
 * nftSale row (direct ownership / money loss).
 *
 * The model now declares a UNIQUE index `nftSaleTransactionHashIdx` on
 * `transactionHash`, but Sequelize `sync({alter:true})` (or a manual ALTER)
 * will FAIL if the live table already contains duplicate hashes. This script
 * removes that blocker and then adds the index, so the model and the DB agree.
 *
 * What it does (in order):
 *   1. Find every non-deleted, non-null transactionHash that appears > 1 time.
 *   2. For each duplicate group, KEEP the oldest row (earliest createdAt, then
 *      lowest id = first completer wins) and SOFT-DELETE the rest by setting
 *      deletedAt = NOW() (the table is paranoid, so the audit trail is kept).
 *   3. Add the UNIQUE index `nftSaleTransactionHashIdx` on transactionHash if it
 *      does not already exist (NULLs remain allowed — standard MySQL behavior).
 *
 * Idempotent:
 *   - Re-running after a successful apply finds no live duplicates and sees the
 *     index already present, so it is a complete no-op.
 *   - Every DDL is guarded by an INFORMATION_SCHEMA existence check.
 *
 * DRY-RUN by default (reports what it WOULD change). Pass --apply to mutate.
 *   Report:  node scripts/dedupe-nft-sale-hashes.mjs
 *   Apply:   node scripts/dedupe-nft-sale-hashes.mjs --apply
 *
 * After --apply, restart the backend so cached/synced metadata is refreshed.
 */

import { config } from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { Sequelize, QueryTypes } from "sequelize";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
config({ path: path.join(__dirname, "../../.env") });

const APPLY = process.argv.includes("--apply");

const TABLE = "nft_sale";
const INDEX_NAME = "nftSaleTransactionHashIdx";
const INDEX_COLUMN = "transactionHash";

const DB_NAME = process.env.DB_NAME || "platform";

const sequelize = new Sequelize(
  DB_NAME,
  process.env.DB_USER || "root",
  process.env.DB_PASSWORD || "",
  {
    host: process.env.DB_HOST || "localhost",
    port: parseInt(process.env.DB_PORT || "3306"),
    dialect: "mysql",
    logging: false,
  }
);

async function tableExists() {
  const rows = await sequelize.query(
    `SELECT 1 FROM INFORMATION_SCHEMA.TABLES
     WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? LIMIT 1`,
    { replacements: [DB_NAME, TABLE], type: QueryTypes.SELECT }
  );
  return rows.length > 0;
}

async function indexExists() {
  const rows = await sequelize.query(
    `SELECT 1 FROM INFORMATION_SCHEMA.STATISTICS
     WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND INDEX_NAME = ? LIMIT 1`,
    { replacements: [DB_NAME, TABLE, INDEX_NAME], type: QueryTypes.SELECT }
  );
  return rows.length > 0;
}

async function main() {
  console.log("=".repeat(64));
  console.log(`nft_sale transactionHash de-dupe  (${APPLY ? "APPLY" : "DRY-RUN"})`);
  console.log("=".repeat(64) + "\n");

  await sequelize.authenticate();

  if (!(await tableExists())) {
    console.log(`Table \`${TABLE}\` does not exist — nothing to do.`);
    return;
  }

  // 1. Find duplicate hash groups among LIVE (non-soft-deleted) rows.
  const dupGroups = await sequelize.query(
    `SELECT ${INDEX_COLUMN} AS hash, COUNT(*) AS cnt
     FROM ${TABLE}
     WHERE ${INDEX_COLUMN} IS NOT NULL AND deletedAt IS NULL
     GROUP BY ${INDEX_COLUMN}
     HAVING cnt > 1`,
    { type: QueryTypes.SELECT }
  );

  let consolidated = 0;

  if (dupGroups.length === 0) {
    console.log("No live duplicate transactionHash values found.\n");
  } else {
    console.log(`Found ${dupGroups.length} transactionHash value(s) with duplicates:\n`);
    for (const g of dupGroups) {
      // Rows in this group, oldest first. Keep rows[0], drop the rest.
      const rows = await sequelize.query(
        `SELECT id, status, createdAt
         FROM ${TABLE}
         WHERE ${INDEX_COLUMN} = ? AND deletedAt IS NULL
         ORDER BY createdAt ASC, id ASC`,
        { replacements: [g.hash], type: QueryTypes.SELECT }
      );
      const keep = rows[0];
      const drop = rows.slice(1);
      consolidated += drop.length;

      console.log(`  hash ${g.hash}  (${rows.length} live rows)`);
      console.log(`    KEEP   id=${keep.id} status=${keep.status} createdAt=${new Date(keep.createdAt).toISOString()}`);
      for (const d of drop) {
        console.log(`    DELETE id=${d.id} status=${d.status} createdAt=${new Date(d.createdAt).toISOString()}`);
      }

      if (APPLY) {
        await sequelize.query(
          `UPDATE ${TABLE}
           SET deletedAt = NOW()
           WHERE ${INDEX_COLUMN} = ? AND deletedAt IS NULL AND id <> ?`,
          { replacements: [g.hash, keep.id] }
        );
      }
    }
    console.log("");
  }

  // 2. Add the UNIQUE index (guarded by existence check for idempotency).
  const hasIndex = await indexExists();
  if (hasIndex) {
    console.log(`Index \`${INDEX_NAME}\` already exists — no DDL needed.`);
  } else if (dupGroups.length > 0 && !APPLY) {
    console.log(
      `Index \`${INDEX_NAME}\` is MISSING but ${dupGroups.length} duplicate group(s) remain.\n` +
      `  Run with --apply to consolidate duplicates and add the UNIQUE index.`
    );
  } else if (APPLY) {
    // After consolidation above (if any), it is safe to add the unique index.
    await sequelize.query(
      `ALTER TABLE ${TABLE} ADD UNIQUE INDEX ${INDEX_NAME} (${INDEX_COLUMN})`
    );
    console.log(`Added UNIQUE index \`${INDEX_NAME}\` on ${TABLE}(${INDEX_COLUMN}).`);
  } else {
    console.log(
      `Index \`${INDEX_NAME}\` is MISSING (no duplicates blocking it).\n` +
      `  Run with --apply to add the UNIQUE index.`
    );
  }

  console.log("\n" + "=".repeat(64));
  console.log(`Duplicate groups:        ${dupGroups.length}`);
  console.log(`Rows ${APPLY ? "soft-deleted" : "to soft-delete"}:  ${consolidated}`);
  if (APPLY) {
    console.log("Applied changes to the database.");
    console.log("\nIMPORTANT: restart the backend so cached/synced metadata is refreshed.");
  } else {
    console.log("DRY-RUN — no changes made. Re-run with --apply to commit.");
  }
  console.log("=".repeat(64));
}

main()
  .catch((e) => {
    console.error("De-dupe failed:", e);
    process.exitCode = 1;
  })
  .finally(async () => {
    try {
      await sequelize.close();
    } catch {}
  });
