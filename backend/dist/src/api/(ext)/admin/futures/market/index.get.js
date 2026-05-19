"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const constants_1 = require("@b/utils/constants");
const query_1 = require("@b/utils/query");
const errors_1 = require("@b/utils/schema/errors");
const utils_1 = require("./utils");
exports.metadata = {
    summary: "Lists all futures markets with pagination and filtering",
    operationId: "listFuturesMarkets",
    tags: ["Admin", "Futures", "Market"],
    description: "Retrieves a paginated list of all futures markets with support for filtering, sorting, and search. Returns market details including currency pairs, status, trending indicators, and trading parameters.",
    parameters: constants_1.crudParameters,
    responses: {
        200: {
            description: "Futures markets retrieved successfully",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            items: {
                                type: "array",
                                items: {
                                    type: "object",
                                    properties: utils_1.futuresMarketSchema,
                                },
                            },
                            pagination: constants_1.paginationSchema,
                        },
                    },
                },
            },
        },
        401: errors_1.unauthorizedResponse,
        404: (0, errors_1.notFoundResponse)("Futures Markets"),
        500: errors_1.serverErrorResponse,
    },
    requiresAuth: true,
    permission: "view.futures.market",
    logModule: "ADMIN_FUT",
    logTitle: "Get Futures Markets",
};
exports.default = async (data) => {
    const { query, ctx } = data;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Fetching futures markets");
    const result = await (0, query_1.getFiltered)({
        model: db_1.models.futuresMarket,
        query,
        sortField: query.sortField || "currency",
    });
    ctx === null || ctx === void 0 ? void 0 : ctx.success(`Retrieved ${result.items.length} futures markets`);
    return result;
};
