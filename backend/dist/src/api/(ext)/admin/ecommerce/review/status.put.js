"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const query_1 = require("@b/utils/query");
exports.metadata = {
    summary: "Bulk updates the status of ecommerce reviews",
    operationId: "bulkUpdateEcommerceReviewStatus",
    tags: ["Admin", "Ecommerce Reviews"],
    requestBody: {
        required: true,
        content: {
            "application/json": {
                schema: {
                    type: "object",
                    properties: {
                        ids: {
                            type: "array",
                            description: "Array of ecommerce review IDs to update",
                            items: { type: "string" },
                        },
                        status: {
                            type: "boolean",
                            description: "New status to apply to the ecommerce reviews (true for active, false for inactive)",
                        },
                    },
                    required: ["ids", "status"],
                },
            },
        },
    },
    responses: (0, query_1.updateRecordResponses)("Ecommerce Review"),
    requiresAuth: true,
    permission: "edit.ecommerce.review",
    logModule: "ADMIN_ECOM",
    logTitle: "Bulk Update E-commerce Review Status",
};
exports.default = async (data) => {
    const { body, ctx } = data;
    const { ids, status } = body;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Updating E-commerce review status");
    const result = await (0, query_1.updateStatus)("ecommerceReview", ids, status);
    ctx === null || ctx === void 0 ? void 0 : ctx.success("Successfully updated E-commerce review status");
    return result;
};
