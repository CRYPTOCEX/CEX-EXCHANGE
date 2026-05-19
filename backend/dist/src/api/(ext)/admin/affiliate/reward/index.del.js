"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const query_1 = require("@b/utils/query");
const errors_1 = require("@b/utils/schema/errors");
exports.metadata = {
    summary: "Bulk delete affiliate rewards",
    operationId: "bulkDeleteAffiliateRewards",
    tags: ["Admin", "Affiliate", "Reward"],
    description: "Deletes multiple affiliate referral rewards by their IDs. This operation permanently removes the rewards from the system.",
    parameters: (0, query_1.commonBulkDeleteParams)("Affiliate Rewards"),
    requestBody: {
        required: true,
        content: {
            "application/json": {
                schema: {
                    type: "object",
                    properties: {
                        ids: {
                            type: "array",
                            items: { type: "string" },
                            description: "Array of affiliate reward IDs to delete",
                        },
                    },
                    required: ["ids"],
                },
            },
        },
    },
    responses: {
        200: {
            description: "Affiliate rewards deleted successfully",
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
        500: errors_1.serverErrorResponse,
    },
    requiresAuth: true,
    permission: "delete.affiliate.reward",
    logModule: "ADMIN_AFFILIATE",
    logTitle: "Bulk delete affiliate rewards",
};
exports.default = async (data) => {
    const { body, query, ctx } = data;
    const { ids } = body;
    ctx === null || ctx === void 0 ? void 0 : ctx.step(`Bulk deleting ${ids.length} rewards`);
    const result = (0, query_1.handleBulkDelete)({
        model: "mlmReferralReward",
        ids,
        query,
    });
    ctx === null || ctx === void 0 ? void 0 : ctx.success("Bulk delete completed successfully");
    return result;
};
