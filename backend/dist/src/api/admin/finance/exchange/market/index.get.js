"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const constants_1 = require("@b/utils/constants");
const query_1 = require("@b/utils/query");
const utils_1 = require("./utils");
exports.metadata = {
    summary: "Lists all exchange markets with pagination and optional filtering",
    operationId: "listExchangeMarkets",
    tags: ["Admin", "Exchange", "Markets"],
    parameters: [
        ...constants_1.crudParameters,
        {
            name: "symbol",
            in: "query",
            description: "Filter markets by trading symbol",
            schema: { type: "string" },
            required: false,
        },
        {
            name: "pair",
            in: "query",
            description: "Filter markets by trading pair",
            schema: { type: "string" },
            required: false,
        },
        {
            name: "status",
            in: "query",
            description: "Filter markets by status (active or not)",
            schema: { type: "boolean" },
            required: false,
        },
    ],
    responses: {
        200: {
            description: "List of exchange markets with detailed information",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            data: {
                                type: "array",
                                items: {
                                    type: "object",
                                    properties: utils_1.marketSchema,
                                },
                            },
                            pagination: constants_1.paginationSchema,
                        },
                    },
                },
            },
        },
        401: query_1.unauthorizedResponse,
        404: (0, query_1.notFoundMetadataResponse)("Exchange Markets"),
        500: query_1.serverErrorResponse,
    },
    requiresAuth: true,
    permission: "view.exchange.market",
};
exports.default = async (data) => {
    const { query } = data;
    return (0, query_1.getFiltered)({
        model: db_1.models.exchangeMarket,
        query,
        sortField: query.sortField || "currency",
        paranoid: false,
    });
};
