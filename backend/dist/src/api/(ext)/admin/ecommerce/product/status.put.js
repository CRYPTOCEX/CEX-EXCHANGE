"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const query_1 = require("@b/utils/query");
exports.metadata = {
    summary: "Bulk updates the status of ecommerce products",
    operationId: "bulkUpdateEcommerceProductStatus",
    tags: ["Admin", "Ecommerce", "Product"],
    description: "Updates the active/inactive status for multiple ecommerce products at once. Use this to enable or disable products from being displayed or purchased.",
    requestBody: {
        required: true,
        content: {
            "application/json": {
                schema: {
                    type: "object",
                    properties: {
                        ids: {
                            type: "array",
                            description: "Array of ecommerce product IDs to update",
                            items: { type: "string" },
                        },
                        status: {
                            type: "boolean",
                            description: "New status to apply to the ecommerce products (true for active, false for inactive)",
                        },
                    },
                    required: ["ids", "status"],
                },
            },
        },
    },
    responses: (0, query_1.updateRecordResponses)("Ecommerce Product"),
    requiresAuth: true,
    permission: "edit.ecommerce.product",
    logModule: "ADMIN_ECOM",
    logTitle: "Bulk Update Ecommerce Product Status",
};
exports.default = async (data) => {
    const { body, ctx } = data;
    const { ids, status } = body;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Updating E-commerce product status");
    const result = await (0, query_1.updateStatus)("ecommerceProduct", ids, status);
    ctx === null || ctx === void 0 ? void 0 : ctx.success("Successfully updated E-commerce product status");
    return result;
};
