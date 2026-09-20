"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const utils_1 = require("../../utils");
const errors_1 = require("@b/utils/schema/errors");
const error_1 = require("@b/utils/error");
const queries_1 = require("../../utils/scylla/queries");
const assessment_1 = require("../../utils/assessment");
const market_resolver_1 = require("../../utils/venue/market-resolver");
const external_1 = require("../../utils/engine/external");
const PriceProcess_1 = require("../../utils/engine/volatility/PriceProcess");
exports.metadata = {
    summary: "Get AI Market Maker market by ID",
    operationId: "getAiMarketMakerMarketById",
    tags: ["Admin", "AI Market Maker", "Market"],
    description: "Retrieves comprehensive details of a specific AI Market Maker market including pool balances, P&L tracking, bot configurations with performance statistics from both MySQL and ScyllaDB, ecosystem market details, and recent activity history (last 50 entries).",
    parameters: [
        {
            index: 0,
            name: "id",
            in: "path",
            required: true,
            description: "ID of the AI Market Maker to retrieve",
            schema: { type: "string" },
        },
    ],
    responses: {
        200: {
            description: "AI Market Maker details",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            ...utils_1.aiMarketMakerSchema,
                            pool: {
                                type: "object",
                                description: "Pool details",
                            },
                            market: {
                                type: "object",
                                description: "Ecosystem market details",
                            },
                            bots: {
                                type: "array",
                                description: "Bot configurations",
                            },
                            recentActivity: {
                                type: "array",
                                description: "Recent activity log",
                            },
                            assessment: {
                                type: "object",
                                description: "Trade-gate verdict, price-band position and pool inventory skew — the same reading the dashboard ranks markets by",
                            },
                            tether: {
                                type: "object",
                                description: "External reference price, tracking error and the travelling containment band. Verdict is one of NOT_TETHERED, NO_REFERENCE, ADRIFT, CONVERGING, TRACKING",
                            },
                            rangeAdequacy: {
                                type: "object",
                                description: "Half-band width in stationary standard deviations, and whether it clears the 2.5-sigma floor below which the containment leash becomes a predictable edge",
                            },
                        },
                    },
                },
            },
        },
        401: errors_1.unauthorizedResponse,
        404: (0, errors_1.notFoundResponse)("AI Market Maker Market"),
        500: errors_1.serverErrorResponse,
    },
    permission: "view.ai.market_maker.market",
    requiresAuth: true,
    logModule: "ADMIN_AI",
    logTitle: "Get Market Maker Market",
};
exports.default = async (data) => {
    const { params, ctx } = data;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Get Market Maker Market");
    const marketMaker = (0, market_resolver_1.hydrateMakerMarket)(await db_1.models.aiMarketMaker.findByPk(params.id, {
        include: [
            {
                model: db_1.models.aiMarketMakerPool,
                as: "pool",
            },
            ...(0, market_resolver_1.makerMarketIncludes)(),
            {
                model: db_1.models.aiBot,
                as: "bots",
            },
        ],
    }));
    if (!marketMaker) {
        throw (0, error_1.createError)(404, "AI Market Maker not found");
    }
    const recentActivity = await db_1.models.aiMarketMakerHistory.findAll({
        where: { marketMakerId: params.id },
        order: [["createdAt", "DESC"]],
        limit: 50,
    });
    const marketMakerAny = marketMaker;
    const ecosystemMarketId = marketMakerAny.marketId;
    const botTradeStats = await (0, queries_1.getBotTradeStats)(ecosystemMarketId);
    const enhancedBots = (marketMakerAny.bots || []).map((bot) => {
        const scyllaStats = botTradeStats.get(bot.id) || { tradeCount: 0, totalVolume: 0 };
        const totalTrades = Math.max(bot.dailyTradeCount || 0, scyllaStats.tradeCount);
        const volume = Number(bot.totalVolume || 0) > 0 ? Number(bot.totalVolume) : scyllaStats.totalVolume;
        return {
            ...bot.toJSON(),
            botType: bot.personality,
            dailyTradeCount: totalTrades,
            realTradesExecuted: bot.realTradesExecuted || 0,
            profitableTrades: bot.profitableTrades || 0,
            totalVolume: volume,
            totalRealizedPnL: bot.totalRealizedPnL || 0,
            currentPosition: bot.currentPosition || 0,
            avgEntryPrice: bot.avgEntryPrice || 0,
            tradesExecuted: totalTrades,
            totalPnL: bot.totalRealizedPnL || 0,
            stats: {
                totalTrades,
                successRate: bot.realTradesExecuted > 0
                    ? (bot.profitableTrades || 0) / bot.realTradesExecuted
                    : 0,
                avgProfitPerTrade: bot.realTradesExecuted > 0
                    ? (bot.totalRealizedPnL || 0) / bot.realTradesExecuted
                    : 0,
                isActive: bot.status === "ACTIVE",
                timeSinceLastTrade: bot.lastTradeAt
                    ? Date.now() - new Date(bot.lastTradeAt).getTime()
                    : null,
            },
        };
    });
    const pool = marketMakerAny.pool;
    const assessment = (0, assessment_1.assessMarketMaker)({
        status: marketMaker.status,
        lastKnownPrice: marketMaker.lastKnownPrice,
        targetPrice: marketMaker.targetPrice,
        priceRangeLow: marketMaker.priceRangeLow,
        priceRangeHigh: marketMaker.priceRangeHigh,
        maxDailyVolume: marketMaker.maxDailyVolume,
        currentDailyVolume: marketMaker.currentDailyVolume,
        realLiquidityPercent: marketMaker.realLiquidityPercent,
        activeBots: enhancedBots.filter((bot) => bot.status === "ACTIVE").length,
        pool: pool
            ? {
                totalValueLocked: pool.totalValueLocked,
                baseCurrencyBalance: pool.baseCurrencyBalance,
                quoteCurrencyBalance: pool.quoteCurrencyBalance,
                initialBaseBalance: pool.initialBaseBalance,
                initialQuoteBalance: pool.initialQuoteBalance,
            }
            : null,
    });
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Assess tether and price range");
    const priceMode = marketMakerAny.priceMode || "AUTONOMOUS";
    const externalSymbol = marketMakerAny.externalSymbol;
    let externalPrice = null;
    if (priceMode !== "AUTONOMOUS" && externalSymbol) {
        try {
            externalPrice = await new external_1.ExternalPriceSync().getExternalPrice(externalSymbol);
        }
        catch (_a) {
            externalPrice = null;
        }
    }
    const tether = {
        ...(0, external_1.assessTetherViability)({
            priceMode,
            externalPrice,
            externalSymbol,
            targetPrice: marketMaker.targetPrice,
            priceRangeLow: marketMaker.priceRangeLow,
            priceRangeHigh: marketMaker.priceRangeHigh,
            correlationStrength: marketMakerAny.correlationStrength,
        }),
        priceMode,
        externalSymbol,
        externalPrice,
    };
    let rangeAdequacy = null;
    try {
        rangeAdequacy = PriceProcess_1.PriceProcess.assessRangeAdequacy({
            priceRangeLow: Number(marketMaker.priceRangeLow),
            priceRangeHigh: Number(marketMaker.priceRangeHigh),
            anchorPrice: Number(marketMaker.targetPrice),
            baseVolatilityPercent: Number(marketMakerAny.baseVolatility),
            volatilityMultiplier: Number(marketMakerAny.volatilityMultiplier),
        });
    }
    catch (_b) {
        rangeAdequacy = null;
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.success("Get Market Maker Market retrieved successfully");
    return {
        ...marketMaker.toJSON(),
        bots: enhancedBots,
        recentActivity,
        assessment,
        tether,
        rangeAdequacy,
    };
};
