/**
 * Backfill `binary_ai_engine_position.platformProfit` for already-settled rows.
 *
 * WHY
 * ---
 * The Binary AI Engine's A/B, cohort and time-of-day reports used to PROJECT
 * platform profit as `stake x binary_ai_engine.payoutMultiplier`. That column
 * never governed a payout — what a winner is paid comes from the binary
 * settings' per-type `profitPercentage`, stamped on each `binary_order` at
 * placement — so the reports priced every win at one guessed rate while the
 * money moved at another.
 *
 * They now sum the realised `platformProfit` that
 * BinaryAiEngine.reconcileSettlement writes on each position. That column was
 * added later than the addon itself, so positions settled before it landed still
 * carry the `0` default. Without this backfill those rows report as break-even
 * and every historical cohort/time report reads as zero profit.
 *
 * WHAT IT WRITES
 * --------------
 * Exactly the formula reconcileSettlement uses, joined to the owning order:
 *
 *   WIN   -> -order.profit                    (house paid the winnings out)
 *   LOSS  -> order.profit = 0 ? order.amount  (total loss: house keeps the stake)
 *                            : -order.profit  (partial loss, e.g. TURBO)
 *   DRAW  -> 0                                (stake returned)
 *
 * Only rows with `outcome IN ('WIN','LOSS')` AND `platformProfit = 0` are
 * touched, so a row already reconciled correctly is never rewritten and a second
 * run is a no-op. A genuinely zero-profit WIN/LOSS row cannot exist: a WIN always
 * paid something out and a LOSS always kept something.
 *
 * DRY-RUN by default (reports what it WOULD write). Pass --apply to write.
 *   Report:  node scripts/backfill-binary-position-profit.mjs
 *   Apply:   node scripts/backfill-binary-position-profit.mjs --apply
 */

import { config } from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { Sequelize } from "sequelize";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
config({ path: path.join(__dirname, "../../.env") });

const APPLY = process.argv.includes("--apply");

const POSITION_TABLE = "binary_ai_engine_position";
const ORDER_TABLE = "binary_order";

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

async function tableExists(name) {
  const [rows] = await sequelize.query(
    `SELECT COUNT(*) AS n FROM INFORMATION_SCHEMA.TABLES
     WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?`,
    { replacements: [DB_NAME, name] }
  );
  return Number(rows[0]?.n || 0) > 0;
}

async function columnExists(table, column) {
  const [rows] = await sequelize.query(
    `SELECT COUNT(*) AS n FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
    { replacements: [DB_NAME, table, column] }
  );
  return Number(rows[0]?.n || 0) > 0;
}

async function main() {
  console.log("=".repeat(72));
  console.log(
    `Backfill ${POSITION_TABLE}.platformProfit  (${APPLY ? "APPLY" : "DRY-RUN"})`
  );
  console.log("=".repeat(72) + "\n");

  await sequelize.authenticate();
  console.log("DB connection established.\n");

  // The addon may never have been installed on this deployment.
  for (const table of [POSITION_TABLE, ORDER_TABLE]) {
    if (!(await tableExists(table))) {
      console.log(`Table \`${table}\` does not exist — the Binary AI Engine is not`);
      console.log("installed here. Nothing to do.\n");
      console.log("=".repeat(72));
      console.log("Done (no-op).");
      console.log("=".repeat(72));
      return;
    }
  }

  if (!(await columnExists(POSITION_TABLE, "platformProfit"))) {
    console.log(
      `Column \`${POSITION_TABLE}.platformProfit\` does not exist yet — start the`
    );
    console.log("backend once so sync({alter:true}) adds it, then re-run.\n");
    console.log("=".repeat(72));
    console.log("Done (no-op).");
    console.log("=".repeat(72));
    return;
  }

  // Candidate rows: settled with a real outcome, still carrying the 0 default,
  // and joinable to the order that holds the realised profit.
  const [summary] = await sequelize.query(
    `SELECT p.outcome AS outcome, COUNT(*) AS n
       FROM ${POSITION_TABLE} p
       JOIN ${ORDER_TABLE} o ON o.id = p.binaryOrderId
      WHERE p.outcome IN ('WIN', 'LOSS')
        AND p.platformProfit = 0
      GROUP BY p.outcome`
  );

  const total = summary.reduce((sum, r) => sum + Number(r.n || 0), 0);

  if (total === 0) {
    console.log("No settled positions are missing a realised platformProfit.");
    console.log("Already backfilled, or nothing has settled yet.\n");
    console.log("=".repeat(72));
    console.log("Done (no-op).");
    console.log("=".repeat(72));
    return;
  }

  console.log(`${total} settled position(s) need a realised platformProfit:`);
  for (const row of summary) {
    console.log(`  - ${row.outcome}: ${row.n}`);
  }

  // Report the aggregate the platform's reports will gain, so the operator can
  // sanity-check the sign before writing anything.
  const [preview] = await sequelize.query(
    `SELECT SUM(
              CASE
                WHEN p.outcome = 'WIN'  THEN -o.profit
                WHEN p.outcome = 'LOSS' THEN CASE WHEN o.profit = 0 THEN o.amount ELSE -o.profit END
                ELSE 0
              END
            ) AS delta
       FROM ${POSITION_TABLE} p
       JOIN ${ORDER_TABLE} o ON o.id = p.binaryOrderId
      WHERE p.outcome IN ('WIN', 'LOSS')
        AND p.platformProfit = 0`
  );
  console.log(
    `\nTotal realised platform profit to be recorded: ${Number(preview[0]?.delta || 0)}`
  );

  if (!APPLY) {
    console.log("\nDRY-RUN — no changes made. Re-run with --apply to write.");
    console.log("\n" + "=".repeat(72));
    console.log("Done (dry-run).");
    console.log("=".repeat(72));
    return;
  }

  // Single set-based UPDATE ... JOIN: the formula is pure SQL, so there is no
  // reason to stream millions of rows through Node.
  const [, meta] = await sequelize.query(
    `UPDATE ${POSITION_TABLE} p
       JOIN ${ORDER_TABLE} o ON o.id = p.binaryOrderId
        SET p.platformProfit = CASE
              WHEN p.outcome = 'WIN'  THEN -o.profit
              WHEN p.outcome = 'LOSS' THEN CASE WHEN o.profit = 0 THEN o.amount ELSE -o.profit END
              ELSE 0
            END
      WHERE p.outcome IN ('WIN', 'LOSS')
        AND p.platformProfit = 0`
  );

  console.log("\n" + "=".repeat(72));
  console.log(`Done. Updated ${meta?.affectedRows ?? total} position(s).`);
  console.log("=".repeat(72));
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
