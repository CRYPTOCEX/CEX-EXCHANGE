/**
 * Removes everything the demo seeder made, and nothing else.
 *
 * TWO PREDICATES, BOTH NARROW.
 *
 *   * `id LIKE 'de000000-0000-4000-8000-%'` — every row this seeder mints
 *     carries the namespace, so a real row would have to collide on 24 fixed
 *     hex characters to be caught.
 *   * `email LIKE 'p2pdemo-%@localhost.invalid'` — resolved as well as, not
 *     instead of, the id. `email` is the unique key on `user`, so a demo
 *     account seeded under an OLDER id still owns its address; keying teardown
 *     on the current ids alone would leave that row behind, and the next seed's
 *     `INSERT ... ON DUPLICATE KEY UPDATE` would then match on email and update
 *     the stale row — leaving the new id nonexistent and every wallet insert
 *     failing its foreign key. This is the e2e fixture's lesson, borrowed.
 *
 * Children first, in foreign-key order: reviews and disputes reference trades,
 * trades reference offers and users, offers reference payment methods through a
 * join table.
 */

import { EMAIL_DOMAIN, ID_PREFIX, TAG } from "./db.mjs";

const LIKE = `${ID_PREFIX}%`;
const EMAIL_LIKE = `${TAG}-%@${EMAIL_DOMAIN}`;

export async function dropAll(conn, { log = () => {} } = {}) {
  const counts = {};
  const run = async (label, sql, params = []) => {
    const [result] = await conn.execute(sql, params);
    const n = result.affectedRows ?? 0;
    if (n) counts[label] = (counts[label] ?? 0) + n;
    return n;
  };

  const [userRows] = await conn.execute(
    `SELECT id FROM user WHERE id LIKE ? OR email LIKE ?`,
    [LIKE, EMAIL_LIKE]
  );
  const userIds = userRows.map((r) => r.id);

  // Trades are found by their own namespace, which also catches the ones whose
  // BUYER is the operator's real account — the viewer's seeded history. Those
  // rows belong to the demo even though one of their participants does not.
  const [tradeRows] = await conn.execute(`SELECT id FROM p2p_trades WHERE id LIKE ?`, [LIKE]);
  const tradeIds = tradeRows.map((r) => r.id);

  if (tradeIds.length) {
    const ph = tradeIds.map(() => "?").join(",");
    await run("reviews", `DELETE FROM p2p_reviews WHERE tradeId IN (${ph})`, tradeIds);
    await run("disputes", `DELETE FROM p2p_disputes WHERE tradeId IN (${ph})`, tradeIds);
    await run("commissions", `DELETE FROM p2p_commissions WHERE tradeId IN (${ph})`, tradeIds);
  }
  await run("reviews", `DELETE FROM p2p_reviews WHERE id LIKE ?`, [LIKE]);
  await run("disputes", `DELETE FROM p2p_disputes WHERE id LIKE ?`, [LIKE]);
  await run("trades", `DELETE FROM p2p_trades WHERE id LIKE ?`, [LIKE]);

  await run("offer methods", `DELETE FROM p2p_offer_payment_method WHERE offerId LIKE ?`, [LIKE]);
  await run("offer flags", `DELETE FROM p2p_offer_flags WHERE offerId LIKE ?`, [LIKE]);
  await run("offers", `DELETE FROM p2p_offers WHERE id LIKE ?`, [LIKE]);

  /* -------------------------------------------------------------------------
     PAYMENT METHODS CASCADE. Check before deleting.

     Two foreign keys reference `p2p_payment_methods` with ON DELETE CASCADE:

         p2p_trades.paymentMethod              -> CASCADE
         p2p_offer_payment_method.paymentMethodId -> CASCADE

     So `DELETE FROM p2p_payment_methods WHERE id LIKE 'de000000-%'` does not
     only remove demo rows. Every trade that ever named one of these methods
     goes with it — including a REAL user's trade, if they ever opened one
     against a demo offer, which is exactly what a demo dataset invites them to
     do. The teardown would then print that it removed nothing but its own.

     A demo seeder silently deleting a real trade is the worst outcome this
     script can produce, so it refuses rather than guesses: anything referencing
     a demo method from outside the demo namespace is reported and the method is
     LEFT IN PLACE. An orphan payment method is a cosmetic problem; a deleted
     trade is not recoverable.
     ---------------------------------------------------------------------- */
  const [demoMethods] = await conn.execute(
    `SELECT id FROM p2p_payment_methods WHERE id LIKE ?`,
    [LIKE]
  );
  const methodIds = demoMethods.map((r) => r.id);

  if (methodIds.length) {
    const ph = methodIds.map(() => "?").join(",");
    const [foreignTrades] = await conn.execute(
      `SELECT id, paymentMethod FROM p2p_trades
        WHERE paymentMethod IN (${ph}) AND id NOT LIKE ?`,
      [...methodIds, LIKE]
    );
    const [foreignLinks] = await conn.execute(
      `SELECT offerId, paymentMethodId FROM p2p_offer_payment_method
        WHERE paymentMethodId IN (${ph}) AND offerId NOT LIKE ?`,
      [...methodIds, LIKE]
    );

    const held = new Set([
      ...foreignTrades.map((r) => r.paymentMethod),
      ...foreignLinks.map((r) => r.paymentMethodId),
    ]);

    if (held.size) {
      process.stdout.write(
        `\n  REFUSED to delete ${held.size} demo payment method(s): they are still\n` +
          `  referenced from outside the demo namespace, and the foreign keys cascade.\n` +
          `    ${foreignTrades.length} real trade(s) and ${foreignLinks.length} real offer link(s) would have been destroyed.\n` +
          `  Those methods are left in place. Detach or remove the referencing rows first.\n\n`
      );
    }

    const safe = methodIds.filter((id) => !held.has(id));
    if (safe.length) {
      const sph = safe.map(() => "?").join(",");
      await run("payment methods", `DELETE FROM p2p_payment_methods WHERE id IN (${sph})`, safe);
    }
  }

  if (userIds.length) {
    const ph = userIds.map(() => "?").join(",");
    await run("activity logs", `DELETE FROM p2p_activity_logs WHERE userId IN (${ph})`, userIds);
    await run("payment methods", `DELETE FROM p2p_payment_methods WHERE userId IN (${ph})`, userIds);
    await run("wallets", `DELETE FROM wallet WHERE userId IN (${ph})`, userIds);
    // Optional tables: the column names are not guaranteed on every install and
    // a missing one must not abort a teardown half way through.
    for (const [table, column] of [
      ["transaction", "userId"],
      ["notification", "userId"],
    ]) {
      try {
        await run(table, `DELETE FROM \`${table}\` WHERE ${column} IN (${ph})`, userIds);
      } catch {
        /* different shape on this install — not fatal for cleanup */
      }
    }
    await run("accounts", `DELETE FROM user WHERE id IN (${ph})`, userIds);
  }

  for (const [label, n] of Object.entries(counts)) log(`removed ${n} ${label}`);
  if (!Object.keys(counts).length) log("nothing to remove — no demo rows found");
  return counts;
}
