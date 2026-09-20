/**
 * Drop unconditional UNIQUE index from the `investment` table.
 *
 * The investment model historically declared a partial UNIQUE index on
 * (userId, planId, status) with `where: { status: "ACTIVE" }`
 * (name: investmentUserIdPlanIdStatusUnique). MySQL/MariaDB silently ignore the
 * partial WHERE clause on UNIQUE indexes, so the constraint was effectively
 * UNCONDITIONAL on (userId, planId, status). Because the model is paranoid
 * (soft-delete), a CANCELLED row keeps occupying (userId, planId) space and
 * blocks the user from ever re-investing in the same plan.
 *
 * The model has been changed to a NON-unique lookup index
 * (investmentUserIdPlanIdStatusIdx) and "one ACTIVE per plan" is now enforced
 * at the application level (investment creation handler). But sync({alter:true})
 * NEVER drops indexes, so the old unique index must be dropped by this script.
 *
 * Idempotent: it discovers the real index name(s) from INFORMATION_SCHEMA and
 * only drops UNIQUE indexes whose column set is (userId, planId, status). A
 * second run finds nothing to drop and is a no-op. The replacement non-unique
 * index is left to sync({alter:true}) to (re)create from the model definition.
 *
 * DRY-RUN by default (reports what it WOULD drop). Pass --apply to drop.
 *   Report:  node scripts/drop-investment-unique-index.mjs
 *   Apply:   node scripts/drop-investment-unique-index.mjs --apply
 *
 * After --apply, restart the backend so sync() recreates the non-unique index.
 */

import { config } from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { Sequelize } from "sequelize";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
config({ path: path.join(__dirname, "../../.env") });

const APPLY = process.argv.includes("--apply");

const TABLE_NAME = "investment";
// The columns that uniquely identify the bad constraint, in index order.
const TARGET_COLUMNS = ["userId", "planId", "status"];

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

// Return the ordered column list for an index from INFORMATION_SCHEMA.STATISTICS.
async function indexColumns(indexName) {
  const [rows] = await sequelize.query(
    `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.STATISTICS
     WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND INDEX_NAME = ?
     ORDER BY SEQ_IN_INDEX`,
    { replacements: [DB_NAME, TABLE_NAME, indexName] }
  );
  return rows.map((r) => r.COLUMN_NAME);
}

function sameColumns(a, b) {
  if (a.length !== b.length) return false;
  return a.every((c, i) => c === b[i]);
}

async function main() {
  console.log("=".repeat(72));
  console.log(`Drop unconditional UNIQUE index on ${TABLE_NAME}  (${APPLY ? "APPLY" : "DRY-RUN"})`);
  console.log("=".repeat(72) + "\n");

  await sequelize.authenticate();
  console.log("DB connection established.\n");

  // Discover all UNIQUE indexes on the table (NON_UNIQUE = 0), then keep only
  // those whose column set is exactly (userId, planId, status). We never trust a
  // hardcoded name — the real index name is read from INFORMATION_SCHEMA.
  const [uniqueIndexRows] = await sequelize.query(
    `SELECT DISTINCT INDEX_NAME FROM INFORMATION_SCHEMA.STATISTICS
     WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND NON_UNIQUE = 0`,
    { replacements: [DB_NAME, TABLE_NAME] }
  );

  const candidates = [];
  for (const row of uniqueIndexRows) {
    const name = row.INDEX_NAME;
    if (name === "PRIMARY") continue;
    const cols = await indexColumns(name);
    if (sameColumns(cols, TARGET_COLUMNS)) {
      candidates.push(name);
    }
  }

  if (candidates.length === 0) {
    console.log(
      `No UNIQUE index on (${TARGET_COLUMNS.join(", ")}) found. ` +
        `Nothing to drop — already migrated or never present.\n`
    );
    console.log("=".repeat(72));
    console.log("Done (no-op).");
    console.log("=".repeat(72));
    return;
  }

  console.log(`Found ${candidates.length} unconditional UNIQUE index(es) to drop:`);
  for (const name of candidates) {
    console.log(`  - ${name}  (${TARGET_COLUMNS.join(", ")})`);
  }
  console.log("");

  if (!APPLY) {
    console.log("DRY-RUN — no changes made. Re-run with --apply to drop the index(es).");
    console.log("\n" + "=".repeat(72));
    console.log("Done (dry-run).");
    console.log("=".repeat(72));
    return;
  }

  let dropped = 0;
  for (const name of candidates) {
    // Use Sequelize's identifier quoting to be safe with the index name.
    const quoted = sequelize.getQueryInterface().quoteIdentifier(name);
    console.log(`Dropping ${name} ...`);
    await sequelize.query(`ALTER TABLE ${TABLE_NAME} DROP INDEX ${quoted}`);
    dropped++;
    console.log(`  dropped ${name}`);
  }

  console.log("\n" + "=".repeat(72));
  console.log(`Done. Dropped ${dropped} index(es).`);
  console.log("IMPORTANT: restart the backend so sync({alter:true}) recreates the");
  console.log("non-unique investmentUserIdPlanIdStatusIdx lookup index.");
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
