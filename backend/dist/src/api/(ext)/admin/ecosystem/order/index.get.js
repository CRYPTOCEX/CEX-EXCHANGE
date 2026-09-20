"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const constants_1 = require("@b/utils/constants");
const query_1 = require("@b/utils/query");
const utils_1 = require("./utils");
const query_2 = require("@b/api/(ext)/ecosystem/utils/scylla/query");
exports.metadata = {
    summary: "Lists all ecosystem orders",
    description: "Retrieves a paginated list of all ecosystem orders with optional filtering and sorting. Orders include details about user trades, order types, status, prices, amounts, and fees.",
    operationId: "listEcosystemOrders",
    tags: ["Admin", "Ecosystem", "Order"],
    parameters: constants_1.crudParameters,
    logModule: "ADMIN_ECO",
    logTitle: "List orders",
    responses: {
        200: {
            description: "Ecosystem orders retrieved successfully",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            items: {
                                type: "array",
                                items: { type: "object", properties: utils_1.orderSchema },
                            },
                            pagination: constants_1.paginationSchema,
                        },
                    },
                },
            },
        },
        401: query_1.unauthorizedResponse,
        404: (0, query_1.notFoundMetadataResponse)("Ecosystem Orders"),
        500: query_1.serverErrorResponse,
    },
    permission: "view.ecosystem.order",
    requiresAuth: true,
};
const keyspace = process.env.SCYLLA_KEYSPACE || "trading";
exports.default = async (data) => {
    const { query, ctx } = data;
    const table = "orders";
    const partitionKeys = ["userId"];
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Fetching ecosystem orders");
    const result = await (0, query_2.getFiltered)({
        table,
        query,
        filter: query.filter,
        sortField: query.sortField || "createdAt",
        sortOrder: query.sortOrder || "DESC",
        perPage: Number(query.perPage) || 10,
        allowFiltering: true,
        keyspace,
        partitionKeys,
        transformColumns: ["amount", "cost", "fee", "filled", "price", "remaining"],
        nonStringLikeColumns: ["userId"],
    });
    const validItems = result.items.filter((order) => {
        return (order.symbol !== null &&
            order.symbol !== undefined &&
            order.amount !== null &&
            order.amount !== undefined &&
            order.price !== null &&
            order.price !== undefined &&
            order.side !== null &&
            order.side !== undefined);
    });
    const removedCount = result.items.length - validItems.length;
    if (removedCount > 0) {
        result.pagination.totalItems = Math.max(0, result.pagination.totalItems - removedCount);
        result.pagination.totalPages = Math.ceil(result.pagination.totalItems / result.pagination.perPage);
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.success("Orders retrieved successfully");
    return {
        items: validItems,
        pagination: result.pagination,
    };
};
