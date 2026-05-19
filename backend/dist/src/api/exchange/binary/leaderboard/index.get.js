"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const sequelize_1 = require("sequelize");
const query_1 = require("@b/utils/query");
const error_1 = require("@b/utils/error");
exports.metadata = {
    summary: "Get Binary Trading Leaderboard",
    operationId: "getBinaryLeaderboard",
    tags: ["Exchange", "Binary", "Leaderboard"],
    description: "Retrieves the top traders leaderboard for binary options trading. Supports different time periods and ranking metrics.",
    parameters: [
        {
            name: "period",
            in: "query",
            description: "Time period for the leaderboard: daily, weekly, monthly, alltime",
            schema: { type: "string", enum: ["daily", "weekly", "monthly", "alltime"] },
        },
        {
            name: "metric",
            in: "query",
            description: "Ranking metric: profit (total profit), winRate (win percentage), volume (trade count)",
            schema: { type: "string", enum: ["profit", "winRate", "volume"] },
        },
        {
            name: "limit",
            in: "query",
            description: "Maximum number of traders to return (default 100, max 100)",
            schema: { type: "number" },
        },
    ],
    responses: {
        200: {
            description: "Leaderboard data with top traders",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            period: { type: "string" },
                            metric: { type: "string" },
                            updatedAt: { type: "string" },
                            traders: {
                                type: "array",
                                items: {
                                    type: "object",
                                    properties: {
                                        rank: { type: "number" },
                                        username: { type: "string" },
                                        avatar: { type: "string" },
                                        totalProfit: { type: "number" },
                                        winRate: { type: "number" },
                                        totalTrades: { type: "number" },
                                        wins: { type: "number" },
                                        losses: { type: "number" },
                                    },
                                },
                            },
                        },
                    },
                },
            },
        },
        404: (0, query_1.notFoundMetadataResponse)("Leaderboard"),
        500: query_1.serverErrorResponse,
    },
    requiresAuth: false,
};
exports.default = async (data) => {
    const { query, ctx } = data;
    const { period = "weekly", metric = "profit", limit = 100, } = query;
    ctx === null || ctx === void 0 ? void 0 : ctx.step(`Fetching ${period} leaderboard by ${metric}`);
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
        const traderStats = await db_1.models.binaryOrder.findAll({
            attributes: [
                "userId",
                [(0, sequelize_1.fn)("COUNT", (0, sequelize_1.col)("id")), "totalTrades"],
                [(0, sequelize_1.fn)("SUM", (0, sequelize_1.literal)("CASE WHEN status = 'WIN' THEN 1 ELSE 0 END")), "wins"],
                [(0, sequelize_1.fn)("SUM", (0, sequelize_1.literal)("CASE WHEN status = 'LOSS' THEN 1 ELSE 0 END")), "losses"],
                [
                    (0, sequelize_1.fn)("SUM", (0, sequelize_1.literal)("CASE WHEN status = 'WIN' THEN profit WHEN status = 'LOSS' THEN -amount ELSE 0 END")),
                    "totalProfit",
                ],
            ],
            where: whereClause,
            group: ["userId"],
            having: (0, sequelize_1.literal)("COUNT(id) >= 5"),
            order: getOrderByMetric(metric),
            limit: Math.min(Number(limit), 100),
            raw: true,
        });
        const userIds = traderStats.map((stat) => stat.userId);
        if (userIds.length === 0) {
            ctx === null || ctx === void 0 ? void 0 : ctx.success("No traders found for this period");
            return {
                period,
                metric,
                updatedAt: new Date().toISOString(),
                traders: [],
            };
        }
        const users = await db_1.models.user.findAll({
            attributes: ["id", "firstName", "lastName", "avatar"],
            where: { id: { [sequelize_1.Op.in]: userIds } },
            raw: true,
        });
        const userMap = new Map();
        users.forEach((user) => {
            userMap.set(user.id, user);
        });
        const traders = traderStats.map((stat, index) => {
            const user = userMap.get(stat.userId);
            const wins = Number(stat.wins) || 0;
            const losses = Number(stat.losses) || 0;
            const totalTrades = Number(stat.totalTrades) || 0;
            const winRate = totalTrades > 0 ? (wins / totalTrades) * 100 : 0;
            const firstName = (user === null || user === void 0 ? void 0 : user.firstName) || "Trader";
            const lastName = (user === null || user === void 0 ? void 0 : user.lastName) || "";
            const displayName = generateAnonymousName(firstName, lastName, stat.userId);
            return {
                rank: index + 1,
                username: displayName,
                avatar: (user === null || user === void 0 ? void 0 : user.avatar) || null,
                totalProfit: parseFloat(Number(stat.totalProfit || 0).toFixed(2)),
                winRate: parseFloat(winRate.toFixed(1)),
                totalTrades,
                wins,
                losses,
            };
        });
        ctx === null || ctx === void 0 ? void 0 : ctx.success(`Retrieved ${traders.length} traders for leaderboard`);
        return {
            period,
            metric,
            updatedAt: new Date().toISOString(),
            traders,
        };
    }
    catch (error) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail(error.message);
        throw (0, error_1.createError)({ statusCode: 500, message: `Failed to fetch leaderboard: ${error.message}` });
    }
};
function getOrderByMetric(metric) {
    switch (metric) {
        case "winRate":
            return [
                [
                    (0, sequelize_1.literal)("CASE WHEN COUNT(id) > 0 THEN SUM(CASE WHEN status = 'WIN' THEN 1 ELSE 0 END) * 100.0 / COUNT(id) ELSE 0 END"),
                    "DESC",
                ],
            ];
        case "volume":
            return [[(0, sequelize_1.fn)("COUNT", (0, sequelize_1.col)("id")), "DESC"]];
        case "profit":
        default:
            return [
                [
                    (0, sequelize_1.literal)("SUM(CASE WHEN status = 'WIN' THEN profit WHEN status = 'LOSS' THEN -amount ELSE 0 END)"),
                    "DESC",
                ],
            ];
    }
}
function generateAnonymousName(firstName, lastName, oderId) {
    const firstInitial = firstName.charAt(0).toUpperCase();
    const lastInitial = lastName ? lastName.charAt(0).toUpperCase() : "";
    const suffix = oderId.slice(-4).toUpperCase();
    return `${firstInitial}${lastInitial}***${suffix}`;
}
