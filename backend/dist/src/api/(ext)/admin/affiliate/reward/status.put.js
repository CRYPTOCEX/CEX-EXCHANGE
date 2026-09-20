"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const query_1 = require("@b/utils/query");
const errors_1 = require("@b/utils/schema/errors");
exports.metadata = {
    summary: "Bulk update affiliate reward claimed status",
    operationId: "bulkUpdateAffiliateRewardStatus",
    tags: ["Admin", "Affiliate", "Reward"],
    description: "Updates the claimed status for multiple affiliate rewards simultaneously. Use this to mark rewards as claimed or unclaimed in bulk.",
    requestBody: {
        required: true,
        content: {
            "application/json": {
                schema: {
                    type: "object",
                    properties: {
                        ids: {
                            type: "array",
                            description: "Array of affiliate reward IDs to update",
                            items: { type: "string" },
                        },
                        status: {
                            type: "boolean",
                            description: "New claimed status to apply (true for claimed, false for unclaimed)",
                        },
                    },
                    required: ["ids", "status"],
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
    logTitle: "Bulk update affiliate reward claimed status",
};
exports.default = async (data) => {
    const { body, ctx } = data;
    const { ids, status } = body;
    const isClaimed = status;
    ctx === null || ctx === void 0 ? void 0 : ctx.step(`Bulk updating claimed status for ${ids.length} rewards`);
    const result = (0, query_1.updateStatus)("mlmReferralReward", ids, isClaimed, undefined, "Referral Reward");
    ctx === null || ctx === void 0 ? void 0 : ctx.success("Bulk claimed status update completed successfully");
    return result;
};
