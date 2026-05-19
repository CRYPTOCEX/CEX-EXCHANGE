"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const query_1 = require("@b/utils/query");
const sequelize_1 = require("sequelize");
const error_1 = require("@b/utils/error");
exports.metadata = {
    summary: "List Orders",
    operationId: "listOrders",
    tags: ["Exchange", "Orders"],
    description: "Retrieves a list of orders for the authenticated user with pagination support.",
    logModule: "EXCHANGE",
    logTitle: "List Binary Orders",
    parameters: [
        {
            name: "type",
            in: "query",
            description: "Type of order to retrieve.",
            schema: { type: "string" },
        },
        {
            name: "currency",
            in: "query",
            description: "currency of the order to retrieve.",
            schema: { type: "string" },
        },
        {
            name: "pair",
            in: "query",
            description: "pair of the order to retrieve.",
            schema: { type: "string" },
        },
        {
            name: "limit",
            in: "query",
            description: "Maximum number of orders to return (default: 50, max: 200)",
            schema: { type: "number" },
        },
        {
            name: "offset",
            in: "query",
            description: "Number of orders to skip for pagination (default: 0)",
            schema: { type: "number" },
        },
    ],
    responses: {
        200: {
            description: "A paginated list of orders",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            orders: {
                                type: "array",
                                items: {
                                    type: "object",
                                    properties: {},
                                },
                            },
                            pagination: {
                                type: "object",
                                properties: {
                                    total: { type: "number", description: "Total number of orders matching the criteria" },
                                    limit: { type: "number", description: "Maximum number of orders per page" },
                                    offset: { type: "number", description: "Number of orders skipped" },
                                    hasMore: { type: "boolean", description: "Whether there are more orders available" },
                                },
                            },
                        },
                    },
                },
            },
        },
        401: query_1.unauthorizedResponse,
        404: (0, query_1.notFoundMetadataResponse)("Order"),
        500: query_1.serverErrorResponse,
    },
    requiresAuth: true,
};
exports.default = async (data) => {
    const { user, query, ctx } = data;
    if (!(user === null || user === void 0 ? void 0 : user.id))
        throw (0, error_1.createError)({ statusCode: 401, message: "Unauthorized" });
    const { currency, pair, type, limit: rawLimit, offset: rawOffset } = query;
    const DEFAULT_LIMIT = 50;
    const MAX_LIMIT = 200;
    const limit = Math.min(Math.max(1, parseInt(rawLimit) || DEFAULT_LIMIT), MAX_LIMIT);
    const offset = Math.max(0, parseInt(rawOffset) || 0);
    const whereClause = {
        userId: user.id,
        status: type === "OPEN" ? "PENDING" : { [sequelize_1.Op.not]: "PENDING" },
        symbol: `${currency}/${pair}`,
    };
    ctx === null || ctx === void 0 ? void 0 : ctx.step(`Fetching ${type} binary orders for ${currency}/${pair} (limit: ${limit}, offset: ${offset})`);
    const total = await db_1.models.binaryOrder.count({ where: whereClause });
    const orders = await db_1.models.binaryOrder.findAll({
        where: whereClause,
        order: [["createdAt", "DESC"]],
        limit,
        offset,
    });
    const hasMore = offset + orders.length < total;
    ctx === null || ctx === void 0 ? void 0 : ctx.success(`Retrieved ${orders.length} of ${total} binary orders`);
    return {
        orders,
        pagination: {
            total,
            limit,
            offset,
            hasMore,
        },
    };
};
