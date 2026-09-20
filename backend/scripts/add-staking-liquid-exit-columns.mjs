/**
 * Add Staking Liquid-Exit Columns  (STAKE-SCHEMA-01)
 *
 * Idempotently adds the two `staking_pools` columns the Sequelize model and
 * `initial.sql` both declare but which are MISSING from installs that were
 * upgraded rather than built fresh:
 *
 *   `liquidExitEnabled`          tinyint(1) NOT NULL DEFAULT 0
 *   `liquidExitMaxSlippageBps`   int(11)    NOT NULL DEFAULT 100
 *
 * WHY THIS MATTERS — the staking pool page is BROKEN without them.
 * `backend/models/ext/staking/stakingPool.ts:547,552` declares both, and
 * `backend/src/api/(ext)/staking/pool/index.get.ts` does a bare `findAll` with
 * no `attributes:` narrowing, so Sequelize puts every modelled column into the
 * SELECT field list. On an install whose physical table lacks them, that query
 * dies with:
 *
 *   Unknown column 'liquidExitEnabled' in 'field list'   (MySQL error 1054)
 *
 * and `/en/staking/pool` renders its error branch instead of the pool list.
 * This was found on 2026-09-08 by the Playwright `values` project
 * (`e2e/ui/customer/surfaces.pw.mjs:650`), and proved by causation in both
 * directions on a scratch clone of the live database: adding the two columns
 * makes the test pass, dropping them again makes it fail.
 *
 * `initial.sql:6300-6301` ships both, so a FRESH install is unaffected. The
 * drift is exactly these two columns — a clone of the live database was found
 * to have 50 columns on this table where `initial.sql` builds 52, with no other
 * difference.
 *
 * Idempotent: each column is added only when INFORMATION_SCHEMA says it is
 * absent, so a second run is a no-op and an install that already has them is
 * untouched. Nothing is ever dropped, widened or re-typed.
 *
 * Both columns are NOT NULL with a DEFAULT, so existing rows are backfilled by
 * the DEFAULT and no separate data step is needed. The defaults are the safe
 * ones: liquid exit OFF, and a 100 bps (1%) slippage cap if it is later enabled.
 *
 * DRY-RUN by default (reports what it would do). Pass --apply to write.
 *   Report:  node scripts/add-staking-liquid-exit-columns.mjs
 *   Apply:   node scripts/add-staking-liquid-exit-columns.mjs --apply
 *
 * After --apply, restart the backend so Sequelize re-reads the table.
 */

import { config } from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { Sequelize, QueryTypes } from "sequelize";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
config({ path: path.join(__dirname, "../../.env") });

const APPLY = process.argv.includes("--apply");

const TABLE = "staking_pools";

// Column name -> the DDL fragment, copied verbatim from initial.sql:6300-6301
// so a fresh install and a repaired install end up byte-identical. `AFTER` keeps
// the physical column order matching initial.sql too, which keeps `SHOW CREATE
// TABLE` diffs between a fresh and a repaired install empty rather than merely
// equivalent.
const COLUMNS = [
  {
    name: "liquidExitEnabled",
    ddl: "`liquidExitEnabled` tinyint(1) NOT NULL DEFAULT 0",
    after: "slashingReimburseCap",
  },
  {
    name: "liquidExitMaxSlippageBps",
    ddl: "`liquidExitMaxSlippageBps` int(11) NOT NULL DEFAULT 100",
    after: "liquidExitEnabled",
  },
];

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

async function columnNames(dbName) {
  const rows = await sequelize.query(
    `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?`,
    { replacements: [dbName, TABLE], type: QueryTypes.SELECT }
  );
  return new Set(rows.map((r) => r.COLUMN_NAME));
}

async function main() {
  console.log("=".repeat(64));
  console.log(
    `Add Staking Liquid-Exit Columns  (${APPLY ? "APPLY" : "DRY-RUN"})`
  );
  console.log("=".repeat(64) + "\n");

  await sequelize.authenticate();
  const dbName = sequelize.config.database;
  console.log(`Database: ${dbName}\n`);

  // Guard: confirm the table exists before touching it. An install without the
  // staking extension has no such table, and that is not an error — there is
  // simply nothing to repair.
  const tableRows = await sequelize.query(
    `SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES
       WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?`,
    { replacements: [dbName, TABLE], type: QueryTypes.SELECT }
  );
  if (!tableRows.length) {
    console.log(
      `Table \`${TABLE}\` does not exist in \`${dbName}\` — the staking`
    );
    console.log("extension is not installed here. Nothing to do.");
    return;
  }

  const present = await columnNames(dbName);
  const missing = COLUMNS.filter((c) => !present.has(c.name));

  console.log(`\`${TABLE}\` currently has ${present.size} column(s).`);
  for (const c of COLUMNS) {
    console.log(`  ${present.has(c.name) ? "present" : "MISSING"}  ${c.name}`);
  }
  console.log("");

  if (!missing.length) {
    console.log("Both columns are already present. Nothing to do.");
    return;
  }

  if (!APPLY) {
    console.log(`DRY-RUN: would run ${missing.length} statement(s):\n`);
    for (const c of missing) {
      console.log(
        `  ALTER TABLE \`${TABLE}\` ADD COLUMN ${c.ddl} AFTER \`${c.after}\`;`
      );
    }
    console.log("\nRe-run with --apply to write. Nothing was changed.");
    return;
  }

  for (const c of missing) {
    // `after` is only a cosmetic ordering hint. If the anchor column is itself
    // absent on some older install, append instead of failing the repair.
    const anchor = present.has(c.after) ? ` AFTER \`${c.after}\`` : "";
    const sql = `ALTER TABLE \`${TABLE}\` ADD COLUMN ${c.ddl}${anchor}`;
    console.log(`  ${sql};`);
    await sequelize.query(sql);
    present.add(c.name);
  }

  // Verify from INFORMATION_SCHEMA rather than trusting the ALTER returned.
  const after = await columnNames(dbName);
  const stillMissing = COLUMNS.filter((c) => !after.has(c.name));
  console.log("");
  if (stillMissing.length) {
    console.error(
      `ERROR: after applying, still missing: ${stillMissing
        .map((c) => c.name)
        .join(", ")}`
    );
    process.exitCode = 1;
    return;
  }
  console.log(
    `Done. \`${TABLE}\` now has ${after.size} column(s); both liquid-exit`
  );
  console.log("columns are present. Restart the backend to pick them up.");
}

main()
  .catch((err) => {
    console.error("FAILED:", err.message);
    process.exitCode = 1;
  })
  .finally(() => sequelize.close());
