"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const query_1 = require("@b/utils/query");
exports.metadata = {
    summary: "Deletes a specific ecommerce product by ID",
    operationId: "deleteEcommerceProduct",
    tags: ["Admin", "Ecommerce", "Product"],
    description: "Permanently deletes a single ecommerce product by its ID. This operation will cascade delete all associated reviews, discounts, and wishlist items.",
    parameters: (0, query_1.deleteRecordParams)("E-commerce product"),
    responses: (0, query_1.deleteRecordResponses)("E-commerce product"),
    permission: "delete.ecommerce.product",
    requiresAuth: true,
    logModule: "ADMIN_ECOM",
    logTitle: "Delete Ecommerce Product",
};
exports.default = async (data) => {
    const { params, query, ctx } = data;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Deleting E-commerce product");
    const result = await (0, query_1.handleSingleDelete)({
        model: "ecommerceProduct",
        id: params.id,
        query,
    });
    ctx === null || ctx === void 0 ? void 0 : ctx.success("Successfully deleted E-commerce product");
    return result;
};
