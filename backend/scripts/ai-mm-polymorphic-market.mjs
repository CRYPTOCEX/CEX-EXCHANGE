/**
 * Make `ai_market_maker.marketId` a POLYMORPHIC reference.
 *
 * ---------------------------------------------------------------------------
 * WHY A SCRIPT AND NOT THE AUTO-SYNC
 * ---------------------------------------------------------------------------
 * The AI market maker now manages FUTURES markets as well as ecosystem ones, so
 * `marketId` names a row in `ecosystem_market` OR in `futures_market`, decided
 * by the new `marketType` column. MySQL cannot express "one of these two
 * parents", so the model's association became `constraints: false` and the old
 * foreign key has to go.
 *
 * `sync({ alter: true })` WILL NOT REMOVE IT. Sequelize emits `removeConstraint`
 * ahead of `changeColumn` for a column that used to carry a reference, that drop
 * fails, and `isBenignConstraintError` in src/db.ts swallows the failure as
 * noise. The constraint therefore survives on every upgraded install, still
 * pointing at `ecosystem_market`.
 *
 * The symptom is precise and unmistakable: creating a FUTURES market maker fails
 * with a foreign-key violation on a `futures_market.id` that certainly exists.
 * A fresh install never sees it, because the table is created from the current
 * model with no constraint at all — which is exactly the shape of defect that
 * passes every development machine and fails on a customer's.
 *
 * `marketType` itself needs nothing here: it is NOT NULL with a default of
 * 'ECO', so the alter sync backfills every existing row with the right answer.
 * Every maker that existed before this column did was an ecosystem maker; the
 * model could not describe anything else.
 *
 * ---------------------------------------------------------------------------
 * WHAT IT DOES
 * ---------------------------------------------------------------------------
 *  1. Drops any FOREIGN KEY on `ai_market_maker.marketId`, whatever it is
 *     named. Names are never hardcoded — the alter sync re-adds foreign keys
 *     ANONYMOUSLY as `ai_market_maker_ibfk_<n>`, so the name on any given
 *     install is whatever that install's history produced.
 *  2. Drops the old UNIQUE index on `marketId` alone, once the composite
 *     `(marketType, marketId)` index the model now declares is present.
 *
 * Step 2 is TIDINESS, NOT CORRECTNESS. The old index constrains nothing the new
 * one does not: two UUIDs colliding across two different tables is not a thing
 * that happens, so an install carrying both indexes behaves identically. It is
 * dropped only so the schema says what the model says. Crucially, it is dropped
 * ONLY IF the replacement exists — dropping it first on an install whose sync
 * has not run yet would leave the table with no uniqueness at all, and two
 * makers on one market is a pair of engines fighting over one book.
 *
 * IDEMPOTENT. Everything is discovered from INFORMATION_SCHEMA; a second run
 * finds nothing and is a no-op.
 *
 * DRY-RUN by default.
 *   Report:  node backend/scripts/ai-mm-polymorphic-market.mjs
 *   Apply:   node backend/scripts/ai-mm-polymorphic-market.mjs --apply
 *
 * Run it AFTER a backend start has synced the model (so `marketType` and the
 * composite index exist), then restart the backend.
 */

import { config } from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { Sequelize } from "sequelize";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
config({ path: path.join(__dirname, "../../.env") });

const APPLY = process.argv.includes("--apply");

const TABLE_NAME = "ai_market_maker";
const COLUMN_NAME = "marketId";
const OLD_UNIQUE_COLUMNS = ["marketId"];
const NEW_UNIQUE_COLUMNS = ["marketType", "marketId"];

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

async function foreignKeysOnColumn() {
  const [rows] = await sequelize.query(
    `SELECT CONSTRAINT_NAME AS name, REFERENCED_TABLE_NAME AS parent
       FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND COLUMN_NAME = ?
        AND REFERENCED_TABLE_NAME IS NOT NULL`,
    { replacements: [DB_NAME, TABLE_NAME, COLUMN_NAME] }
  );
  return rows;
}

async function indexColumns(indexName) {
  const [rows] = await sequelize.query(
    `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.STATISTICS
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND INDEX_NAME = ?
      ORDER BY SEQ_IN_INDEX`,
    { replacements: [DB_NAME, TABLE_NAME, indexName] }
  );
  return rows.map((r) => r.COLUMN_NAME);
}

async function uniqueIndexes() {
  const [rows] = await sequelize.query(
    `SELECT DISTINCT INDEX_NAME AS name FROM INFORMATION_SCHEMA.STATISTICS
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND NON_UNIQUE = 0`,
    { replacements: [DB_NAME, TABLE_NAME] }
  );

  const out = [];
  for (const row of rows) {
    if (row.name === "PRIMARY") continue;
    out.push({ name: row.name, columns: await indexColumns(row.name) });
  }
  return out;
}

