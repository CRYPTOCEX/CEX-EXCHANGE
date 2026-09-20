/**
 * Add idempotencyKey column + UNIQUE index to the `transaction` table
 * (MODEL-01 / CORE-WALLET-02).
 *
 * The wallet service's old duplicate-detection used a non-locking SELECT ... LIKE
 * over the metadata JSON column, which races under concurrency and can double-spend.
 * The fix replaces it with a real `idempotencyKey VARCHAR(191) NULL` column protected
 * by a UNIQUE index so the database itself rejects concurrent duplicate inserts.
 * NULL is allowed (MySQL permits multiple NULLs in a UNIQUE index) so non-idempotent
 * operations and all existing rows coexist without conflict.
 *
 * This script ONLY touches schema; no data migration is needed (existing rows keep a
 * NULL idempotencyKey). It is fully idempotent: every DDL is guarded by an
 * INFORMATION_SCHEMA existence check, so a second run is a no-op.
 *
 * DRY-RUN by default (reports exactly what it would change). Pass --apply to mutate.
 *   Report:  node scripts/add-idempotency-key-column.mjs
 *   Apply:   node scripts/add-idempotency-key-column.mjs --apply
 *
 * After --apply, restart the backend so the model picks up the new column.
 */

import { config } from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { Sequelize, QueryTypes } from "sequelize";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
config({ path: path.join(__dirname, "../../.env") });

const APPLY = process.argv.includes("--apply");

const TABLE = "transaction";
const COLUMN = "idempotencyKey";
const INDEX = "transaction_idempotency_key";
const COLUMN_COMMENT =
  "Idempotency key for deduplication; nullable to allow non-idempotent operations";

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

async function columnExists(schema) {
  const rows = await sequelize.query(
    `SELECT COUNT(*) AS count FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
    { replacements: [schema, TABLE, COLUMN], type: QueryTypes.SELECT }
  );
  return Number(rows[0]?.count || 0) > 0;
}

async function indexExists(schema) {
  const rows = await sequelize.query(
    `SELECT COUNT(*) AS count FROM information_schema.STATISTICS
     WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND INDEX_NAME = ?`,
    { replacements: [schema, TABLE, INDEX], type: QueryTypes.SELECT }
  );
  return Number(rows[0]?.count || 0) > 0;
}

async function tableExists(schema) {
  const rows = await sequelize.query(
    `SELECT COUNT(*) AS count FROM information_schema.TABLES
     WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?`,
    { replacements: [schema, TABLE], type: QueryTypes.SELECT }
  );
  return Number(rows[0]?.count || 0) > 0;
}

async function main() {
  console.log("=".repeat(64));
  console.log(
    `Add ${COLUMN} column + UNIQUE index to '${TABLE}'  (${APPLY ? "APPLY" : "DRY-RUN"})`
  );
  console.log("=".repeat(64) + "\n");

  await sequelize.authenticate();
  const schema = sequelize.getDatabaseName();
  console.log(`Database: ${schema}\n`);

  if (!(await tableExists(schema))) {
    console.log(
      `[ABORT] Table '${TABLE}' does not exist in '${schema}'. Nothing to do.`
    );
    console.log("=".repeat(64));
    return;
  }

  let willChange = 0;

  // 1. Column
  if (await columnExists(schema)) {
    console.log(`[SKIP]  Column '${COLUMN}' already exists on '${TABLE}'.`);
  } else {
    willChange++;
    console.log(`[ADD]   Column '${COLUMN}' VARCHAR(191) NULL`);
    if (APPLY) {
      await sequelize.query(
        `ALTER TABLE \`${TABLE}\` ADD COLUMN \`${COLUMN}\` VARCHAR(191) NULL COMMENT ?`,
        { replacements: [COLUMN_COMMENT] }
      );
      console.log(`        -> column added.`);
    }
  }

  // 2. UNIQUE index (requires the column to exist first)
  if (await indexExists(schema)) {
    console.log(`[SKIP]  Index '${INDEX}' already exists on '${TABLE}'.`);
  } else if (!APPLY && !(await columnExists(schema))) {
    // Column not yet present (dry-run, column add not applied) — report intent only.
    willChange++;
    console.log(
      `[ADD]   UNIQUE index '${INDEX}' (${COLUMN})  [pending column add]`
    );
  } else {
    willChange++;
    console.log(`[ADD]   UNIQUE index '${INDEX}' (${COLUMN})`);
    if (APPLY) {
      await sequelize.query(
        `ALTER TABLE \`${TABLE}\` ADD UNIQUE INDEX \`${INDEX}\` (\`${COLUMN}\`)`
      );
      console.log(`        -> index added.`);
    }
  }

  console.log("\n" + "=".repeat(64));
  if (willChange === 0) {
    console.log("Schema already up to date — nothing to change.");
  } else if (APPLY) {
    console.log(`Applied ${willChange} change(s).`);
    console.log(
      "\nIMPORTANT: restart the backend so the model picks up the new column.\n"
    );
  } else {
    console.log(
      `DRY-RUN — ${willChange} change(s) pending. Re-run with --apply to execute.`
    );
  }
  console.log("=".repeat(64));
}

main()
  .catch((e) => {
    console.error("idempotencyKey migration failed:", e);
    process.exitCode = 1;
  })
  .finally(async () => {
    try {
      await sequelize.close();
    } catch {}
  });
