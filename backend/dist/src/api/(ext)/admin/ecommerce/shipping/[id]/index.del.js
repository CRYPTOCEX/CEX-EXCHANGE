"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const query_1 = require("@b/utils/query");
exports.metadata = {
    summary: "Deletes a specific e-commerce shipping",
    operationId: "deleteEcommerceShipping",
    tags: ["Admin", "Ecommerce", "Shipping"],
    parameters: (0, query_1.deleteRecordParams)("E-commerce shipping"),
    responses: (0, query_1.deleteRecordResponses)("E-commerce shipping"),
    permission: "delete.ecommerce.shipping",
    requiresAuth: true,
    logModule: "ADMIN_ECOM",
    logTitle: "Delete E-commerce Shipping",
};
exports.default = async (data) => {
    const { params, query, ctx } = data;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Deleting E-commerce shipping record");
    const result = await (0, query_1.handleSingleDelete)({
        model: "ecommerceShipping",
        id: params.id,
        query,
    });
    ctx === null || ctx === void 0 ? void 0 : ctx.success("Successfully deleted E-commerce shipping record");
    return result;
};