function sameColumns(a, b) {
  return a.length === b.length && a.every((c, i) => c === b[i]);
}

async function tableExists() {
  const [rows] = await sequelize.query(
    `SELECT 1 FROM INFORMATION_SCHEMA.TABLES
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?`,
    { replacements: [DB_NAME, TABLE_NAME] }
  );
  return rows.length > 0;
}

async function columnExists(column) {
  const [rows] = await sequelize.query(
    `SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
    { replacements: [DB_NAME, TABLE_NAME, column] }
  );
  return rows.length > 0;
}

async function main() {
  const line = "=".repeat(72);
  console.log(line);
  console.log(
    `AI market maker: polymorphic market reference  (${APPLY ? "APPLY" : "DRY-RUN"})`
  );
  console.log(line + "\n");

  await sequelize.authenticate();
  console.log("DB connection established.\n");

  if (!(await tableExists())) {
    console.log(
      `Table \`${TABLE_NAME}\` does not exist — the AI Market Maker extension is not ` +
        `installed here. Nothing to do.\n`
    );
    return;
  }

  /*
   * The whole migration is about a column the model no longer constrains. If
   * `marketType` is missing, the backend has not yet synced the new model —
   * running now would drop the foreign key while nothing has replaced the
   * uniqueness guarantee, so it refuses rather than half-applying.
   */
  if (!(await columnExists("marketType"))) {
    console.log(
      `Column \`${TABLE_NAME}.marketType\` is missing. Start the backend once so the\n` +
        `model sync creates it, then run this script again.\n`
    );
    process.exitCode = 1;
    return;
  }

  const fks = await foreignKeysOnColumn();
  const indexes = await uniqueIndexes();
  const hasNewUnique = indexes.some((i) => sameColumns(i.columns, NEW_UNIQUE_COLUMNS));
  const oldUnique = indexes.filter((i) => sameColumns(i.columns, OLD_UNIQUE_COLUMNS));

  console.log(`Foreign keys on ${TABLE_NAME}.${COLUMN_NAME}: ${fks.length}`);
  for (const fk of fks) console.log(`  - ${fk.name} -> ${fk.parent}`);
  console.log(
    `Composite UNIQUE (${NEW_UNIQUE_COLUMNS.join(", ")}): ${hasNewUnique ? "present" : "MISSING"}`
  );
  console.log(`Old UNIQUE on (${OLD_UNIQUE_COLUMNS.join(", ")}): ${oldUnique.length}`);
  for (const idx of oldUnique) console.log(`  - ${idx.name}`);
  console.log("");

  const plan = [];
  for (const fk of fks) {
    plan.push({
      what: `DROP FOREIGN KEY ${fk.name} (was -> ${fk.parent})`,
      sql: `ALTER TABLE \`${TABLE_NAME}\` DROP FOREIGN KEY \`${fk.name}\``,
    });
  }
  if (hasNewUnique) {
    for (const idx of oldUnique) {
      plan.push({
        what: `DROP INDEX ${idx.name} (superseded by the composite key)`,
        sql: `ALTER TABLE \`${TABLE_NAME}\` DROP INDEX \`${idx.name}\``,
      });
    }
  } else if (oldUnique.length) {
    console.log(
      "The composite UNIQUE index is not present yet, so the old one is being KEPT.\n" +
        "Dropping it now would leave the table with no uniqueness at all, and two\n" +
        "makers on one market is two engines fighting over one order book.\n" +
        "Start the backend so the sync creates the composite index, then re-run.\n"
    );
  }

  if (plan.length === 0) {
    console.log("Nothing to change — already migrated.\n");
    console.log(line);
    console.log("Done (no-op).");
    console.log(line);
    return;
  }

  console.log("Planned changes:");
  for (const step of plan) console.log(`  - ${step.what}`);
  console.log("");

  if (!APPLY) {
    console.log("DRY-RUN — no changes made. Re-run with --apply to perform them.");
    console.log("\n" + line);
    console.log("Done (dry-run).");
    console.log(line);
    return;
  }

  let applied = 0;
  for (const step of plan) {
    console.log(`${step.what} ...`);
    await sequelize.query(step.sql);
    applied++;
  }

  console.log("\n" + line);
  console.log(`Done. Applied ${applied} change(s).`);
  console.log("Restart the backend. Futures market makers can now be created.");
  console.log(line);
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
