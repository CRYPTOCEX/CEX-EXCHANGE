"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const query_1 = require("@b/utils/query");
const utils_1 = require("./utils");
exports.metadata = {
    summary: "Creates a new AI Investment Plan",
    operationId: "createAiInvestmentPlan",
    tags: ["Admin", "AI Investment", "Plan"],
    description: "Creates a new AI Investment Plan with specified parameters including profit ranges, investment amounts, and associated durations. The plan can be set as trending and configured with default results.",
    requestBody: {
        required: true,
        content: {
            "application/json": {
                schema: utils_1.aiInvestmentPlanUpdateSchema,
            },
        },
    },
    responses: (0, query_1.storeRecordResponses)(utils_1.aiInvestmentPlanStoreSchema, "AI Investment Plan"),
    requiresAuth: true,
    permission: "create.ai.investment.plan",
    logModule: "ADMIN_AI",
    logTitle: "Create investment plan",
};
exports.default = async (data) => {
    const { body, ctx } = data;
    const { name, title, description, image, minProfit, maxProfit, minAmount, maxAmount, invested, profitPercentage, status, defaultProfit, defaultResult, trending, durations, } = body;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Validating plan data");
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
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Creating plan record");
    const result = await (0, query_1.storeRecord)({
        model: "aiInvestmentPlan",
        data: {
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
        },
        relations,
    });
    ctx === null || ctx === void 0 ? void 0 : ctx.success("Investment plan created successfully");
    return result;
};
