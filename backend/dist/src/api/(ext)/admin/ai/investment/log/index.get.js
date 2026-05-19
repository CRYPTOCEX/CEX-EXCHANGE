"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const constants_1 = require("@b/utils/constants");
const query_1 = require("@b/utils/query");
const utils_1 = require("./utils");
exports.metadata = {
    summary: "Lists all AI investments with pagination and optional filtering",
    operationId: "listAIInvestments",
    tags: ["Admin", "AI Investment"],
    parameters: constants_1.crudParameters,
    responses: {
        200: {
            description: "List of AI investments with detailed pagination information",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            items: {
                                type: "array",
                                items: {
                                    type: "object",
                                    properties: utils_1.aiInvestmentSchema,
                                },
                            },
                            pagination: constants_1.paginationSchema,
                        },
                    },
                },
            },
        },
        401: query_1.unauthorizedResponse,
        404: (0, query_1.notFoundMetadataResponse)("AI Investments"),
        500: query_1.serverErrorResponse,
    },
    requiresAuth: true,
    permission: "view.ai.investment",
    logModule: "ADMIN_AI",
    logTitle: "List AI investments",
    demoMask: ["items.user.email"],
};
exports.default = async (data) => {
    var _a;
    const { query, ctx } = data;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Fetching AI investments");
    const result = await (0, query_1.getFiltered)({
        model: db_1.models.aiInvestment,
        query,
        sortField: query.sortField || "createdAt",
        includeModels: [
            {
                model: db_1.models.user,
                as: "user",
                attributes: ["id", "firstName", "lastName", "email", "avatar"],
            },
            {
                model: db_1.models.aiInvestmentPlan,
                as: "plan",
                attributes: ["title", "image"],
            },
            {
                model: db_1.models.aiInvestmentDuration,
                as: "duration",
                attributes: ["duration", "timeframe"],
            },
        ],
    });
    ctx === null || ctx === void 0 ? void 0 : ctx.success(`Retrieved ${((_a = result.items) === null || _a === void 0 ? void 0 : _a.length) || 0} investment(s)`);
    return result;
};
