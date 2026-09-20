"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const utils_1 = require("../../utils");
const query_1 = require("@b/utils/query");
const error_1 = require("@b/utils/error");
const queries_1 = require("../../utils/scylla/queries");
const market_resolver_1 = require("../../utils/venue/market-resolver");
const fill_measurement_1 = require("../../utils/venue/fill-measurement");
exports.metadata = {
    summary: "Get P&L report for an AI Market Maker",
    operationId: "getAiMarketMakerPnL",
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
    ],
    responses: {
        200: {
            description: "P&L report with daily, weekly, monthly, and all-time data",
            content: {
                "application/json": {
                    schema: utils_1.pnlReportSchema,
                },
            },
        },
        401: query_1.unauthorizedResponse,
        404: (0, query_1.notFoundMetadataResponse)("AI Market Maker"),
        500: query_1.serverErrorResponse,
    },
    requiresAuth: true,
    logModule: "ADMIN_AI",
    logTitle: "Get Market Maker PnL",
    permission: "view.ai.market_maker.analytics",
};
exports.default = async (data) => {
    const { params, ctx } = data;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Get Market Maker PnL");
    const marketMaker = (0, market_resolver_1.hydrateMakerMarket)(await db_1.models.aiMarketMaker.findByPk(params.marketId, {
        include: [
            { model: db_1.models.aiMarketMakerPool, as: "pool" },
            ...(0, market_resolver_1.makerMarketIncludes)(),
        ],
    }));
    if (!marketMaker) {
        throw (0, error_1.createError)(404, "AI Market Maker not found");
    }
    const pool = marketMaker.pool;
    if (!pool) {
        throw (0, error_1.createError)(404, "Pool not found for this market maker");
    }
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const bots = (await db_1.models.aiBot.findAll({
        where: { marketMakerId: params.marketId },
        attributes: [
            "id",
            "totalRealizedPnL",
            "realTradesExecuted",
            "profitableTrades",
            "firstRealTradeAt",
        ],
    }));
    const lifetimeRealized = bots.reduce((sum, b) => sum + (Number(b.totalRealizedPnL) || 0), 0);
    const lifetimeRealTrades = bots.reduce((sum, b) => sum + (Number(b.realTradesExecuted) || 0), 0);
    const lifetimeProfitable = bots.reduce((sum, b) => sum + (Number(b.profitableTrades) || 0), 0);
    const realTrades = await (0, queries_1.getBotRealTradesInRange)(bots.map((b) => String(b.id)), 30);
    let dailyPnL = 0;
    let weeklyPnL = 0;
    let monthlyPnL = 0;
    let windowFees = 0;
    let makerFills = 0;
    const pnlByDay = {};
    for (const trade of realTrades) {
        const when = new Date(trade.tradeTime);
        const dayKey = when.toISOString().slice(0, 10);
        pnlByDay[dayKey] = (pnlByDay[dayKey] || 0) + trade.pnl;
        windowFees += trade.fee;
        if (trade.isMaker)
            makerFills++;
        monthlyPnL += trade.pnl;
        if (when >= oneWeekAgo)
            weeklyPnL += trade.pnl;
        if (when >= oneDayAgo)
            dailyPnL += trade.pnl;
    }
    const firstRealTradeAt = bots.reduce((min, b) => {
        const t = b.firstRealTradeAt ? new Date(b.firstRealTradeAt).getTime() : null;
        if (t === null)
            return min;
        return min === null ? t : Math.min(min, t);
    }, null);
    const allTimePnL = lifetimeRealized;
    const sortedDays = Object.keys(pnlByDay).sort();
    let cumulativePnL = 0;
    const history = sortedDays.map((day) => {
        cumulativePnL += pnlByDay[day];
        return {
            date: day,
            pnl: pnlByDay[day],
            cumulativePnl: cumulativePnL,
        };
    });
    const unrealizedPnL = Number(pool.unrealizedPnL) || 0;
    const realizedPnL = lifetimeRealized;
    const initialInvestment = Number(pool.initialBaseBalance) * Number(marketMaker.targetPrice) +
        Number(pool.initialQuoteBalance);
    const totalPnL = unrealizedPnL + realizedPnL;
    const roi = initialInvestment > 0 ? (totalPnL / initialInvestment) * 100 : 0;
    const windowWins = realTrades.filter((t) => t.pnl > 0);
    const windowLosses = realTrades.filter((t) => t.pnl < 0);
    const avg = (rows) => rows.length ? rows.reduce((s, t) => s + t.pnl, 0) / rows.length : 0;
    ctx === null || ctx === void 0 ? void 0 : ctx.success("Get Market Maker PnL retrieved successfully");
    return {
        marketId: params.marketId,
        market: marketMaker.market,
        summary: {
            daily: dailyPnL,
            weekly: weeklyPnL,
            monthly: monthlyPnL,
            allTime: allTimePnL,
            unrealized: unrealizedPnL,
            realized: realizedPnL,
            total: totalPnL,
        },
        roi: {
            percent: roi.toFixed(2),
            initialInvestment,
            currentValue: Number(pool.totalValueLocked),
        },
        history,
        breakdown: {
            tradeCount: lifetimeRealTrades,
            winningTrades: lifetimeProfitable,
            losingTrades: Math.max(0, lifetimeRealTrades - lifetimeProfitable),
            avgWin: avg(windowWins),
            avgLoss: avg(windowLosses),
            windowDays: 30,
            windowTradeCount: realTrades.length,
            windowFees,
            makerFillCount: makerFills,
            takerFillCount: realTrades.length - makerFills,
            makerRatio: realTrades.length ? makerFills / realTrades.length : null,
        },
        ledger: {
            measurement: (0, fill_measurement_1.fillMeasurement)(marketMaker),
            source: "ai_bot_real_trades",
            beginsAt: firstRealTradeAt ? new Date(firstRealTradeAt).toISOString() : null,
            windowDays: 30,
            windowTradeCount: realTrades.length,
            allTimeSource: "aiBot.totalRealizedPnL",
            periodSource: "ai_bot_real_trades",
        },
        lastUpdated: new Date().toISOString(),
    };
};
