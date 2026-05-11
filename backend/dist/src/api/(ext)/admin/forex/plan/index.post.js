"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const query_1 = require("@b/utils/query");
const utils_1 = require("./utils");
exports.metadata = {
    summary: "Creates a new Forex plan",
    description: "Creates a new Forex trading plan with profit ranges, investment limits, currency, wallet type, and available durations.",
    operationId: "createForexPlan",
    tags: ["Admin", "Forex", "Plan"],
    requestBody: {
        required: true,
        content: {
            "application/json": {
                schema: utils_1.forexPlanUpdateSchema,
            },
        },
    },
    responses: (0, query_1.storeRecordResponses)(utils_1.forexPlanStoreSchema, "Forex Plan"),
    requiresAuth: true,
    permission: "create.forex.plan",
    logModule: "ADMIN_FOREX",
    logTitle: "Create forex plan",
};
exports.default = async (data) => {
    const { body, ctx } = data;
    const { name, title, description, image, minProfit, maxProfit, minAmount, maxAmount, invested, profitPercentage, status, defaultProfit, defaultResult, trending, durations, currency, walletType, } = body;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Validating forex plan data");
    const relations = durations
        ? [
            {
                model: "forexPlanDuration",
                method: "addDurations",
                data: durations.map((duration) => typeof duration === 'string' ? duration : duration.value),
                fields: {
                    source: "planId",
                    target: "durationId",
                },
            },
        ]
        : [];
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Creating forex plan");
    const result = await (0, query_1.storeRecord)({
        model: "forexPlan",
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
    ctx === null || ctx === void 0 ? void 0 : ctx.success("Forex plan created successfully");
    return result;
};
