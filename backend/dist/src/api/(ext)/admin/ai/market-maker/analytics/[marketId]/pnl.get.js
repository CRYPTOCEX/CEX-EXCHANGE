"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const utils_1 = require("../../utils");
const query_1 = require("@b/utils/query");
const error_1 = require("@b/utils/error");
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
    permission: "view.ai.market-maker.analytics",
};
exports.default = async (data) => {
    var _a;
    const { params, ctx } = data;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Get Market Maker PnL");
    const marketMaker = await db_1.models.aiMarketMaker.findByPk(params.marketId, {
        include: [
            { model: db_1.models.aiMarketMakerPool, as: "pool" },
            { model: db_1.models.ecosystemMarket, as: "market" },
        ],
    });
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
    const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const trades = await db_1.models.aiMarketMakerHistory.findAll({
        where: {
            marketMakerId: params.marketId,
            action: "TRADE",
        },
        order: [["createdAt", "ASC"]],
    });
    let dailyPnL = 0;
    let weeklyPnL = 0;
    let monthlyPnL = 0;
    let allTimePnL = 0;
    const pnlByDay = {};
    for (const trade of trades) {
        const tradeDate = new Date(trade.createdAt);
        const dayKey = tradeDate.toISOString().slice(0, 10);
        const tradePnL = ((_a = trade.details) === null || _a === void 0 ? void 0 : _a.pnl) || 0;
        pnlByDay[dayKey] = (pnlByDay[dayKey] || 0) + tradePnL;
        allTimePnL += tradePnL;
        if (tradeDate >= oneDayAgo) {
            dailyPnL += tradePnL;
        }
        if (tradeDate >= oneWeekAgo) {
            weeklyPnL += tradePnL;
        }
        if (tradeDate >= oneMonthAgo) {
            monthlyPnL += tradePnL;
        }
    }
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
    const realizedPnL = Number(pool.realizedPnL) || 0;
    const initialInvestment = Number(pool.initialBaseBalance) * Number(marketMaker.targetPrice) +
        Number(pool.initialQuoteBalance);
    const totalPnL = unrealizedPnL + realizedPnL;
    const roi = initialInvestment > 0 ? (totalPnL / initialInvestment) * 100 : 0;
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
            tradeCount: trades.length,
            winningTrades: trades.filter((t) => { var _a; return (((_a = t.details) === null || _a === void 0 ? void 0 : _a.pnl) || 0) > 0; }).length,
            losingTrades: trades.filter((t) => { var _a; return (((_a = t.details) === null || _a === void 0 ? void 0 : _a.pnl) || 0) < 0; }).length,
            avgWin: trades.filter((t) => { var _a; return (((_a = t.details) === null || _a === void 0 ? void 0 : _a.pnl) || 0) > 0; }).length > 0
                ? trades
                    .filter((t) => { var _a; return (((_a = t.details) === null || _a === void 0 ? void 0 : _a.pnl) || 0) > 0; })
                    .reduce((sum, t) => { var _a; return sum + (((_a = t.details) === null || _a === void 0 ? void 0 : _a.pnl) || 0); }, 0) /
                    trades.filter((t) => { var _a; return (((_a = t.details) === null || _a === void 0 ? void 0 : _a.pnl) || 0) > 0; }).length
                : 0,
            avgLoss: trades.filter((t) => { var _a; return (((_a = t.details) === null || _a === void 0 ? void 0 : _a.pnl) || 0) < 0; }).length > 0
                ? trades
                    .filter((t) => { var _a; return (((_a = t.details) === null || _a === void 0 ? void 0 : _a.pnl) || 0) < 0; })
                    .reduce((sum, t) => { var _a; return sum + (((_a = t.details) === null || _a === void 0 ? void 0 : _a.pnl) || 0); }, 0) /
                    trades.filter((t) => { var _a; return (((_a = t.details) === null || _a === void 0 ? void 0 : _a.pnl) || 0) < 0; }).length
                : 0,
        },
        lastUpdated: new Date().toISOString(),
    };
};
