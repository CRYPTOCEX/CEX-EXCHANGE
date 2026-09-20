/**
 * Migrate Money Columns: DOUBLE/FLOAT -> DECIMAL  (MODEL-03)
 *
 * Audit finding MODEL-03: core custody/settlement money columns in the finance
 * and staking tables are stored as binary floating point (DOUBLE / FLOAT), which
 * cannot represent decimal money values exactly and silently rounds. This script
 * converts them to fixed-point DECIMAL with enough headroom for both fiat sums
 * and 18-decimal crypto (Wei) precision.
 *
 *   balance / inOrder / amount / fee / minStake / maxStake / availableToStake / stake
 *        -> DECIMAL(36,18)
 *   apr / adminFeePercentage / earlyWithdrawalFee (percentages)
 *        -> DECIMAL(10,8), except staking_positions.apr /
 *           staking_positions.adminFeePercentage -> DECIMAL(16,8)
 *           (widened to fit a 100% value, matching the model)
 *   currency.precision / currency.price
 *        -> DECIMAL(30,15)
 *
 * The TypeScript models have already been updated to these same types, so the
 * backend's sync({alter:true}) would eventually issue the same CHANGE COLUMN.
 * This script lets you run (and verify) the conversion explicitly and ahead of
 * deploy, with a precision-loss pre-flight that sync does not perform.
 *
 * SAFE BY DEFAULT:
 *   - DRY-RUN unless --apply is passed (prints exactly what it would do).
 *   - Fully IDEMPOTENT: every column is guarded by an INFORMATION_SCHEMA check on
 *     its current COLUMN_TYPE; a column that is already the target DECIMAL type is
 *     skipped, so re-running is a no-op.
 *   - Pre-flight overflow scan: for each column it measures the widest existing
 *     value and refuses to convert (warns and skips) any column whose data would
 *     not fit the target DECIMAL precision, so no row is ever truncated.
 *
 * Usage:
 *   Report:  node scripts/migrate-money-columns-double-to-decimal.mjs
 *   Apply:   node scripts/migrate-money-columns-double-to-decimal.mjs --apply
 *
 * After --apply, restart the backend so cached model metadata / wallet rows are
 * refreshed.
 */

import { config } from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { Sequelize } from "sequelize";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
config({ path: path.join(__dirname, "../../.env") });

const APPLY = process.argv.includes("--apply");

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

const DB_NAME = process.env.DB_NAME || "platform";

/**
 * Every money/percentage column to convert. `nullable`/`default` mirror the
 * Sequelize model definitions so the rebuilt column keeps the same constraints
 * (a CHANGE COLUMN must restate them or it would drop NOT NULL / DEFAULT).
 */
const COLUMNS = [
  // table, column, precision, scale, nullable, default (raw SQL literal or null)
  { table: "wallet", column: "balance", precision: 36, scale: 18, nullable: false, default: "0" },
  { table: "wallet", column: "inOrder", precision: 36, scale: 18, nullable: true, default: "0" },

  { table: "transaction", column: "amount", precision: 36, scale: 18, nullable: false, default: null },
  { table: "transaction", column: "fee", precision: 36, scale: 18, nullable: true, default: "0" },

  { table: "wallet_data", column: "balance", precision: 36, scale: 18, nullable: false, default: "0" },

  { table: "currency", column: "precision", precision: 30, scale: 15, nullable: false, default: null },
  { table: "currency", column: "price", precision: 30, scale: 15, nullable: true, default: null },

  { table: "admin_profit", column: "amount", precision: 36, scale: 18, nullable: false, default: null },

  { table: "staking_positions", column: "amount", precision: 36, scale: 18, nullable: false, default: null },
  { table: "staking_positions", column: "apr", precision: 16, scale: 8, nullable: true, default: null },
  { table: "staking_positions", column: "adminFeePercentage", precision: 16, scale: 8, nullable: true, default: null },

  { table: "staking_pools", column: "apr", precision: 10, scale: 8, nullable: false, default: null },
  { table: "staking_pools", column: "minStake", precision: 36, scale: 18, nullable: false, default: null },
  { table: "staking_pools", column: "maxStake", precision: 36, scale: 18, nullable: true, default: null },
  { table: "staking_pools", column: "availableToStake", precision: 36, scale: 18, nullable: false, default: "0" },
  { table: "staking_pools", column: "earlyWithdrawalFee", precision: 10, scale: 8, nullable: false, default: "0" },
  { table: "staking_pools", column: "adminFeePercentage", precision: 10, scale: 8, nullable: false, default: "0" },
];

