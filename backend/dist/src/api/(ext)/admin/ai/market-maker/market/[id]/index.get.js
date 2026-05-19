"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const utils_1 = require("../../utils");
const errors_1 = require("@b/utils/schema/errors");
const error_1 = require("@b/utils/error");
const queries_1 = require("../../utils/scylla/queries");
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
                        },
                    },
                },
            },
        },
        401: errors_1.unauthorizedResponse,
        404: (0, errors_1.notFoundResponse)("AI Market Maker Market"),
        500: errors_1.serverErrorResponse,
    },
    permission: "view.ai.market-maker.market",
    requiresAuth: true,
    logModule: "ADMIN_AI",
    logTitle: "Get Market Maker Market",
};
exports.default = async (data) => {
    const { params, ctx } = data;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Get Market Maker Market");
    const marketMaker = await db_1.models.aiMarketMaker.findByPk(params.id, {
        include: [
            {
                model: db_1.models.aiMarketMakerPool,
                as: "pool",
            },
            {
                model: db_1.models.ecosystemMarket,
                as: "market",
            },
            {
                model: db_1.models.aiBot,
                as: "bots",
            },
        ],
    });
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
    ctx === null || ctx === void 0 ? void 0 : ctx.success("Get Market Maker Market retrieved successfully");
    return {
        ...marketMaker.toJSON(),
        bots: enhancedBots,
        recentActivity,
    };
};
