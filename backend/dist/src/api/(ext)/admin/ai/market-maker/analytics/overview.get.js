"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const utils_1 = require("../utils");
const query_1 = require("@b/utils/query");
const sequelize_1 = require("sequelize");
const console_1 = require("@b/utils/console");
const utils_2 = require("@b/api/finance/currency/utils");
const assessment_1 = require("../utils/assessment");
const market_resolver_1 = require("../utils/venue/market-resolver");
const MARKETS_CAP = 10;
const priced = (rate) => typeof rate === "number" && Number.isFinite(rate) && rate > 0;
const usd = (value) => Number(value.toFixed(2));
const UNKNOWN_DENOMINATION = "UNKNOWN";
exports.metadata = {
    summary: "Get global AI Market Maker analytics overview",
    description: "Global analytics for the AI Market Maker addon. Every money figure is grouped by its own denomination, priced into USD and only then summed; denominations that could not be priced are listed in `unpriced`, which makes every total a lower bound while it is non-empty. The ranked `markets` list is capped at `marketsCap`; every count and total covers the whole population.",
    operationId: "getAiMarketMakerAnalyticsOverview",
    tags: ["Admin", "AI Market Maker", "Analytics"],
    responses: {
        200: {
            description: "Global analytics overview",
            content: {
                "application/json": {
                    schema: utils_1.analyticsOverviewSchema,
                },
            },
        },
        401: query_1.unauthorizedResponse,
        500: query_1.serverErrorResponse,
    },
    requiresAuth: true,
    logModule: "ADMIN_AI",
    logTitle: "Get Market Maker Overview",
    permission: "view.ai.market_maker.analytics",
};
exports.default = async (data) => {
    var _a, _b, _c;
    var _d;
    const { ctx } = data;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Get Market Maker Overview");
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const [marketMakers, botCensus, aiOnlyActivity, engine] = await Promise.all([
        (0, market_resolver_1.hydrateMakerMarkets)(await db_1.models.aiMarketMaker.findAll({
            attributes: [
                "id",
                "marketType",
                "status",
                "targetPrice",
                "lastKnownPrice",
                "priceRangeLow",
                "priceRangeHigh",
                "maxDailyVolume",
                "currentDailyVolume",
                "realLiquidityPercent",
                "updatedAt",
            ],
            include: [
                {
                    model: db_1.models.aiMarketMakerPool,
                    as: "pool",
                    attributes: [
                        "totalValueLocked",
                        "unrealizedPnL",
                        "realizedPnL",
                        "baseCurrencyBalance",
                        "quoteCurrencyBalance",
                        "initialBaseBalance",
                        "initialQuoteBalance",
                    ],
                },
                ...(0, market_resolver_1.makerMarketIncludes)({ attributes: ["id", "currency", "pair"] }),
            ],
        })),
        db_1.models.aiBot.findAll({
            attributes: [
                "marketMakerId",
                [(0, sequelize_1.fn)("COUNT", (0, sequelize_1.literal)("*")), "total"],
                [
                    (0, sequelize_1.fn)("SUM", (0, sequelize_1.literal)("CASE WHEN status = 'ACTIVE' THEN 1 ELSE 0 END")),
                    "active",
                ],
                [(0, sequelize_1.fn)("MAX", (0, sequelize_1.col)("lastTradeAt")), "lastTradeAt"],
            ],
            group: ["marketMakerId"],
            raw: true,
        }),
        db_1.models.aiMarketMakerHistory.count({
            where: {
                createdAt: { [sequelize_1.Op.gte]: oneDayAgo },
                action: "TRADE",
            },
        }),
        (async () => {
            var _a, _b;
            var _c;
            try {
                const mod = await Promise.resolve().then(() => __importStar(require("../utils/engine/MarketMakerEngine")));
                return (_c = (_b = (_a = mod.default) === null || _a === void 0 ? void 0 : _a.getStatus) === null || _b === void 0 ? void 0 : _b.call(_a)) !== null && _c !== void 0 ? _c : null;
            }
            catch (_d) {
                return null;
            }
        })(),
    ]);
    const realActivity = await (async () => {
        try {
            const botIds = (await db_1.models.aiBot.findAll({ attributes: ["id"], raw: true })).map((b) => String(b.id));
            if (!botIds.length)
                return 0;
            const { getBotRealTradesInRange } = await Promise.resolve().then(() => __importStar(require("../utils/scylla/queries")));
            const rows = await getBotRealTradesInRange(botIds, 1);
            return rows.filter((r) => new Date(r.tradeTime) >= oneDayAgo).length;
        }
        catch (error) {
            console_1.logger.warn("AI_MM", `Real-trade count unavailable for the operator overview (${error === null || error === void 0 ? void 0 : error.message}); ` +
                `the figure below counts AI-to-AI trades only and is therefore a LOWER BOUND`);
            return 0;
        }
    })();
    const recentActivity = aiOnlyActivity + realActivity;
    const botsByMarket = new Map();
    let totalBots = 0;
    let activeBots = 0;
    for (const row of botCensus) {
        const total = Number(row.total) || 0;
        const active = Number(row.active) || 0;
        const at = row.lastTradeAt ? new Date(row.lastTradeAt).getTime() : NaN;
        botsByMarket.set(String(row.marketMakerId), {
            total,
            active,
            lastTradeAt: Number.isNaN(at) ? null : at,
        });
        totalBots += total;
        activeBots += active;
    }
    const tvlByQuote = new Map();
    const pnlByQuote = new Map();
    const volumeByBase = new Map();
    const budgetByBase = new Map();
    const activeVolumeByBase = new Map();
    const bucket = (map, code, amount) => {
        var _a;
        if (!Number.isFinite(amount) || amount === 0)
            return;
        map.set(code, ((_a = map.get(code)) !== null && _a !== void 0 ? _a : 0) + amount);
    };
    let activeMarkets = 0;
    const marketsByStatus = { active: 0, paused: 0, stopped: 0 };
    for (const maker of marketMakers) {
        const pool = maker.pool;
        const quote = ((_a = maker.market) === null || _a === void 0 ? void 0 : _a.pair)
            ? String(maker.market.pair)
            : UNKNOWN_DENOMINATION;
        const base = ((_b = maker.market) === null || _b === void 0 ? void 0 : _b.currency)
            ? String(maker.market.currency)
            : UNKNOWN_DENOMINATION;
        if (pool) {
            bucket(tvlByQuote, quote, Number(pool.totalValueLocked) || 0);
            bucket(pnlByQuote, quote, (Number(pool.unrealizedPnL) || 0) + (Number(pool.realizedPnL) || 0));
        }
        bucket(volumeByBase, base, Number(maker.currentDailyVolume) || 0);
        bucket(budgetByBase, base, Math.max(0, Number(maker.maxDailyVolume) || 0));
        if (maker.status === "ACTIVE") {
            activeMarkets++;
            marketsByStatus.active++;
            bucket(activeVolumeByBase, base, Number(maker.currentDailyVolume) || 0);
        }
        else if (maker.status === "PAUSED") {
            marketsByStatus.paused++;
        }
        else if (maker.status === "STOPPED") {
            marketsByStatus.stopped++;
        }
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Pricing the book");
    const denominations = new Set([
        ...tvlByQuote.keys(),
        ...pnlByQuote.keys(),
        ...volumeByBase.keys(),
        ...budgetByBase.keys(),
        ...activeVolumeByBase.keys(),
    ]);
    denominations.delete(UNKNOWN_DENOMINATION);
    const rates = new Map();
    try {
        for (const [currency, rate] of await (0, utils_2.getUsdRates)([...denominations])) {
            rates.set(currency, rate);
        }
        if (denominations.has("USDT") && !priced(rates.get("USDT"))) {
            rates.set("USDT", await (0, utils_2.getUsdtPriceInUSD)());
        }
    }
    catch (error) {
        console_1.logger.warn("ADMIN_AI", `Market maker overview could not price the book: ${(_d = error === null || error === void 0 ? void 0 : error.message) !== null && _d !== void 0 ? _d : error}`);
    }
    const unpriced = new Set();
    const priceBucket = (byCurrency) => {
        let total = 0;
        for (const [currency, amount] of byCurrency) {
            if (!Number.isFinite(amount) || amount === 0)
                continue;
            const rate = rates.get(currency);
            if (!priced(rate)) {
                unpriced.add(currency);
                continue;
            }
            total += amount * rate;
        }
        return total;
    };
    const totalTVL = usd(priceBucket(tvlByQuote));
    const totalPnL = usd(priceBucket(pnlByQuote));
    const volumeToday = usd(priceBucket(volumeByBase));
    const volumeBudgetToday = usd(priceBucket(budgetByBase));
    const total24hVolume = usd(priceBucket(activeVolumeByBase));
    const quoteCodes = new Set();
    for (const maker of marketMakers) {
        const pair = (_c = maker.market) === null || _c === void 0 ? void 0 : _c.pair;
        if (pair)
            quoteCodes.add(String(pair));
    }
    const quoteCurrency = quoteCodes.size === 1 ? [...quoteCodes][0] : null;
    const ranked = marketMakers.map((maker) => {
        var _a;
        const botCounts = (_a = botsByMarket.get(maker.id)) !== null && _a !== void 0 ? _a : {
            total: 0,
            active: 0,
            lastTradeAt: null,
        };
        const pool = maker.pool;
        const targetPrice = Number(maker.targetPrice) || 0;
        const lastKnownPrice = Number(maker.lastKnownPrice) || 0;
        const priceRangeLow = Number(maker.priceRangeLow) || 0;
        const priceRangeHigh = Number(maker.priceRangeHigh) || 0;
        const maxDailyVolume = Number(maker.maxDailyVolume) || 0;
        const currentDailyVolume = Number(maker.currentDailyVolume) || 0;
        const realLiquidityPercent = Number(maker.realLiquidityPercent) || 0;
        const totalValueLocked = Number(pool === null || pool === void 0 ? void 0 : pool.totalValueLocked) || 0;
        const { band, bandPosition: position, quoting: isQuoting, blockers, inventory } = (0, assessment_1.assessMarketMaker)({
            status: maker.status,
            lastKnownPrice,
            targetPrice,
            priceRangeLow,
            priceRangeHigh,
            maxDailyVolume,
            currentDailyVolume,
            realLiquidityPercent,
            activeBots: botCounts.active,
            pool: pool
                ? {
                    totalValueLocked,
                    baseCurrencyBalance: pool.baseCurrencyBalance,
                    quoteCurrencyBalance: pool.quoteCurrencyBalance,
                    initialBaseBalance: pool.initialBaseBalance,
                    initialQuoteBalance: pool.initialQuoteBalance,
                }
                : null,
        });
        return {
            id: maker.id,
            status: maker.status,
            targetPrice,
            lastKnownPrice: lastKnownPrice || null,
            priceRangeLow,
            priceRangeHigh,
            band,
            bandPosition: position,
            quoting: isQuoting,
            blockers,
            inventory,
            currentDailyVolume,
            maxDailyVolume,
            realLiquidityPercent,
            activeBots: botCounts.active,
            totalBots: botCounts.total,
            lastTradeAt: botCounts.lastTradeAt
                ? new Date(botCounts.lastTradeAt).toISOString()
                : null,
            updatedAt: maker.updatedAt,
            severity: (0, assessment_1.severityRank)(maker.status, isQuoting, band),
            pool: maker.pool
                ? {
                    totalValueLocked,
                    realizedPnL: Number(maker.pool.realizedPnL) || 0,
                    unrealizedPnL: Number(maker.pool.unrealizedPnL) || 0,
                    baseCurrencyBalance: Number(maker.pool.baseCurrencyBalance) || 0,
                    quoteCurrencyBalance: Number(maker.pool.quoteCurrencyBalance) || 0,
                }
                : null,
            market: maker.market
                ? {
                    id: maker.market.id,
                    symbol: `${maker.market.currency}/${maker.market.pair}`,
                    currency: maker.market.currency,
                    pair: maker.market.pair,
                }
                : null,
        };
    });
    ranked.sort((a, b) => { var _a, _b; var _c, _d; return a.severity - b.severity ||
        ((_c = (_a = b.pool) === null || _a === void 0 ? void 0 : _a.totalValueLocked) !== null && _c !== void 0 ? _c : 0) - ((_d = (_b = a.pool) === null || _b === void 0 ? void 0 : _b.totalValueLocked) !== null && _d !== void 0 ? _d : 0); });
    const quoting = {
        active: 0,
        inBand: 0,
        atEdge: 0,
        outsideBand: 0,
        unpriced: 0,
        notQuoting: 0,
    };
    const blockerCounts = { bots: 0, pool: 0, budget: 0 };
    for (const row of ranked) {
        if (row.status !== "ACTIVE")
            continue;
        quoting.active++;
        if (!row.quoting) {
            quoting.notQuoting++;
            for (const blocker of row.blockers)
                blockerCounts[blocker] += 1;
        }
        else if (row.band === "out")
            quoting.outsideBand++;
        else if (row.band === "edge")
            quoting.atEdge++;
        else if (row.band === "unknown")
            quoting.unpriced++;
        else
            quoting.inBand++;
    }
    const markets = ranked.slice(0, MARKETS_CAP);
    const marketIndex = ranked.map((row) => ({
        id: row.id,
        status: row.status,
        market: row.market,
    }));
    ctx === null || ctx === void 0 ? void 0 : ctx.success("Get Market Maker Overview retrieved successfully");
    return {
        currency: "USD",
        unpriced: [...unpriced],
        totalTVL,
        total24hVolume,
        volumeToday,
        volumeBudgetToday,
        totalPnL,
        pnlPercent: totalTVL > 0 ? Number(((totalPnL / totalTVL) * 100).toFixed(2)) : null,
        quoteCurrency,
        activeMarkets,
        totalMarkets: marketMakers.length,
        totalBots,
        activeBots,
        recentTradeCount: recentActivity,
        marketsByStatus,
        quoting,
        blockers: blockerCounts,
        markets,
        marketsCap: MARKETS_CAP,
        marketIndex,
        engine,
        lastUpdated: new Date().toISOString(),
    };
};
