/**
 * P2P escrow doctor — triage for trades that cannot settle.
 *
 * ---------------------------------------------------------------------------
 * WHAT THIS IS FOR
 * ---------------------------------------------------------------------------
 * `settleTradeEscrow` refuses to settle a trade whose seller wallet it cannot
 * find, and the timeout cron retries every sixty seconds for ever. On installs
 * that predate the escrow authority the P2P holds were taken WITHOUT writing
 * wallet rows, and a `p2p:reconcile --apply` then stamped `escrowStatus='HELD'`
 * on every in-flight trade from its status alone — so the platform believed it
 * was holding money that had never been taken.
 *
 * The result is a population of trades that claim a hold, have none, never
 * expire, block their offer's capacity and log an error a minute each.
 *
 * ---------------------------------------------------------------------------
 * WHAT IT WILL AND WILL NOT DO
 * ---------------------------------------------------------------------------
 * It MOVES NO MONEY and touches no wallet column, ever, in either mode.
 * `SUM(wallet.inOrder)` is identical before and after. The only thing `--apply`
 * changes is a trade's own claim about itself, and only where that claim is
 * provably false.
 *
 * The classification is the point. Three of the four buckets look identical
 * from the error log and only one of them is safe to clear:
 *
 *   A  no wallet, and nothing held in ANY wallet of that currency
 *      -> the hold is a fiction. Safe to settle to zero.
 *   B  the wallet exists but is SOFT-DELETED
 *      -> the funds are real and recoverable. Settling would forfeit them.
 *         Prints the UPDATE that restores it. NEVER auto-settled.
 *   C  no wallet of the expected type, but the seller holds this currency
 *      under a DIFFERENT type
 *      -> the funds are real and mis-typed. Settling would strand them with no
 *         trade left able to release them. NEVER auto-settled.
 *   D  wallet present and holding
 *      -> healthy; not part of this incident.
 *
 * Bucket A is settled through `settleTradeEscrow`, never by raw SQL: a direct
 * UPDATE would skip the offer's escrow drawdown and the capacity restore, and
 * leave offers advertising liquidity that was never released — the same defect
 * in a different column.
 *
 *   Report:  pnpm p2p:doctor
 *   Apply:   pnpm p2p:doctor --apply        (bucket A only)
 *
 * Take a backup first. There is no undo.
 */

import { models, sequelize } from "@b/db";
import { QueryTypes } from "sequelize";
import { settleTradeEscrow } from "@b/api/(ext)/p2p/utils/escrow";

const APPLY = process.argv.includes("--apply");

type Row = {
  id: string;
  status: string;
  sellerId: string;
  currency: string;
  escrowAmount: string | number | null;
  walletType: string | null;
  offerCurrency: string | null;
  walletId: string | null;
  inOrder: string | number | null;
  deletedWalletId: string | null;
  otherType: string | null;
  otherHeld: string | number | null;
};

function n(v: unknown): number {
  return Number(v ?? 0) || 0;
}

