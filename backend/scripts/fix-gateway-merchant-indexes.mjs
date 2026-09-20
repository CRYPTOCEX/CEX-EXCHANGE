/**
 * Fix gateway_merchant Duplicate UNIQUE Indexes (MODEL-11)
 *
 * Sequelize `sync({ alter: true })` re-adds the UNIQUE indexes on
 * `gateway_merchant.slug`, `.apiKey` and `.secretKey` on every schema-hash
 * change because it cannot recognise the auto-named copies (`slug_2`,
 * `apiKey_3`, ...) as matching the model's named indexes
 * (`gatewayMerchantSlugUnique`, `gatewayMerchantApiKeyUnique`,
 * `gatewayMerchantSecretKeyUnique`). Over many deploys the table accumulates
 * dozens of redundant single-column UNIQUE indexes and approaches InnoDB's
 * 64-index-per-table hard cap, blocking future migrations on this
 * money-critical table.
 *
 * This script discovers the redundant single-column UNIQUE indexes from
 * information_schema, KEEPS exactly one canonical index per column, and DROPS
 * the rest. It is idempotent: it only drops index names that currently exist
 * (re-running is a no-op once the table is clean).
 *
 * It NEVER touches the PRIMARY key, the FK helper index
 * (`gatewayMerchantUserIdFkey`), the non-unique status index
 * (`gatewayMerchantStatusIdx`), or any multi-column UNIQUE index. Only
 * single-column UNIQUE indexes on `slug` / `apiKey` / `secretKey` are
 * considered, and only the surplus copies are removed.
 *
 * DRY-RUN by default (reports what would be dropped). Pass --apply to execute.
 *   Report:  node scripts/fix-gateway-merchant-indexes.mjs
 *   Apply:   node scripts/fix-gateway-merchant-indexes.mjs --apply
 *
 * After --apply, restart the backend so Sequelize re-reads a clean index set.
 */

import { config } from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { Sequelize, QueryTypes } from "sequelize";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
config({ path: path.join(__dirname, "../../.env") });

const APPLY = process.argv.includes("--apply");

const TABLE = "gateway_merchant";

// Columns whose UNIQUE index is defined by the model, and the canonical index
// name the model declares for each (the one we KEEP).
const CANONICAL = {
  slug: "gatewayMerchantSlugUnique",
  apiKey: "gatewayMerchantApiKeyUnique",
  secretKey: "gatewayMerchantSecretKeyUnique",
};

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

