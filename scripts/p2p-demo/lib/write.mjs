/**
 * Puts the plan in the database.
 *
 * WHY THIS WRITES SQL INSTEAD OF DRIVING THE API
 * ----------------------------------------------
 * The API is the right tool for a correctness harness — `e2e/p2p/api-suite.mjs`
 * uses it, and must. It is the wrong tool for a demo dataset, for four reasons
 * that are all properties of the product rather than of this script:
 *
 *  1. THE TIMESTAMPS ARE THE POINT. `avgReleaseSeconds` is
 *     `AVG(TIMESTAMPDIFF(SECOND, paymentConfirmedAt, completedAt))`, and those
 *     two columns are stamped `new Date()` by `confirm.post.ts` and
 *     `release.post.ts`. Through the API a "slow but honest" trader who
 *     averages fourteen minutes costs fourteen minutes of wall clock PER TRADE,
 *     and a history "spread over weeks" is not expressible at all.
 *  2. THE RATE LIMITS ARE REAL AND MUST STAY ON. Offer creation is capped at 5
 *     per hour per user and trade initiation at 20 (`handler/Middleware.ts`),
 *     with an in-process counter that cannot be reset from outside. A market of
 *     fifty offers and two thousand trades is days of wall clock.
 *  3. `p2pAutoApproveOffers` ships false, so every offer created through the API
 *     lands in PENDING_APPROVAL and would need an admin pass before the board
 *     could show it.
 *  4. There is no API at all for "a trade that completed six weeks ago".
 *
 * The cost of writing SQL is that this file has to uphold by hand every
 * invariant the handlers uphold by construction. The one that matters is escrow,
 * and it is not upheld here — it is upheld in `plan.mjs`, derived rather than
 * asserted, and then re-checked against the database by `audit.mjs` after the
 * write. A seeder that can produce an unbalanced ledger and not notice is worse
 * than no seeder.
 */

import { insertRows, sqlDate } from "./db.mjs";

const json = (value) => (value === null || value === undefined ? null : JSON.stringify(value));

