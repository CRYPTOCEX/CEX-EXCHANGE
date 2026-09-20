/**
 * Builds the whole demo market IN MEMORY, then hands it over to be written.
 *
 * WHY THE PLAN IS A PURE FUNCTION
 * -------------------------------
 * The hard constraint on this dataset is that escrow balances: every ACTIVE,
 * PAUSED or PENDING_APPROVAL SELL offer's remaining total, and every HELD trade
 * escrow, has to be backed by that seller's `wallet.inOrder`, exactly. That is
 * an arithmetic property of the whole dataset, not of any one row, and it can
 * only be established once every offer and trade is known.
 *
 * So nothing is written until everything is decided. `finalise()` derives the
 * wallets FROM the commitments rather than funding wallets first and hoping the
 * offers fit — which is the shape that lets a seeder produce a market whose
 * escrow is silently short, and a market with short escrow is worse than an
 * empty one: every "Insufficient locked funds for this offer" refusal looks
 * like a P2P defect.
 */

import {
  ARCHETYPES,
  ASSETS,
  CORRIDORS,
  CANCEL_REASONS,
  DISPUTE_DETAILS,
  DISPUTE_REASONS,
  NAME_BANK,
  PAYMENT_METHODS,
  REVIEW_COMMENTS,
  TERMS,
  TRADE_MESSAGES,
  avatarFor,
  methodsForCountry,
} from "./catalog.mjs";
import {
  DEMO_PASSWORD,
  EMAIL_DOMAIN,
  TAG,
  between,
  demoId,
  intBetween,
  pick,
  q8,
  rng,
  roundTo,
  shuffled,
  sum8,
} from "./db.mjs";

const DAY = 24 * 60 * 60 * 1000;

/**
 * Platform bounds, in US DOLLARS. Mirrors the defaults of
 * `p2pMinimumTradeAmount` / `p2pMaximumTradeAmount`, which are dollar figures
 * the server converts into each offer's pricing currency before comparing.
 */
const PLATFORM_MIN_USD = 10;
const PLATFORM_MAX_USD = 100_000;

/**
 * Price ladder, in fractions of the pair's reference price.
 *
 * `PriceDelta` renders "x% above avg" / "x% below avg" against the mean of the
 * offers on the same side of the same pair, and returns NOTHING when the
 * comparison is impossible. A ladder that never crosses zero would leave every
 * chip on the board reading the same direction, so the component's two branches
 * are exercised only because the offers on each side genuinely straddle their
 * own mean. Below 0.01% it prints "At the average", which the middle rung
 * deliberately does not trigger.
 */
const PRICE_LADDER = [-0.024, -0.014, -0.006, 0.002, 0.009, 0.017, 0.026, -0.019, 0.013];

/** Offer statuses in the live rotation. ACTIVE dominates; the rest prove the states exist. */
const LIVE_STATUS_CYCLE = [
  "ACTIVE", "ACTIVE", "ACTIVE", "ACTIVE", "ACTIVE", "ACTIVE", "ACTIVE",
  "PAUSED", "ACTIVE", "ACTIVE", "ACTIVE", "PENDING_APPROVAL",
];

