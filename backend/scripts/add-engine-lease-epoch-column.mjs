/**
 * Add the `epoch` fencing column to the `engine_lease` table
 * (plans/done/ORDER-SCALE-10K.md, section 2.2 step 5 (ii), WP-5.1).
 *
 * WHY THE COLUMN EXISTS
 * ---------------------------------------------------------------------------
 * The ledger batcher (backend/src/services/wallet/batcher.ts) commits many
 * wallet operations per transaction. A process that held the engine lease,
 * paused (GC, a stalled event loop, a suspended container), lost the lease and
 * then resumed would COMMIT a batch after another process had been promoted
 * over it, and nothing in Redis can reach into an open MySQL transaction to
 * stop that. So the lease row carries an integer epoch: promotion increments
 * it, and every batch reads the row FOR UPDATE inside its transaction and
 * aborts unless the epoch is its own (backend/src/utils/engine-lease-epoch.ts).
 *
 * WHY A SCRIPT
 * ---------------------------------------------------------------------------
 * The model (backend/models/engineLease.ts) declares the column, and DB_SYNC's
 * lazy mode syncs a changed model on a development box. A production install
 * runs with DB_SYNC=none and gets its schema changes from this directory; this
 * script adds the same definition behind an INFORMATION_SCHEMA guard, so a
 * second run is a no-op.
 *
 *     `epoch` INT NOT NULL DEFAULT 0
 *
 * Existing rows start at epoch 0, which is what a batcher that has never seen a
 * promotion holds. Nothing else changes; the claim SQL in
 * backend/src/utils/engine-lease.ts never writes the column.
 *
 * DRY-RUN by default (reports exactly what it would change). Pass --apply to mutate.
 *   Report:  node scripts/add-engine-lease-epoch-column.mjs
 *   Apply:   node scripts/add-engine-lease-epoch-column.mjs --apply
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

const TABLE = "engine_lease";
const COLUMN = "epoch";
const COLUMN_COMMENT =
  "Fencing token for ledger batches: read FOR UPDATE inside every tick, incremented on promotion";

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

async function tableExists(schema) {
  const rows = await sequelize.query(
    `SELECT COUNT(*) AS count FROM information_schema.TABLES
     WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?`,
    { replacements: [schema, TABLE], type: QueryTypes.SELECT }
  );
  return Number(rows[0]?.count || 0) > 0;
}

async function columnExists(schema) {
  const rows = await sequelize.query(
    `SELECT COUNT(*) AS count FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
    { replacements: [schema, TABLE, COLUMN], type: QueryTypes.SELECT }
  );
  return Number(rows[0]?.count || 0) > 0;
}

async function main() {
  console.log("=".repeat(64));
  console.log(`Add ${COLUMN} column to '${TABLE}'  (${APPLY ? "APPLY" : "DRY-RUN"})`);
  console.log("=".repeat(64) + "\n");

  await sequelize.authenticate();
  const schema = sequelize.getDatabaseName();
  console.log(`Database: ${schema}\n`);

  if (!(await tableExists(schema))) {
    // The table is created by the model on the first boot that claims a lease;
    // an install that has never booted the engine has nothing to alter.
    console.log(
      `[ABORT] Table '${TABLE}' does not exist in '${schema}'. The model creates it with the column on the next boot.`
    );
    console.log("=".repeat(64));
    return;
  }

  let willChange = 0;

  if (await columnExists(schema)) {
    console.log(`[SKIP]  Column '${COLUMN}' already exists on '${TABLE}'.`);
  } else {
    willChange++;
    console.log(`[ADD]   Column '${COLUMN}' INT NOT NULL DEFAULT 0`);
    if (APPLY) {
      await sequelize.query(
        `ALTER TABLE \`${TABLE}\` ADD COLUMN \`${COLUMN}\` INT NOT NULL DEFAULT 0 COMMENT ?`,
        { replacements: [COLUMN_COMMENT] }
      );
      console.log(`        -> column added.`);
    }
  }

  console.log("\n" + "=".repeat(64));
  if (willChange === 0) {
    console.log("Schema already up to date; nothing to change.");
  } else if (APPLY) {
    console.log(`Applied ${willChange} change(s). Restart the backend so the model picks up the column.`);
  } else {
    console.log(`${willChange} change(s) pending. Re-run with --apply to write them.`);
  }
  console.log("=".repeat(64));
}

main()
  .catch((error) => {
    console.error("\n[FAILED]", error?.message || error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await sequelize.close().catch(() => {});
  });