export async function writePlan(conn, plan, { passwordHash, log }) {
  const roleId = await userRoleId(conn);
  const methodById = new Map(plan.methods.map((m) => [m.id, m]));

  /* ---- users ------------------------------------------------------------ */
  for (const user of plan.users) {
    await conn.execute(
      `INSERT INTO user
         (id, email, password, avatar, firstName, lastName, emailVerified, roleId,
          profile, lastLogin, status, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'ACTIVE', ?, NOW())
       ON DUPLICATE KEY UPDATE
         password = VALUES(password),
         avatar = VALUES(avatar),
         firstName = VALUES(firstName),
         lastName = VALUES(lastName),
         emailVerified = VALUES(emailVerified),
         roleId = VALUES(roleId),
         profile = VALUES(profile),
         lastLogin = VALUES(lastLogin),
         status = 'ACTIVE',
         failedLoginAttempts = 0,
         deletedAt = NULL,
         createdAt = VALUES(createdAt),
         updatedAt = NOW()`,
      [
        user.id,
        user.email,
        passwordHash,
        user.avatar,
        user.firstName,
        user.lastName,
        user.emailVerified,
        roleId,
        // `market/locale.get.ts` reads `profile.location.country` as its
        // strongest signal, so a demo account signed into from any machine
        // resolves to the country its offers are in.
        json({ location: { country: user.country, countryCode: user.country } }),
        sqlDate(user.lastLogin),
        sqlDate(user.createdAt),
      ]
    );
  }
  log(`${plan.users.length} accounts (${plan.traders.length} on the board, ${plan.counterparties.length} counterparties)`);

  /* ---- wallets ---------------------------------------------------------- */
  for (const wallet of plan.wallets) {
    await conn.execute(
      `INSERT INTO wallet (id, userId, type, currency, balance, inOrder, status, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, 1, NOW(), NOW())
       ON DUPLICATE KEY UPDATE
         balance = VALUES(balance),
         inOrder = VALUES(inOrder),
         status = 1,
         deletedAt = NULL,
         updatedAt = NOW()`,
      [wallet.id, wallet.userId, wallet.walletType, wallet.currency, wallet.balance, wallet.inOrder]
    );
  }
  log(`${plan.wallets.length} wallets funded to match the escrow the offers commit`);

  /* ---- payment methods --------------------------------------------------- */
  for (const method of plan.methods) {
    await conn.execute(
      `INSERT INTO p2p_payment_methods
         (id, userId, name, icon, description, instructions, processingTime,
          available, popularityRank, isGlobal, metadata, createdAt, updatedAt)
       VALUES (?, NULL, ?, ?, ?, ?, ?, 1, ?, 1, ?, NOW(), NOW())
       ON DUPLICATE KEY UPDATE
         userId = NULL,
         isGlobal = 1,
         name = VALUES(name),
         icon = VALUES(icon),
         instructions = VALUES(instructions),
         processingTime = VALUES(processingTime),
         metadata = VALUES(metadata),
         available = 1,
         deletedAt = NULL,
         updatedAt = NOW()`,
      [
        method.id,
        method.name,
        method.icon,
        `Demo rail seeded by scripts/p2p-demo`,
        "Send the exact amount to the details below and paste the reference into the trade chat.",
        method.time,
        method.rank,
        // The keys the trade room prints verbatim — see payment-instructions.tsx.
        json({
          "Account name": "Demo Merchant",
          "Account number": `${method.key.toUpperCase()}-0198 4423`,
          Bank: method.name,
        }),
      ]
    );
  }
  log(`${plan.methods.length} global payment methods`);

  /* ---- offers ------------------------------------------------------------ */
  const offerRows = plan.offers.map((offer) => ({
    id: offer.id,
    userId: offer.userId,
    type: offer.type,
    currency: offer.currency,
    walletType: offer.walletType,
    priceCurrency: offer.priceCurrency,
    // Written as PLAIN, ONCE-ENCODED JSON. The model's own setter has a history
    // of double-encoding these columns, and `utils/visibility.ts` documents the
    // damage: a double-encoded PRIVATE offer leaked onto public listings until
    // the predicate learned to strip backslashes. Nothing this seeder writes
    // needs that rescue.
    amountConfig: json({
      total: offer.total,
      min: offer.min,
      max: offer.max,
      originalTotal: offer.originalTotal,
      availableBalance: 0,
    }),
    priceConfig: json({
      model: "FIXED",
      value: offer.price,
      fixedPrice: offer.price,
      finalPrice: offer.price,
      currency: offer.priceCurrency,
    }),
    tradeSettings: json({
      autoCancel: offer.autoCancel,
      kycRequired: offer.kycRequired,
      visibility: offer.visibility,
      termsOfTrade: offer.terms ?? "",
      additionalNotes: "",
    }),
    locationSettings: json({
      country: offer.country,
      region: "",
      city: "",
      restrictions: [],
    }),
    userRequirements: Object.keys(offer.requirements).length ? json(offer.requirements) : null,
    status: offer.status,
    views: offer.views,
    systemTags: json(["p2pdemo"]),
    adminNotes: "Seeded by scripts/p2p-demo — safe to delete with --drop",
    escrowAmount: offer.escrowAmount,
    activityLog: null,
    createdAt: sqlDate(offer.createdAt),
    updatedAt: sqlDate(offer.createdAt),
  }));

  await insertRows(
    conn,
    "p2p_offers",
    [
      "id", "userId", "type", "currency", "walletType", "priceCurrency",
      "amountConfig", "priceConfig", "tradeSettings", "locationSettings",
      "userRequirements", "status", "views", "systemTags", "adminNotes",
      "escrowAmount", "activityLog", "createdAt", "updatedAt",
    ],
    offerRows
  );

  const joinRows = [];
  for (const offer of plan.offers) {
    for (const methodId of offer.methodIds) {
      joinRows.push({
        offerId: offer.id,
        paymentMethodId: methodId,
        createdAt: sqlDate(offer.createdAt),
        updatedAt: sqlDate(offer.createdAt),
      });
    }
  }
  await insertRows(conn, "p2p_offer_payment_method", ["offerId", "paymentMethodId", "createdAt", "updatedAt"], joinRows);

  const live = plan.offers.filter((o) => o.purpose === "live");
  log(
    `${plan.offers.length} offers (${live.length} on the board, ` +
      `${plan.offers.length - live.length} closed archives carrying the history)`
  );

  /* ---- trades ------------------------------------------------------------ */
  const tradeRows = plan.trades.map((trade) => {
    const method = methodById.get(trade.paymentMethod);
    return {
      id: trade.id,
      offerId: trade.offerId,
      buyerId: trade.buyerId,
      sellerId: trade.sellerId,
      type: trade.type,
      currency: trade.currency,
      amount: trade.amount,
      price: trade.price,
      total: trade.total,
      status: trade.status,
      paymentMethod: trade.paymentMethod,
      paymentDetails: json({
        name: method?.name ?? "Bank Transfer",
        icon: method?.icon ?? "building-bank",
        instructions: "Send the exact amount and paste the reference into the trade chat.",
        processingTime: method?.time ?? "Minutes",
        "Account name": "Demo Merchant",
        "Account number": `${(method?.key ?? "bank").toUpperCase()}-0198 4423`,
      }),
      timeline: json(trade.timeline ?? null),
      terms: trade.terms,
      escrowFee: String(trade.escrowFee ?? 0),
      escrowTime: trade.escrowTime ?? "30",
      paymentConfirmedAt: sqlDate(trade.paymentConfirmedAt),
      paymentReference: trade.paymentReference ?? null,
      escrowAmount: trade.escrowAmount ?? 0,
      escrowStatus: trade.escrowStatus,
      completedAt: sqlDate(trade.completedAt),
      cancelledAt: sqlDate(trade.cancelledAt),
      disputedAt: sqlDate(trade.disputedAt),
      cancelledBy: trade.cancelledBy ?? null,
      cancellationReason: trade.cancellationReason ?? null,
      resolution: null,
      createdAt: sqlDate(trade.createdAt),
      updatedAt: sqlDate(trade.updatedAt ?? trade.createdAt),
    };
  });

  await insertRows(
    conn,
    "p2p_trades",
    [
      "id", "offerId", "buyerId", "sellerId", "type", "currency", "amount", "price",
      "total", "status", "paymentMethod", "paymentDetails", "timeline", "terms",
      "escrowFee", "escrowTime", "paymentConfirmedAt", "paymentReference",
      "escrowAmount", "escrowStatus", "completedAt", "cancelledAt", "disputedAt",
      "cancelledBy", "cancellationReason", "resolution", "createdAt", "updatedAt",
    ],
    tradeRows
  );

  const byStatus = plan.trades.reduce((acc, t) => {
    acc[t.status] = (acc[t.status] ?? 0) + 1;
    return acc;
  }, {});
  log(
    `${plan.trades.length} trades — ` +
      Object.entries(byStatus)
        .sort((a, b) => b[1] - a[1])
        .map(([k, v]) => `${v} ${k}`)
        .join(", ")
  );

  /* ---- reviews ----------------------------------------------------------- */
  await insertRows(
    conn,
    "p2p_reviews",
    ["id", "reviewerId", "revieweeId", "tradeId", "communicationRating", "speedRating", "trustRating", "comment", "createdAt", "updatedAt"],
    plan.reviews.map((r) => ({
      id: r.id,
      reviewerId: r.reviewerId,
      revieweeId: r.revieweeId,
      tradeId: r.tradeId,
      communicationRating: r.communicationRating,
      speedRating: r.speedRating,
      trustRating: r.trustRating,
      comment: r.comment,
      createdAt: sqlDate(r.createdAt),
      updatedAt: sqlDate(r.createdAt),
    }))
  );
  log(`${plan.reviews.length} reviews`);

  /* ---- disputes ---------------------------------------------------------- */
  await insertRows(
    conn,
    "p2p_disputes",
    ["id", "tradeId", "amount", "reportedById", "againstId", "reason", "details", "filedOn", "status", "priority", "messages", "evidence", "activityLog", "createdAt", "updatedAt"],
    plan.disputes.map((d) => ({
      id: d.id,
      tradeId: d.tradeId,
      amount: d.amount,
      reportedById: d.reportedById,
      againstId: d.againstId,
      reason: d.reason,
      details: d.details,
      filedOn: sqlDate(d.filedOn),
      status: d.status,
      priority: d.priority,
      messages: json(d.messages),
      evidence: json(d.evidence),
      activityLog: json(d.activityLog),
      createdAt: sqlDate(d.filedOn),
      updatedAt: sqlDate(d.filedOn),
    }))
  );
  log(`${plan.disputes.length} open disputes for the admin queue`);
}

