"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const query_1 = require("@b/utils/query");
exports.metadata = {
    summary: "Deletes a specific e-commerce wishlist entry",
    operationId: "deleteEcommerceWishlist",
    tags: ["Admin", "Ecommerce", "Wishlists"],
    parameters: (0, query_1.deleteRecordParams)("E-commerce wishlist entry"),
    responses: (0, query_1.deleteRecordResponses)("E-commerce wishlist entry"),
    permission: "delete.ecommerce.wishlist",
    requiresAuth: true,
    logModule: "ADMIN_ECOM",
    logTitle: "Delete E-commerce Wishlist Entry",
};
exports.default = async (data) => {
    const { params, query, ctx } = data;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Deleting E-commerce wishlist entry");
    const result = await (0, query_1.handleSingleDelete)({
        model: "ecommerceWishlist",
        id: params.id,
        query,
    });
    ctx === null || ctx === void 0 ? void 0 : ctx.success("Successfully deleted E-commerce wishlist entry");
    return result;
};
