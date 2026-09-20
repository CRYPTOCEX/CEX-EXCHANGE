"use strict";

/**
 * Ready-to-run Hummingbot strategy presets.
 *
 * Without these the Strategy Studio starts empty, so an operator has to author a
 * controller config by hand before a single bot can run — and the parameters
 * that matter (spread ladders, refresh cadence, XEMM profitability floors) are
 * exactly the ones you cannot guess correctly on the first try.
 *
 * Every preset below mirrors the YAML shipped in `hummingbot/conf/controllers/`,
 * so what an operator runs from this panel and what a user downloads are the
 * same strategy. Field names match what `validateStrategyConfig` in
 * `hb/utils/strategyYaml.ts` actually consumes — a look-alike key that no code
 * reads is accepted silently and the bot quotes with defaults nobody chose.
 *
 * Seeded as `published` so they appear to users immediately. They are starting
 * points sized conservatively, not tuned strategies — sizes assume a modest
 * account and XEMM targets assume the fee schedule documented alongside.
 */

/**
 * PRESETS DESCRIBE BEHAVIOUR, NOT A MARKET.
 *
 * They used to be named for pairs ("PMM — BTC/USDT (spot)"), which made sense
 * when the pair lived on the preset. It no longer does: an instance selects its
 * own market, so a pair in the name is now actively misleading — you could pick
 * "PMM — BTC/USDT" and run it on TON-USDT. Worse, it implied one preset per
 * pair, when the thing a preset actually captures — spread ladder, refresh
 * cadence, risk barriers — depends on how DEEP and how VOLATILE a market is,
 * not on which asset it is.
 *
 * So the axis that matters is liquidity. Each profile below states the market
 * conditions it suits; the operator picks the profile, then picks the market.
 *
 * `pair` is retained only as the default used by the user-facing download
 * (a self-hosting user gets a complete file), and is overridden by every
 * instance. It is stored in dash form to match the market picker's values.
 */

/** Shared risk barriers. Spreads/cadence are what actually vary by profile. */
const BARRIERS = {
  stopLoss: 0.02,
  takeProfit: 0.005,
  timeLimit: 3600,
};

const DEFAULT_PAIR = "BTC-USDT";

/**
 * The pair-named presets that shipped before markets moved onto the instance.
 * Removed on seed so the Studio does not carry two generations side by side.
 */
const LEGACY_NAMES = [
  "PMM — BTC/USDT (spot)",
  "PMM — ETH/USDT (spot)",
  "PMM — mid-cap alt (wider spreads)",
  "PMM — BTC/USDT perpetual (3x)",
  "XEMM — BTC/USDT hedged on Binance",
  "XEMM — BTC/USDT hedged on MEXC",
];

