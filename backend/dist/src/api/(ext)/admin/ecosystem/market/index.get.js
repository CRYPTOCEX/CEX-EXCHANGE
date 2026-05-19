"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const utils_1 = require("@b/api/admin/finance/exchange/market/utils");
const db_1 = require("@b/db");
const constants_1 = require("@b/utils/constants");
const query_1 = require("@b/utils/query");
const errors_1 = require("@b/utils/schema/errors");
exports.metadata = {
    summary: "Lists all ecosystem markets",
    description: "Retrieves a paginated list of all ecosystem markets with optional filtering and sorting. Markets include trading pairs, trending and hot status indicators, and metadata about precision, limits, and fees.",
    operationId: "listEcosystemMarkets",
    tags: ["Admin", "Ecosystem", "Market"],
    parameters: constants_1.crudParameters,
    logModule: "ADMIN_ECO",
    logTitle: "List markets",
    responses: {
        200: {
            description: "List of ecosystem markets retrieved successfully",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            items: {
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
        401: errors_1.unauthorizedResponse,
        404: (0, query_1.notFoundMetadataResponse)("Ecosystem Markets"),
        500: errors_1.serverErrorResponse,
    },
    requiresAuth: true,
    permission: "view.ecosystem.market",
};
exports.default = async (data) => {
    const { query, ctx } = data;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Fetching ecosystem markets");
    const result = await (0, query_1.getFiltered)({
        model: db_1.models.ecosystemMarket,
        query,
        sortField: query.sortField || "currency",
    });
    ctx === null || ctx === void 0 ? void 0 : ctx.success("Markets retrieved successfully");
    return result;
};
