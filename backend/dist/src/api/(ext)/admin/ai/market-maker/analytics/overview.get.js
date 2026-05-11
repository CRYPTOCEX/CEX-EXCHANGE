"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const utils_1 = require("../utils");
const query_1 = require("@b/utils/query");
const sequelize_1 = require("sequelize");
exports.metadata = {
    summary: "Get global AI Market Maker analytics overview",
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
    permission: "view.ai.market-maker.analytics",
};
exports.default = async (data) => {
    const { ctx } = data;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Get Market Maker Overview");
    const marketMakers = await db_1.models.aiMarketMaker.findAll({
        include: [
            {
                model: db_1.models.aiMarketMakerPool,
                as: "pool",
            },
            {
                model: db_1.models.ecosystemMarket,
                as: "market",
            },
        ],
    });
    const bots = await db_1.models.aiBot.findAll();
    let totalTVL = 0;
    let totalPnL = 0;
    let total24hVolume = 0;
    let activeMarkets = 0;
    for (const maker of marketMakers) {
        const pool = maker.pool;
        if (pool) {
            totalTVL += Number(pool.totalValueLocked) || 0;
            totalPnL +=
                (Number(pool.unrealizedPnL) || 0) + (Number(pool.realizedPnL) || 0);
        }
        if (maker.status === "ACTIVE") {
            activeMarkets++;
            total24hVolume += Number(maker.currentDailyVolume) || 0;
        }
    }
    const totalBots = bots.length;
    const activeBots = bots.filter((b) => b.status === "ACTIVE").length;
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentActivity = await db_1.models.aiMarketMakerHistory.count({
        where: {
            createdAt: { [sequelize_1.Op.gte]: oneDayAgo },
            action: "TRADE",
        },
    });
    const marketsByStatus = {
        active: marketMakers.filter((m) => m.status === "ACTIVE").length,
        paused: marketMakers.filter((m) => m.status === "PAUSED").length,
        stopped: marketMakers.filter((m) => m.status === "STOPPED").length,
    };
    const markets = marketMakers.map((maker) => ({
        id: maker.id,
        status: maker.status,
        targetPrice: maker.targetPrice || 0,
        currentDailyVolume: maker.currentDailyVolume || 0,
        updatedAt: maker.updatedAt,
        activeBots: bots.filter((b) => b.marketMakerId === maker.id && b.status === "ACTIVE").length,
        pool: maker.pool
            ? {
                totalValueLocked: maker.pool.totalValueLocked || 0,
                realizedPnL: maker.pool.realizedPnL || 0,
                unrealizedPnL: maker.pool.unrealizedPnL || 0,
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
    }));
    ctx === null || ctx === void 0 ? void 0 : ctx.success("Get Market Maker Overview retrieved successfully");
    return {
        totalTVL,
        total24hVolume,
        totalPnL,
        pnlPercent: totalTVL > 0 ? (totalPnL / totalTVL) * 100 : 0,
        activeMarkets,
        totalMarkets: marketMakers.length,
        totalBots,
        activeBots,
        recentTradeCount: recentActivity,
        marketsByStatus,
        markets,
        lastUpdated: new Date().toISOString(),
    };
};