const presets = [
  {
    name: "PMM — Tight (deep, liquid markets)",
    description:
      "Three levels a side starting at 5 bps, refreshed every 8s. Only for markets with a genuinely deep book — on a thin one these quotes sit at the top and get picked off by anyone with a faster feed. Pick the market on the instance; this profile is about how tightly you quote it, not which asset it is.",
    family: "pmm",
    pair: DEFAULT_PAIR,
    makerConnector: "bicrypto",
    takerConnector: null,
    config: {
      market: "spot",
      totalAmountQuote: 1000,
      leverage: 1,
      buySpreads: [0.0005, 0.0015, 0.003],
      sellSpreads: [0.0005, 0.0015, 0.003],
      buyAmountsPct: [15, 30, 55],
      sellAmountsPct: [15, 30, 55],
      // 8s: the ecosystem websocket publishes book snapshots roughly every
      // 200ms, so this absorbs fills without a cancel/replace storm.
      executorRefreshTime: 8,
      cooldownTime: 2,
      ...BARRIERS,
    },
  },
  {
    name: "PMM — Balanced (start here)",
    description:
      "The sensible default when you do not yet know how deep your book is: 20 bps out to 100 bps, refreshed every 12s. Wide enough not to be run over, tight enough to actually trade. Run this first, watch the fill rate for an hour, then move to Tight or Wide.",
    family: "pmm",
    pair: DEFAULT_PAIR,
    makerConnector: "bicrypto",
    takerConnector: null,
    config: {
      market: "spot",
      totalAmountQuote: 1000,
      leverage: 1,
      buySpreads: [0.002, 0.005, 0.01],
      sellSpreads: [0.002, 0.005, 0.01],
      buyAmountsPct: [20, 30, 50],
      sellAmountsPct: [20, 30, 50],
      executorRefreshTime: 12,
      cooldownTime: 4,
      ...BARRIERS,
    },
  },
  {
    name: "PMM — Wide (thin or volatile markets)",
    description:
      "For a new listing, a low-volume pair, or anything that moves in jumps: 50 bps out to 300 bps, refreshed every 25s, with a wider stop. Expect few fills and a large edge on each. This is also the right profile for a market YOU are seeding, where you are the only liquidity.",
    family: "pmm",
    pair: DEFAULT_PAIR,
    makerConnector: "bicrypto",
    takerConnector: null,
    config: {
      market: "spot",
      totalAmountQuote: 500,
      leverage: 1,
      buySpreads: [0.005, 0.015, 0.03],
      sellSpreads: [0.005, 0.015, 0.03],
      buyAmountsPct: [20, 30, 50],
      sellAmountsPct: [20, 30, 50],
      executorRefreshTime: 25,
      cooldownTime: 8,
      stopLoss: 0.05,
      takeProfit: 0.012,
      timeLimit: 3600,
    },
  },
  {
    name: "PMM — Perpetual, conservative (3x)",
    description:
      "The Balanced ladder on a perpetual contract at 3x. Adds funding-rate exposure and liquidation risk on top of inventory drift — do not raise leverage without liquidation alerts wired up. The backend rejects anything above the market's maxLeverage. Instances using this offer perpetual markets only.",
    family: "pmm",
    pair: DEFAULT_PAIR,
    makerConnector: "bicrypto_perpetual",
    takerConnector: null,
    config: {
      market: "perp",
      totalAmountQuote: 1000,
      leverage: 3,
      buySpreads: [0.002, 0.005, 0.01],
      sellSpreads: [0.002, 0.005, 0.01],
      buyAmountsPct: [20, 30, 50],
      sellAmountsPct: [20, 30, 50],
      executorRefreshTime: 12,
      cooldownTime: 4,
      ...BARRIERS,
    },
  },
  {
    name: "XEMM — Hedged on Binance",
    description:
      "Quote on your own book and hedge every fill on Binance. Use when your book is thin and Binance's is deep. Targets start at 10 bps, above a typical fee-plus-slippage floor — recalculate against YOUR fee schedule first, because a target below the floor bleeds on every hedge. The hedge uses the same pair you select for the instance, so Binance must list it.",
    family: "xemm",
    pair: DEFAULT_PAIR,
    makerConnector: "bicrypto",
    takerConnector: "binance",
    config: {
      // takerPair deliberately omitted: buildControllerYaml defaults it to the
      // maker pair, so the hedge follows whichever market the instance selects
      // instead of being pinned to whatever this preset was seeded with.
      buyLevels: [
        { targetProfitability: 0.001, amountQuote: 200 },
        { targetProfitability: 0.002, amountQuote: 300 },
      ],
      sellLevels: [
        { targetProfitability: 0.001, amountQuote: 200 },
        { targetProfitability: 0.002, amountQuote: 300 },
      ],
      minProfitability: 0.0008,
      maxProfitability: 0.003,
    },
  },
  {
    name: "XEMM — Hedged on MEXC",
    description:
      "The same cross-exchange strategy hedging on MEXC. Requires `connect mexc` inside Hummingbot and a funded MEXC account above the per-level amounts. The hedge uses the same pair you select for the instance, so MEXC must list it.",
    family: "xemm",
    pair: DEFAULT_PAIR,
    makerConnector: "bicrypto",
    takerConnector: "mexc",
    config: {
      buyLevels: [
        { targetProfitability: 0.001, amountQuote: 200 },
        { targetProfitability: 0.002, amountQuote: 300 },
      ],
      sellLevels: [
        { targetProfitability: 0.001, amountQuote: 200 },
        { targetProfitability: 0.002, amountQuote: 300 },
      ],
      minProfitability: 0.0008,
      maxProfitability: 0.003,
    },
  },
];

async function tableExists(queryInterface) {
  try {
    await queryInterface.describeTable("hb_strategy_preset");
    return true;
  } catch {
    // The Hummingbot extension is not installed on this server — its models
    // never synced, so there is no table to seed. Not an error.
    return false;
  }
}

module.exports = {
  async up(queryInterface, Sequelize) {
    if (!(await tableExists(queryInterface))) return;

    const [existing] = await queryInterface.sequelize.query(
      "SELECT name FROM hb_strategy_preset"
    );
    const have = new Set(existing.map((r) => r.name));

    // Drop the pair-named presets this seeder used to ship.
    //
    // The market moved onto the instance, so a preset called "PMM — BTC/USDT"
    // is now actively misleading: nothing stops it running on TON-USDT, and the
    // name implies one preset per pair when what a preset really captures is
    // how tightly to quote. Listed explicitly rather than "delete anything not
    // in `presets`" so an operator's own presets are never touched.
    //
    // presetId is SET NULL on delete, so any instance pointing at one of these
    // loses its strategy and must pick a new profile — a visible, one-time
    // choice, which is the point of replacing them rather than renaming.
    if (LEGACY_NAMES.length) {
      await queryInterface.bulkDelete("hb_strategy_preset", {
        name: { [Sequelize.Op.in]: LEGACY_NAMES },
      });
      for (const n of LEGACY_NAMES) have.delete(n);
    }

    // Insert only what is missing. An operator who edited or deleted a preset
    // made a decision — re-seeding over it would undo that.
    const rows = presets
      .filter((p) => !have.has(p.name))
      .map((p) => ({
        id: Sequelize.literal("(UUID())"),
        name: p.name,
        description: p.description,
        family: p.family,
        pair: p.pair,
        makerConnector: p.makerConnector,
        takerConnector: p.takerConnector,
        config: JSON.stringify(p.config),
        status: "published",
        version: 1,
        createdBy: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      }));

    if (rows.length === 0) return;
    await queryInterface.bulkInsert("hb_strategy_preset", rows);
  },

  async down(queryInterface, Sequelize) {
    if (!(await tableExists(queryInterface))) return;
    await queryInterface.bulkDelete("hb_strategy_preset", {
      name: { [Sequelize.Op.in]: presets.map((p) => p.name) },
    });
  },
};
