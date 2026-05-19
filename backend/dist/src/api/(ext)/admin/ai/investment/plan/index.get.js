"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const constants_1 = require("@b/utils/constants");
const query_1 = require("@b/utils/query");
const utils_1 = require("./utils");
exports.metadata = {
    summary: "Lists all AI Investment Plans",
    operationId: "listAiInvestmentPlans",
    tags: ["Admin", "AI Investment", "Plan"],
    description: "Retrieves a paginated list of all AI Investment Plans with support for filtering, sorting, and searching. Includes associated investments and durations for each plan.",
    parameters: constants_1.crudParameters,
    responses: {
        200: {
            description: "List of AI Investment Plans with detailed information including investments and durations, along with pagination metadata",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            items: {
                                type: "array",
                                items: {
                                    type: "object",
                                    properties: utils_1.aiInvestmentPlanSchema,
                                },
                            },
                            pagination: constants_1.paginationSchema,
                        },
                    },
                },
            },
        },
        401: query_1.unauthorizedResponse,
        404: (0, query_1.notFoundMetadataResponse)("AI Investment Plans"),
        500: query_1.serverErrorResponse,
    },
    requiresAuth: true,
    permission: "view.ai.investment.plan",
    logModule: "ADMIN_AI",
    logTitle: "List investment plans",
};
exports.default = async (data) => {
    var _a;
    const { query, ctx } = data;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Fetching investment plans");
    const result = await (0, query_1.getFiltered)({
        model: db_1.models.aiInvestmentPlan,
        query,
        sortField: query.sortField || "name",
        includeModels: [
            {
                model: db_1.models.aiInvestment,
                as: "investments",
                attributes: ["id", "amount", "profit", "status"],
            },
            {
                model: db_1.models.aiInvestmentDuration,
                as: "durations",
                through: { attributes: [] },
                attributes: ["id", "duration", "timeframe"],
            },
        ],
    });
    ctx === null || ctx === void 0 ? void 0 : ctx.success(`Retrieved ${((_a = result.items) === null || _a === void 0 ? void 0 : _a.length) || 0} plan(s)`);
    return result;
};
