"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const query_1 = require("@b/utils/query");
const utils_1 = require("./utils");
exports.metadata = {
    summary: "Stores a new Investment Plan",
    operationId: "storeInvestmentPlan",
    tags: ["Admin", "Investment Plans"],
    logModule: "ADMIN_FIN",
    logTitle: "Create Investment Plan",
    requestBody: {
        required: true,
        content: {
            "application/json": {
                schema: utils_1.investmentPlanUpdateSchema,
            },
        },
    },
    responses: (0, query_1.storeRecordResponses)(utils_1.investmentPlanStoreSchema, "Investment Plan"),
    requiresAuth: true,
    permission: "create.investment.plan",
};
exports.default = async (data) => {
    const { body, ctx } = data;
    const { name, title, description, image, minProfit, maxProfit, minAmount, maxAmount, invested, profitPercentage, status, defaultProfit, defaultResult, trending, durations, currency, walletType, } = body;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Preparing investment plan data");
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
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Adding plan durations");
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Creating investment plan");
    const result = await (0, query_1.storeRecord)({
        model: "investmentPlan",
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
            currency,
            walletType,
        },
        relations,
    });
    ctx === null || ctx === void 0 ? void 0 : ctx.success("Investment plan created successfully");
    return result;
};
