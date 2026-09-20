"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const utils_1 = require("../../utils");
const query_1 = require("@b/utils/query");
const error_1 = require("@b/utils/error");
const sequelize_1 = require("sequelize");
const console_1 = require("@b/utils/console");
const MarketMakerEngine_1 = __importDefault(require("../../utils/engine/MarketMakerEngine"));
const queries_1 = require("../../utils/scylla/queries");
const market_resolver_1 = require("../../utils/venue/market-resolver");
const fill_measurement_1 = require("../../utils/venue/fill-measurement");
const operator_trade_feed_1 = require("../../utils/analytics/operator-trade-feed");
function getLiveMarketPrice(marketMaker) {
    var _a, _b;
    try {
        const instance = (_a = MarketMakerEngine_1.default.getMarketManager()) === null || _a === void 0 ? void 0 : _a.getMarketInstance(marketMaker.id);
        const live = (_b = instance === null || instance === void 0 ? void 0 : instance.getCurrentPriceNumber) === null || _b === void 0 ? void 0 : _b.call(instance);
        return typeof live === "number" && Number.isFinite(live) && live > 0
            ? live
            : null;
    }
    catch (_c) {
        return null;
    }
}
function firstUsablePrice(...candidates) {
    for (const candidate of candidates) {
        const value = Number(candidate);
        if (Number.isFinite(value) && value > 0)
            return value;
    }
    return 0;
}
function isoOrRaw(value) {
    const when = new Date(value);
    return Number.isNaN(when.getTime()) ? String(value) : when.toISOString();
}
const TARGET_TOLERANCE = 0.02;
const REAL_TRADE_MAX_WINDOW_DAYS = 31;
const HISTORY_ROW_CAP = 5000;
exports.metadata = {
    summary: "Get market performance analytics",
    description: "Performance of one AI market maker over a period. Every trade-derived figure is a UNION of the AI-to-AI history table and the per-fill ledger of trades against real customers; `sources` says how much each store contributed and whether either was incomplete. `targetAchievement` compares prints against the target as it stands NOW — read its `caveat`.",
    operationId: "getAiMarketMakerPerformance",
    tags: ["Admin", "AI Market Maker", "Analytics"],
    parameters: [
        {
            index: 0,
            name: "marketId",
            in: "path",
            required: true,
            description: "ID of the AI Market Maker",
            schema: { type: "string" },
        },
        {
            name: "period",
            in: "query",
            required: false,
            description: "Time period (1h, 24h, 7d, 30d)",
            schema: { type: "string", default: "24h" },
        },
    ],
    responses: {
        200: {
            description: "Market performance data",
            content: {
                "application/json": {
                    schema: utils_1.marketPerformanceSchema,
                },
            },
        },
        401: query_1.unauthorizedResponse,
        404: (0, query_1.notFoundMetadataResponse)("AI Market Maker"),
        500: query_1.serverErrorResponse,
    },
    requiresAuth: true,
    logModule: "ADMIN_AI",
    logTitle: "Get Market Maker Performance",
    permission: "view.ai.market_maker.analytics",
};
exports.default = async (data) => {
    var _a;
    const { params, query, ctx } = data;
    const period = query.period || "24h";
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Get Market Maker Performance");
    const marketMaker = (0, market_resolver_1.hydrateMakerMarket)(await db_1.models.aiMarketMaker.findByPk(params.marketId, {
        include: [
            { model: db_1.models.aiMarketMakerPool, as: "pool" },
            ...(0, market_resolver_1.makerMarketIncludes)(),
        ],
    }));
    if (!marketMaker) {
        throw (0, error_1.createError)(404, "AI Market Maker not found");
    }
    const periodMs = {
        "1h": 60 * 60 * 1000,
        "24h": 24 * 60 * 60 * 1000,
        "7d": 7 * 24 * 60 * 60 * 1000,
        "30d": 30 * 24 * 60 * 60 * 1000,
    };
    const startTime = new Date(Date.now() - (periodMs[period] || periodMs["24h"]));
    const [history, bots] = await Promise.all([
        db_1.models.aiMarketMakerHistory.findAll({
            where: {
                marketMakerId: params.marketId,
                createdAt: { [sequelize_1.Op.gte]: startTime },
            },
            order: [["createdAt", "DESC"]],
            limit: HISTORY_ROW_CAP + 1,
        }),
        db_1.models.aiBot.findAll({
            where: { marketMakerId: params.marketId },
            attributes: ["id", "firstRealTradeAt"],
        }),
    ]);
    const truncated = history.length > HISTORY_ROW_CAP;
    if (truncated)
        history.length = HISTORY_ROW_CAP;
    history.reverse();
    const aiOnlyPrints = history
        .filter((h) => h.action === "TRADE")
        .map((h) => { var _a, _b; var _c, _d; return ({
        timestamp: isoOrRaw(h.createdAt),
        price: Number(h.priceAtAction),
        amount: Number((_d = (_c = (_a = h.details) === null || _a === void 0 ? void 0 : _a.amount) !== null && _c !== void 0 ? _c : (_b = h.details) === null || _b === void 0 ? void 0 : _b.volume) !== null && _d !== void 0 ? _d : 0),
        type: "AI_ONLY",
    }); });
    const botIds = bots.map((b) => String(b.id));
    const ledgerWindow = (0, operator_trade_feed_1.resolveRealTradeWindow)({
        startDate: startTime,
        maxDays: REAL_TRADE_MAX_WINDOW_DAYS,
    });
    const unreadableBots = [];
    let ledgerUnavailable = null;
    let ledger = [];
    if (botIds.length) {
        try {
            ledger = await (0, queries_1.getBotRealTradesInRange)(botIds, ledgerWindow.days, unreadableBots);
        }
        catch (error) {
            ledgerUnavailable = String((_a = error === null || error === void 0 ? void 0 : error.message) !== null && _a !== void 0 ? _a : error);
            console_1.logger.warn("ADMIN_AI", `Real-fill ledger unavailable for market maker ${params.marketId} ` +
                `(${ledgerUnavailable}); every trade figure on this performance ` +
                `payload counts AI-to-AI prints only and is therefore a LOWER BOUND`);
        }
    }
    const realPrints = ledger
        .filter((t) => {
        const when = new Date(t.tradeTime).getTime();
        return !Number.isNaN(when) && when >= startTime.getTime();
    })
        .map((t) => ({
        timestamp: isoOrRaw(t.tradeTime),
        price: t.price,
        amount: t.amount,
        type: "REAL",
    }));
    const summary = (0, operator_trade_feed_1.summarisePerformancePrints)([...aiOnlyPrints, ...realPrints]);
    const targetForPeriod = Number(marketMaker.targetPrice) || 0;
    const achievement = (0, operator_trade_feed_1.targetAchievement)(summary.pricePoints, {
        target: targetForPeriod,
        tolerance: TARGET_TOLERANCE,
    });
    const priceHistory = [
        ...history
            .filter((h) => h.action === "TARGET_CHANGE" ||
            (h.action === "START" && Number(h.priceAtAction) > 0))
            .map((h) => ({
            timestamp: isoOrRaw(h.createdAt),
            price: Number(h.priceAtAction),
            targetPrice: h.action === "TARGET_CHANGE" ? Number(h.priceAtAction) : null,
            source: h.action,
        })),
        ...summary.pricePoints.map((p) => ({
            timestamp: p.timestamp,
            price: p.price,
            targetPrice: null,
            source: p.type,
        })),
    ].sort((a, b) => Date.parse(a.timestamp) - Date.parse(b.timestamp));
    priceHistory.push({
        timestamp: new Date().toISOString(),
        price: firstUsablePrice(getLiveMarketPrice(marketMaker), marketMaker.lastKnownPrice, marketMaker.targetPrice),
        targetPrice: targetForPeriod || null,
        source: "CURRENT",
    });
    const ledgerBeginsAt = bots.reduce((min, b) => {
        if (!b.firstRealTradeAt)
            return min;
        const t = new Date(b.firstRealTradeAt);
        if (Number.isNaN(t.getTime()))
            return min;
        return min === null || t < min ? t : min;
    }, null);
    const epoch = (0, operator_trade_feed_1.ledgerEpochCoverage)({
        periodStart: startTime,
        ledgerBeginsAt,
    });
    const realReason = ledgerUnavailable
        ? `the real-fill ledger could not be read at all (${ledgerUnavailable}), so no real ` +
            `fill is counted in any figure on this payload`
        : unreadableBots.length
            ? `the real-fill ledger could not be read for ${unreadableBots.length} of ` +
                `${botIds.length} bot(s), so real fills are missing from these figures` +
                (epoch.reason ? `; ${epoch.reason}` : "")
            : epoch.reason;
    const realComplete = epoch.covered && unreadableBots.length === 0 && !ledgerUnavailable;
    const aiOnlyReason = truncated
        ? `only the newest ${HISTORY_ROW_CAP} history rows in this period were read, so the ` +
            `OLDEST part of the period is missing its AI-to-AI prints`
        : null;
    const undatedReason = summary.undatedPrints
        ? `${summary.undatedPrints} print(s) carried a timestamp that could not be read: they ` +
            `are counted in metrics.totalTrades and metrics.periodVolume but appear on neither chart`
        : null;
    const pool = marketMaker.pool;
    ctx === null || ctx === void 0 ? void 0 : ctx.success("Get Market Maker Performance retrieved successfully");
    return {
        marketId: params.marketId,
        period,
        market: marketMaker.market,
        measurement: (0, fill_measurement_1.fillMeasurement)(marketMaker),
        currentPrice: firstUsablePrice(getLiveMarketPrice(marketMaker), marketMaker.lastKnownPrice, marketMaker.targetPrice),
        targetPrice: targetForPeriod,
        priceHistory,
        volumeHistory: summary.volumeHistory,
        targetAchievementRate: achievement.rate,
        targetAchievement: {
            ...achievement,
            measuredAgainst: "CURRENT_TARGET",
            caveat: "Every print in the period is compared against the target as it stands NOW. " +
                "The target can be moved inside the period — priceHistory carries a TARGET_CHANGE " +
                "point for each time it was — and neither store records the target that was in " +
                "force at the moment of a print, so this is NOT a measure of how well the market " +
                "tracked its target through the period. It answers one question: what share of " +
                "this period's prints sit within the tolerance of today's target.",
        },
        truncated,
        metrics: {
            totalTrades: summary.totalTrades,
            aiOnlyTrades: summary.aiOnlyTrades,
            realTrades: summary.realTrades,
            avgTradeSize: summary.avgTradeSize,
            periodVolume: summary.periodVolume,
            totalVolume: Number(marketMaker.currentDailyVolume) || 0,
            tvl: Number(pool === null || pool === void 0 ? void 0 : pool.totalValueLocked) || 0,
            unrealizedPnL: Number(pool === null || pool === void 0 ? void 0 : pool.unrealizedPnL) || 0,
            realizedPnL: Number(pool === null || pool === void 0 ? void 0 : pool.realizedPnL) || 0,
        },
        sources: {
            aiOnly: {
                store: "aiMarketMakerHistory",
                trades: summary.aiOnlyTrades,
                complete: !truncated,
                reason: aiOnlyReason,
            },
            real: {
                store: "ai_bot_real_trades",
                trades: summary.realTrades,
                windowDays: ledgerWindow.days,
                windowStart: ledgerWindow.windowStart.toISOString(),
                ledgerBeginsAt: ledgerBeginsAt ? ledgerBeginsAt.toISOString() : null,
                botsQueried: botIds.length,
                unreadableBots: unreadableBots.length,
                complete: realComplete,
                reason: realReason,
            },
            undatedPrints: summary.undatedPrints,
            complete: !truncated && realComplete && summary.undatedPrints === 0,
            reason: [aiOnlyReason, realReason, undatedReason].filter(Boolean).join(" — ") ||
                null,
        },
        status: marketMaker.status,
    };
};
