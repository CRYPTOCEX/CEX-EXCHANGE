"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const query_1 = require("@b/utils/query");
const utils_1 = require("./utils");
exports.metadata = {
    summary: "Creates a new Forex investment",
    description: "Creates a new Forex investment for a user with specified plan, duration, amount, and expected profit. The investment status can be ACTIVE, COMPLETED, CANCELLED, or REJECTED.",
    operationId: "createForexInvestment",
    tags: ["Admin", "Forex", "Investment"],
    requestBody: {
        required: true,
        content: {
            "application/json": {
                schema: utils_1.forexInvestmentUpdateSchema,
            },
        },
    },
    responses: (0, query_1.storeRecordResponses)(utils_1.forexInvestmentStoreSchema, "Forex Investment"),
    requiresAuth: true,
    permission: "create.forex.investment",
    logModule: "ADMIN_FOREX",
    logTitle: "Create forex investment",
};
exports.default = async (data) => {
    const { body, ctx } = data;
    const { userId, planId, durationId, amount, profit, result, status, endDate, } = body;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Validating forex investment data");
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Creating forex investment");
    const investmentResult = await (0, query_1.storeRecord)({
        model: "forexInvestment",
        data: {
            userId,
            planId,
            durationId,
            amount,
            profit,
            result,
            status,
            endDate,
        },
    });
    ctx === null || ctx === void 0 ? void 0 : ctx.success("Forex investment created successfully");
    return investmentResult;
};
