/**
 * Affiliate Condition Reward-Currency Retarget
 *
 * WHY THIS EXISTS
 * ---------------
 * `seeders/20240402234806-rewardConditions.js` seeded every referral condition
 * with `rewardWalletType = 'FIAT'` and `rewardCurrency = 'USD'`, on a platform
 * whose activity is denominated in USDT (every market is quoted in USDT;
 * deposits and fills land in SPOT/ECO USDT wallets). Two consequences:
 *
 *   1. The evaluator only counted volume already denominated in the reward
 *      currency, so a USD condition summed USD activity — of which there is
 *      none — and paid nobody. The cron said so once per condition per window,
 *      which is how the log ended up with 70 identical warnings an hour.
 *   2. Even once it paid, the reward landed in a FIAT USD wallet most installs
 *      give the user no way to withdraw from.
 *
 * Conversion in `backend/src/api/(ext)/admin/affiliate/utils/cron.ts` fixes (1)
 * without any data change: a USD condition now qualifies on USDT volume,
 * converted at the platform's own rates. This script is for (2) — it retargets
 * conditions that are still sitting on the seeded FIAT/USD default so the
 * commission is paid in a currency the referrer can actually use.
 *
 * That is an ECONOMICS decision, not a bug fix, which is why it is a script an
 * operator runs deliberately rather than something the app does on boot.
 *
 * WHAT IT TOUCHES
 * ---------------
 * ONLY rows that still match the seeded default exactly
 * (`rewardWalletType = 'FIAT' AND rewardCurrency = 'USD'`). A condition an
 * operator has already edited is left alone — if someone deliberately chose
 * FIAT/EUR, or FIAT/USD on an install that really does run a fiat gateway, this
 * script must not overrule them. Use --force to include rows already retargeted
 * to some other wallet type (it still only matches the currency filter).
 *
 * It does NOT touch existing `mlm_referral_reward` rows: an unclaimed reward
 * carries an amount, and the currency it is claimed in is read from the
 * condition at claim time. Changing the condition therefore re-denominates
 * PENDING rewards — reward 20 stops meaning "20 USD" and starts meaning
 * "20 USDT". Those two are within a fraction of a percent of each other, which
 * is why this is safe for USD -> USDT specifically; the pre-flight report below
 * prints the unclaimed exposure so the decision is made with the number in view.
 *
 * DRY-RUN by default. Pass --apply to write.
 *   Report: node scripts/affiliate-condition-currency.mjs
 *   Apply:  node scripts/affiliate-condition-currency.mjs --apply
 *   Other target:
 *           node scripts/affiliate-condition-currency.mjs --currency=USDT --wallet-type=ECO --apply
 *
 * Idempotent: once retargeted, the source filter no longer matches.
 */

import { config } from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { Sequelize, QueryTypes } from "sequelize";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
config({ path: path.join(__dirname, "../../.env") });

const APPLY = process.argv.includes("--apply");
const FORCE = process.argv.includes("--force");

function arg(name, fallback) {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3).trim() : fallback;
}

const FROM_CURRENCY = arg("from-currency", "USD").toUpperCase();
const FROM_WALLET_TYPE = arg("from-wallet-type", "FIAT").toUpperCase();
const TO_CURRENCY = arg("currency", "USDT").toUpperCase();
const TO_WALLET_TYPE = arg("wallet-type", "SPOT").toUpperCase();

const VALID_WALLET_TYPES = new Set([
  "FIAT",
  "SPOT",
  "ECO",
  "FUTURES",
  "COPY_TRADING",
]);

const TABLE = "mlm_referral_condition";

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
  const rows = await sequelize.query(
    `SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?`,
    { replacements: [tableName], type: QueryTypes.SELECT }
  );
  return rows.length > 0;
}

/**
 * Can the platform price the target currency at all?
 *
 * The evaluator converts every wallet currency into the reward currency through
 * USD, so a target with no rate anywhere leaves it with no denominator and the
 * condition stays unpayable — the exact failure this script is meant to end.
 * `exchange_currency.price` is USD PER UNIT; `currency.price` is UNITS PER USD.
 */
async function isPriceable(code) {
  const spot = await sequelize.query(
    `SELECT price FROM exchange_currency WHERE currency = ? AND price > 0 LIMIT 1`,
    { replacements: [code], type: QueryTypes.SELECT }
  );
  if (spot.length > 0) return `exchange_currency (${spot[0].price} USD per unit)`;

  const fiat = await sequelize.query(
    `SELECT price FROM currency WHERE id = ? AND price > 0 LIMIT 1`,
    { replacements: [code], type: QueryTypes.SELECT }
  );
  if (fiat.length > 0) return `currency (${fiat[0].price} units per USD)`;

  return null;
}

