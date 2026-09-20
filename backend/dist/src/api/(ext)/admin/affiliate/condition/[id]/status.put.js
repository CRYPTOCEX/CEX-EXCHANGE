"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const query_1 = require("@b/utils/query");
exports.metadata = {
    summary: "Updates the status of a specific affiliate condition",
    description: "Toggles the active status of a single affiliate condition. When disabled, the condition will no longer trigger rewards for affiliate referrals. This endpoint allows quick activation or deactivation without modifying other condition properties.",
    operationId: "updateAffiliateConditionStatus",
    tags: ["Admin", "Affiliate", "Condition"],
    parameters: [
        {
            index: 0,
            name: "id",
            in: "path",
            required: true,
            description: "ID of the affiliate condition to update",
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
                            description: "New active status to apply (true for active, false for inactive)",
                        },
                    },
                    required: ["status"],
                },
            },
        },
    },
    responses: (0, query_1.updateRecordResponses)("Affiliate Condition"),
    requiresAuth: true,
    permission: "edit.affiliate.condition",
    logModule: "ADMIN_AFFILIATE",
    logTitle: "Update affiliate condition status",
};
exports.default = async (data) => {
    const { body, params, ctx } = data;
    const { id } = params;
    const { status } = body;
    ctx === null || ctx === void 0 ? void 0 : ctx.step(`Updating condition status for ID: ${id}`);
    const result = (0, query_1.updateStatus)("mlmReferralCondition", id, status, undefined, "Referral Condition");
    ctx === null || ctx === void 0 ? void 0 : ctx.success("Condition status updated successfully");
    return result;
};
