"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const query_1 = require("@b/utils/query");
const errors_1 = require("@b/utils/schema/errors");
exports.metadata = {
    summary: "Update affiliate reward claimed status",
    operationId: "updateAffiliateRewardStatus",
    tags: ["Admin", "Affiliate", "Reward"],
    description: "Updates the claimed status for a specific affiliate referral reward. Use this to mark a reward as claimed or unclaimed.",
    parameters: [
        {
            index: 0,
            name: "id",
            in: "path",
            required: true,
            description: "ID of the affiliate reward to update",
            schema: { type: "string" },
        },
    ],
    requestBody: {
        required: true,
        content: {
            "application/json": {
                schema: {
                    type: "object",
                    properties: {
                        status: {
                            type: "boolean",
                            description: "New claimed status to apply (true for claimed, false for unclaimed)",
                        },
                    },
                    required: ["status"],
                },
            },
        },
    },
    responses: {
        200: {
            description: "Affiliate reward claimed status updated successfully",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            message: {
                                type: "string",
                                description: "Success message",
                            },
                        },
                    },
                },
            },
        },
        400: errors_1.badRequestResponse,
        401: errors_1.unauthorizedResponse,
        404: (0, errors_1.notFoundResponse)("Affiliate Reward"),
        500: errors_1.serverErrorResponse,
    },
    requiresAuth: true,
    permission: "edit.affiliate.reward",
    logModule: "ADMIN_AFFILIATE",
    logTitle: "Update affiliate reward claimed status",
};
exports.default = async (data) => {
    const { body, params, ctx } = data;
    const { id } = params;
    const { status } = body;
    const isClaimed = status;
    ctx === null || ctx === void 0 ? void 0 : ctx.step(`Updating claimed status for reward ID: ${id}`);
    const result = (0, query_1.updateStatus)("mlmReferralReward", id, isClaimed, undefined, "Referral Reward");
    ctx === null || ctx === void 0 ? void 0 : ctx.success("Reward claimed status updated successfully");
    return result;
};
