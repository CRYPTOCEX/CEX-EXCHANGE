"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const sequelize_1 = require("sequelize");
const error_1 = require("@b/utils/error");
const errors_1 = require("@b/utils/schema/errors");
exports.metadata = {
    summary: "Get copy trading analytics",
    description: "Returns comprehensive analytics for copy trading including leader stats, follower stats, trade stats, revenue metrics, top performers, and daily statistics for charting. Supports filtering by time period (day, week, month, all).",
    operationId: "getCopyTradingAnalytics",
    tags: ["Admin", "Copy Trading", "Analytics"],
    requiresAuth: true,
    logModule: "ADMIN_COPY",
    logTitle: "Get Copy Trading Analytics",
    permission: "access.copy_trading",
    parameters: [
        {
            name: "period",
            in: "query",
            schema: {
                type: "string",
                enum: ["day", "week", "month", "all"],
                default: "month",
            },
            description: "Time period for analytics data",
        },
    ],
    responses: {
        200: {
            description: "Analytics data retrieved successfully",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            leaders: { type: "object", description: "Leader statistics" },
                            followers: { type: "object", description: "Follower statistics" },
                            trades: { type: "object", description: "Trade statistics" },
                            revenue: { type: "object", description: "Platform revenue statistics" },
                            topLeaders: { type: "array", description: "Top 10 performing leaders by ROI" },
                            dailyStats: { type: "array", description: "Daily statistics for the last 30 days" },
                            period: { type: "string", description: "Time period used for analytics" },
                        },
                    },
                },
            },
        },
        401: errors_1.unauthorizedResponse,
        403: errors_1.forbiddenResponse,
        500: errors_1.serverErrorResponse,
    },
};
exports.default = async (data) => {
    var _a, _b;
    const { user, query, ctx } = data;
    if (!(user === null || user === void 0 ? void 0 : user.id)) {
        throw (0, error_1.createError)({ statusCode: 401, message: "Unauthorized" });
    }
    const period = query.period || "month";
    let dateFilter = {};
    const now = new Date();
    switch (period) {
        case "day":
            dateFilter = { [sequelize_1.Op.gte]: new Date(now.setDate(now.getDate() - 1)) };
            break;
        case "week":
            dateFilter = { [sequelize_1.Op.gte]: new Date(now.setDate(now.getDate() - 7)) };
            break;
        case "month":
            dateFilter = { [sequelize_1.Op.gte]: new Date(now.setMonth(now.getMonth() - 1)) };
            break;
        case "all":
        default:
            dateFilter = {};
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Get Copy Trading Analytics");
    const leaderStats = await db_1.models.copyTradingLeader.findAll({
        attributes: [
            [(0, sequelize_1.fn)("COUNT", (0, sequelize_1.col)("id")), "totalLeaders"],
            [
                (0, sequelize_1.fn)("SUM", (0, sequelize_1.literal)(`CASE WHEN "status" = 'ACTIVE' THEN 1 ELSE 0 END`)),
                "activeLeaders",
            ],
            [
                (0, sequelize_1.fn)("SUM", (0, sequelize_1.literal)(`CASE WHEN "status" = 'PENDING' THEN 1 ELSE 0 END`)),
                "pendingLeaders",
            ],
            [(0, sequelize_1.fn)("SUM", (0, sequelize_1.col)("totalFollowers")), "totalFollowersSum"],
            [(0, sequelize_1.fn)("AVG", (0, sequelize_1.col)("winRate")), "avgWinRate"],
            [(0, sequelize_1.fn)("AVG", (0, sequelize_1.col)("roi")), "avgRoi"],
        ],
        raw: true,
    });
    const followerStats = await db_1.models.copyTradingFollower.findAll({
        attributes: [
            [(0, sequelize_1.fn)("COUNT", (0, sequelize_1.col)("id")), "totalSubscriptions"],
            [
                (0, sequelize_1.fn)("SUM", (0, sequelize_1.literal)(`CASE WHEN "status" = 'ACTIVE' THEN 1 ELSE 0 END`)),
                "activeSubscriptions",
            ],
            [(0, sequelize_1.fn)("SUM", (0, sequelize_1.col)("totalProfit")), "totalProfit"],
        ],
        raw: true,
    });
    const tradeWhere = {};
    if (Object.keys(dateFilter).length > 0) {
        tradeWhere.createdAt = dateFilter;
    }
    const tradeStats = await db_1.models.copyTradingTrade.findAll({
        where: tradeWhere,
        attributes: [
            [(0, sequelize_1.fn)("COUNT", (0, sequelize_1.col)("id")), "totalTrades"],
            [
                (0, sequelize_1.fn)("SUM", (0, sequelize_1.literal)(`CASE WHEN "status" = 'CLOSED' THEN 1 ELSE 0 END`)),
                "closedTrades",
            ],
            [
                (0, sequelize_1.fn)("SUM", (0, sequelize_1.literal)(`CASE WHEN "profit" > 0 THEN 1 ELSE 0 END`)),
                "profitableTrades",
            ],
            [(0, sequelize_1.fn)("SUM", (0, sequelize_1.col)("profit")), "totalProfit"],
            [(0, sequelize_1.fn)("SUM", (0, sequelize_1.col)("amount")), "totalVolume"],
            [(0, sequelize_1.fn)("SUM", (0, sequelize_1.col)("fee")), "totalFees"],
        ],
        raw: true,
    });
    const transactionWhere = {};
    if (Object.keys(dateFilter).length > 0) {
        transactionWhere.createdAt = dateFilter;
    }
    const platformFees = await db_1.models.copyTradingTransaction.findAll({
        where: {
            ...transactionWhere,
            type: "PLATFORM_FEE",
        },
        attributes: [[(0, sequelize_1.fn)("SUM", (0, sequelize_1.col)("amount")), "totalPlatformFees"]],
        raw: true,
    });
    const profitShares = await db_1.models.copyTradingTransaction.findAll({
        where: {
            ...transactionWhere,
            type: "PROFIT_SHARE",
        },
        attributes: [[(0, sequelize_1.fn)("SUM", (0, sequelize_1.col)("amount")), "totalProfitShares"]],
        raw: true,
    });
    const topLeaders = await db_1.models.copyTradingLeader.findAll({
        where: { status: "ACTIVE" },
        order: [["roi", "DESC"]],
        limit: 10,
        include: [
            {
                model: db_1.models.user,
                as: "user",
                attributes: ["id", "firstName", "lastName", "avatar"],
            },
        ],
    });
    const dailyStats = await db_1.models.copyTradingTrade.findAll({
        where: {
            createdAt: { [sequelize_1.Op.gte]: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
        },
        attributes: [
            [(0, sequelize_1.fn)("DATE", (0, sequelize_1.col)("createdAt")), "date"],
            [(0, sequelize_1.fn)("COUNT", (0, sequelize_1.col)("id")), "trades"],
            [(0, sequelize_1.fn)("SUM", (0, sequelize_1.col)("profit")), "profit"],
            [(0, sequelize_1.fn)("SUM", (0, sequelize_1.col)("amount")), "volume"],
        ],
        group: [(0, sequelize_1.fn)("DATE", (0, sequelize_1.col)("createdAt"))],
        order: [[(0, sequelize_1.fn)("DATE", (0, sequelize_1.col)("createdAt")), "ASC"]],
        raw: true,
    });
    ctx === null || ctx === void 0 ? void 0 : ctx.success("Get Copy Trading Analytics retrieved successfully");
    return {
        leaders: leaderStats[0] || {},
        followers: followerStats[0] || {},
        trades: tradeStats[0] || {},
        revenue: {
            platformFees: ((_a = platformFees[0]) === null || _a === void 0 ? void 0 : _a.totalPlatformFees) || 0,
            profitShares: ((_b = profitShares[0]) === null || _b === void 0 ? void 0 : _b.totalProfitShares) || 0,
        },
        topLeaders,
        dailyStats,
        period,
    };
};
