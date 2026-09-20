"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const utils_1 = require("../../../utils");
const query_1 = require("@b/utils/query");
const error_1 = require("@b/utils/error");
const market_resolver_1 = require("../../../utils/venue/market-resolver");
exports.metadata = {
    summary: "Get detailed information for a specific AI Market Maker bot",
    operationId: "getMarketMakerBotById",
    tags: ["Admin", "AI Market Maker", "Bot"],
    description: "Retrieves comprehensive details for a specific AI bot, including its configuration, current status, performance metrics, and recent trading activity. Returns calculated performance statistics such as win rate, total volume, trades remaining today, and associated market maker context.",
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
            index: 1,
            name: "botId",
            in: "path",
            required: true,
            description: "ID of the bot to retrieve",
            schema: { type: "string" },
        },
    ],
    responses: {
        200: {
            description: "Detailed bot information with performance metrics and context",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            ...utils_1.aiBotSchema,
                            marketMaker: {
                                type: "object",
                                description: "Associated market maker information",
                                properties: {
                                    id: {
                                        type: "string",
                                        description: "Market maker ID",
                                    },
                                    status: {
                                        type: "string",
                                        description: "Market maker status",
                                    },
                                    market: {
                                        type: "object",
                                        description: "Associated ecosystem market details",
                                    },
                                },
                            },
                            performance: {
                                type: "object",
                                description: "Detailed performance metrics for the bot",
                                properties: {
                                    totalTrades: {
                                        type: "number",
                                        description: "Total number of trades executed",
                                    },
                                    successfulTrades: {
                                        type: "number",
                                        description: "Number of successful trades",
                                    },
                                    failedTrades: {
                                        type: "number",
                                        description: "Number of failed trades",
                                    },
                                    winRate: {
                                        type: "number",
                                        description: "Win rate percentage",
                                    },
                                    avgTradeSize: {
                                        type: "number",
                                        description: "Average trade size",
                                    },
                                    totalVolume: {
                                        type: "number",
                                        description: "Total trading volume",
                                    },
                                    profitLoss: {
                                        type: "number",
                                        description: "Total profit/loss",
                                    },
                                    tradesRemainingToday: {
                                        type: "number",
                                        description: "Number of trades remaining for today based on daily limit",
                                    },
                                },
                            },
                            recentTrades: {
                                type: "array",
                                description: "List of recent trades executed by this bot",
                                items: {
                                    type: "object",
                                },
                            },
                        },
                    },
                },
            },
        },
        401: query_1.unauthorizedResponse,
        404: (0, query_1.notFoundMetadataResponse)("Bot"),
        500: query_1.serverErrorResponse,
    },
    requiresAuth: true,
    logModule: "ADMIN_AI",
    logTitle: "Get Market Maker Bot",
    permission: "view.ai.market_maker.bot",
};
exports.default = async (data) => {
    var _a, _b, _c;
    const { params, ctx } = data;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Get Market Maker Bot");
    const bot = await db_1.models.aiBot.findOne({
        where: {
            id: params.botId,
            marketMakerId: params.marketId,
        },
    });
    if (!bot) {
        throw (0, error_1.createError)(404, "Bot not found");
    }
    const marketMaker = (0, market_resolver_1.hydrateMakerMarket)(await db_1.models.aiMarketMaker.findByPk(params.marketId, {
        include: [...(0, market_resolver_1.makerMarketIncludes)()],
    }));
    const botAny = bot;
    const realTrades = (_a = botAny.realTradesExecuted) !== null && _a !== void 0 ? _a : 0;
    const profitable = (_b = botAny.profitableTrades) !== null && _b !== void 0 ? _b : 0;
    const performance = {
        totalTrades: bot.dailyTradeCount || 0,
        realTradesExecuted: realTrades,
        profitableTrades: profitable,
        winRate: realTrades > 0 ? (profitable / realTrades) * 100 : null,
        avgTradeSize: bot.avgOrderSize,
        totalVolume: Number((_c = botAny.totalVolume) !== null && _c !== void 0 ? _c : 0),
        tradesRemainingToday: Math.max(0, (bot.maxDailyTrades || 0) - (bot.dailyTradeCount || 0)),
    };
    const recentTrades = [];
    ctx === null || ctx === void 0 ? void 0 : ctx.success("Get Market Maker Bot retrieved successfully");
    return {
        ...bot.toJSON(),
        marketMaker: {
            id: marketMaker === null || marketMaker === void 0 ? void 0 : marketMaker.id,
            status: marketMaker === null || marketMaker === void 0 ? void 0 : marketMaker.status,
            market: marketMaker === null || marketMaker === void 0 ? void 0 : marketMaker.market,
        },
        performance,
        recentTrades,
    };
};