async function userRoleId(conn) {
  const [rows] = await conn.execute("SELECT id FROM role WHERE name = 'User' LIMIT 1");
  return rows[0]?.id ?? 4;
}

/* ==========================================================================
   Fiat currencies
   ========================================================================== */

/**
 * Switch on the `currency` rows the demo board quotes in, remembering which
 * ones were off.
 *
 * WHY THIS IS NECESSARY, AND WHY IT IS THE ONLY ROW THIS SEEDER TOUCHES THAT
 * IT DID NOT CREATE.
 *
 * `market/locale.get.ts` will only report `currencySupported: true` when there
 * is an ACTIVE `currency` row for the visitor's money, and the market client
 * applies the detected fiat ONLY on that flag — but it applies the detected
 * COUNTRY on a different condition (the board has offers from there). Seeding
 * Iraqi offers without enabling IQD therefore produces the worst of both: a
 * visitor in Baghdad gets `country=IQ` plus whatever fiat led the facets, and a
 * board filtered to Iraqi makers quoting Nigerian naira is empty.
 *
 * So the flip is part of making the corridor real. It is recorded so `--drop`
 * can put it back, and `--no-currencies` turns it off for an operator who
 * manages that table by hand.
 */
export async function enableFiats(conn, codes) {
  if (!codes.length) return { enabled: [], previouslyDisabled: [] };
  const placeholders = codes.map(() => "?").join(",");
  const [rows] = await conn.execute(
    `SELECT id, status FROM currency WHERE id IN (${placeholders})`,
    codes
  );
  const off = rows.filter((r) => !r.status).map((r) => r.id);
  if (off.length) {
    // `currency` carries no timestamps — it is a reference table, not a record.
    await conn.execute(
      `UPDATE currency SET status = 1 WHERE id IN (${off.map(() => "?").join(",")})`,
      off
    );
  }
  return { enabled: rows.map((r) => r.id), previouslyDisabled: off };
}

export async function restoreFiats(conn, codes) {
  if (!codes?.length) return 0;
  const [result] = await conn.execute(
    `UPDATE currency SET status = 0 WHERE id IN (${codes.map(() => "?").join(",")})`,
    codes
  );
  return result.affectedRows ?? 0;
}
