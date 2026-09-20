/**
 * P2P data migration + escrow reconciliation.
 *
 *   cd backend
 *   tsx scripts/p2p-escrow-reconcile.ts            # report only (default)
 *   tsx scripts/p2p-escrow-reconcile.ts --apply    # write the safe fixes
 *
 * WHAT --apply CHANGES
 * --------------------
 *   1. Normalises double-encoded JSON columns on `p2p_offers`. The model setters used to
 *      JSON.stringify into a DataTypes.JSON column, so MySQL stored a JSON *string*
 *      containing JSON. ORM reads survived (the getter unwraps one level) but every
 *      SQL-level JSON_EXTRACT/filter silently matched nothing. The setters are fixed;
 *      this repairs the rows written before that.
 *   2. Backfills `p2pOffer.escrowAmount` and `p2pTrade.escrowAmount`/`escrowStatus` so the
 *      new escrow authority has attribution to work from.
 *
 * WHAT IT DELIBERATELY DOES *NOT* DO
 * ----------------------------------
 * It never moves money — not even to return escrow it believes is stranded.
 *
 * `wallet.inOrder` is a single shared number with no per-feature attribution: exchange
 * orders, futures, staking, copy trading and P2P all add to and subtract from it. On this
 * database the P2P escrow holds were taken WITHOUT writing wallet transaction rows
 * (`SELECT type, COUNT(*) FROM transaction WHERE type LIKE '%P2P%'` returns a single row),
 * so there is no ledger from which a given held balance can be attributed to P2P.
 *
 * A surplus of `inOrder` over what P2P expects is therefore NOT proof of stranded P2P
 * escrow — it is equally consistent with an open exchange order. Releasing it would
 * unlock funds backing something else. The surplus is reported for a human to adjudicate;
 * fixing it is a deliberate operational decision, not a migration step.
 */

import { models, sequelize } from "@b/db";
import { QueryTypes } from "sequelize";

const APPLY = process.argv.includes("--apply");

/** Statuses in which a SELL offer is expected to be holding collateral. */
const OFFER_HOLDS_ESCROW = ["ACTIVE", "PAUSED", "PENDING_APPROVAL", "DRAFT"];
/** Trade statuses whose escrow has not yet been settled. */
const TRADE_IN_FLIGHT = ["PENDING", "PAYMENT_SENT", "DISPUTED"];

const JSON_COLUMNS = [
  "amountConfig",
  "priceConfig",
  "tradeSettings",
  "locationSettings",
  "userRequirements",
  "systemTags",
  "activityLog",
];

function log(section: string, msg: string) {
  console.log(`[${section}] ${msg}`);
}

async function normaliseJsonColumns() {
  console.log("\n=== 1. Double-encoded JSON columns on p2p_offers ===");
  let fixed = 0;
  let clean = 0;

  for (const col of JSON_COLUMNS) {
    const rows: any[] = await sequelize.query(
      `SELECT id, JSON_TYPE(\`${col}\`) AS jtype, \`${col}\` AS raw
         FROM p2p_offers
        WHERE \`${col}\` IS NOT NULL`,
      { type: QueryTypes.SELECT }
    );

    for (const row of rows) {
      if (row.jtype !== "STRING") {
        clean++;
        continue;
      }
      // The column holds a JSON string whose content is itself JSON.
      let inner: any;
      try {
        const once = typeof row.raw === "string" ? JSON.parse(row.raw) : row.raw;
        inner = typeof once === "string" ? JSON.parse(once) : once;
      } catch {
        log("JSON", `offer ${row.id}.${col}: unparseable, left untouched`);
        continue;
      }
      log(
        "JSON",
        `offer ${String(row.id).slice(0, 8)}.${col}: STRING -> OBJECT ${APPLY ? "(fixing)" : "(dry run)"}`
      );
      if (APPLY) {
        // Plain assignment of a JSON *text* is the portable form:
        //   - MySQL parses the literal into the column's native JSON type.
        //   - MariaDB stores JSON as LONGTEXT with a validity CHECK, and has no
        //     `CAST(expr AS JSON)` at all, so a CAST here is a syntax error.
        await sequelize.query(
          `UPDATE p2p_offers SET \`${col}\` = ? WHERE id = ?`,
          { replacements: [JSON.stringify(inner), row.id] }
        );
      }
      fixed++;
    }
  }
  console.log(`  double-encoded: ${fixed}   already clean: ${clean}`);
  return fixed;
}

function readAmountTotal(raw: any): number {
  let cfg: any = raw;
  try {
    if (typeof cfg === "string") cfg = JSON.parse(cfg);
    if (typeof cfg === "string") cfg = JSON.parse(cfg);
  } catch {
    return 0;
  }
  const t = Number(cfg?.total);
  return Number.isFinite(t) ? t : 0;
}

