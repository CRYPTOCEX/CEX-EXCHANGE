"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const query_1 = require("@b/utils/query");
const utils_1 = require("../utils");
const db_1 = require("@b/db");
exports.metadata = {
    summary: "Retrieves a specific AI Investment Plan",
    operationId: "getAiInvestmentPlanById",
    tags: ["Admin", "AI Investment", "Plan"],
    description: "Fetches detailed information for a specific AI Investment Plan including all associated investments and available durations. Returns comprehensive plan data with profit ranges, investment limits, and trending status.",
    parameters: [
        {
            index: 0,
            name: "id",
            in: "path",
            required: true,
            description: "ID of the AI Investment Plan to retrieve",
            schema: { type: "string" },
        },
    ],
    responses: {
        200: {
            description: "AI Investment Plan details with associated investments and durations",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: utils_1.baseAIInvestmentPlanSchema,
                    },
                },
            },
        },
        401: query_1.unauthorizedResponse,
        404: (0, query_1.notFoundMetadataResponse)("AI Investment Plan"),
        500: query_1.serverErrorResponse,
    },
    permission: "view.ai.investment.plan",
    requiresAuth: true,
    logModule: "ADMIN_AI",
    logTitle: "Get investment plan",
};
exports.default = async (data) => {
    const { params, ctx } = data;
    ctx === null || ctx === void 0 ? void 0 : ctx.step(`Fetching plan ${params.id}`);
    const result = await (0, query_1.getRecord)("aiInvestmentPlan", params.id, [
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
    ]);
    ctx === null || ctx === void 0 ? void 0 : ctx.success("Plan retrieved");
    return result;
};
