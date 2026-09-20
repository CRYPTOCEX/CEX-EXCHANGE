"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const query_1 = require("@b/utils/query");
exports.metadata = {
    summary: "Bulk updates the status of affiliate conditions",
    description: "Updates the active status of multiple affiliate conditions simultaneously. Accepts an array of condition IDs and a boolean status value. This is useful for enabling or disabling multiple conditions at once without individual updates.",
    operationId: "bulkUpdateAffiliateConditionStatus",
    tags: ["Admin", "Affiliate", "Condition"],
    requestBody: {
        required: true,
        content: {
            "application/json": {
                schema: {
                    type: "object",
                    properties: {
                        ids: {
                            type: "array",
                            description: "Array of affiliate condition IDs to update",
                            items: { type: "string" },
                        },
                        status: {
                            type: "boolean",
                            description: "New status to apply (true for active, false for inactive)",
                        },
                    },
                    required: ["ids", "status"],
                },
            },
        },
    },
    responses: (0, query_1.updateRecordResponses)("Affiliate Condition"),
    requiresAuth: true,
    permission: "edit.affiliate.condition",
    logModule: "ADMIN_AFFILIATE",
    logTitle: "Bulk update affiliate condition status",
};
exports.default = async (data) => {
    const { body, ctx } = data;
    const { ids, status } = body;
    ctx === null || ctx === void 0 ? void 0 : ctx.step(`Bulk updating status for ${ids.length} conditions`);
    const result = (0, query_1.updateStatus)("mlmReferralCondition", ids, status);
    ctx === null || ctx === void 0 ? void 0 : ctx.success("Bulk status update completed successfully");
    return result;
};
