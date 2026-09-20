"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const query_1 = require("@b/utils/query");
const utils_1 = require("./utils");
const db_1 = require("@b/db");
const errors_1 = require("@b/utils/schema/errors");
const error_1 = require("@b/utils/error");
exports.metadata = {
    summary: "Create a new affiliate reward",
    operationId: "createAffiliateReward",
    tags: ["Admin", "Affiliate", "Reward"],
    description: "Creates a new affiliate referral reward for a specific referrer and condition. Validates that the referrer exists before creating the reward.",
    requestBody: {
        required: true,
        content: {
            "application/json": {
                schema: utils_1.mlmReferralRewardUpdateSchema,
            },
        },
    },
    responses: {
        200: utils_1.mlmReferralRewardStoreSchema,
        400: errors_1.badRequestResponse,
        401: errors_1.unauthorizedResponse,
        404: (0, errors_1.notFoundResponse)("Referrer"),
        500: errors_1.serverErrorResponse,
    },
    requiresAuth: true,
    permission: "create.affiliate.reward",
    logModule: "ADMIN_AFFILIATE",
    logTitle: "Create affiliate reward",
};
exports.default = async (data) => {
    const { body, ctx } = data;
    const { reward, isClaimed, conditionId, referrerId } = body;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Verifying referrer exists");
    const referrer = await db_1.models.user.findOne({ where: { id: referrerId } });
    if (!referrer)
        throw (0, error_1.createError)({ statusCode: 404, message: "Referrer not found" });
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Creating reward record");
    const result = await (0, query_1.storeRecord)({
        model: "mlmReferralReward",
        data: {
            reward,
            isClaimed,
            conditionId,
            referrerId,
        },
    });
    ctx === null || ctx === void 0 ? void 0 : ctx.success("Reward created successfully");
    return result;
};