async function backfillOfferEscrow() {
  console.log("\n=== 2. Backfill p2pOffer.escrowAmount ===");
  const offers: any[] = await sequelize.query(
    `SELECT id, userId, type, currency, walletType, status, amountConfig, escrowAmount
       FROM p2p_offers WHERE deletedAt IS NULL`,
    { type: QueryTypes.SELECT }
  );

  let set = 0;
  let zeroed = 0;
  for (const o of offers) {
    // Only SELL offers escrow at the offer level; BUY offers escrow per trade.
    const shouldHold = o.type === "SELL" && OFFER_HOLDS_ESCROW.includes(o.status);
    const target = shouldHold ? readAmountTotal(o.amountConfig) : 0;
    const current = Number(o.escrowAmount ?? 0);
    if (Math.abs(current - target) < 1e-12) continue;

    log(
      "OFFER",
      `${String(o.id).slice(0, 8)} ${o.type}/${o.status} ${o.currency}: escrowAmount ${current} -> ${target} ${APPLY ? "" : "(dry run)"}`
    );
    if (APPLY) {
      await sequelize.query(`UPDATE p2p_offers SET escrowAmount = ? WHERE id = ?`, {
        replacements: [target, o.id],
      });
    }
    target > 0 ? set++ : zeroed++;
  }
  console.log(`  offers given escrow attribution: ${set}   zeroed (terminal/BUY): ${zeroed}`);
}

async function backfillTradeEscrow() {
  console.log("\n=== 3. Backfill p2pTrade escrowAmount / escrowStatus ===");
  /**
   * `sellerHeld` is why this query joins the wallet.
   *
   * This phase used to derive `escrowStatus` from `t.status` ALONE. On an
   * install that predates the escrow authority the P2P holds were taken without
   * writing wallet rows at all, so a single --apply stamped HELD on every
   * in-flight trade and told the platform it was holding money that had never
   * been taken. Those trades then failed to settle for ever, because settlement
   * looks for a hold that does not exist — which is precisely the ~100-row,
   * all-currencies incident this script was run to clean up and instead caused.
   *
   * A claim of HELD is now only written where a wallet actually holds something.
   */
  const trades: any[] = await sequelize.query(
    `SELECT t.id, t.status, t.amount, t.currency, t.escrowAmount, t.escrowStatus,
            o.type AS offerType, o.walletType AS walletType,
            w.id AS sellerWalletId, w.inOrder AS sellerHeld
       FROM p2p_trades t
       LEFT JOIN p2p_offers o ON o.id = t.offerId
       LEFT JOIN wallet w
              ON w.userId = t.sellerId
             AND w.currency COLLATE utf8mb4_unicode_ci = COALESCE(o.currency, t.currency) COLLATE utf8mb4_unicode_ci
             AND w.type COLLATE utf8mb4_unicode_ci = o.walletType COLLATE utf8mb4_unicode_ci
             AND w.deletedAt IS NULL
      WHERE t.deletedAt IS NULL`,
    { type: QueryTypes.SELECT }
  );

  let held = 0;
  let released = 0;
  let refunded = 0;
  let uncollateralised = 0;
  for (const t of trades) {
    let status: string;
    if (TRADE_IN_FLIGHT.includes(t.status)) status = "HELD";
    else if (t.status === "COMPLETED") status = "RELEASED";
    else status = "REFUNDED"; // CANCELLED / EXPIRED

    /**
     * Refuse to manufacture a hold.
     *
     * Only the HELD branch asserts that money is presently locked, so it is the
     * only one that has to be true. If the seller has no wallet for this
     * currency and type, or that wallet holds nothing, the trade is
     * under-collateralised: report it and leave the row exactly as found. An
     * operator settles it deliberately; this script must not decide for them.
     */
    if (status === "HELD" && !(Number(t.sellerHeld ?? 0) > 0)) {
      uncollateralised++;
      log(
        "TRADE",
        `${String(t.id).slice(0, 8)} ${t.status}: SKIPPED — seller holds nothing ` +
          `in ${t.currency} ${t.walletType ?? "?"}` +
          `${t.sellerWalletId ? "" : " (no wallet row)"}; not stamping HELD`
      );
      continue;
    }

    const amount = status === "HELD" ? Number(t.amount) || 0 : 0;
    if (t.escrowStatus === status && Number(t.escrowAmount ?? 0) === amount) continue;

    log(
      "TRADE",
      `${String(t.id).slice(0, 8)} ${t.status}: escrowStatus ${t.escrowStatus} -> ${status}, amount -> ${amount} ${APPLY ? "" : "(dry run)"}`
    );
    if (APPLY) {
      await sequelize.query(
        `UPDATE p2p_trades SET escrowStatus = ?, escrowAmount = ? WHERE id = ?`,
        { replacements: [status, amount, t.id] }
      );
    }
    if (status === "HELD") held++;
    else if (status === "RELEASED") released++;
    else refunded++;
  }
  console.log(`  HELD: ${held}   RELEASED: ${released}   REFUNDED: ${refunded}`);
  if (uncollateralised > 0) {
    console.log(
      `  SKIPPED (under-collateralised, left untouched): ${uncollateralised} — ` +
        `these trades claim no hold because none exists. Settle them deliberately; ` +
        `stamping HELD here is what strands them.`
    );
  }
}

