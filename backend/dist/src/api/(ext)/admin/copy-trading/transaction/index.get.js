"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const sequelize_1 = require("sequelize");
const errors_1 = require("@b/utils/schema/errors");
exports.metadata = {
    summary: "List All Copy Trading Transactions",
    description: "Returns a paginated list of all copy trading transactions with filtering options. Supports filtering by transaction type (ALLOCATION, DEALLOCATION, PROFIT, LOSS, PROFIT_SHARE, PLATFORM_FEE, REFUND), user ID, leader ID, follower ID, minimum amount, and date range. Includes summary statistics grouped by transaction type.",
    operationId: "getAdminCopyTradingTransactions",
    tags: ["Admin", "Copy Trading", "Transactions"],
    requiresAuth: true,
    permission: "access.copy_trading",
    demoMask: ["items.user.email"],
    logModule: "ADMIN_COPY",
    logTitle: "Get Copy Trading Transactions",
    parameters: [
        {
            name: "type",
            in: "query",
            required: false,
            schema: {
                type: "string",
                enum: ["ALLOCATION", "DEALLOCATION", "PROFIT", "LOSS", "PROFIT_SHARE", "PLATFORM_FEE", "REFUND"],
            },
            description: "Filter by transaction type",
        },
        {
            name: "userId",
            in: "query",
            required: false,
            schema: { type: "string" },
            description: "Filter by user ID",
        },
        {
            name: "leaderId",
            in: "query",
            required: false,
            schema: { type: "string" },
            description: "Filter by leader ID",
        },
        {
            name: "followerId",
            in: "query",
            required: false,
            schema: { type: "string" },
            description: "Filter by follower/subscription ID",
        },
        {
            name: "minAmount",
            in: "query",
            required: false,
            schema: { type: "number" },
            description: "Minimum transaction amount",
        },
        {
            name: "dateFrom",
            in: "query",
            required: false,
            schema: { type: "string", format: "date" },
            description: "Filter from date (inclusive)",
        },
        {
            name: "dateTo",
            in: "query",
            required: false,
            schema: { type: "string", format: "date" },
            description: "Filter until date (inclusive)",
        },
        {
            name: "page",
            in: "query",
            schema: { type: "integer", default: 1 },
            description: "Page number for pagination",
        },
        {
            name: "limit",
            in: "query",
            schema: { type: "integer", default: 20 },
            description: "Number of items per page (max 100)",
        },
    ],
    responses: {
        200: {
            description: "Transactions retrieved successfully",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            items: {
                                type: "array",
                                description: "List of copy trading transactions",
                                items: {
                                    type: "object",
                                    properties: {
                                        id: { type: "string" },
                                        userId: { type: "string" },
                                        leaderId: { type: "string", nullable: true },
                                        followerId: { type: "string", nullable: true },
                                        tradeId: { type: "string", nullable: true },
                                        type: { type: "string" },
                                        amount: { type: "number" },
                                        currency: { type: "string" },
                                        fee: { type: "number" },
                                        balanceBefore: { type: "number" },
                                        balanceAfter: { type: "number" },
                                        description: { type: "string" },
                                        createdAt: { type: "string", format: "date-time" },
                                        user: { type: "object" },
                                        leader: { type: "object", nullable: true },
                                        follower: { type: "object", nullable: true },
                                        trade: { type: "object", nullable: true },
                                    },
                                },
                            },
                            pagination: {
                                type: "object",
                                properties: {
                                    total: { type: "integer" },
                                    page: { type: "integer" },
                                    limit: { type: "integer" },
                                    totalPages: { type: "integer" },
                                },
                            },
                            summary: {
                                type: "array",
                                description: "Summary statistics grouped by transaction type",
                                items: {
                                    type: "object",
                                    properties: {
                                        type: { type: "string" },
                                        total: { type: "number" },
                                        count: { type: "integer" },
                                    },
                                },
                            },
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
    const { user, query, ctx } = data;
    if (!(user === null || user === void 0 ? void 0 : user.id)) {
        throw (0, error_1.createError)({ statusCode: 401, message: "Unauthorized" });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Fetching copy trading transactions");
    const where = {};
    if (query.type) {
        where.type = query.type;
    }
    if (query.userId) {
        where.userId = query.userId;
    }
    if (query.leaderId) {
        where.leaderId = query.leaderId;
    }
    if (query.followerId) {
        where.followerId = query.followerId;
    }
    if (query.minAmount) {
        where.amount = { [sequelize_1.Op.gte]: parseFloat(query.minAmount) };
    }
    if (query.dateFrom || query.dateTo) {
        where.createdAt = {};
        if (query.dateFrom) {
            where.createdAt[sequelize_1.Op.gte] = new Date(query.dateFrom);
        }
        if (query.dateTo) {
            where.createdAt[sequelize_1.Op.lte] = new Date(query.dateTo + "T23:59:59.999Z");
        }
    }
    const page = parseInt(query.page) || 1;
    const limit = Math.min(parseInt(query.limit) || 20, 100);
    const offset = (page - 1) * limit;
    const { count, rows: transactions } = await db_1.models.copyTradingTransaction.findAndCountAll({
        where,
        include: [
            {
                model: db_1.models.user,
                as: "user",
                attributes: ["id", "firstName", "lastName", "email"],
            },
            {
                model: db_1.models.copyTradingLeader,
                as: "leader",
                attributes: ["id", "displayName"],
                required: false,
            },
            {
                model: db_1.models.copyTradingFollower,
                as: "follower",
                attributes: ["id"],
                required: false,
            },
            {
                model: db_1.models.copyTradingTrade,
                as: "trade",
                attributes: ["id", "symbol", "side", "amount"],
                required: false,
            },
        ],
        order: [["createdAt", "DESC"]],
        limit,
        offset,
    });
    const summary = await db_1.models.copyTradingTransaction.findAll({
        attributes: [
            "type",
            [(0, sequelize_1.fn)("SUM", (0, sequelize_1.col)("amount")), "total"],
            [(0, sequelize_1.fn)("COUNT", (0, sequelize_1.col)("id")), "count"],
        ],
        group: ["type"],
    });
    ctx === null || ctx === void 0 ? void 0 : ctx.success(`Retrieved ${count} copy trading transactions`);
    return {
        items: transactions.map((t) => t.toJSON()),
        pagination: {
            total: count,
            page,
            limit,
            totalPages: Math.ceil(count / limit),
        },
        summary: summary.map((s) => ({
            type: s.type,
            total: parseFloat(s.get("total")) || 0,
            count: parseInt(s.get("count")) || 0,
        })),
    };
};
