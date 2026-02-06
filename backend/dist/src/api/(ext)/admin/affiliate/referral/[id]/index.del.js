"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const query_1 = require("@b/utils/query");
const errors_1 = require("@b/utils/schema/errors");
exports.metadata = {
    summary: "Deletes a specific affiliate referral",
    description: "Permanently deletes an affiliate referral record by ID. This also removes associated MLM node structures (binary/unilevel) and affects the referral network hierarchy.",
    operationId: "deleteAffiliateReferral",
    tags: ["Admin", "Affiliate", "Referral"],
    parameters: (0, query_1.deleteRecordParams)("Affiliate Referral"),
    responses: {
        200: {
            description: "Affiliate referral deleted successfully",
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
        404: (0, errors_1.notFoundResponse)("Affiliate Referral"),
        500: errors_1.serverErrorResponse,
    },
    permission: "delete.affiliate.referral",
    requiresAuth: true,
    logModule: "ADMIN_AFFILIATE",
    logTitle: "Delete affiliate referral",
};
exports.default = async (data) => {
    const { params, query, ctx } = data;
    ctx === null || ctx === void 0 ? void 0 : ctx.step(`Deleting referral with ID: ${params.id}`);
    const result = (0, query_1.handleSingleDelete)({
        model: "mlmReferral",
        id: params.id,
        query,
    });
    ctx === null || ctx === void 0 ? void 0 : ctx.success("Referral deleted successfully");
    return result;
};
