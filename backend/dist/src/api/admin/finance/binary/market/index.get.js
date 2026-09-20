"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const constants_1 = require("@b/utils/constants");
const query_1 = require("@b/utils/query");
const utils_1 = require("./utils");
exports.metadata = {
    summary: "Lists all binary markets with pagination and optional filtering",
    operationId: "listBinaryMarkets",
    tags: ["Admin", "Binary", "Markets"],
    parameters: [
        ...constants_1.crudParameters,
        {
            name: "currency",
            in: "query",
            description: "Filter markets by currency",
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
            description: "List of binary markets with detailed information",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            data: {
                                type: "array",
                                items: {
                                    type: "object",
                                    properties: utils_1.binaryMarketSchema,
                                },
                            },
                            pagination: constants_1.paginationSchema,
                        },
                    },
                },
            },
        },
        401: query_1.unauthorizedResponse,
        404: (0, query_1.notFoundMetadataResponse)("Binary Markets"),
        500: query_1.serverErrorResponse,
    },
    requiresAuth: true,
    permission: "view.binary.market",
};
exports.default = async (data) => {
    const { query } = data;
    return (0, query_1.getFiltered)({
        model: db_1.models.binaryMarket,
        query,
        sortField: query.sortField || "currency",
        paranoid: false,
    });
};
