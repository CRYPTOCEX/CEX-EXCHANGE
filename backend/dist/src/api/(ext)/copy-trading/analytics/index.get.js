"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const sequelize_1 = require("sequelize");
const utils_1 = require("@b/api/finance/currency/utils");
exports.metadata = {
    summary: "Get My Copy Trading Analytics",
    description: "Retrieves comprehensive analytics for the user's copy trading activities.",
    operationId: "getMyCopyTradingAnalytics",
    tags: ["Copy Trading", "Analytics"],
    requiresAuth: true,
    logModule: "COPY",
    logTitle: "Get analytics",
    parameters: [
        {
            name: "period",
            in: "query",
            required: false,
            schema: { type: "string", enum: ["24h", "7d", "30d", "90d", "1y", "all"] },
            description: "Time period for analytics",
        },
    ],
    responses: {
        200: {
            description: "Analytics retrieved successfully",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            summary: {
                                type: "object",
                                properties: {
                                    totalAllocated: { type: "number" },
                                    totalProfit: { type: "number" },
                                    overallROI: { type: "number" },
                                    activeSubscriptions: { type: "number" },
                                    totalTrades: { type: "number" },
                                    winRate: { type: "number" },
                                },
                            },
                            byLeader: { type: "array" },
                            profitChart: { type: "array" },
                            tradeDistribution: { type: "object" },
                        },
                    },
                },
            },
        },
        401: { description: "Unauthorized" },
        500: { description: "Internal Server Error" },
    },
};
function getPeriodDate(period) {
    const now = new Date();
    switch (period) {
        case "24h":
            return new Date(now.getTime() - 24 * 60 * 60 * 1000);
        case "7d":
            return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        case "30d":
            return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        case "90d":
            return new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        case "1y":
            return new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        case "all":
        default:
            return null;
    }
}
exports.default = async (data) => {
    const { user, query, ctx } = data;
    if (!(user === null || user === void 0 ? void 0 : user.id)) {
        throw (0, error_1.createError)({ statusCode: 401, message: "Unauthorized" });
    }
    const period = query.period || "30d";
    const periodDate = getPeriodDate(period);
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Fetching user subscriptions");
    const subscriptions = await db_1.models.copyTradingFollower.findAll({
        where: { userId: user.id },
        include: [
            {
                model: db_1.models.copyTradingLeader,
                as: "leader",
                include: [
                    {
                        model: db_1.models.user,
                        as: "user",
                        attributes: ["id", "firstName", "lastName", "avatar"],
                    },
                ],
            },
            {
                model: db_1.models.copyTradingFollowerAllocation,
                as: "allocations",
                where: { isActive: true },
                required: false,
            },
        ],
    });
    const followerIds = subscriptions.map((s) => s.id);
    const activeSubscriptions = subscriptions.filter((s) => s.status === "ACTIVE").length;
    if (followerIds.length === 0) {
        ctx === null || ctx === void 0 ? void 0 : ctx.success("No subscriptions found");
        return {
            summary: {
                totalAllocated: 0,
                totalProfit: 0,
                overallROI: 0,
                activeSubscriptions: 0,
                totalTrades: 0,
                winRate: 0,
            },
            byLeader: [],
            profitChart: [],
            tradeDistribution: {
                bySymbol: [],
                bySide: {
                    buy: { count: 0, profit: 0 },
                    sell: { count: 0, profit: 0 },
                },
            },
        };
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Fetching trades");
    const tradeWhere = {
        followerId: { [sequelize_1.Op.in]: followerIds },
        status: "CLOSED",
    };
    if (periodDate) {
        tradeWhere.createdAt = { [sequelize_1.Op.gte]: periodDate };
    }
    const trades = await db_1.models.copyTradingTrade.findAll({
        where: tradeWhere,
        include: [
            {
                model: db_1.models.copyTradingLeader,
                as: "leader",
                attributes: ["id", "displayName"],
            },
        ],
    });
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Calculating analytics");
    const totalTrades = trades.length;
    const winningTrades = trades.filter((t) => (t.profit || 0) > 0).length;
    const totalProfit = trades.reduce((sum, t) => sum + (t.profit || 0), 0);
    const winRate = totalTrades > 0 ? (winningTrades / totalTrades) * 100 : 0;
    let totalAllocated = 0;
    for (const sub of subscriptions) {
        if (!sub.allocations)
            continue;
        for (const alloc of sub.allocations) {
            try {
                const [baseCurrency, quoteCurrency] = alloc.symbol.split("/");
                const basePrice = await (0, utils_1.getEcoPriceInUSD)(baseCurrency);
                const baseInUSDT = parseFloat(alloc.baseAmount || 0) * basePrice;
                const quotePrice = await (0, utils_1.getEcoPriceInUSD)(quoteCurrency);
                const quoteInUSDT = parseFloat(alloc.quoteAmount || 0) * quotePrice;
                totalAllocated += baseInUSDT + quoteInUSDT;
            }
            catch (error) {
                console.error(`Failed to get price for ${alloc.symbol}:`, error);
            }
        }
    }
    const overallROI = totalAllocated > 0 ? (totalProfit / totalAllocated) * 100 : 0;
    const byLeaderMap = {};
    trades.forEach((trade) => {
        var _a;
        const leaderId = trade.leaderId;
        if (!byLeaderMap[leaderId]) {
            const sub = subscriptions.find((s) => s.leaderId === leaderId);
            byLeaderMap[leaderId] = {
                leader: ((_a = trade.leader) === null || _a === void 0 ? void 0 : _a.toJSON()) || { id: leaderId },
                subscription: sub ? { id: sub.id, status: sub.status } : null,
                trades: 0,
                wins: 0,
                profit: 0,
                volume: 0,
            };
        }
        byLeaderMap[leaderId].trades++;
        if ((trade.profit || 0) > 0)
            byLeaderMap[leaderId].wins++;
        byLeaderMap[leaderId].profit += trade.profit || 0;
        byLeaderMap[leaderId].volume += trade.cost || 0;
    });
    const byLeader = Object.values(byLeaderMap).map((item) => ({
        ...item,
        winRate: item.trades > 0 ? (item.wins / item.trades) * 100 : 0,
        roi: 0,
        profit: Math.round(item.profit * 100) / 100,
        volume: Math.round(item.volume * 100) / 100,
    }));
    const profitByDate = {};
    trades.forEach((trade) => {
        const date = new Date(trade.createdAt).toISOString().split("T")[0];
        profitByDate[date] = (profitByDate[date] || 0) + (trade.profit || 0);
    });
    const sortedDates = Object.keys(profitByDate).sort();
    let cumulative = 0;
    const profitChart = sortedDates.map((date) => {
        cumulative += profitByDate[date];
        return {
            date,
            dailyProfit: Math.round(profitByDate[date] * 100) / 100,
            cumulativeProfit: Math.round(cumulative * 100) / 100,
        };
    });
    const symbolDistribution = {};
    trades.forEach((trade) => {
        const symbol = trade.symbol || "UNKNOWN";
        if (!symbolDistribution[symbol]) {
            symbolDistribution[symbol] = { count: 0, profit: 0 };
        }
        symbolDistribution[symbol].count++;
        symbolDistribution[symbol].profit += trade.profit || 0;
    });
    const buyTrades = trades.filter((t) => t.side === "BUY");
    const sellTrades = trades.filter((t) => t.side === "SELL");
    ctx === null || ctx === void 0 ? void 0 : ctx.success("Analytics retrieved successfully");
    return {
        summary: {
            totalAllocated: Math.round(totalAllocated * 100) / 100,
            totalProfit: Math.round(totalProfit * 100) / 100,
            overallROI: Math.round(overallROI * 100) / 100,
            activeSubscriptions,
            totalTrades,
            winRate: Math.round(winRate * 100) / 100,
        },
        byLeader,
        profitChart,
        tradeDistribution: {
            bySymbol: Object.entries(symbolDistribution).map(([symbol, data]) => ({
                symbol,
                ...data,
                profit: Math.round(data.profit * 100) / 100,
            })),
            bySide: {
                buy: { count: buyTrades.length, profit: buyTrades.reduce((s, t) => s + (t.profit || 0), 0) },
                sell: { count: sellTrades.length, profit: sellTrades.reduce((s, t) => s + (t.profit || 0), 0) },
            },
        },
    };
};
