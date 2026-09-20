"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const sequelize_1 = require("sequelize");
const error_1 = require("@b/utils/error");
const query_1 = require("@b/utils/query");
const errors_1 = require("@b/utils/schema/errors");
exports.metadata = {
    summary: "List all copy trades",
    description: "Returns a paginated list of all copy trading trades with filtering options. Supports filtering by status, leader ID, follower ID, symbol, side (BUY/SELL), and trade type (leader/follower). Includes leader and follower information with associated user details.",
    operationId: "getAdminCopyTradingTrades",
    tags: ["Admin", "Copy Trading", "Trades"],
    requiresAuth: true,
    permission: "view.copy_trading",
    logModule: "ADMIN_COPY",
    logTitle: "Get Copy Trading Trades",
    parameters: [
        {
            name: "page",
            in: "query",
            schema: { type: "integer", default: 1 },
            description: "Page number for pagination",
        },
        {
            name: "limit",
            in: "query",
            schema: { type: "integer", default: 10 },
            description: "Number of items per page",
        },
        {
            name: "perPage",
            in: "query",
            schema: { type: "integer", default: 10 },
            description: "Number of items per page (data table alias for limit)",
        },
        {
            name: "filter",
            in: "query",
            schema: { type: "string" },
            description: "JSON filter object sent by the data table. Supports a flat userId, which is translated into the leader/follower rows that user owns, plus the trade's own columns (leaderId, followerId, symbol, marketType, side, status, isLeaderTrade, amount, price, cost, profit, createdAt).",
        },
        {
            name: "sortField",
            in: "query",
            schema: { type: "string" },
            description: "Comma-separated column(s) to order by. Unknown columns are ignored; defaults to createdAt.",
        },
        {
            name: "sortOrder",
            in: "query",
            schema: { type: "string" },
            description: "Comma-separated asc/desc, positionally paired with sortField.",
        },
        {
            name: "status",
            in: "query",
            schema: { type: "string" },
            description: "Filter by trade status",
        },
        {
            name: "leaderId",
            in: "query",
            schema: { type: "string" },
            description: "Filter by leader ID",
        },
        {
            name: "followerId",
            in: "query",
            schema: { type: "string" },
            description: "Filter by follower ID",
        },
        {
            name: "symbol",
            in: "query",
            schema: { type: "string" },
            description: "Filter by trading symbol",
        },
        {
            name: "side",
            in: "query",
            schema: { type: "string", enum: ["BUY", "SELL"] },
            description: "Filter by trade side",
        },
        {
            name: "type",
            in: "query",
            schema: { type: "string", enum: ["leader", "follower"] },
            description: "Filter by leader trades only or follower trades only",
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
                            items: {
                                type: "array",
                                description: "List of copy trading trades",
                                items: {
                                    type: "object",
                                    properties: {
                                        id: { type: "string" },
                                        leaderId: { type: "string" },
                                        followerId: { type: "string", nullable: true },
                                        symbol: { type: "string" },
                                        side: { type: "string", enum: ["BUY", "SELL"] },
                                        amount: { type: "number" },
                                        price: { type: "number" },
                                        status: { type: "string" },
                                        profit: { type: "number" },
                                        fee: { type: "number" },
                                        latencyMs: { type: "integer" },
                                        createdAt: { type: "string", format: "date-time" },
                                        leader: { type: "object" },
                                        follower: { type: "object", nullable: true },
                                    },
                                },
                            },
                            pagination: {
                                type: "object",
                                properties: {
                                    total: { type: "integer" },
                                    totalItems: { type: "integer" },
                                    page: { type: "integer" },
                                    limit: { type: "integer" },
                                    totalPages: { type: "integer" },
                                },
                            },
                            stats: {
                                type: "object",
                                description: "Aggregates over the same filters as the list, not over the whole table.",
                                properties: {
                                    totalTrades: { type: "integer" },
                                    leaderTrades: { type: "integer" },
                                    followerTrades: { type: "integer" },
                                    totalVolume: { type: "number" },
                                    totalPnl: { type: "number" },
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
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Fetching copy trading trades");
    const page = parseInt(query.page) || 1;
    const limit = parseInt(query.limit) || parseInt(query.perPage) || 10;
    const offset = (page - 1) * limit;
    const where = {};
    if (query.status) {
        where.status = query.status;
    }
    if (query.leaderId) {
        where.leaderId = query.leaderId;
    }
    if (query.followerId) {
        where.followerId = query.followerId;
    }
    if (query.symbol) {
        where.symbol = query.symbol;
    }
    if (query.marketType === "SPOT" || query.marketType === "BINARY") {
        where.marketType = query.marketType;
    }
    if (query.side) {
        where.side = query.side;
    }
    if (query.type === "leader") {
        where.followerId = null;
    }
    else if (query.type === "follower") {
        where.followerId = { [sequelize_1.Op.ne]: null };
    }
    const tradeDirectFilters = (0, query_1.parseFilterParam)(query.filter, []);
    const filterUserId = (0, query_1.takeDirectFilter)(tradeDirectFilters, "userId");
    if (filterUserId) {
        const [leaderRows, followerRows] = await Promise.all([
            db_1.models.copyTradingLeader.findAll({
                where: { userId: filterUserId },
                attributes: ["id"],
                paranoid: false,
                raw: true,
            }),
            db_1.models.copyTradingFollower.findAll({
                where: { userId: filterUserId },
                attributes: ["id"],
                paranoid: false,
                raw: true,
            }),
        ]);
        const leaderIds = leaderRows.map((r) => r.id);
        const followerIds = followerRows.map((r) => r.id);
        if (!leaderIds.length && !followerIds.length) {
            where.id = null;
        }
        else {
            const ownership = [];
            if (leaderIds.length) {
                ownership.push({ leaderId: { [sequelize_1.Op.in]: leaderIds }, followerId: null });
            }
            if (followerIds.length) {
                ownership.push({ followerId: { [sequelize_1.Op.in]: followerIds } });
            }
            where[sequelize_1.Op.and] = [...(where[sequelize_1.Op.and] || []), { [sequelize_1.Op.or]: ownership }];
        }
    }
    (0, query_1.applyDirectFilters)(where, tradeDirectFilters, {
        id: "string",
        leaderId: "string",
        followerId: "string",
        symbol: "string",
        marketType: "string",
        side: "string",
        status: "string",
        isLeaderTrade: "boolean",
        amount: "number",
        price: "number",
        cost: "number",
        profit: "number",
        createdAt: "date",
    });
    const SORTABLE = new Set([
        "createdAt",
        "symbol",
        "side",
        "marketType",
        "amount",
        "price",
        "cost",
        "profit",
        "status",
        "isLeaderTrade",
    ]);
    const order = [];
    const sortFields = String(query.sortField || "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
    const sortOrders = String(query.sortOrder || "")
        .split(",")
        .map((s) => s.trim());
    sortFields.forEach((field, index) => {
        var _a;
        if (!SORTABLE.has(field))
            return;
        order.push([
            field,
            ((_a = sortOrders[index]) === null || _a === void 0 ? void 0 : _a.toLowerCase()) === "asc" ? "ASC" : "DESC",
        ]);
    });
    if (order.length === 0)
        order.push(["createdAt", "DESC"]);
    const { count, rows } = await db_1.models.copyTradingTrade.findAndCountAll({
        where,
        include: [
            {
                model: db_1.models.copyTradingLeader,
                as: "leader",
                attributes: ["id", "displayName", "userId"],
                include: [
                    {
                        model: db_1.models.user,
                        as: "user",
                        attributes: ["id", "firstName", "lastName"],
                    },
                ],
            },
            {
                model: db_1.models.copyTradingFollower,
                as: "follower",
                attributes: ["id", "userId"],
                include: [
                    {
                        model: db_1.models.user,
                        as: "user",
                        attributes: ["id", "firstName", "lastName"],
                    },
                ],
            },
        ],
        limit,
        offset,
        order,
    });
    const aggregate = await db_1.models.copyTradingTrade.findOne({
        where,
        attributes: [
            [(0, sequelize_1.fn)("COUNT", (0, sequelize_1.col)("id")), "totalTrades"],
            [(0, sequelize_1.fn)("SUM", (0, sequelize_1.col)("isLeaderTrade")), "leaderTrades"],
            [(0, sequelize_1.fn)("SUM", (0, sequelize_1.col)("cost")), "totalVolume"],
            [(0, sequelize_1.fn)("SUM", (0, sequelize_1.col)("profit")), "totalPnl"],
        ],
        raw: true,
    });
    const totalTrades = parseInt(aggregate === null || aggregate === void 0 ? void 0 : aggregate.totalTrades) || 0;
    const leaderTrades = parseInt(aggregate === null || aggregate === void 0 ? void 0 : aggregate.leaderTrades) || 0;
    const stats = {
        totalTrades,
        leaderTrades,
        followerTrades: totalTrades - leaderTrades,
        totalVolume: parseFloat(aggregate === null || aggregate === void 0 ? void 0 : aggregate.totalVolume) || 0,
        totalPnl: parseFloat(aggregate === null || aggregate === void 0 ? void 0 : aggregate.totalPnl) || 0,
    };
    ctx === null || ctx === void 0 ? void 0 : ctx.success(`Retrieved ${count} copy trading trades`);
    return {
        items: rows,
        pagination: {
            total: count,
            totalItems: count,
            page,
            limit,
            totalPages: Math.ceil(count / limit),
        },
        stats,
    };
};
