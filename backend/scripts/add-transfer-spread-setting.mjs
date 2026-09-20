/**
 * Add Transfer Spread Setting  (CORE-FIN-08)
 *
 * Idempotently ensures the `walletTransferSpread` row exists in the `settings`
 * table. This setting controls the safety margin (in percent) applied to the
 * cross-currency wallet-transfer exchange rate, protecting the platform from
 * internal mid-price feed lag / arbitrage (see api/finance/transfer/index.post.ts).
 *
 * Default value: 0.5  (0.5% — reduces the effective rate by multiplying the
 * mid-rate by (100 - 0.5) / 100 = 0.995). Set to 0 to disable the spread.
 * Admins may later adjust the value directly in the DB.
 *
 * Idempotent: the row is only inserted when absent (checked via a SELECT and
 * INSERT IGNORE), so a second run is a no-op and never overwrites an
 * admin-tuned value.
 *
 * DRY-RUN by default (reports what it would do). Pass --apply to write.
 *   Report:  node scripts/add-transfer-spread-setting.mjs
 *   Apply:   node scripts/add-transfer-spread-setting.mjs --apply
 *
 * After --apply, restart the backend so the settings cache is refreshed.
 */

import { config } from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { Sequelize, QueryTypes } from "sequelize";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
config({ path: path.join(__dirname, "../../.env") });

const APPLY = process.argv.includes("--apply");

const SETTING_KEY = "walletTransferSpread";
const DEFAULT_VALUE = "0.5";

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

async function main() {
  console.log("=".repeat(64));
  console.log(`Add Transfer Spread Setting  (${APPLY ? "APPLY" : "DRY-RUN"})`);
  console.log("=".repeat(64) + "\n");

  await sequelize.authenticate();

  // Guard: confirm the `settings` table actually exists before touching it.
  const dbName = sequelize.config.database;
  const tableRows = await sequelize.query(
    `SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES
       WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'settings'`,
    { replacements: [dbName], type: QueryTypes.SELECT }
  );
  if (!tableRows.length) {
    console.error(
      `ERROR: table \`settings\` not found in schema \`${dbName}\`. Aborting.`
    );
    return;
  }

  // `key` is a MySQL reserved word — must be backtick-quoted everywhere.
  const existing = await sequelize.query(
    "SELECT `key`, `value` FROM `settings` WHERE `key` = ?",
    { replacements: [SETTING_KEY], type: QueryTypes.SELECT }
  );

  if (existing.length) {
    console.log(
      `Setting \`${SETTING_KEY}\` already exists with value = ${existing[0].value}`
    );
    console.log("Nothing to do — existing value is preserved (idempotent).");
    console.log("\n" + "=".repeat(64));
    return;
  }

  console.log(
    `Setting \`${SETTING_KEY}\` is MISSING. Would insert default value = ${DEFAULT_VALUE} (%).`
  );

  if (!APPLY) {
    console.log("\nDRY-RUN — no changes written. Re-run with --apply to insert.");
    console.log("=".repeat(64));
    return;
  }

  // INSERT IGNORE keeps this safe even against a concurrent inserter.
  await sequelize.query(
    "INSERT IGNORE INTO `settings` (`key`, `value`) VALUES (?, ?)",
    { replacements: [SETTING_KEY, DEFAULT_VALUE], type: QueryTypes.INSERT }
  );

  const verify = await sequelize.query(
    "SELECT `key`, `value` FROM `settings` WHERE `key` = ?",
    { replacements: [SETTING_KEY], type: QueryTypes.SELECT }
  );

  if (verify.length) {
    console.log(`\n[INSERTED] \`${SETTING_KEY}\` = ${verify[0].value} (%)`);
    console.log(
      "\nIMPORTANT: restart the backend so the settings cache picks up the new value."
    );
  } else {
    console.error(`\nERROR: insert did not persist \`${SETTING_KEY}\`.`);
  }
  console.log("=".repeat(64));
}

main()
  .catch((e) => console.error("Failed to add transfer spread setting:", e))
  .finally(async () => {
    try {
      await sequelize.close();
    } catch {}
  });