const bt = (id) => "`" + String(id).replace(/`/g, "``") + "`";

/** Return the row from INFORMATION_SCHEMA.COLUMNS, or null if the column is absent. */
async function describeColumn(table, column) {
  const [rows] = await sequelize.query(
    `SELECT COLUMN_TYPE, DATA_TYPE, IS_NULLABLE, NUMERIC_PRECISION, NUMERIC_SCALE
       FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
    { replacements: [DB_NAME, table, column] }
  );
  return rows[0] || null;
}

function isAlreadyTarget(info, precision, scale) {
  return (
    info &&
    String(info.DATA_TYPE).toLowerCase() === "decimal" &&
    Number(info.NUMERIC_PRECISION) === precision &&
    Number(info.NUMERIC_SCALE) === scale
  );
}

/**
 * Pre-flight: would any existing value lose integer digits when stored as
 * DECIMAL(precision,scale)? The integer-digit budget is (precision - scale).
 * Returns { ok, maxIntDigits, sampleMax } so we can refuse a lossy conversion.
 */
async function checkOverflow(table, column, precision, scale) {
  const intBudget = precision - scale;
  // ABS so negatives count their magnitude; CHAR_LENGTH of the floored integer part.
  const [rows] = await sequelize.query(
    `SELECT
        MAX(LENGTH(CAST(FLOOR(ABS(${bt(column)})) AS UNSIGNED))) AS maxIntDigits,
        MAX(ABS(${bt(column)})) AS sampleMax
       FROM ${bt(table)}
      WHERE ${bt(column)} IS NOT NULL`
  );
  const maxIntDigits = rows[0]?.maxIntDigits != null ? Number(rows[0].maxIntDigits) : 0;
  const sampleMax = rows[0]?.sampleMax ?? null;
  return { ok: maxIntDigits <= intBudget, maxIntDigits, intBudget, sampleMax };
}

function buildAlterSql(c) {
  const type = `DECIMAL(${c.precision},${c.scale})`;
  const nullClause = c.nullable ? "NULL" : "NOT NULL";
  const defaultClause = c.default != null ? ` DEFAULT ${c.default}` : "";
  return `ALTER TABLE ${bt(c.table)} CHANGE COLUMN ${bt(c.column)} ${bt(c.column)} ${type} ${nullClause}${defaultClause}`;
}

async function main() {
  console.log("=".repeat(72));
  console.log(`Money Columns DOUBLE/FLOAT -> DECIMAL migration  (${APPLY ? "APPLY" : "DRY-RUN"})`);
  console.log(`Database: ${DB_NAME}`);
  console.log("=".repeat(72) + "\n");

  await sequelize.authenticate();

  let toConvert = 0;
  let alreadyDone = 0;
  let missing = 0;
  let blocked = 0;
  let converted = 0;

  for (const c of COLUMNS) {
    const label = `${c.table}.${c.column}`;
    const target = `DECIMAL(${c.precision},${c.scale})`;
    const info = await describeColumn(c.table, c.column);

    if (!info) {
      missing++;
      console.log(`[SKIP]    ${label} -> column not found (table/column absent). Skipping.`);
      continue;
    }

    if (isAlreadyTarget(info, c.precision, c.scale)) {
      alreadyDone++;
      console.log(`[OK]      ${label} is already ${target}. No change.`);
      continue;
    }

    // Pre-flight precision-loss scan before we touch anything.
    let overflow;
    try {
      overflow = await checkOverflow(c.table, c.column, c.precision, c.scale);
    } catch (e) {
      blocked++;
      console.log(`[BLOCK]   ${label} overflow pre-flight failed: ${e.message}. Skipping for safety.`);
      continue;
    }

    if (!overflow.ok) {
      blocked++;
      console.log(
        `[BLOCK]   ${label} current=${info.COLUMN_TYPE} -> ${target}: ` +
          `data needs ${overflow.maxIntDigits} integer digits but target allows only ${overflow.intBudget} ` +
          `(max value ~${overflow.sampleMax}). Conversion WOULD LOSE DATA — skipped. ` +
          `Widen the target precision before migrating.`
      );
      continue;
    }

    toConvert++;
    const sql = buildAlterSql(c);
    console.log(`[CONVERT] ${label} current=${info.COLUMN_TYPE} -> ${target} (max int digits in data: ${overflow.maxIntDigits}/${overflow.intBudget})`);
    console.log(`          ${sql};`);

    if (APPLY) {
      await sequelize.query(sql);
      converted++;
      console.log(`          [APPLIED]`);
    }
    console.log("");
  }

  console.log("=".repeat(72));
  console.log(`Columns inspected:      ${COLUMNS.length}`);
  console.log(`Already DECIMAL target: ${alreadyDone}`);
  console.log(`Pending conversion:     ${toConvert}`);
  console.log(`Blocked (would lose data): ${blocked}`);
  console.log(`Not found (skipped):    ${missing}`);
  if (APPLY) {
    console.log(`Converted this run:     ${converted}`);
  } else {
    console.log(`DRY-RUN — no schema changed. Re-run with --apply to convert.`);
  }
  console.log("=".repeat(72));
  if (APPLY && converted > 0) {
    console.log("\nIMPORTANT: restart the backend so cached model metadata is refreshed.\n");
  }
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
