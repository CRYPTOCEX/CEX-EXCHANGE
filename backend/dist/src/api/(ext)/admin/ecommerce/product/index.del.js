"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const query_1 = require("@b/utils/query");
exports.metadata = {
    summary: "Bulk deletes ecommerce products by IDs",
    operationId: "bulkDeleteEcommerceProducts",
    tags: ["Admin", "Ecommerce", "Product"],
    description: "Deletes multiple ecommerce products at once using an array of product IDs. This operation will cascade delete all associated reviews, discounts, and wishlist items.",
    parameters: (0, query_1.commonBulkDeleteParams)("Ecommerce Products"),
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
                            description: "Array of ecommerce product IDs to delete",
                        },
                    },
                    required: ["ids"],
                },
            },
        },
    },
    responses: (0, query_1.commonBulkDeleteResponses)("Ecommerce Products"),
    requiresAuth: true,
    permission: "delete.ecommerce.product",
    logModule: "ADMIN_ECOM",
    logTitle: "Bulk Delete Ecommerce Products",
};
exports.default = async (data) => {
    const { body, query, ctx } = data;
    const { ids } = body;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Deleting E-commerce products");
    const result = await (0, query_1.handleBulkDelete)({
        model: "ecommerceProduct",
        ids,
        query,
    });
    ctx === null || ctx === void 0 ? void 0 : ctx.success("Successfully deleted E-commerce products");
    return result;
};