async function main() {
  console.log(
    `Affiliate condition retarget: ${FROM_WALLET_TYPE}/${FROM_CURRENCY} -> ${TO_WALLET_TYPE}/${TO_CURRENCY}`
  );
  console.log(APPLY ? "MODE: APPLY" : "MODE: DRY-RUN (pass --apply to write)");

  if (!VALID_WALLET_TYPES.has(TO_WALLET_TYPE)) {
    throw new Error(
      `--wallet-type must be one of ${Array.from(VALID_WALLET_TYPES).join(", ")}`
    );
  }
  if (!(await tableExists(TABLE))) {
    console.log(`Table ${TABLE} does not exist — nothing to do.`);
    return;
  }

  const priced = await isPriceable(TO_CURRENCY);
  if (!priced) {
    // Refusing here is the point: retargeting to a currency the platform cannot
    // price would swap one silent non-payment for another.
    throw new Error(
      `The platform has no rate for ${TO_CURRENCY} (checked exchange_currency and currency). ` +
        `Retargeting to it would leave every condition unpayable. Add a rate first.`
    );
  }
  console.log(`Target ${TO_CURRENCY} is priced via ${priced}.`);

  const where = FORCE
    ? `rewardCurrency = ?`
    : `rewardWalletType = ? AND rewardCurrency = ?`;
  const params = FORCE
    ? [FROM_CURRENCY]
    : [FROM_WALLET_TYPE, FROM_CURRENCY];

  const candidates = await sequelize.query(
    `SELECT id, name, title, status, reward, rewardType, rewardWalletType, rewardCurrency
       FROM ${TABLE} WHERE ${where} ORDER BY status DESC, name`,
    { replacements: params, type: QueryTypes.SELECT }
  );

  if (candidates.length === 0) {
    console.log(
      `No conditions are still on ${FROM_WALLET_TYPE}/${FROM_CURRENCY} — nothing to do.`
    );
    return;
  }

  const active = candidates.filter((c) => Number(c.status) === 1);
  console.log(
    `\n${candidates.length} condition(s) match (${active.length} ACTIVE):`
  );
  for (const c of candidates) {
    const rate =
      c.rewardType === "PERCENTAGE" ? `${c.reward}%` : String(c.reward);
    console.log(
      `  ${Number(c.status) === 1 ? "[ON ]" : "[off]"} ${c.name.padEnd(24)} ${rate.padStart(8)}  ${c.rewardWalletType}/${c.rewardCurrency}`
    );
  }

  // Unclaimed exposure: these reward amounts are re-denominated by the change.
  const exposure = await sequelize.query(
    `SELECT COUNT(*) AS n, COALESCE(SUM(reward), 0) AS total
       FROM mlm_referral_reward
      WHERE isClaimed = 0
        AND deletedAt IS NULL
        AND conditionId IN (${candidates.map(() => "?").join(",")})`,
    {
      replacements: candidates.map((c) => c.id),
      type: QueryTypes.SELECT,
    }
  );
  // mysql2 returns SUM() over a DECIMAL as a STRING.
  const unclaimedCount = Number(exposure[0]?.n ?? 0);
  const unclaimedTotal = Number(exposure[0]?.total ?? 0);
  console.log(
    `\nUnclaimed rewards on these conditions: ${unclaimedCount} row(s), ` +
      `${unclaimedTotal} units. After the change they are claimed as ` +
      `${TO_CURRENCY} instead of ${FROM_CURRENCY}.`
  );

  if (!APPLY) {
    console.log("\nDRY-RUN: no rows were changed. Re-run with --apply to write.");
    return;
  }

  const [, affected] = await sequelize.query(
    `UPDATE ${TABLE}
        SET rewardWalletType = ?, rewardCurrency = ?, updatedAt = NOW()
      WHERE ${where}`,
    { replacements: [TO_WALLET_TYPE, TO_CURRENCY, ...params] }
  );
  console.log(
    `\nUpdated ${affected ?? candidates.length} condition(s) to ${TO_WALLET_TYPE}/${TO_CURRENCY}.`
  );
  console.log(
    "The next MLM cron run evaluates them against the new currency; existing " +
      "reward rows keep their amounts and are claimed in the new currency."
  );
}

main()
  .then(() => sequelize.close())
  .catch(async (error) => {
    console.error(`FAILED: ${error.message}`);
    await sequelize.close();
    process.exit(1);
  });
