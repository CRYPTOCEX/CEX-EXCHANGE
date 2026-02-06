"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const query_1 = require("@b/utils/query");
const utils_1 = require("../utils");
exports.metadata = {
    summary: "Updates a specific Investment Plan",
    operationId: "updateInvestmentPlan",
    tags: ["Admin", "Investment Plans"],
    logModule: "ADMIN_FIN",
    logTitle: "Update Investment Plan",
    parameters: [
        {
            index: 0,
            name: "id",
            in: "path",
            description: "ID of the Investment Plan to update",
            required: true,
            schema: {
                type: "string",
            },
        },
    ],
    requestBody: {
        description: "New data for the Investment Plan",
        content: {
            "application/json": {
                schema: utils_1.investmentPlanUpdateSchema,
            },
        },
    },
    responses: (0, query_1.updateRecordResponses)("Investment Plan"),
    requiresAuth: true,
    permission: "edit.investment.plan",
};
exports.default = async (data) => {
    const { body, params, ctx } = data;
    const { id } = params;
    const { name, title, description, image, minProfit, maxProfit, minAmount, maxAmount, invested, profitPercentage, status, defaultProfit, defaultResult, trending, durations, currency, walletType, } = body;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Preparing investment plan update", { id, name, title });
    const relations = durations
        ? [
            {
                model: "investmentPlanDuration",
                method: "addDurations",
                data: durations.map((duration) => typeof duration === 'string' ? duration : duration.value),
                fields: {
                    source: "planId",
                    target: "durationId",
                },
            },
        ]
        : [];
    if (durations) {
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Updating plan durations", { durationsCount: durations.length });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Updating investment plan");
    const result = await (0, query_1.updateRecord)("investmentPlan", id, {
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
        currency,
        walletType,
    }, undefined, relations);
    ctx === null || ctx === void 0 ? void 0 : ctx.success("Investment plan updated successfully");
    return result;
};