async function reportEscrowDiscrepancies() {
  console.log("\n=== 4. Escrow reconciliation (REPORT ONLY — never moves money) ===");

  const expectedRows: any[] = await sequelize.query(
    `SELECT userId, currency, walletType, SUM(amt) AS expected FROM (
        SELECT o.userId, o.currency, o.walletType, o.escrowAmount AS amt
          FROM p2p_offers o
         WHERE o.deletedAt IS NULL AND o.type = 'SELL' AND o.escrowAmount > 0
        UNION ALL
        SELECT t.sellerId AS userId, o.currency, o.walletType, t.escrowAmount AS amt
          FROM p2p_trades t JOIN p2p_offers o ON o.id = t.offerId
         WHERE t.deletedAt IS NULL AND o.type = 'BUY' AND t.escrowStatus = 'HELD'
     ) x GROUP BY userId, currency, walletType`,
    { type: QueryTypes.SELECT }
  );

  const wallets: any[] = await sequelize.query(
    `SELECT userId, currency, type AS walletType, inOrder FROM wallet WHERE inOrder > 0`,
    { type: QueryTypes.SELECT }
  );

  const expected = new Map<string, number>();
  expectedRows.forEach((r) =>
    expected.set(`${r.userId}|${r.currency}|${r.walletType}`, Number(r.expected) || 0)
  );

  let discrepancies = 0;
  for (const w of wallets) {
    const key = `${w.userId}|${w.currency}|${w.walletType}`;
    const exp = expected.get(key) ?? 0;
    const held = Number(w.inOrder) || 0;
    const diff = held - exp;
    if (Math.abs(diff) < 1e-9) continue;
    discrepancies++;
    console.log(
      `  ${w.userId.slice(0, 8)} ${w.currency}/${w.walletType}: inOrder=${held} p2pExpected=${exp} diff=${diff > 0 ? "+" : ""}${diff.toFixed(8)}`
    );
  }
  // Anything expected but with no wallet row at all.
  for (const [key, exp] of expected) {
    if (exp <= 0) continue;
    const [userId, currency, walletType] = key.split("|");
    if (!wallets.some((w) => `${w.userId}|${w.currency}|${w.type ?? w.walletType}` === key)) {
      const match = wallets.find(
        (w) => w.userId === userId && w.currency === currency && w.walletType === walletType
      );
      if (!match) {
        discrepancies++;
        console.log(
          `  ${userId.slice(0, 8)} ${currency}/${walletType}: p2pExpected=${exp} but wallet holds NOTHING (under-collateralised)`
        );
      }
    }
  }

  console.log(`\n  ${discrepancies} wallet(s) where inOrder != P2P expectation.`);
  console.log(
    "  A POSITIVE diff is NOT proof of stranded P2P escrow: inOrder is shared with exchange\n" +
      "  orders, futures, staking and copy trading, and the historical P2P holds wrote no\n" +
      "  transaction rows, so nothing attributes a held balance to P2P. Review each case by hand\n" +
      "  against that user's open orders before releasing anything. This script will not do it."
  );
}

(async () => {
  console.log("=".repeat(78));
  console.log(`P2P ESCROW RECONCILE  —  ${APPLY ? "APPLY (will write)" : "DRY RUN (no writes)"}`);
  console.log("=".repeat(78));

  await normaliseJsonColumns();
  await backfillOfferEscrow();
  await backfillTradeEscrow();
  await reportEscrowDiscrepancies();

  console.log("\n" + "=".repeat(78));
  console.log(APPLY ? "Applied." : "Dry run complete. Re-run with --apply to write.");
  console.log("=".repeat(78));
  await sequelize.close();
  process.exit(0);
})().catch((e) => {
  console.error("RECONCILE FAILED:", e);
  process.exit(1);
});
