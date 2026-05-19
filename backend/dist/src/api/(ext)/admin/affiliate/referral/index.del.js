"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const query_1 = require("@b/utils/query");
const errors_1 = require("@b/utils/schema/errors");
exports.metadata = {
    summary: "Bulk deletes affiliate referrals by IDs",
    description: "Deletes multiple affiliate referral records at once. This operation permanently removes the referral relationships and associated MLM nodes (binary/unilevel) for the specified referral IDs.",
    operationId: "bulkDeleteAffiliateReferrals",
    tags: ["Admin", "Affiliate", "Referral"],
    parameters: (0, query_1.commonBulkDeleteParams)("Affiliate Referrals"),
    requestBody: {
        required: true,
        content: {
            "application/json": {
                schema: {
                    type: "object",
                    properties: {
                        ids: {
                            type: "array",
                            items: { type: "string", format: "uuid" },
                            description: "Array of affiliate referral IDs (UUIDs) to delete",
                        },
                    },
                    required: ["ids"],
                },
            },
        },
    },
    responses: {
        200: {
            description: "Affiliate referrals deleted successfully",
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
    permission: "delete.affiliate.referral",
    logModule: "ADMIN_AFFILIATE",
    logTitle: "Bulk delete affiliate referrals",
};
exports.default = async (data) => {
    const { body, query, ctx } = data;
    const { ids } = body;
    ctx === null || ctx === void 0 ? void 0 : ctx.step(`Bulk deleting ${ids.length} referrals`);
    const result = (0, query_1.handleBulkDelete)({
        model: "mlmReferral",
        ids,
        query,
    });
    ctx === null || ctx === void 0 ? void 0 : ctx.success("Bulk delete completed successfully");
    return result;
};
