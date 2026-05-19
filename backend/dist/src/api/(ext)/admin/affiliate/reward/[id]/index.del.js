"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const query_1 = require("@b/utils/query");
const errors_1 = require("@b/utils/schema/errors");
exports.metadata = {
    summary: "Delete a specific affiliate reward",
    operationId: "deleteAffiliateReward",
    tags: ["Admin", "Affiliate", "Reward"],
    description: "Deletes a single affiliate referral reward by its ID. This operation permanently removes the reward from the system.",
    parameters: (0, query_1.deleteRecordParams)("Affiliate Reward"),
    responses: {
        200: {
            description: "Affiliate reward deleted successfully",
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
        401: errors_1.unauthorizedResponse,
        404: (0, errors_1.notFoundResponse)("Affiliate Reward"),
        500: errors_1.serverErrorResponse,
    },
    permission: "delete.affiliate.reward",
    requiresAuth: true,
    logModule: "ADMIN_AFFILIATE",
    logTitle: "Delete affiliate reward",
};
exports.default = async (data) => {
    const { params, query, ctx } = data;
    ctx === null || ctx === void 0 ? void 0 : ctx.step(`Deleting reward with ID: ${params.id}`);
    const result = (0, query_1.handleSingleDelete)({
        model: "mlmReferralReward",
        id: params.id,
        query,
    });
    ctx === null || ctx === void 0 ? void 0 : ctx.success("Reward deleted successfully");
    return result;
};
