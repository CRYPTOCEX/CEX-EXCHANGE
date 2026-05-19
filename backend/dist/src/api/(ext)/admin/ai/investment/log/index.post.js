"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const query_1 = require("@b/utils/query");
const utils_1 = require("./utils");
exports.metadata = {
    summary: "Stores a new AI Investment",
    operationId: "storeAIInvestment",
    tags: ["Admin", "AI Investments"],
    requestBody: {
        required: true,
        content: {
            "application/json": {
                schema: utils_1.aiInvestmentUpdateSchema,
            },
        },
    },
    responses: (0, query_1.storeRecordResponses)(utils_1.aiInvestmentStoreSchema, "AI Investment"),
    requiresAuth: true,
    permission: "create.ai.investment",
    logModule: "ADMIN_AI",
    logTitle: "Create AI investment",
};
exports.default = async (data) => {
    const { body, ctx } = data;
    const { userId, planId, durationId, symbol, amount, profit, result, status } = body;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Validating investment data");
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Creating investment record");
    const investmentResult = await (0, query_1.storeRecord)({
        model: "aiInvestment",
        data: {
            userId,
            planId,
            durationId,
            symbol,
            amount,
            profit,
            result,
            status,
        },
    });
    ctx === null || ctx === void 0 ? void 0 : ctx.success("Investment created successfully");
    return investmentResult;
};
