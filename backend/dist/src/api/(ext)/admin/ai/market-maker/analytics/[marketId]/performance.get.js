"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const utils_1 = require("../../utils");
const query_1 = require("@b/utils/query");
const error_1 = require("@b/utils/error");
const sequelize_1 = require("sequelize");
exports.metadata = {
    summary: "Get market performance analytics",
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
    permission: "view.ai.market-maker.analytics",
};
exports.default = async (data) => {
    var _a, _b;
    const { params, query, ctx } = data;
    const period = query.period || "24h";
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Get Market Maker Performance");
    const marketMaker = await db_1.models.aiMarketMaker.findByPk(params.marketId, {
        include: [
            { model: db_1.models.aiMarketMakerPool, as: "pool" },
            { model: db_1.models.ecosystemMarket, as: "market" },
        ],
    });
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
    const history = await db_1.models.aiMarketMakerHistory.findAll({
        where: {
            marketMakerId: params.marketId,
            createdAt: { [sequelize_1.Op.gte]: startTime },
        },
        order: [["createdAt", "ASC"]],
    });
    const priceHistory = history
        .filter((h) => {
        if (h.action === "TARGET_CHANGE")
            return true;
        if (h.action === "TRADE" && Number(h.priceAtAction) > 0)
            return true;
        if (h.action === "START" && Number(h.priceAtAction) > 0)
            return true;
        return false;
    })
        .map((h) => ({
        timestamp: h.createdAt,
        price: Number(h.priceAtAction),
        targetPrice: Number(h.priceAtAction),
    }));
    priceHistory.push({
        timestamp: new Date(),
        price: Number(marketMaker.targetPrice),
        targetPrice: Number(marketMaker.targetPrice),
    });
    const tradeHistory = history.filter((h) => h.action === "TRADE");
    const volumeByHour = {};
    for (const trade of tradeHistory) {
        const hour = new Date(trade.createdAt).toISOString().slice(0, 13);
        const tradeAmount = ((_a = trade.details) === null || _a === void 0 ? void 0 : _a.amount) || ((_b = trade.details) === null || _b === void 0 ? void 0 : _b.volume) || 0;
        volumeByHour[hour] = (volumeByHour[hour] || 0) + tradeAmount;
    }
    const volumeHistory = Object.entries(volumeByHour).map(([hour, volume]) => ({
        timestamp: new Date(hour + ":00:00Z"),
        volume,
    }));
    const targetAchievementRate = 85;
    const pool = marketMaker.pool;
    const totalTrades = tradeHistory.length;
    const avgTradeSize = totalTrades > 0
        ? tradeHistory.reduce((sum, t) => { var _a, _b; return sum + (((_a = t.details) === null || _a === void 0 ? void 0 : _a.amount) || ((_b = t.details) === null || _b === void 0 ? void 0 : _b.size) || 0); }, 0) /
            totalTrades
        : 0;
    ctx === null || ctx === void 0 ? void 0 : ctx.success("Get Market Maker Performance retrieved successfully");
    return {
        marketId: params.marketId,
        period,
        market: marketMaker.market,
        currentPrice: marketMaker.targetPrice,
        priceHistory,
        volumeHistory,
        targetAchievementRate,
        metrics: {
            totalTrades,
            avgTradeSize,
            totalVolume: Number(marketMaker.currentDailyVolume),
            tvl: (pool === null || pool === void 0 ? void 0 : pool.totalValueLocked) || 0,
            unrealizedPnL: (pool === null || pool === void 0 ? void 0 : pool.unrealizedPnL) || 0,
            realizedPnL: (pool === null || pool === void 0 ? void 0 : pool.realizedPnL) || 0,
        },
        status: marketMaker.status,
    };
};
