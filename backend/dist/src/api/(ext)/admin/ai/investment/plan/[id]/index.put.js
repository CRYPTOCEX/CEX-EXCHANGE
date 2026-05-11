"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const query_1 = require("@b/utils/query");
const utils_1 = require("../utils");
exports.metadata = {
    summary: "Updates a specific AI Investment Plan",
    operationId: "updateAiInvestmentPlan",
    tags: ["Admin", "AI Investment", "Plan"],
    description: "Updates an existing AI Investment Plan with new parameters including profit ranges, investment limits, durations, and other configuration settings. Can modify trending status and default results.",
    parameters: [
        {
            index: 0,
            name: "id",
            in: "path",
            description: "ID of the AI Investment Plan to update",
            required: true,
            schema: {
                type: "string",
            },
        },
    ],
    requestBody: {
        description: "Updated data for the AI Investment Plan",
        required: true,
        content: {
            "application/json": {
                schema: utils_1.aiInvestmentPlanUpdateSchema,
            },
        },
    },
    responses: (0, query_1.updateRecordResponses)("AI Investment Plan"),
    requiresAuth: true,
    permission: "edit.ai.investment.plan",
    logModule: "ADMIN_AI",
    logTitle: "Update investment plan",
};
exports.default = async (data) => {
    const { body, params, ctx } = data;
    const { id } = params;
    const { name, title, description, image, minProfit, maxProfit, minAmount, maxAmount, invested, profitPercentage, status, defaultProfit, defaultResult, trending, durations, } = body;
    ctx === null || ctx === void 0 ? void 0 : ctx.step(`Updating plan ${id}`);
    const relations = durations
        ? [
            {
                model: "aiInvestmentPlanDuration",
                method: "addDurations",
                data: durations.map((duration) => typeof duration === 'string' ? duration : duration.value),
                fields: {
                    source: "planId",
                    target: "durationId",
                },
            },
        ]
        : [];
    const result = await (0, query_1.updateRecord)("aiInvestmentPlan", id, {
        name,
        title,
        description,
        image,
        minProfit,
        maxProfit,
        minAmount,
        maxAmount,
        invested,
        profitPercentage,
        status,
        defaultProfit,
        defaultResult,
        trending,
    }, undefined, relations);
    ctx === null || ctx === void 0 ? void 0 : ctx.success("Plan updated successfully");
    return result;
};
