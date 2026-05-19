"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const query_1 = require("@b/utils/query");
const constants_1 = require("@b/utils/constants");
const utils_1 = require("./utils");
exports.metadata = {
    summary: "Lists all currencies with pagination and optional filtering",
    operationId: "listAllCurrencies",
    tags: ["Admin", "Currencies"],
    parameters: constants_1.crudParameters,
    responses: {
        200: {
            description: "All currencies retrieved successfully with pagination",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            data: {
                                type: "array",
                                items: {
                                    type: "object",
                                    properties: utils_1.baseFiatCurrencySchema,
                                },
                            },
                            pagination: constants_1.paginationSchema,
                        },
                    },
                },
            },
        },
        401: query_1.unauthorizedResponse,
        404: (0, query_1.notFoundMetadataResponse)("Currencies"),
        500: query_1.serverErrorResponse,
    },
    requiresAuth: true,
    permission: "view.fiat.currency",
};
exports.default = async (data) => {
    const { query } = data;
    const sortField = query.sortField || "id";
    return (0, query_1.getFiltered)({
        model: db_1.models.currency,
        query,
        sortField: sortField || "symbol",
        numericFields: ["price", "precision"],
        timestamps: false,
    });
};