async function main() {
  console.log(`\nP2P ESCROW DOCTOR  —  ${APPLY ? "APPLY (bucket A only)" : "REPORT ONLY"}`);
  console.log("=".repeat(72));

  /**
   * One pass, four joins, so a trade is classified from a single consistent
   * read rather than a query per bucket.
   *
   * `w` is the wallet settlement will look for. `wd` is the same tuple ignoring
   * `deletedAt` — `wallet` is paranoid and the unique key has no `deletedAt`
   * column, so a soft-deleted row is both invisible AND unreplaceable. `wo` is
   * any OTHER type of wallet in the same currency that is actually holding
   * something, which is the mis-typed case.
   */
  const rows: Row[] = await sequelize.query(
    `SELECT t.id, t.status, t.sellerId, t.currency, t.escrowAmount,
            o.walletType             AS walletType,
            o.currency               AS offerCurrency,
            w.id                     AS walletId,
            w.inOrder                AS inOrder,
            wd.id                    AS deletedWalletId,
            wo.type                  AS otherType,
            wo.inOrder               AS otherHeld
       FROM p2p_trades t
       LEFT JOIN p2p_offers o ON o.id = t.offerId
       LEFT JOIN wallet w
              ON w.userId = t.sellerId
             AND w.currency COLLATE utf8mb4_unicode_ci = COALESCE(o.currency, t.currency) COLLATE utf8mb4_unicode_ci
             AND w.type COLLATE utf8mb4_unicode_ci = o.walletType COLLATE utf8mb4_unicode_ci
             AND w.deletedAt IS NULL
       LEFT JOIN wallet wd
              ON wd.userId = t.sellerId
             AND wd.currency COLLATE utf8mb4_unicode_ci = COALESCE(o.currency, t.currency) COLLATE utf8mb4_unicode_ci
             AND wd.type COLLATE utf8mb4_unicode_ci = o.walletType COLLATE utf8mb4_unicode_ci
             AND wd.deletedAt IS NOT NULL
       LEFT JOIN wallet wo
              ON wo.userId = t.sellerId
             AND wo.currency COLLATE utf8mb4_unicode_ci = COALESCE(o.currency, t.currency) COLLATE utf8mb4_unicode_ci
             AND wo.type COLLATE utf8mb4_unicode_ci <> o.walletType COLLATE utf8mb4_unicode_ci
             AND wo.deletedAt IS NULL
             AND wo.inOrder > 0
      WHERE t.deletedAt IS NULL
        AND t.escrowStatus = 'HELD'`,
    { type: QueryTypes.SELECT }
  );

  const before = n(
    (
      await sequelize.query<{ total: string }>(
        `SELECT COALESCE(SUM(inOrder), 0) AS total FROM wallet`,
        { type: QueryTypes.SELECT }
      )
    )[0]?.total
  );

  const A: Row[] = [];
  const B: Row[] = [];
  const C: Row[] = [];
  let D = 0;

  for (const r of rows) {
    if (r.walletId && n(r.inOrder) > 0) {
      D++;
    } else if (r.deletedWalletId) {
      B.push(r);
    } else if (r.otherType) {
      C.push(r);
    } else {
      // Covers both "no wallet row" and "wallet exists holding nothing"; in
      // either case no escrow exists for this trade to release.
      A.push(r);
    }
  }

  console.log(`\nHELD trades examined : ${rows.length}`);
  console.log(`  D healthy                            : ${D}`);
  console.log(`  A phantom hold (safe to clear)       : ${A.length}`);
  console.log(`  B soft-deleted wallet (DO NOT CLEAR) : ${B.length}`);
  console.log(`  C held under another type (DO NOT)   : ${C.length}`);
  console.log(`\nSUM(wallet.inOrder) before: ${before}`);

  if (B.length) {
    console.log(`\n--- B: funds are REAL and recoverable. Restore the wallet, then let the cron settle.`);
    for (const r of B) {
      console.log(
        `  trade ${r.id}  ${r.currency} ${r.walletType}  ` +
          `UPDATE wallet SET deletedAt = NULL WHERE id = '${r.deletedWalletId}';`
      );
    }
  }

  if (C.length) {
    console.log(`\n--- C: funds are REAL but held under a different wallet type. Adjudicate by hand.`);
    for (const r of C) {
      console.log(
        `  trade ${r.id}  expects ${r.currency} ${r.walletType}  ` +
          `but seller holds ${n(r.otherHeld)} in a ${r.otherType} wallet`
      );
    }
  }

  if (!A.length) {
    console.log("\nNothing to clear.\n");
    return;
  }

  console.log(`\n--- A: ${A.length} trade(s) claim a hold that does not exist.`);
  for (const r of A) {
    console.log(
      `  ${APPLY ? "settling" : "would settle"} ${r.id}  ${r.status}  ` +
        `${r.currency} ${r.walletType ?? "?"}  claimed=${n(r.escrowAmount)}`
    );
  }

  if (!APPLY) {
    console.log("\nDry run — nothing written. Re-run with --apply to clear bucket A.\n");
    return;
  }

  let settled = 0;
  let failed = 0;
  for (const r of A) {
    const transaction = await sequelize.transaction();
    try {
      // Through the authority, so the offer's attributed escrow is drawn down
      // and its capacity restored. A raw UPDATE would skip both.
      await settleTradeEscrow({
        tradeId: r.id,
        transaction,
        outcome: "RETURN_TO_OFFER",
      } as any);
      await transaction.commit();
      settled++;
    } catch (error: any) {
      await transaction.rollback();
      failed++;
      console.log(`  ! ${r.id}: ${error?.message ?? error}`);
    }
  }

  const after = n(
    (
      await sequelize.query<{ total: string }>(
        `SELECT COALESCE(SUM(inOrder), 0) AS total FROM wallet`,
        { type: QueryTypes.SELECT }
      )
    )[0]?.total
  );

  console.log(`\nsettled: ${settled}   failed: ${failed}`);
  console.log(`SUM(wallet.inOrder) after : ${after}`);
  console.log(
    before === after
      ? "CONSERVATION OK — no wallet balance moved."
      : `!! CONSERVATION VIOLATED — inOrder moved by ${after - before}. INVESTIGATE.`
  );
  console.log("");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
