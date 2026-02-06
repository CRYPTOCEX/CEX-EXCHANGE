"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const constants_1 = require("@b/utils/constants");
const query_1 = require("@b/utils/query");
const utils_1 = require("./utils");
exports.metadata = {
    summary: "Lists all exchanges with pagination and optional filtering",
    operationId: "listExchanges",
    tags: ["Admin", "Exchange"],
    parameters: [
        ...constants_1.crudParameters,
        {
            name: "name",
            in: "query",
            description: "Filter exchanges by name",
            schema: { type: "string" },
            required: false,
        },
        {
            name: "type",
            in: "query",
            description: "Filter exchanges by type (e.g., spot, futures)",
            schema: { type: "string" },
            required: false,
        },
        {
            name: "status",
            in: "query",
            description: "Filter exchanges by operational status",
            schema: { type: "boolean" },
            required: false,
        },
    ],
    responses: {
        200: {
            description: "List of exchanges with detailed information",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            data: {
                                type: "array",
                                items: {
                                    type: "object",
                                    properties: utils_1.exchangeSchema,
                                },
                            },
                            pagination: constants_1.paginationSchema,
                        },
                    },
                },
            },
        },
        401: query_1.unauthorizedResponse,
        404: (0, query_1.notFoundMetadataResponse)("Exchanges"),
        500: query_1.serverErrorResponse,
    },
    requiresAuth: true,
    permission: "view.exchange",
};
exports.default = async (data) => {
    const { query } = data;
    return (0, query_1.getFiltered)({
        model: db_1.models.exchange,
        query,
        sortField: query.sortField || "name",
        paranoid: false,
    });
};
