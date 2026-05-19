"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const query_1 = require("@b/utils/query");
const errors_1 = require("@b/utils/schema/errors");
exports.metadata = {
    summary: "Updates the status of a specific affiliate referral",
    description: "Updates the status of a single affiliate referral. Valid statuses are PENDING, ACTIVE, and REJECTED. This affects the referral eligibility for rewards and commissions.",
    operationId: "updateAffiliateReferralStatus",
    tags: ["Admin", "Affiliate", "Referral"],
    parameters: [
        {
            index: 0,
            name: "id",
            in: "path",
            required: true,
            description: "ID of the affiliate referral to update",
            schema: { type: "string", format: "uuid" },
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
                            type: "string",
                            enum: ["PENDING", "ACTIVE", "REJECTED"],
                            description: "New status to apply to the affiliate referral",
                        },
                    },
                    required: ["status"],
                },
            },
        },
    },
    responses: {
        200: {
            description: "Affiliate referral status updated successfully",
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
        404: (0, errors_1.notFoundResponse)("Affiliate Referral"),
        500: errors_1.serverErrorResponse,
    },
    requiresAuth: true,
    permission: "edit.affiliate.referral",
    logModule: "ADMIN_AFFILIATE",
    logTitle: "Update affiliate referral status",
};
exports.default = async (data) => {
    const { body, params, ctx } = data;
    const { id } = params;
    const { status } = body;
    ctx === null || ctx === void 0 ? void 0 : ctx.step(`Updating status for referral ID: ${id}`);
    const result = (0, query_1.updateStatus)("mlmReferral", id, status);
    ctx === null || ctx === void 0 ? void 0 : ctx.success("Referral status updated successfully");
    return result;
};
