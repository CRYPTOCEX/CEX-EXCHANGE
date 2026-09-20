/**
 * Backfill Method Status Script  (MODEL-12)
 *
 * Prepares `deposit_method` and `withdraw_method` for a NOT NULL DEFAULT true
 * `status` column. Today a NULL status and a `false` status both mean "inactive",
 * which is ambiguous. Before the model change makes `status` NOT NULL (applied by
 * Sequelize sync({alter: true})), every existing NULL must be resolved or the
 * ALTER will fail.
 *
 * This script normalizes the historical ambiguity by treating NULL as the
 * intended default (active = true):
 *   UPDATE deposit_method  SET status = true WHERE status IS NULL;
 *   UPDATE withdraw_method  SET status = true WHERE status IS NULL;
 *
 * It is fully IDEMPOTENT and safe to re-run:
 *   - Each table is guarded by an INFORMATION_SCHEMA existence check.
 *   - The `status` column is guarded by an INFORMATION_SCHEMA column check.
 *   - `UPDATE ... WHERE status IS NULL` is a no-op once backfilled.
 *
 * DRY-RUN by default (reports how many rows WOULD be backfilled). Pass --apply
 * to actually run the UPDATEs.
 *   Report: node scripts/backfill-method-status.mjs
 *   Apply:  node scripts/backfill-method-status.mjs --apply
 *
 * Deployment order (see MODEL-12 plan):
 *   1. Run this script with --apply.
 *   2. Verify both NULL counts are 0.
 *   3. Deploy the updated model files (status NOT NULL DEFAULT true).
 *   4. Start the app (sync({alter: true}) applies the NOT NULL constraint).
 */

import { config } from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { Sequelize } from "sequelize";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
config({ path: path.join(__dirname, "../../.env") });

const APPLY = process.argv.includes("--apply");

const TABLES = ["deposit_method", "withdraw_method"];
const STATUS_COLUMN = "status";

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

async function tableExists(tableName) {
  const [rows] = await sequelize.query(
    `SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?`,
    { replacements: [tableName] }
  );
  return rows.length > 0;
}

async function columnExists(tableName, columnName) {
  const [rows] = await sequelize.query(
    `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
    { replacements: [tableName, columnName] }
  );
  return rows.length > 0;
}

async function countNullStatus(tableName) {
  const [rows] = await sequelize.query(
    `SELECT COUNT(*) AS c FROM \`${tableName}\` WHERE \`${STATUS_COLUMN}\` IS NULL`
  );
  return Number(rows[0]?.c ?? 0);
}

async function main() {
  console.log("=".repeat(64));
  console.log(`Backfill Method Status  (MODEL-12)  (${APPLY ? "APPLY" : "DRY-RUN"})`);
  console.log("=".repeat(64) + "\n");

  await sequelize.authenticate();

  let totalToBackfill = 0;

  for (const tableName of TABLES) {
    if (!(await tableExists(tableName))) {
      console.log(`[SKIP] table \`${tableName}\` does not exist.\n`);
      continue;
    }
    if (!(await columnExists(tableName, STATUS_COLUMN))) {
      console.log(`[SKIP] table \`${tableName}\` has no \`${STATUS_COLUMN}\` column.\n`);
      continue;
    }

    const nullCount = await countNullStatus(tableName);
    if (nullCount === 0) {
      console.log(`[OK]   \`${tableName}\`: no NULL \`${STATUS_COLUMN}\` rows (already backfilled).\n`);
      continue;
    }

    totalToBackfill += nullCount;
    console.log(`[FOUND] \`${tableName}\`: ${nullCount} row(s) with NULL \`${STATUS_COLUMN}\` -> will set to true.`);

    if (APPLY) {
      const transaction = await sequelize.transaction();
      try {
        await sequelize.query(
          `UPDATE \`${tableName}\` SET \`${STATUS_COLUMN}\` = true WHERE \`${STATUS_COLUMN}\` IS NULL`,
          { transaction }
        );
        await transaction.commit();
      } catch (e) {
        await transaction.rollback();
        throw e;
      }
      const remaining = await countNullStatus(tableName);
      console.log(`        [BACKFILLED] ${nullCount - remaining} row(s). Remaining NULL: ${remaining}.`);
    }
    console.log("");
  }

  console.log("=".repeat(64));
  if (totalToBackfill === 0) {
    console.log("Nothing to backfill — all method status rows are already non-NULL.");
  } else if (APPLY) {
    console.log(`Backfill complete. ${totalToBackfill} row(s) targeted.`);
    console.log("Next: deploy the NOT NULL model change and start the app to apply the constraint.");
  } else {
    console.log(`DRY-RUN — ${totalToBackfill} row(s) would be backfilled. Re-run with --apply.`);
  }
  console.log("=".repeat(64));
}

main()
  .catch((e) => {
    console.error("Backfill failed:", e);
    process.exitCode = 1;
  })
  .finally(async () => {
    try {
      await sequelize.close();
    } catch {}
  });
