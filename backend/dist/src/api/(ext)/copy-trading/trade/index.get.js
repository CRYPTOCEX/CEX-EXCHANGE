"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const sequelize_1 = require("sequelize");
exports.metadata = {
    summary: "Get My Copy Trades",
    description: "Retrieves the user's copy trading trade history with filtering and pagination.",
    operationId: "getMyCopyTrades",
    tags: ["Copy Trading", "Trades"],
    requiresAuth: true,
    logModule: "COPY",
    logTitle: "Get my trades",
    parameters: [
        {
            name: "followerId",
            in: "query",
            required: false,
            schema: { type: "string" },
            description: "Filter by subscription/follower ID",
        },
        {
            name: "leaderId",
            in: "query",
            required: false,
            schema: { type: "string" },
            description: "Filter by leader ID",
        },
        {
            name: "symbol",
            in: "query",
            required: false,
            schema: { type: "string" },
            description: "Filter by trading pair symbol",
        },
        {
            name: "status",
            in: "query",
            required: false,
            schema: { type: "string", enum: ["PENDING", "EXECUTED", "PARTIAL", "CANCELLED", "FAILED", "CLOSED"] },
            description: "Filter by trade status",
        },
        {
            name: "side",
            in: "query",
            required: false,
            schema: { type: "string", enum: ["BUY", "SELL"] },
            description: "Filter by trade side",
        },
        {
            name: "dateFrom",
            in: "query",
            required: false,
            schema: { type: "string", format: "date" },
            description: "Filter trades from this date",
        },
        {
            name: "dateTo",
            in: "query",
            required: false,
            schema: { type: "string", format: "date" },
            description: "Filter trades until this date",
        },
        {
            name: "page",
            in: "query",
            required: false,
            schema: { type: "integer", default: 1 },
            description: "Page number",
        },
        {
            name: "limit",
            in: "query",
            required: false,
            schema: { type: "integer", default: 20 },
            description: "Items per page",
        },
    ],
    responses: {
        200: {
            description: "Trades retrieved successfully",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            items: { type: "array" },
                            pagination: {
                                type: "object",
                                properties: {
                                    total: { type: "number" },
                                    page: { type: "number" },
                                    limit: { type: "number" },
                                    totalPages: { type: "number" },
                                },
                            },
                            summary: {
                                type: "object",
                                properties: {
                                    totalTrades: { type: "number" },
                                    totalProfit: { type: "number" },
                                    winRate: { type: "number" },
                                },
                            },
                        },
                    },
                },
            },
        },
        401: { description: "Unauthorized" },
        500: { description: "Internal Server Error" },
    },
};
exports.default = async (data) => {
    const { user, query, ctx } = data;
    if (!(user === null || user === void 0 ? void 0 : user.id)) {
        throw (0, error_1.createError)({ statusCode: 401, message: "Unauthorized" });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Fetching user followers");
    const userFollowers = await db_1.models.copyTradingFollower.findAll({
        where: { userId: user.id },
        attributes: ["id", "leaderId"],
    });
    const followerIds = userFollowers.map((f) => f.id);
    if (followerIds.length === 0) {
        return {
            items: [],
            pagination: { total: 0, page: 1, limit: 20, totalPages: 0 },
            summary: { totalTrades: 0, totalProfit: 0, winRate: 0 },
        };
    }
    const where = {
        followerId: { [sequelize_1.Op.in]: followerIds },
    };
    if (query.followerId) {
        if (!followerIds.includes(query.followerId)) {
            throw (0, error_1.createError)({ statusCode: 403, message: "Access denied to this subscription" });
        }
        where.followerId = query.followerId;
    }
    if (query.leaderId) {
        where.leaderId = query.leaderId;
    }
    if (query.symbol) {
        where.symbol = query.symbol;
    }
    if (query.status) {
        where.status = query.status;
    }
    if (query.side) {
        where.side = query.side;
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
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Fetching trades");
    const { count, rows: trades } = await db_1.models.copyTradingTrade.findAndCountAll({
        where,
        include: [
            {
                model: db_1.models.copyTradingLeader,
                as: "leader",
                attributes: ["id", "displayName"],
                include: [
                    {
                        model: db_1.models.user,
                        as: "user",
                        attributes: ["id", "firstName", "lastName", "avatar"],
                    },
                ],
            },
            {
                model: db_1.models.copyTradingFollower,
                as: "follower",
                attributes: ["id", "copyMode", "fixedAmount", "fixedRatio"],
            },
        ],
        order: [["createdAt", "DESC"]],
        limit,
        offset,
    });
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Calculating summary");
    const closedTrades = await db_1.models.copyTradingTrade.findAll({
        where: {
            followerId: { [sequelize_1.Op.in]: followerIds },
            status: "CLOSED",
        },
        attributes: ["profit"],
    });
    const totalClosedTrades = closedTrades.length;
    const winningTrades = closedTrades.filter((t) => (t.profit || 0) > 0).length;
    const totalProfit = closedTrades.reduce((sum, t) => sum + (t.profit || 0), 0);
    const winRate = totalClosedTrades > 0 ? (winningTrades / totalClosedTrades) * 100 : 0;
    ctx === null || ctx === void 0 ? void 0 : ctx.success(`Found ${count} trades`);
    return {
        items: trades.map((t) => t.toJSON()),
        pagination: {
            total: count,
            page,
            limit,
            totalPages: Math.ceil(count / limit),
        },
        summary: {
            totalTrades: totalClosedTrades,
            totalProfit: Math.round(totalProfit * 100) / 100,
            winRate: Math.round(winRate * 100) / 100,
        },
    };
};
