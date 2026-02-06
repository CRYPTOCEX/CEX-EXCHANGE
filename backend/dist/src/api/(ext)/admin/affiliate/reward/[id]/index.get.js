"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const query_1 = require("@b/utils/query");
const errors_1 = require("@b/utils/schema/errors");
const utils_1 = require("../utils");
const db_1 = require("@b/db");
exports.metadata = {
    summary: "Get affiliate reward by ID",
    operationId: "getAffiliateRewardById",
    tags: ["Admin", "Affiliate", "Reward"],
    description: "Retrieves detailed information for a specific affiliate referral reward including the referrer user details and associated referral condition.",
    parameters: [
        {
            index: 0,
            name: "id",
            in: "path",
            required: true,
            description: "ID of the affiliate reward to retrieve",
            schema: { type: "string" },
        },
    ],
    responses: {
        200: {
            description: "Affiliate reward details retrieved successfully",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: utils_1.baseMlmReferralRewardSchema,
                    },
                },
            },
        },
        401: errors_1.unauthorizedResponse,
        404: (0, errors_1.notFoundResponse)("Affiliate Reward"),
        500: errors_1.serverErrorResponse,
    },
    permission: "view.affiliate.reward",
    requiresAuth: true,
    logModule: "ADMIN_AFFILIATE",
    logTitle: "Get affiliate reward details",
    demoMask: ["referrer.email"],
};
exports.default = async (data) => {
    const { params, ctx } = data;
    ctx === null || ctx === void 0 ? void 0 : ctx.step(`Fetching reward with ID: ${params.id}`);
    const result = await (0, query_1.getRecord)("mlmReferralReward", params.id, [
        {
            model: db_1.models.user,
            as: "referrer",
            attributes: ["id", "firstName", "lastName", "email", "avatar"],
        },
        {
            model: db_1.models.mlmReferralCondition,
            as: "condition",
            attributes: [
                "title",
                "rewardType",
                "rewardWalletType",
                "rewardCurrency",
                "rewardChain",
            ],
        },
    ]);
    ctx === null || ctx === void 0 ? void 0 : ctx.success("Reward details retrieved successfully");
    return result;
};
