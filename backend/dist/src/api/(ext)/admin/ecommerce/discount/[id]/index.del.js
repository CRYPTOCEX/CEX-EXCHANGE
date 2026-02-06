"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const query_1 = require("@b/utils/query");
exports.metadata = {
    summary: "Deletes a specific ecommerce discount by ID",
    operationId: "deleteEcommerceDiscountById",
    description: "Permanently deletes a single ecommerce discount record by its unique identifier. This will remove the discount code and all associated relationships. Any customers who have used this discount will retain their historical usage records.",
    tags: ["Admin", "Ecommerce", "Discount"],
    parameters: (0, query_1.deleteRecordParams)("E-commerce discount"),
    responses: (0, query_1.deleteRecordResponses)("E-commerce discount"),
    permission: "delete.ecommerce.discount",
    requiresAuth: true,
    logModule: "ADMIN_ECOM",
    logTitle: "Delete discount",
};
exports.default = async (data) => {
    const { params, query, ctx } = data;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Validating discount ID");
    ctx === null || ctx === void 0 ? void 0 : ctx.step(`Deleting discount: ${params.id}`);
    const result = await (0, query_1.handleSingleDelete)({
        model: "ecommerceDiscount",
        id: params.id,
        query,
    });
    ctx === null || ctx === void 0 ? void 0 : ctx.success("Discount deleted successfully");
    return result;
};
