/**
 * The escrow-conservation check, run against the database AFTER the write.
 *
 * This is deliberately the SAME question, asked the SAME way, as the final
 * reconciliation in `e2e/p2p/api-suite.mjs`:
 *
 *     inOrder  ==  SUM(JSON_EXTRACT(amountConfig,'$.total')) over the user's
 *                  SELL offers in ACTIVE / PENDING_APPROVAL / PAUSED
 *              +   SUM(escrowAmount) over trades where they are the seller and
 *                  escrowStatus = 'HELD' and the trade is still open
 *
 * Asking it in SQL rather than trusting the plan is the whole value: the plan
 * computes the numbers in JavaScript doubles, and they land in three different
 * numeric regimes — JSON text, a DOUBLE column and a DECIMAL(36,18). If the
 * round trip loses anything, this is where it shows up, before an operator
 * finds out by being refused a trade.
 *
 * A surplus is coins frozen against nothing. A shortfall is an escrow that
 * cannot be paid out, and it surfaces to a user as "Insufficient locked funds
 * for this offer" — a refusal that looks like a P2P defect and is not one.
 */

import { ID_PREFIX } from "./db.mjs";

const TOLERANCE = 1e-8;

export async function auditEscrow(conn) {
  const like = `${ID_PREFIX}%`;

  const [wallets] = await conn.execute(
    `SELECT w.userId, w.currency, w.type, w.balance, w.inOrder,
            CONCAT(u.firstName, ' ', u.lastName) AS name
       FROM wallet w
       JOIN user u ON u.id = w.userId
      WHERE w.userId LIKE ? AND w.deletedAt IS NULL`,
    [like]
  );

  const problems = [];
  let checked = 0;
  let totalHeld = 0;

  for (const wallet of wallets) {
    const [offerRows] = await conn.execute(
      `SELECT COALESCE(SUM(CAST(JSON_EXTRACT(amountConfig,'$.total') AS DECIMAL(36,18))),0) AS held
         FROM p2p_offers
        WHERE userId = ? AND currency = ? AND type = 'SELL'
          AND status IN ('ACTIVE','PENDING_APPROVAL','PAUSED') AND deletedAt IS NULL`,
      [wallet.userId, wallet.currency]
    );
    const [tradeRows] = await conn.execute(
      `SELECT COALESCE(SUM(escrowAmount),0) AS held
         FROM p2p_trades
        WHERE sellerId = ? AND currency = ? AND escrowStatus = 'HELD'
          AND status IN ('PENDING','PAYMENT_SENT','DISPUTED') AND deletedAt IS NULL`,
      [wallet.userId, wallet.currency]
    );

    const fromOffers = Number(offerRows[0].held);
    const fromTrades = Number(tradeRows[0].held);
    const expected = fromOffers + fromTrades;
    const inOrder = Number(wallet.inOrder);
    const balance = Number(wallet.balance);
    checked += 1;
    totalHeld += inOrder;

    if (Math.abs(inOrder - expected) > TOLERANCE) {
      problems.push(
        `${wallet.name} (${wallet.currency}): holds ${inOrder} but open commitments total ` +
          `${expected} — offers ${fromOffers}, live trades ${fromTrades}`
      );
    }
    if (balance < 0 || inOrder < 0) {
      problems.push(`${wallet.name} (${wallet.currency}): negative wallet — ${balance} / ${inOrder}`);
    }
  }

  /*
    An offer holding escrow whose owner has NO WALLET AT ALL would be invisible
    to the loop above, because it iterates wallets. That is the exact shape of
    the bug where a seeder "balances" by simply not funding anybody.

    Compared in JavaScript rather than by a LEFT JOIN on purpose: `wallet.currency`
    is varchar(255) and `p2p_offers.currency` is varchar(50), and on this install
    they carry different collations — joining them raises "Illegal mix of
    collations" and an audit that cannot run is an audit that passes by accident.
  */
  const walletKeys = new Set(wallets.map((w) => `${w.userId}|${w.currency}|${w.type}`));
  const [holdingOffers] = await conn.execute(
    `SELECT id, currency, userId, walletType FROM p2p_offers
      WHERE id LIKE ? AND type = 'SELL'
        AND status IN ('ACTIVE','PENDING_APPROVAL','PAUSED')
        AND deletedAt IS NULL`,
    [like]
  );
  for (const row of holdingOffers) {
    if (walletKeys.has(`${row.userId}|${row.currency}|${row.walletType}`)) continue;
    problems.push(
      `offer ${row.id} holds ${row.currency} escrow but its owner has no ${row.walletType} wallet for it`
    );
  }

  return { ok: problems.length === 0, checked, totalHeld, problems };
}
