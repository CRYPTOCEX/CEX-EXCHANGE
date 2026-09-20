/**
 * Drop `binary_ai_engine.payoutMultiplier`.
 *
 * WHY
 * ---
 * The column was presented in the engine creation form as "Payout Multiplier"
 * with an `(85%)` readout, so an operator reasonably read it as "what my users
 * get paid". It never was. Payouts come from the binary settings' per-type
 * `profitPercentage` (Admin -> Finance -> Binary -> Settings), which
 * BinaryOrderService stamps on each order at placement and pays from at
 * settlement. The engine column was read by exactly three analytics modules, all
 * of which used it to PROJECT platform profit — so editing it moved a report and
 * nothing else, in the opposite direction from what the label implied.
 *
 * Those modules now sum the realised `binary_ai_engine_position.platformProfit`
 * (see scripts/backfill-binary-position-profit.mjs, which must run first so
 * historical rows are not reported as break-even). With no reader left, the
 * column is retired.
 *
 * `sync({ alter: true })` never DROPS a column, so this has to be explicit.
 *
 * Idempotent: it checks INFORMATION_SCHEMA first, so a second run is a no-op.
 *
 * DRY-RUN by default (reports what it WOULD drop). Pass --apply to drop.
 *   Report:  node scripts/drop-binary-engine-payout-multiplier.mjs
 *   Apply:   node scripts/drop-binary-engine-payout-multiplier.mjs --apply
 */

import { config } from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { Sequelize } from "sequelize";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
config({ path: path.join(__dirname, "../../.env") });

const APPLY = process.argv.includes("--apply");

const TABLE_NAME = "binary_ai_engine";
const COLUMN_NAME = "payoutMultiplier";

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

async function main() {
  console.log("=".repeat(72));
  console.log(
    `Drop ${TABLE_NAME}.${COLUMN_NAME}  (${APPLY ? "APPLY" : "DRY-RUN"})`
  );
  console.log("=".repeat(72) + "\n");

  await sequelize.authenticate();
  console.log("DB connection established.\n");

  const [rows] = await sequelize.query(
    `SELECT COUNT(*) AS n FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
    { replacements: [DB_NAME, TABLE_NAME, COLUMN_NAME] }
  );

  if (Number(rows[0]?.n || 0) === 0) {
    console.log(
      `Column \`${TABLE_NAME}.${COLUMN_NAME}\` is not present — already dropped, or`
    );
    console.log("the Binary AI Engine was never installed here.\n");
    console.log("=".repeat(72));
    console.log("Done (no-op).");
    console.log("=".repeat(72));
    return;
  }

  console.log(`Found \`${TABLE_NAME}.${COLUMN_NAME}\`.`);
  console.log(
    "Nothing reads it: the analytics modules that did now sum the realised"
  );
  console.log("binary_ai_engine_position.platformProfit instead.\n");

  if (!APPLY) {
    console.log("DRY-RUN — no changes made. Re-run with --apply to drop the column.");
    console.log(
      "\nRun scripts/backfill-binary-position-profit.mjs --apply FIRST, so historical"
    );
    console.log("cohort and time-of-day reports do not read as zero profit.");
    console.log("\n" + "=".repeat(72));
    console.log("Done (dry-run).");
    console.log("=".repeat(72));
    return;
  }

  console.log(`Dropping ${TABLE_NAME}.${COLUMN_NAME} ...`);
  await sequelize.query(`ALTER TABLE \`${TABLE_NAME}\` DROP COLUMN \`${COLUMN_NAME}\``);

  console.log("\n" + "=".repeat(72));
  console.log("Done. Column dropped.");
  console.log("=".repeat(72));
}

main()
  .catch((e) => {
    console.error("Migration failed:", e);
    process.exitCode = 1;
  })
  .finally(async () => {
    try {
      await sequelize.close();
    } catch {}
  });
