"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const constants_1 = require("@b/utils/constants");
const query_1 = require("@b/utils/query");
const utils_1 = require("./utils");
exports.metadata = {
    summary: "List all AI investment durations",
    operationId: "listAiInvestmentDurations",
    tags: ["Admin", "AI Investment", "Duration"],
    description: "Retrieves a paginated list of all AI investment duration options. Supports filtering, sorting, and pagination for managing investment timeframes.",
    parameters: constants_1.crudParameters,
    responses: {
        200: {
            description: "List of AI investment durations with pagination information",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            items: {
                                type: "array",
                                items: {
                                    type: "object",
                                    properties: utils_1.aiInvestmentDurationSchema,
                                },
                            },
                            pagination: constants_1.paginationSchema,
                        },
                    },
                },
            },
        },
        401: query_1.unauthorizedResponse,
        404: (0, query_1.notFoundMetadataResponse)("AI Investment Durations"),
        500: query_1.serverErrorResponse,
    },
    requiresAuth: true,
    permission: "view.ai.investment.duration",
    logModule: "ADMIN_AI",
    logTitle: "List investment durations",
};
exports.default = async (data) => {
    var _a;
    const { query, ctx } = data;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Fetching investment durations");
    const result = await (0, query_1.getFiltered)({
        model: db_1.models.aiInvestmentDuration,
        query,
        sortField: query.sortField || "duration",
        paranoid: false,
    });
    ctx === null || ctx === void 0 ? void 0 : ctx.success(`Retrieved ${((_a = result.items) === null || _a === void 0 ? void 0 : _a.length) || 0} duration(s)`);
    return result;
};
