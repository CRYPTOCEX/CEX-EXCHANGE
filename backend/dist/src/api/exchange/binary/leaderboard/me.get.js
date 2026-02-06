"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const sequelize_1 = require("sequelize");
const query_1 = require("@b/utils/query");
const error_1 = require("@b/utils/error");
exports.metadata = {
    summary: "Get User's Leaderboard Position",
    operationId: "getUserLeaderboardPosition",
    tags: ["Exchange", "Binary", "Leaderboard"],
    description: "Retrieves the authenticated user's ranking and trading statistics for the leaderboard.",
    parameters: [
        {
            name: "period",
            in: "query",
            description: "Time period for the ranking: daily, weekly, monthly, alltime",
            schema: { type: "string", enum: ["daily", "weekly", "monthly", "alltime"] },
        },
        {
            name: "metric",
            in: "query",
            description: "Ranking metric: profit (total profit), winRate (win percentage), volume (trade count)",
            schema: { type: "string", enum: ["profit", "winRate", "volume"] },
        },
    ],
    responses: {
        200: {
            description: "User's leaderboard position and stats",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            rank: { type: "number" },
                            totalTraders: { type: "number" },
                            percentile: { type: "number" },
                            stats: {
                                type: "object",
                                properties: {
                                    totalProfit: { type: "number" },
                                    winRate: { type: "number" },
                                    totalTrades: { type: "number" },
                                    wins: { type: "number" },
                                    losses: { type: "number" },
                                    bestStreak: { type: "number" },
                                    avgProfit: { type: "number" },
                                },
                            },
                        },
                    },
                },
            },
        },
        401: query_1.unauthorizedResponse,
        404: (0, query_1.notFoundMetadataResponse)("User stats"),
        500: query_1.serverErrorResponse,
    },
    requiresAuth: true,
};
exports.default = async (data) => {
    const { user, query, ctx } = data;
    if (!(user === null || user === void 0 ? void 0 : user.id)) {
        throw (0, error_1.createError)({ statusCode: 401, message: "Unauthorized" });
    }
    const { period = "weekly", metric = "profit" } = query;
    ctx === null || ctx === void 0 ? void 0 : ctx.step(`Fetching leaderboard position for user ${user.id}`);
    const now = new Date();
    let startDate;
    switch (period) {
        case "daily":
            startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            break;
        case "weekly":
            const dayOfWeek = now.getDay();
            startDate = new Date(now);
            startDate.setDate(now.getDate() - dayOfWeek);
            startDate.setHours(0, 0, 0, 0);
            break;
        case "monthly":
            startDate = new Date(now.getFullYear(), now.getMonth(), 1);
            break;
        case "alltime":
        default:
            startDate = new Date(0);
            break;
    }
    const whereClause = {
        status: { [sequelize_1.Op.in]: ["WIN", "LOSS"] },
        isDemo: false,
    };
    if (period !== "alltime") {
        whereClause.closedAt = { [sequelize_1.Op.gte]: startDate };
    }
    try {
        const userStats = await db_1.models.binaryOrder.findAll({
            attributes: [
                [(0, sequelize_1.fn)("COUNT", (0, sequelize_1.col)("id")), "totalTrades"],
                [(0, sequelize_1.fn)("SUM", (0, sequelize_1.literal)("CASE WHEN status = 'WIN' THEN 1 ELSE 0 END")), "wins"],
                [(0, sequelize_1.fn)("SUM", (0, sequelize_1.literal)("CASE WHEN status = 'LOSS' THEN 1 ELSE 0 END")), "losses"],
                [
                    (0, sequelize_1.fn)("SUM", (0, sequelize_1.literal)("CASE WHEN status = 'WIN' THEN profit WHEN status = 'LOSS' THEN -amount ELSE 0 END")),
                    "totalProfit",
                ],
                [
                    (0, sequelize_1.fn)("AVG", (0, sequelize_1.literal)("CASE WHEN status = 'WIN' THEN profit ELSE NULL END")),
                    "avgProfit",
                ],
            ],
            where: { ...whereClause, userId: user.id },
            raw: true,
        });
        const stats = userStats[0];
        if (!stats || Number(stats.totalTrades) === 0) {
            ctx === null || ctx === void 0 ? void 0 : ctx.success("No trades found for this period");
            return {
                rank: null,
                totalTraders: 0,
                percentile: null,
                qualified: false,
                minTradesRequired: 5,
                stats: {
                    totalProfit: 0,
                    winRate: 0,
                    totalTrades: 0,
                    wins: 0,
                    losses: 0,
                    avgProfit: 0,
                },
            };
        }
        const wins = Number(stats.wins) || 0;
        const losses = Number(stats.losses) || 0;
        const totalTrades = Number(stats.totalTrades) || 0;
        const winRate = totalTrades > 0 ? (wins / totalTrades) * 100 : 0;
        const totalProfit = parseFloat(Number(stats.totalProfit || 0).toFixed(2));
        const avgProfit = parseFloat(Number(stats.avgProfit || 0).toFixed(2));
        const qualified = totalTrades >= 5;
        let rank = null;
        let totalTraders = 0;
        if (qualified) {
            const allTraderStats = await db_1.models.binaryOrder.findAll({
                attributes: [
                    "userId",
                    [(0, sequelize_1.fn)("COUNT", (0, sequelize_1.col)("id")), "totalTrades"],
                    [(0, sequelize_1.fn)("SUM", (0, sequelize_1.literal)("CASE WHEN status = 'WIN' THEN 1 ELSE 0 END")), "wins"],
                    [
                        (0, sequelize_1.fn)("SUM", (0, sequelize_1.literal)("CASE WHEN status = 'WIN' THEN profit WHEN status = 'LOSS' THEN -amount ELSE 0 END")),
                        "totalProfit",
                    ],
                ],
                where: whereClause,
                group: ["userId"],
                having: (0, sequelize_1.literal)("COUNT(id) >= 5"),
                raw: true,
            });
            totalTraders = allTraderStats.length;
            const sortedTraders = allTraderStats
                .map((trader) => {
                const traderWins = Number(trader.wins) || 0;
                const traderTotal = Number(trader.totalTrades) || 0;
                const traderWinRate = traderTotal > 0 ? (traderWins / traderTotal) * 100 : 0;
                const traderProfit = Number(trader.totalProfit) || 0;
                return {
                    userId: trader.userId,
                    profit: traderProfit,
                    winRate: traderWinRate,
                    volume: traderTotal,
                };
            })
                .sort((a, b) => {
                switch (metric) {
                    case "winRate":
                        return b.winRate - a.winRate;
                    case "volume":
                        return b.volume - a.volume;
                    case "profit":
                    default:
                        return b.profit - a.profit;
                }
            });
            const userIndex = sortedTraders.findIndex((trader) => trader.userId === user.id);
            rank = userIndex >= 0 ? userIndex + 1 : null;
        }
        const percentile = rank && totalTraders > 0
            ? parseFloat((((totalTraders - rank + 1) / totalTraders) * 100).toFixed(1))
            : null;
        ctx === null || ctx === void 0 ? void 0 : ctx.success(`User rank: ${rank || "N/A"}`);
        return {
            rank,
            totalTraders,
            percentile,
            qualified,
            minTradesRequired: 5,
            stats: {
                totalProfit,
                winRate: parseFloat(winRate.toFixed(1)),
                totalTrades,
                wins,
                losses,
                avgProfit,
            },
        };
    }
    catch (error) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail(error.message);
        throw (0, error_1.createError)({ statusCode: 500, message: `Failed to fetch user position: ${error.message}` });
    }
};
