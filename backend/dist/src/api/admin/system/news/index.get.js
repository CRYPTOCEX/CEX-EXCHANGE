"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const constants_1 = require("@b/utils/constants");
const query_1 = require("@b/utils/query");
const errors_1 = require("@b/utils/schema/errors");
exports.metadata = {
    summary: "Lists market news",
    operationId: "listMarketNewsAdmin",
    tags: ["Admin", "Market News"],
    description: "Paginated market-news feed. Includes both provider-synced stories and operator-authored desk commentary.",
    parameters: constants_1.crudParameters,
    responses: {
        200: {
            description: "Market news retrieved successfully",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            items: { type: "array", items: { type: "object" } },
                            pagination: constants_1.paginationSchema,
                        },
                    },
                },
            },
        },
        401: errors_1.unauthorizedResponse,
        404: (0, errors_1.notFoundResponse)("Market News"),
        500: errors_1.serverErrorResponse,
    },
    requiresAuth: true,
    permission: "view.market.news",
    logModule: "ADMIN_NEWS",
    logTitle: "List market news",
};
exports.default = async (data) => {
    const { query, ctx } = data;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Fetching market news");
    const result = await (0, query_1.getFiltered)({
        model: db_1.models.marketNews,
        paranoid: false,
        query,
        sortField: query.sortField || "publishedAt",
    });
    ctx === null || ctx === void 0 ? void 0 : ctx.success(`Retrieved ${result.items.length} market news items`);
    return result;
};
