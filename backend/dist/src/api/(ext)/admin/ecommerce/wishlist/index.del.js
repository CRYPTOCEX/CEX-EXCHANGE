"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const query_1 = require("@b/utils/query");
exports.metadata = {
    summary: "Bulk deletes e-commerce wishlist entries by IDs",
    operationId: "bulkDeleteEcommerceWishlists",
    tags: ["Admin", "Ecommerce", "Wishlists"],
    parameters: (0, query_1.commonBulkDeleteParams)("E-commerce Wishlist Entries"),
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
                            description: "Array of e-commerce wishlist entry IDs to delete",
                        },
                    },
                    required: ["ids"],
                },
            },
        },
    },
    responses: (0, query_1.commonBulkDeleteResponses)("E-commerce Wishlist Entries"),
    requiresAuth: true,
    permission: "delete.ecommerce.wishlist",
    logModule: "ADMIN_ECOM",
    logTitle: "Bulk Delete E-commerce Wishlist Entries",
};
exports.default = async (data) => {
    const { body, query, ctx } = data;
    const { ids } = body;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Deleting E-commerce wishlist entries");
    const result = await (0, query_1.handleBulkDelete)({
        model: "ecommerceWishlist",
        ids,
        query,
    });
    ctx === null || ctx === void 0 ? void 0 : ctx.success("Successfully deleted E-commerce wishlist entries");
    return result;
};