export function buildPlan({ scale = 1, rates = {}, pairPrices = {}, viewer = null } = {}) {
  const random = rng(0x9e3779b9 ^ Math.round(scale * 1000));
  const scaled = (n) => Math.max(1, Math.round(n * scale));

  const perUsd = (fiat) => {
    const platform = Number(rates[fiat]);
    if (Number.isFinite(platform) && platform > 0) return platform;
    return CORRIDORS.find((c) => c.fiat === fiat)?.perUsd ?? 1;
  };

  /**
   * THE PAIR'S REFERENCE PRICE IS WHAT THE BOARD ALREADY QUOTES, WHEN IT QUOTES
   * ANYTHING.
   *
   * `PriceDelta` compares an offer against the mean of the offers on the SAME
   * side of the SAME pair, so the demo's prices are not judged against the
   * platform's FX table — they are judged against whatever else is standing on
   * that board. Deriving them purely from `currency.price` looked right in
   * isolation and read as broken in situ: this install already carries USDT/NGN
   * offers around 1,745 while its `currency` row says 1,361 to the dollar, and
   * demo offers priced off the table alone landed eighteen percent "below
   * average" — a chip that says the demo data is mispriced rather than that the
   * component works.
   *
   * The existing level is adopted only when it is within a factor of five of the
   * platform-derived one. Beyond that the two numbers are not describing the
   * same pair (a stray row with a price of 1, a fat-fingered listing), and
   * anchoring a whole corridor to it would be worse than ignoring it.
   */
  const referenceFor = (asset, fiat) => {
    const fromTable = asset.usd * perUsd(fiat);
    const onBoard = Number(pairPrices[`${asset.currency}|${fiat}`]);
    if (!Number.isFinite(onBoard) || onBoard <= 0) return fromTable;
    const ratio = onBoard / fromTable;
    return ratio > 0.2 && ratio < 5 ? onBoard : fromTable;
  };

  const seq = { user: 0, method: 0, offer: 0, trade: 0, review: 0, dispute: 0, wallet: 0 };
  const nextId = (kind) => demoId(kind, ++seq[kind]);

  /* ======================================================================
     1. Payment methods
     ====================================================================== */
  const methods = [];
  const methodByKey = new Map();
  for (const m of PAYMENT_METHODS) {
    const row = { ...m, id: nextId("method") };
    methods.push(row);
    methodByKey.set(m.key, row);
  }

  /* ======================================================================
     2. The cast
     ====================================================================== */
  const traders = [];
  /*
    SHUFFLED, so an archetype does not colonise a country.

    Taking the bank in order gives all three veterans Nigerian names (they are
    the first three rows), all three newcomers Indian ones, and so on — which
    produces a board where the NG corridor is uniformly excellent and the IN
    corridor is uniformly unproven. The whole point of the cast is that a
    corridor contains a RANGE, because that is the choice the market UI exists
    to help somebody make.
  */
  const namePool = shuffled(random, NAME_BANK);
  const nameCursor = { i: 0 };
  const takeName = () => {
    const entry = namePool[nameCursor.i % namePool.length];
    const round = Math.floor(nameCursor.i / namePool.length);
    nameCursor.i += 1;
    return {
      country: entry[0],
      first: entry[1],
      // A second lap through the bank must not mint a duplicate name; the
      // initial is what a real second Ahmed on a board would carry.
      last: round === 0 ? entry[2] : `${entry[2]} ${String.fromCharCode(65 + (round % 26))}.`,
    };
  };

  const now = Date.now();

  for (const archetype of ARCHETYPES) {
    const count = scaled(archetype.count);
    for (let i = 0; i < count; i++) {
      const name = takeName();
      const home = CORRIDORS.find((c) => c.country === name.country) ?? CORRIDORS[0];
      const completed = intBetween(random, archetype.completed[0], archetype.completed[1]);
      const rate = intBetween(random, archetype.rate[0], archetype.rate[1]);
      const release =
        archetype.release === null
          ? null
          : Math.round(between(random, archetype.release[0], archetype.release[1]));

      // Account age is a real filter (`userRequirements.minAccountAge`), so it
      // has to correlate with the story: a 400-trade veteran who joined last
      // week would fail their own offers' bar.
      const ageDays =
        archetype.key === "fresh"
          ? intBetween(random, 2, 25)
          : archetype.key === "veteran"
            ? intBetween(random, 420, 1100)
            : intBetween(random, 90, 620);

      traders.push({
        id: nextId("user"),
        kind: "trader",
        archetype: archetype.key,
        archetypeLabel: archetype.label,
        email: `${TAG}-${archetype.key}${i + 1}@${EMAIL_DOMAIN}`,
        firstName: name.first,
        lastName: name.last,
        country: home.country,
        home,
        emailVerified: random() < archetype.verified ? 1 : 0,
        avatar: avatarFor(name.first, name.last, traders.length),
        createdAt: new Date(now - ageDays * DAY),
        // A spread of presence, so the "online now" filter and the green dot on
        // the trader card separate somebody rather than lighting up for all.
        lastLogin: new Date(
          now - Math.round(between(random, 0, 1) ** 3 * 6 * DAY) - (random() < 0.25 ? 0 : 9 * 60 * 1000)
        ),
        offerBudget: scaled(archetype.offers),
        target: { completed, rate, release },
        reviewShare: archetype.reviewShare,
      });
    }
  }

  /* ----------------------------------------------------------------------
     Counterparties.

     THIS POOL IS WHY THE PERSONAS SURVIVE CONTACT WITH THEIR OWN HISTORY.

     `getTraderStats` counts a finished trade for BOTH sides — `completedTrades`
     is the union of the buyer-side and seller-side groupings. So if a veteran's
     420 sales were made to the cast's three new traders, those three would each
     end the seed with a hundred completed trades and the "New trader — no
     completed trades yet" caution, the single most important thing the picks
     row has to be able to say, would render for nobody.

     These accounts absorb the other side of every historical trade. They own no
     offers, so they never reach the board, the traders lens or the picks — but
     they are real users with real names, because they DO appear as the
     counterparty inside a trade the operator opens.
     -------------------------------------------------------------------- */
  const counterparties = [];
  const counterpartyCount = Math.max(10, Math.round(14 * scale));
  for (let i = 0; i < counterpartyCount; i++) {
    const name = takeName();
    counterparties.push({
      id: nextId("user"),
      kind: "counterparty",
      archetype: "counterparty",
      email: `${TAG}-cp${i + 1}@${EMAIL_DOMAIN}`,
      firstName: name.first,
      lastName: name.last,
      country: name.country,
      emailVerified: random() < 0.8 ? 1 : 0,
      avatar: avatarFor(name.first, name.last, 40 + i),
      createdAt: new Date(now - intBetween(random, 40, 900) * DAY),
      lastLogin: new Date(now - intBetween(random, 0, 20) * DAY),
    });
  }

  const users = [...traders, ...counterparties];

  /* ======================================================================
     3. Offers
     ====================================================================== */
  const offers = [];

  const assetFor = () => {
    // Weighted so the asset strip leads with USDT the way a real desk does.
    const total = ASSETS.reduce((a, b) => a + b.weight, 0);
    let roll = random() * total;
    for (const asset of ASSETS) {
      roll -= asset.weight;
      if (roll <= 0) return asset;
    }
    return ASSETS[0];
  };

  /**
   * COVERAGE FIRST, THEN DEPTH.
   *
   * A trader's first two offers are their own country. Everything after that is
   * drawn from a queue built in two passes, and the order of the passes is the
   * whole design:
   *
   *   1. Every corridor NOBODY calls home, twice. This is a FLOOR, not a
   *      preference. A country the visitor is detected in but which has no
   *      offers is a dead board — the market client will not even apply the
   *      detected country unless the facets say offers exist there — so a
   *      corridor this dataset advertises has to be genuinely tradeable.
   *   2. Whatever slots remain, cycling the head of `CORRIDORS`, which is
   *      ordered major-first.
   *
   * Getting this backwards (a weighted random draw over everything) produced
   * both failure modes at once: the pair the market opens on had three offers,
   * so the picks row had nothing to choose between, while Iraq had one and the
   * corridor the brief specifically asks for was a dead end.
   */
  const homeCountries = new Set(traders.map((t) => t.home.country));
  const uncovered = CORRIDORS.filter((c) => !homeCountries.has(c.country));
  const spillSlots = traders.reduce((n, t) => n + Math.max(0, t.offerBudget - 2), 0);
  const spillQueue = [...uncovered, ...uncovered];
  const headDepth = CORRIDORS.slice(0, 5);
  for (let i = spillQueue.length; i < spillSlots; i++) {
    spillQueue.push(headDepth[i % headDepth.length]);
  }
  let spillCursor = 0;

  const corridorFor = (trader, index) => {
    if (index < 2) return trader.home;
    for (let attempt = 0; attempt < spillQueue.length; attempt++) {
      const candidate = spillQueue[(spillCursor + attempt) % spillQueue.length];
      // Never hand a trader a second offer in a corridor they already lead from;
      // slots 0 and 1 already cover it, and a third would look like padding.
      if (candidate.country !== trader.home.country) {
        spillCursor += attempt + 1;
        return candidate;
      }
    }
    return CORRIDORS[0];
  };

  let liveCursor = 0;
  for (const trader of traders) {
    /*
      The first two offers are the trader's HOME corridor and their PRIMARY
      asset, one on each side.

      `market/traders.get.ts` only draws a two-sided card when the same trader
      quotes both directions in the SAME asset — `pickAsset` scores
      two-sidedness at a million to one against offer count, and comparing a BTC
      price with a USDT price is documented there as not a price comparison at
      all. Choosing the asset independently per offer left most traders quoting
      one side of one asset and the other side of another, so the lens rendered
      half a card each time.
    */
    const primaryAsset = assetFor();
    for (let i = 0; i < trader.offerBudget; i++) {
      const corridor = corridorFor(trader, i);
      const asset = i < 2 ? primaryAsset : assetFor();
      // Alternate sides deterministically so both halves of the board fill;
      // `market/traders.get.ts` only shows a two-sided card when the same
      // trader quotes both directions in the SAME asset.
      const type = i % 2 === 0 ? "SELL" : "BUY";
      const status = LIVE_STATUS_CYCLE[liveCursor % LIVE_STATUS_CYCLE.length];
      liveCursor += 1;

      offers.push(
        draftOffer({
          id: nextId("offer"),
          trader,
          corridor,
          asset,
          type,
          status,
          purpose: "live",
          random,
          now,
          perUsd,
          methodByKey,
        })
      );
    }

    /* ------------------------------------------------------------------
       Two ARCHIVE offers per trader, closed and off the board.

       Every trade needs an `offerId` — it is NOT NULL with a foreign key — and
       hanging a veteran's four hundred completed sales off their live offer
       would force that offer's remaining total to tell a story it cannot: the
       total is the amount still for sale, so a live offer that had genuinely
       absorbed four hundred trades would be empty, and an empty offer is
       filtered off the board by `availableAmount <= 0`.

       A COMPLETED offer is what a fully consumed listing actually looks like
       once its maker closes it: it carries no escrow (`escrowAmount` 0, and the
       audit's status filter excludes it), it is invisible to every public
       listing, and it is a perfectly ordinary parent for a settled trade.
       ------------------------------------------------------------------ */
    if (trader.target.completed > 0 || trader.archetype !== "fresh") {
      /*
        Most history is USDT, some of it is not.

        The board's asset strip is ordered by COMPLETED TRADES in the last
        thirty days, offer count only as the tie-break — that ordering is the
        one thing `facets.currencies` publishes both numbers for, and it is
        untestable when every settled trade in the database is in one asset.
      */
      const roll = random();
      const archiveAsset = roll < 0.72 ? ASSETS[0] : roll < 0.92 ? ASSETS[1] : ASSETS[2];
      trader.archiveSell = draftOffer({
        id: nextId("offer"),
        trader,
        corridor: trader.home,
        asset: archiveAsset,
        type: "SELL",
        status: "COMPLETED",
        purpose: "archive",
        random,
        now,
        perUsd,
        methodByKey,
      });
      trader.archiveBuy = draftOffer({
        id: nextId("offer"),
        trader,
        corridor: trader.home,
        asset: archiveAsset,
        type: "BUY",
        status: "COMPLETED",
        purpose: "archive",
        random,
        now,
        perUsd,
        methodByKey,
      });
      offers.push(trader.archiveSell, trader.archiveBuy);
    }
  }

  /* ----------------------------------------------------------------------
     Prices, then limits, then totals — in that order and grouped by
     (asset, fiat, side), because each figure depends on the one before it.
     -------------------------------------------------------------------- */
  const groups = new Map();
  for (const offer of offers) {
    const key = `${offer.currency}|${offer.priceCurrency}|${offer.type}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(offer);
  }
  for (const group of groups.values()) {
    group.forEach((offer, index) => {
      const reference = referenceFor(offer.asset, offer.priceCurrency);
      const edge = PRICE_LADDER[index % PRICE_LADDER.length];
      const price = reference * (1 + edge);
      offer.price = Number(price.toPrecision(8));
      finaliseLimits(offer, random);
    });
  }

  /* ----------------------------------------------------------------------
     NO CORRIDOR MAY BE LEFT WITH AN EMPTY PUBLIC BOARD.

     The PRIVATE roll above is per-offer and unaware of its neighbours, so a 4%
     chance landing on the ONLY listing in a (asset, fiat, side) bucket takes
     that whole side of that corridor off the board. It did exactly that to the
     single USDT/USD SELL offer — the fiat an English-locale operator detects
     into — so the demo's most likely first impression was an empty buy board.

     PRIVATE exists here to prove the hiding mechanism has something to hide;
     it is not worth a dead corridor. Anything that turns out to be the last
     PUBLIC listing on its side is put back.
     -------------------------------------------------------------------- */
  const publicPerSide = new Map();
  /* `currency`, not `asset` — `asset` is the catalogue OBJECT, and interpolating
     it yields "[object Object]", which collapses BTC, ETH and USDT into one
     bucket and makes this guard see neighbours that are not there. */
  const keyFor = (o) => `${o.currency}|${o.priceCurrency}|${o.type}`;
  for (const offer of offers) {
    if (offer.purpose !== "live" || offer.visibility !== "PUBLIC") continue;
    const key = keyFor(offer);
    publicPerSide.set(key, (publicPerSide.get(key) ?? 0) + 1);
  }
  for (const offer of offers) {
    if (offer.purpose !== "live" || offer.visibility !== "PRIVATE") continue;
    const key = keyFor(offer);
    if ((publicPerSide.get(key) ?? 0) === 0) {
      offer.visibility = "PUBLIC";
      publicPerSide.set(key, 1);
    }
  }

  /* ======================================================================
     4. History
     ====================================================================== */
  const trades = [];
  const reviews = [];
  const disputes = [];

  for (const trader of traders) {
    if (!trader.archiveSell) continue;
    const { completed, rate, release } = trader.target;
    if (completed <= 0) continue;

    // finished = completed + failed, and completionRate is COMPLETED / finished
    // rounded. Solving for `failed` from the target rate is what makes the
    // number on the card the number this cast was specified with.
    const failed = rate >= 100 ? 0 : Math.max(1, Math.round((completed * (100 - rate)) / rate));

    // Roughly four in five as the seller. Both sides count towards the
    // completion rate; only the seller side has a release time to measure, and
    // that asymmetry is exactly what `avgReleaseSeconds` is documented to mean.
    const sellCompleted = Math.max(1, Math.round(completed * 0.78));
    const buyCompleted = completed - sellCompleted;
    const sellFailed = Math.round(failed * 0.6);
    const buyFailed = failed - sellFailed;

    const releaseSamples = releaseSpread(random, sellCompleted, release);

    for (let i = 0; i < sellCompleted; i++) {
      trades.push(
        historyTrade({
          id: nextId("trade"),
          offer: trader.archiveSell,
          sellerId: trader.id,
          buyerId: pick(random, counterparties).id,
          outcome: "COMPLETED",
          releaseSeconds: releaseSamples[i],
          random,
          now,
        })
      );
    }
    for (let i = 0; i < buyCompleted; i++) {
      trades.push(
        historyTrade({
          id: nextId("trade"),
          offer: trader.archiveBuy,
          // A BUY offer's owner is the BUYER — `initiate-trade.post.ts` assigns
          // `buyerId = offer.userId` — so the counterparty is the seller here,
          // and this trade contributes nothing to the trader's release time.
          buyerId: trader.id,
          sellerId: pick(random, counterparties).id,
          outcome: "COMPLETED",
          releaseSeconds: intBetween(random, 90, 500),
          random,
          now,
        })
      );
    }
    for (let i = 0; i < sellFailed; i++) {
      trades.push(
        historyTrade({
          id: nextId("trade"),
          offer: trader.archiveSell,
          sellerId: trader.id,
          buyerId: pick(random, counterparties).id,
          outcome: i % 2 === 0 ? "CANCELLED" : "EXPIRED",
          random,
          now,
        })
      );
    }
    for (let i = 0; i < buyFailed; i++) {
      trades.push(
        historyTrade({
          id: nextId("trade"),
          offer: trader.archiveBuy,
          buyerId: trader.id,
          sellerId: pick(random, counterparties).id,
          outcome: i % 2 === 0 ? "EXPIRED" : "CANCELLED",
          random,
          now,
        })
      );
    }
  }

  /* ----------------------------------------------------------------------
     The viewer's own history.

     "You've traded with them N times before" is the strongest trust signal the
     product has, it pins repeat counterparties to the front of the traders
     lens, and it is worth 12 points in `scoreOffer` — none of which an operator
     can see unless the account they are signed in as has actually traded.

     The viewer is only ever the BUYER, and only on COMPLETED trades. A buyer
     holds no escrow, so this cannot touch the operator's real wallet, and a
     settled trade has `escrowStatus` RELEASED and `escrowAmount` 0, so it is
     invisible to the conservation audit.
     -------------------------------------------------------------------- */
  if (viewer?.id) {
    const hosts = traders.filter((t) => t.archiveSell && t.target.completed > 0).slice(0, 3);
    hosts.forEach((trader, index) => {
      const count = [3, 2, 1][index] ?? 1;
      for (let i = 0; i < count; i++) {
        trades.push(
          historyTrade({
            id: nextId("trade"),
            offer: trader.archiveSell,
            sellerId: trader.id,
            buyerId: viewer.id,
            outcome: "COMPLETED",
            releaseSeconds: trader.target.release ?? 200,
            random,
            now,
            ageDays: intBetween(random, 3, 50),
          })
        );
      }
    });
  }

  /* ----------------------------------------------------------------------
     Reviews.
     -------------------------------------------------------------------- */
  const completedTrades = trades.filter((t) => t.status === "COMPLETED");
  for (const trade of completedTrades) {
    const seller = traders.find((t) => t.id === trade.sellerId);
    const share = seller ? seller.reviewShare : 0.25;
    if (random() > share) continue;

    // `p2p_reviews` has no `rating` column: `review.post.ts` spreads a 1-5 star
    // value across three 0-100 dimensions as `(stars / 5) * 100`. Writing the
    // same shape here means the seeded reviews and the ones a user submits are
    // indistinguishable to `getTraderStats`.
    const stars = weightedStars(random, seller?.archetype);
    const base = (stars / 5) * 100;
    reviews.push({
      id: nextId("review"),
      reviewerId: trade.buyerId,
      revieweeId: trade.sellerId,
      tradeId: trade.id,
      communicationRating: base,
      speedRating: Math.max(0, Math.min(100, base + (seller?.archetype === "slow" ? -20 : 0))),
      trustRating: base,
      comment: random() < 0.75 ? pick(random, REVIEW_COMMENTS) : null,
      createdAt: new Date(new Date(trade.completedAt).getTime() + intBetween(random, 60, 3600) * 1000),
    });
  }

  /* ======================================================================
     5. Live trades — one of each state the UI has a screen for
     ====================================================================== */
  const liveSellOffers = offers.filter(
    (o) => o.purpose === "live" && o.type === "SELL" && o.status === "ACTIVE"
  );
  const liveBuyOffers = offers.filter(
    (o) => o.purpose === "live" && o.type === "BUY" && o.status === "ACTIVE"
  );

  const liveSpecs = [];
  const perState = Math.max(1, Math.round(2 * scale));
  for (const state of ["PENDING", "PAYMENT_SENT", "DISPUTED"]) {
    // One of each with the VIEWER as the buyer, so "My trades" is not empty for
    // the person running the demo.
    if (viewer?.id) liveSpecs.push({ state, buyer: viewer.id, offerPool: "sell" });
    for (let i = 0; i < perState; i++) {
      liveSpecs.push({ state, buyer: null, offerPool: "sell" });
    }
  }
  // One against a BUY offer, where the TAKER is the seller and their own wallet
  // is held. Without it the demo only ever exercises offer-level escrow.
  liveSpecs.push({ state: "PAYMENT_SENT", buyer: null, offerPool: "buy" });

  let sellCursor = 0;
  let buyCursor = 0;
  for (const spec of liveSpecs) {
    const pool = spec.offerPool === "buy" ? liveBuyOffers : liveSellOffers;
    if (!pool.length) continue;
    const offer = spec.offerPool === "buy" ? pool[buyCursor++ % pool.length] : pool[sellCursor++ % pool.length];

    const isBuyOffer = offer.type === "BUY";
    // On a BUY offer the taker is the seller; draw them from the counterparty
    // pool so a storefront persona's story is untouched by a live trade.
    const taker = pick(random, counterparties);
    const buyerId = isBuyOffer ? offer.userId : spec.buyer ?? taker.id;
    const sellerId = isBuyOffer ? taker.id : offer.userId;
    if (buyerId === sellerId) continue;

    const trade = liveTrade({
      id: nextId("trade"),
      offer,
      buyerId,
      sellerId,
      state: spec.state,
      random,
      now,
    });
    trades.push(trade);

    /* The trade's share is CARVED OUT of the offer, not added to it. On a SELL
       offer the collateral was locked when the offer was published, and
       `initiate-trade` decrements `amountConfig.total` by the traded amount
       while leaving the offer's `escrowAmount` alone — the offer still holds
       the funds, they are just attributed to the trade now. Reproducing that
       split is what keeps `offer total + live trade escrow` equal to one
       number in the seller's wallet. */
    if (!isBuyOffer) {
      offer.total = q8(offer.total - trade.amount);
      if (offer.total <= 0) {
        // Never advertise an offer with nothing left; give it room instead of
        // letting it fall off the board.
        offer.total = q8(trade.amount * 2);
        offer.originalTotal = q8(offer.total + trade.amount);
      }
      offer.liveTradeEscrow = q8((offer.liveTradeEscrow ?? 0) + trade.amount);
    }

    if (spec.state === "DISPUTED") {
      const reasonIndex = disputes.length % DISPUTE_REASONS.length;
      const filedOn = new Date(new Date(trade.paymentConfirmedAt ?? trade.createdAt).getTime() + 40 * 60 * 1000);
      disputes.push({
        id: nextId("dispute"),
        tradeId: trade.id,
        amount: String(trade.amount),
        reportedById: trade.buyerId,
        againstId: trade.sellerId,
        reason: DISPUTE_REASONS[reasonIndex],
        details: DISPUTE_DETAILS[reasonIndex],
        filedOn,
        status: disputes.length % 3 === 0 ? "IN_PROGRESS" : "PENDING",
        priority: disputes.length % 2 === 0 ? "HIGH" : "MEDIUM",
        messages: [
          {
            id: `${trade.id}-d1`,
            senderId: trade.buyerId,
            message: DISPUTE_DETAILS[reasonIndex],
            createdAt: filedOn.toISOString(),
          },
        ],
        evidence: [],
        activityLog: [
          { type: "DISPUTE_OPENED", createdAt: filedOn.toISOString() },
        ],
      });
    }
  }

  /* ======================================================================
     6. Wallets, derived from the commitments
     ====================================================================== */
  const wallets = finaliseEscrow({ users, offers, trades, nextId });

  return {
    scale,
    password: DEMO_PASSWORD,
    users,
    traders,
    counterparties,
    methods,
    offers,
    trades,
    reviews,
    disputes,
    wallets,
    viewer,
  };
}

/* ==========================================================================
   Helpers
   ========================================================================== */

/**
 * An offer with everything except its price-dependent figures.
 */
function draftOffer({ id, trader, corridor, asset, type, status, purpose, random, now, perUsd, methodByKey }) {
  const eligible = methodsForCountry(corridor.country);
  const chosen = shuffled(random, eligible).slice(0, 1 + Math.floor(random() * 2.6));
  const methodIds = chosen.map((m) => methodByKey.get(m.key)?.id).filter(Boolean);

  // Varied, and mostly absent — a board where every offer carries the same
  // paragraph of terms is a board nobody reads the terms on.
  const terms = random() < 0.6 ? pick(random, TERMS) : null;

  const requirements = {};
  if (random() < 0.16) requirements.verifiedOnly = true;
  if (random() < 0.1) requirements.minCompletedTrades = pick(random, [5, 10, 25]);
  if (random() < 0.07) requirements.minAccountAge = pick(random, [7, 30]);
  if (random() < 0.05) requirements.trustedOnly = true;
  if (random() < 0.06) requirements.minSuccessRate = pick(random, [90, 95]);

  return {
    id,
    purpose,
    userId: trader.id,
    trader,
    type,
    asset,
    currency: asset.currency,
    walletType: asset.walletType,
    priceCurrency: corridor.fiat,
    country: corridor.country,
    status,
    methodIds,
    terms,
    requirements,
    kycRequired: random() < 0.09,
    // A couple of PRIVATE listings, which the board must not show — the demo is
    // more useful when the mechanism that hides them has something to hide.
    visibility: purpose === "live" && random() < 0.04 ? "PRIVATE" : "PUBLIC",
    autoCancel: pick(random, [30, 45, 60, 120, 240]),
    views: purpose === "live" ? Math.round(between(random, 4, 900)) : Math.round(between(random, 60, 4000)),
    createdAt: new Date(now - Math.round(between(random, 0.5, purpose === "archive" ? 300 : 46)) * DAY),
    perUsd,
    // filled by finaliseLimits
    price: 0,
    total: 0,
    min: 0,
    max: 0,
    liveTradeEscrow: 0,
  };
}

/**
 * Limits are stated in the PRICE currency; the total is in CRYPTO.
 *
 * That asymmetry is the offer model's, not this seeder's — `initiate-trade`
 * converts with `min / price` — and getting it backwards produces offers whose
 * minimum is a hundred times their maximum.
 *
 * THE PLATFORM BOUNDS ARE DOLLARS, so the clamping happens in dollars and the
 * result is converted once, at the end. This used to clamp in the price
 * currency, which is what the server did too, and the note here recorded the
 * consequence as though it were a rule: "on a VND board [the cap] is about four
 * dollars". That was the defect, not the design — a 100,000 cap an operator
 * entered as dollars was enforced as dong. Both sides are converted now, and
 * this seeder has to agree with the server or every demo offer it writes on a
 * weak-currency board is one the trade opener will refuse.
 */
function finaliseLimits(offer, random) {
  const rate = offer.perUsd(offer.priceCurrency);
  const wantMinUsd = pick(random, [10, 20, 50, 120, 250]);
  const wantMaxUsd = pick(random, [400, 900, 2000, 6000]);

  // Clamp in USD, where the bounds actually live.
  const minUsd = Math.max(PLATFORM_MIN_USD, wantMinUsd);
  const maxUsd = Math.min(PLATFORM_MAX_USD * 0.99, Math.max(wantMaxUsd, minUsd * 4));

  const maxPc = maxUsd * rate;
  const minPc = Math.min(minUsd * rate, maxPc * 0.25);

  const step = maxPc > 20000 ? 500 : maxPc > 2000 ? 50 : maxPc > 200 ? 5 : 1;
  // Rounding to a step can push a figure back over the bound it was clamped to,
  // so both are re-clamped after rounding rather than before.
  offer.max = Math.min(PLATFORM_MAX_USD * 0.99 * rate, roundTo(maxPc, step));
  offer.min = Math.max(
    PLATFORM_MIN_USD * rate,
    Math.min(roundTo(minPc, step) || step, offer.max * 0.5)
  );

  // The total must comfortably cover the offer's own maximum, or the largest
  // trade the offer advertises cannot be opened against it.
  const coverage = between(random, 1.6, 9);
  offer.total = q8(Math.max((offer.max / offer.price) * coverage, offer.min / offer.price));
  offer.originalTotal = offer.total;
}

/**
 * Release times whose MEAN is the persona's target.
 *
 * `avgReleaseSeconds` is `AVG(TIMESTAMPDIFF(SECOND, paymentConfirmedAt,
 * completedAt))`, so the card's number is whatever these samples average to.
 * Drawing them from a uniform band lands near the target but not on it, and
 * "releases in about 71 seconds" for a persona specified as 45 makes the cast
 * definition a suggestion rather than a specification. Scaling the spread onto
 * the target fixes the mean exactly while keeping the individual trades varied.
 */
function releaseSpread(random, count, target) {
  if (!count || !target) return new Array(count).fill(target ?? 120);
  const raw = Array.from({ length: count }, () => 0.55 + random() * 0.9);
  const mean = raw.reduce((a, b) => a + b, 0) / raw.length;
  return raw.map((v) => Math.max(5, Math.round((v / mean) * target)));
}

function weightedStars(random, archetype) {
  const roll = random();
  if (archetype === "shaky") return roll < 0.45 ? 2 : roll < 0.8 ? 3 : 4;
  if (archetype === "slow") return roll < 0.25 ? 3 : roll < 0.8 ? 4 : 5;
  return roll < 0.08 ? 3 : roll < 0.35 ? 4 : 5;
}

/** A settled trade: timestamps that agree with each other and with the outcome. */
function historyTrade({ id, offer, buyerId, sellerId, outcome, releaseSeconds, random, now, ageDays }) {
  const days = ageDays ?? between(random, 0.2, 118);
  const createdAt = new Date(now - days * DAY);

  const fiatValue = between(random, offer.min, Math.min(offer.max, offer.min * 12 + offer.min));
  const amount = q8(Math.max(fiatValue / offer.price, 1e-6));
  const total = Number((amount * offer.price).toFixed(2));

  const base = {
    id,
    offerId: offer.id,
    buyerId,
    sellerId,
    type: offer.type,
    currency: offer.currency,
    amount,
    price: offer.price,
    total,
    paymentMethod: offer.methodIds[0],
    terms: offer.terms,
    escrowFee: q8(amount * 0.001),
    escrowTime: "30",
    createdAt,
    status: outcome,
  };

  if (outcome === "COMPLETED") {
    const confirmDelay = intBetween(random, 3, 46) * 60;
    const paymentConfirmedAt = new Date(createdAt.getTime() + confirmDelay * 1000);
    const completedAt = new Date(paymentConfirmedAt.getTime() + (releaseSeconds ?? 200) * 1000);
    return {
      ...base,
      paymentConfirmedAt,
      completedAt,
      updatedAt: completedAt,
      timeline: [
        { event: "TRADE_INITIATED", message: "Trade initiated", userId: buyerId, createdAt: createdAt.toISOString() },
        { event: "PAYMENT_SENT", message: "Buyer marked the payment as sent", userId: buyerId, createdAt: paymentConfirmedAt.toISOString() },
        { event: "ESCROW_RELEASED", message: "Seller released the escrow", userId: sellerId, createdAt: completedAt.toISOString() },
      ],
      // Settled: nothing is held, which is why history is invisible to the
      // escrow audit and needs no wallet backing at all.
      escrowStatus: "RELEASED",
      escrowAmount: 0,
      paymentReference: `REF-${id.slice(-8).toUpperCase()}`,
    };
  }

  if (outcome === "CANCELLED") {
    const cancelledAt = new Date(createdAt.getTime() + intBetween(random, 4, 55) * 60 * 1000);
    return {
      ...base,
      cancelledAt,
      cancelledBy: random() < 0.5 ? buyerId : sellerId,
      cancellationReason: pick(random, CANCEL_REASONS),
      updatedAt: cancelledAt,
      escrowStatus: "REFUNDED",
      escrowAmount: 0,
      timeline: [
        { event: "TRADE_INITIATED", message: "Trade initiated", userId: buyerId, createdAt: createdAt.toISOString() },
        { event: "TRADE_CANCELLED", message: "Trade cancelled", userId: buyerId, createdAt: cancelledAt.toISOString() },
      ],
    };
  }

  // EXPIRED — the payment window ran out with nothing confirmed.
  const expiredAt = new Date(createdAt.getTime() + (offer.autoCancel ?? 60) * 60 * 1000);
  return {
    ...base,
    updatedAt: expiredAt,
    escrowStatus: "REFUNDED",
    escrowAmount: 0,
    timeline: [
      { event: "TRADE_INITIATED", message: "Trade initiated", userId: buyerId, createdAt: createdAt.toISOString() },
      { event: "TRADE_EXPIRED", message: "Payment window expired", createdAt: expiredAt.toISOString() },
    ],
  };
}

/** An open trade: escrow genuinely HELD, and the wallet arithmetic must cover it. */
function liveTrade({ id, offer, buyerId, sellerId, state, random, now }) {
  const minutesAgo = state === "PENDING" ? intBetween(random, 2, 40) : intBetween(random, 45, 320);
  const createdAt = new Date(now - minutesAgo * 60 * 1000);

  const fiatValue = between(random, offer.min, Math.min(offer.max, offer.min * 6 + offer.min));
  const amount = q8(Math.max(fiatValue / offer.price, 1e-6));
  const total = Number((amount * offer.price).toFixed(2));

  const timeline = [
    {
      event: "TRADE_INITIATED",
      message: "Trade initiated",
      userId: buyerId,
      createdAt: createdAt.toISOString(),
    },
  ];

  let paymentConfirmedAt = null;
  if (state !== "PENDING") {
    paymentConfirmedAt = new Date(createdAt.getTime() + intBetween(random, 4, 30) * 60 * 1000);
    timeline.push({
      event: "PAYMENT_SENT",
      message: "Buyer marked the payment as sent",
      userId: buyerId,
      createdAt: paymentConfirmedAt.toISOString(),
    });
    timeline.push({
      id: `${id}-m1`,
      event: "MESSAGE",
      message: pick(random, TRADE_MESSAGES),
      senderId: buyerId,
      createdAt: paymentConfirmedAt.toISOString(),
    });
  }

  const disputedAt =
    state === "DISPUTED"
      ? new Date((paymentConfirmedAt ?? createdAt).getTime() + 40 * 60 * 1000)
      : null;
  if (disputedAt) {
    timeline.push({
      event: "DISPUTE_OPENED",
      message: "Dispute opened",
      userId: buyerId,
      createdAt: disputedAt.toISOString(),
    });
  }

  return {
    id,
    offerId: offer.id,
    buyerId,
    sellerId,
    type: offer.type,
    currency: offer.currency,
    amount,
    price: offer.price,
    total,
    status: state,
    paymentMethod: offer.methodIds[0],
    terms: offer.terms,
    escrowFee: q8(amount * 0.001),
    escrowTime: "30",
    createdAt,
    updatedAt: disputedAt ?? paymentConfirmedAt ?? createdAt,
    paymentConfirmedAt,
    disputedAt,
    timeline,
    // The whole point of the live set: real, open escrow.
    escrowStatus: "HELD",
    escrowAmount: amount,
    live: true,
  };
}

/**
 * THE HARD CONSTRAINT, RESOLVED.
 *
 * Derives every wallet from what the dataset has actually committed, using the
 * same two sums the end-state audit in `e2e/p2p/api-suite.mjs` uses:
 *
 *     inOrder  ==  SUM(amountConfig.total) over the user's SELL offers in
 *                  ACTIVE / PENDING_APPROVAL / PAUSED
 *              +   SUM(escrowAmount)       over trades where they are the seller
 *                  and escrowStatus = 'HELD'
 *
 * A surplus would be coins frozen against nothing; a shortfall means
 * `initiate-trade` refuses every taker with "Insufficient locked funds for this
 * offer", which reads as a platform bug rather than a seeding one.
 *
 * `p2p_offers.escrowAmount` is set to the offer's own total PLUS whatever its
 * live trades carved out, which is what `holdOfferEscrow` followed by
 * `initiate-trade` leaves behind: the offer still holds the funds, the trade
 * merely owns an attribution to part of them.
 */
function finaliseEscrow({ users, offers, trades, nextId }) {
  const HOLDING_OFFER_STATUS = new Set(["ACTIVE", "PENDING_APPROVAL", "PAUSED"]);
  const HOLDING_TRADE_STATUS = new Set(["PENDING", "PAYMENT_SENT", "DISPUTED"]);

  /** userId -> currency -> held units */
  const held = new Map();
  const add = (userId, currency, amount) => {
    if (!held.has(userId)) held.set(userId, new Map());
    const byCurrency = held.get(userId);
    byCurrency.set(currency, sum8([byCurrency.get(currency) ?? 0, amount]));
  };

  for (const offer of offers) {
    if (offer.type !== "SELL") {
      offer.escrowAmount = 0;
      continue;
    }
    if (!HOLDING_OFFER_STATUS.has(offer.status)) {
      // A closed SELL offer released its collateral; `releaseOfferEscrow` zeroes
      // exactly this column when it does.
      offer.escrowAmount = 0;
      continue;
    }
    offer.escrowAmount = sum8([offer.total, offer.liveTradeEscrow ?? 0]);
    add(offer.userId, offer.currency, offer.total);
  }

  for (const trade of trades) {
    if (trade.escrowStatus !== "HELD") continue;
    if (!HOLDING_TRADE_STATUS.has(trade.status)) continue;
    add(trade.sellerId, trade.currency, trade.escrowAmount);
  }

  const wallets = [];
  const byUser = new Map(users.map((u) => [u.id, u]));

  for (const [userId, byCurrency] of held) {
    // Demo users only. The viewer is never a seller on a demo trade, so their
    // real wallet is never rewritten — see the note on the viewer's history.
    if (!byUser.has(userId)) continue;
    for (const [currency, inOrder] of byCurrency) {
      const asset = ASSETS.find((a) => a.currency === currency) ?? ASSETS[0];
      // Spendable headroom on top of the hold: enough that the account reads as
      // a working merchant rather than one with every coin committed.
      const float = q8((inOrder || 0) * 0.55 + 2000 / asset.usd);
      wallets.push({
        id: nextId("wallet"),
        userId,
        currency,
        walletType: asset.walletType,
        balance: float,
        inOrder: q8(inOrder),
      });
    }
  }

  // Everybody who holds nothing still needs a funded wallet in the assets they
  // quote, or a BUY offer of theirs is one a taker can open but nobody can
  // fund, and the demo's first click is a refusal.
  const covered = new Set(wallets.map((w) => `${w.userId}|${w.currency}`));
  for (const offer of offers) {
    const key = `${offer.userId}|${offer.currency}`;
    if (covered.has(key)) continue;
    const asset = ASSETS.find((a) => a.currency === offer.currency) ?? ASSETS[0];
    covered.add(key);
    wallets.push({
      id: nextId("wallet"),
      userId: offer.userId,
      currency: offer.currency,
      walletType: asset.walletType,
      balance: q8(12000 / asset.usd),
      inOrder: 0,
    });
  }
  // Counterparties take BUY offers in the live set, so they need coins too.
  for (const user of users) {
    if (user.kind !== "counterparty") continue;
    for (const asset of ASSETS) {
      const key = `${user.id}|${asset.currency}`;
      if (covered.has(key)) continue;
      covered.add(key);
      wallets.push({
        id: nextId("wallet"),
        userId: user.id,
        currency: asset.currency,
        walletType: asset.walletType,
        balance: q8(5000 / asset.usd),
        inOrder: 0,
      });
    }
  }

  return wallets;
}
