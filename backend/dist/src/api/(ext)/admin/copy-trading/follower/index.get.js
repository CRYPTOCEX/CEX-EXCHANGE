"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const sequelize_1 = require("sequelize");
const error_1 = require("@b/utils/error");
const stats_calculator_1 = require("@b/api/(ext)/copy-trading/utils/stats-calculator");
const errors_1 = require("@b/utils/schema/errors");
exports.metadata = {
    summary: "List copy trading followers",
    description: "Retrieves a paginated list of all copy trading follower subscriptions. Supports filtering by status, leader, user, and searching by user details (name, email). Includes related user and leader information for each follower.",
    operationId: "listCopyTradingFollowers",
    tags: ["Admin", "Copy Trading", "Follower"],
    requiresAuth: true,
    logModule: "ADMIN_COPY",
    logTitle: "List Copy Trading Followers",
    permission: "access.copy_trading",
    demoMask: ["items.user.email"],
    parameters: [
        {
            name: "page",
            in: "query",
            description: "Page number for pagination (min: 1, default: 1)",
            schema: { type: "integer", default: 1 },
        },
        {
            name: "limit",
            in: "query",
            description: "Number of items per page (1-100, default: 10)",
            schema: { type: "integer", default: 10 },
        },
        {
            name: "status",
            in: "query",
            description: "Filter by follower status",
            schema: { type: "string", enum: ["ACTIVE", "PAUSED", "STOPPED"] },
        },
        {
            name: "leaderId",
            in: "query",
            description: "Filter by specific leader ID",
            schema: { type: "string", format: "uuid" },
        },
        {
            name: "userId",
            in: "query",
            description: "Filter by specific user ID",
            schema: { type: "string", format: "uuid" },
        },
        {
            name: "search",
            in: "query",
            description: "Search by user first name, last name, or email",
            schema: { type: "string" },
        },
    ],
    responses: {
        200: {
            description: "Follower list retrieved successfully",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            items: {
                                type: "array",
                                items: {
                                    type: "object",
                                    properties: {
                                        ...errors_1.commonFields,
                                        userId: {
                                            type: "string",
                                            format: "uuid",
                                            description: "ID of the user following the leader",
                                        },
                                        leaderId: {
                                            type: "string",
                                            format: "uuid",
                                            description: "ID of the leader being followed",
                                        },
                                        copyMode: {
                                            type: "string",
                                            enum: ["PROPORTIONAL", "FIXED_AMOUNT", "FIXED_RATIO"],
                                            description: "Copy trading mode",
                                        },
                                        fixedAmount: {
                                            type: "number",
                                            nullable: true,
                                            description: "Fixed amount per trade (if using FIXED_AMOUNT mode)",
                                        },
                                        fixedRatio: {
                                            type: "number",
                                            nullable: true,
                                            description: "Fixed ratio multiplier (if using FIXED_RATIO mode)",
                                        },
                                        maxDailyLoss: {
                                            type: "number",
                                            nullable: true,
                                            description: "Maximum daily loss limit",
                                        },
                                        maxPositionSize: {
                                            type: "number",
                                            nullable: true,
                                            description: "Maximum position size limit",
                                        },
                                        stopLossPercent: {
                                            type: "number",
                                            nullable: true,
                                            description: "Stop loss percentage",
                                        },
                                        takeProfitPercent: {
                                            type: "number",
                                            nullable: true,
                                            description: "Take profit percentage",
                                        },
                                        totalProfit: {
                                            type: "number",
                                            description: "Total profit/loss from all trades",
                                        },
                                        totalTrades: {
                                            type: "integer",
                                            description: "Total number of trades executed",
                                        },
                                        winRate: {
                                            type: "number",
                                            description: "Win rate percentage",
                                        },
                                        roi: {
                                            type: "number",
                                            description: "Return on investment percentage",
                                        },
                                        status: {
                                            type: "string",
                                            enum: ["ACTIVE", "PAUSED", "STOPPED"],
                                            description: "Current subscription status",
                                        },
                                        user: {
                                            type: "object",
                                            description: "User details",
                                            properties: {
                                                id: { type: "string", format: "uuid" },
                                                firstName: { type: "string" },
                                                lastName: { type: "string" },
                                                email: { type: "string", format: "email" },
                                                avatar: { type: "string", nullable: true },
                                            },
                                        },
                                        leader: {
                                            type: "object",
                                            description: "Leader details",
                                            properties: {
                                                id: { type: "string", format: "uuid" },
                                                displayName: { type: "string" },
                                                avatar: { type: "string", nullable: true },
                                                tradingStyle: { type: "string", nullable: true },
                                                riskLevel: { type: "string", nullable: true },
                                            },
                                        },
                                    },
                                },
                            },
                            pagination: {
                                type: "object",
                                properties: {
                                    total: {
                                        type: "integer",
                                        description: "Total number of followers",
                                    },
                                    page: {
                                        type: "integer",
                                        description: "Current page number",
                                    },
                                    limit: {
                                        type: "integer",
                                        description: "Items per page",
                                    },
                                    totalPages: {
                                        type: "integer",
                                        description: "Total number of pages",
                                    },
                                },
                                required: ["total", "page", "limit", "totalPages"],
                            },
                        },
                        required: ["items", "pagination"],
                    },
                },
            },
        },
        400: errors_1.badRequestResponse,
        401: errors_1.unauthorizedResponse,
        500: errors_1.serverErrorResponse,
    },
};
exports.default = async (data) => {
    const { user, query, ctx } = data;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Get Copy Trading Followers");
    if (!(user === null || user === void 0 ? void 0 : user.id)) {
        throw (0, error_1.createError)({ statusCode: 401, message: "Unauthorized" });
    }
    const page = parseInt(query.page) || 1;
    const limit = parseInt(query.limit) || 10;
    const offset = (page - 1) * limit;
    const where = {};
    if (query.status) {
        where.status = query.status;
    }
    if (query.leaderId) {
        where.leaderId = query.leaderId;
    }
    if (query.userId) {
        where.userId = query.userId;
    }
    const include = [
        {
            model: db_1.models.user,
            as: "user",
            attributes: ["id", "firstName", "lastName", "email", "avatar"],
        },
        {
            model: db_1.models.copyTradingLeader,
            as: "leader",
            attributes: ["id", "displayName", "avatar", "tradingStyle", "riskLevel"],
        },
        {
            model: db_1.models.copyTradingFollowerAllocation,
            as: "allocations",
            required: false,
        },
    ];
    if (query.search) {
        include[0].where = {
            [sequelize_1.Op.or]: [
                { firstName: { [sequelize_1.Op.like]: `%${query.search}%` } },
                { lastName: { [sequelize_1.Op.like]: `%${query.search}%` } },
                { email: { [sequelize_1.Op.like]: `%${query.search}%` } },
            ],
        };
        include[0].required = true;
    }
    const { count, rows } = await db_1.models.copyTradingFollower.findAndCountAll({
        where,
        include,
        limit,
        offset,
        order: [["createdAt", "DESC"]],
    });
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Calculating stats for followers");
    const followersWithStats = await Promise.all(rows.map(async (follower) => {
        const followerData = follower.toJSON();
        const stats = await (0, stats_calculator_1.getFollowerStats)(follower.id);
        return {
            ...followerData,
            ...stats,
        };
    }));
    ctx === null || ctx === void 0 ? void 0 : ctx.success("Get Copy Trading Followers retrieved successfully");
    return {
        items: followersWithStats,
        pagination: {
            total: count,
            page,
            limit,
            totalPages: Math.ceil(count / limit),
        },
    };
};