// MySQL identifier quoting (escape embedded backticks).
function bq(id) {
  return "`" + String(id).replace(/`/g, "``") + "`";
}

async function main() {
  console.log("=".repeat(64));
  console.log(`gateway_merchant index cleanup  (${APPLY ? "APPLY" : "DRY-RUN"})`);
  console.log("=".repeat(64) + "\n");

  await sequelize.authenticate();

  // Discover every UNIQUE index on the table along with its column composition.
  // SEQ_IN_INDEX lets us detect (and skip) multi-column indexes.
  const rows = await sequelize.query(
    `SELECT INDEX_NAME, COLUMN_NAME, SEQ_IN_INDEX
       FROM information_schema.STATISTICS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = :table
        AND NON_UNIQUE = 0
      ORDER BY INDEX_NAME, SEQ_IN_INDEX`,
    { replacements: { table: TABLE }, type: QueryTypes.SELECT }
  );

  if (rows.length === 0) {
    console.log(`Table '${TABLE}' has no UNIQUE indexes (or does not exist). Nothing to do.`);
    return;
  }

  // Group rows by index name to compute each index's column list.
  const indexCols = new Map(); // indexName -> [columnName, ...] ordered by SEQ_IN_INDEX
  for (const r of rows) {
    if (!indexCols.has(r.INDEX_NAME)) indexCols.set(r.INDEX_NAME, []);
    indexCols.get(r.INDEX_NAME).push(r.COLUMN_NAME);
  }

  // Total UNIQUE index count up-front (PRIMARY is NON_UNIQUE=0 too and shows here).
  const totalUnique = indexCols.size;
  console.log(`Found ${totalUnique} UNIQUE index(es) on '${TABLE}'.\n`);

  // For each managed column, collect the single-column UNIQUE indexes on it.
  const toDrop = []; // [{ indexName, column }]
  let anyTarget = false;

  for (const column of Object.keys(CANONICAL)) {
    const canonical = CANONICAL[column];
    // Single-column UNIQUE indexes whose sole column is this one.
    const candidates = [...indexCols.entries()]
      .filter(([, cols]) => cols.length === 1 && cols[0] === column)
      .map(([name]) => name)
      .filter((name) => name !== "PRIMARY");

    if (candidates.length === 0) continue;
    anyTarget = true;

    // Decide which one to keep: prefer the canonical model name; otherwise
    // keep a deterministic one (sorted first) and warn.
    let keep;
    if (candidates.includes(canonical)) {
      keep = canonical;
    } else {
      keep = [...candidates].sort()[0];
      console.log(
        `[WARN] column '${column}': canonical index '${canonical}' is MISSING. ` +
          `Keeping '${keep}' instead. Run a backend boot (sync) after this to recreate the canonical name.`
      );
    }

    const drops = candidates.filter((name) => name !== keep);
    console.log(
      `column '${column}': ${candidates.length} UNIQUE index(es) -> keep '${keep}', drop ${drops.length}`
    );
    for (const name of drops) {
      console.log(`    - ${name}`);
      toDrop.push({ indexName: name, column });
    }
    console.log("");
  }

  if (!anyTarget) {
    console.log(`No single-column UNIQUE indexes found on ${Object.keys(CANONICAL).join(", ")}. Nothing to do.`);
  }

  if (toDrop.length === 0) {
    console.log("=".repeat(64));
    console.log("No redundant indexes to drop. Table is already clean.");
    console.log("=".repeat(64));
    return;
  }

  console.log("=".repeat(64));
  console.log(`Redundant UNIQUE indexes to drop: ${toDrop.length}`);
  console.log("=".repeat(64) + "\n");

  if (!APPLY) {
    console.log("DRY-RUN — nothing dropped. Re-run with --apply to execute.");
    return;
  }

  let dropped = 0;
  for (const { indexName, column } of toDrop) {
    // No IF EXISTS (unsupported on MySQL) — we only drop names we just
    // discovered, so this stays idempotent across re-runs.
    const sql = `DROP INDEX ${bq(indexName)} ON ${bq(TABLE)}`;
    try {
      await sequelize.query(sql, { type: QueryTypes.RAW });
      dropped++;
      console.log(`[DROPPED] ${indexName} (${column})`);
    } catch (e) {
      console.error(`[FAILED ] ${indexName} (${column}): ${e.message}`);
    }
  }

  // Verify post-state.
  const after = await sequelize.query(
    `SELECT COUNT(DISTINCT INDEX_NAME) AS cnt
       FROM information_schema.STATISTICS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = :table
        AND NON_UNIQUE = 0`,
    { replacements: { table: TABLE }, type: QueryTypes.SELECT }
  );

  console.log("\n" + "=".repeat(64));
  console.log(`Dropped ${dropped} of ${toDrop.length} redundant index(es).`);
  console.log(`UNIQUE indexes remaining on '${TABLE}' (incl. PRIMARY): ${after[0].cnt}`);
  console.log("Expected: 4 (PRIMARY + slug + apiKey + secretKey).");
  console.log("=".repeat(64));
  console.log("\nIMPORTANT: restart the backend so Sequelize re-reads a clean index set.\n");
}

main()
  .catch((e) => console.error("Index cleanup failed:", e))
  .finally(async () => {
    try {
      await sequelize.close();
    } catch {}
  });
