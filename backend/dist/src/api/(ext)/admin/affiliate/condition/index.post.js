"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const query_1 = require("@b/utils/query");
const utils_1 = require("./utils");
exports.metadata = {
    summary: "Creates a new affiliate condition",
    description: "Creates a new affiliate condition with specified reward parameters. Conditions define how affiliates earn rewards based on referral actions such as deposits, trades, investments, and more. Supports various reward types (percentage or fixed) and wallet types (FIAT, SPOT, ECO).",
    operationId: "createAffiliateCondition",
    tags: ["Admin", "Affiliate", "Condition"],
    requestBody: {
        required: true,
        content: {
            "application/json": {
                schema: utils_1.mlmReferralConditionUpdateSchema,
            },
        },
    },
    responses: (0, query_1.storeRecordResponses)(utils_1.mlmReferralConditionStoreSchema, "Affiliate Condition"),
    requiresAuth: true,
    permission: "create.affiliate.condition",
    logModule: "ADMIN_AFFILIATE",
    logTitle: "Create affiliate condition",
};
exports.default = async (data) => {
    const { body, ctx } = data;
    const { name, title, description, type, reward, rewardType, rewardWalletType, rewardCurrency, rewardChain, status, image, } = body;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Validating condition data");
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Creating condition record");
    const result = await (0, query_1.storeRecord)({
        model: "mlmReferralCondition",
        data: {
            name,
            title,
            description,
            type,
            reward,
            rewardType,
            rewardWalletType,
            rewardCurrency,
            rewardChain,
            status,
            image,
        },
    });
    ctx === null || ctx === void 0 ? void 0 : ctx.success("Condition created successfully");
    return result;
};
