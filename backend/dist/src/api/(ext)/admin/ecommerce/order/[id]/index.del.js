"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const query_1 = require("@b/utils/query");
exports.metadata = {
    summary: "Deletes a specific e-commerce order",
    operationId: "deleteEcommerceOrder",
    tags: ["Admin", "Ecommerce", "Orders"],
    parameters: (0, query_1.deleteRecordParams)("E-commerce order"),
    responses: (0, query_1.deleteRecordResponses)("E-commerce order"),
    permission: "delete.ecommerce.order",
    requiresAuth: true,
    logModule: "ADMIN_ECOM",
    logTitle: "Delete order",
};
exports.default = async (data) => {
    const { params, query, ctx } = data;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Validating order ID");
    ctx === null || ctx === void 0 ? void 0 : ctx.step(`Deleting order: ${params.id}`);
    const result = await (0, query_1.handleSingleDelete)({
        model: "ecommerceOrder",
        id: params.id,
        query,
    });
    ctx === null || ctx === void 0 ? void 0 : ctx.success("Order deleted successfully");
    return result;
};
