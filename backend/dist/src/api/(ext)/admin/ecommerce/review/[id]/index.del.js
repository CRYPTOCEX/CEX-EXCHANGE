"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const query_1 = require("@b/utils/query");
exports.metadata = {
    summary: "Deletes a specific e-commerce review",
    operationId: "deleteEcommerceReview",
    tags: ["Admin", "Ecommerce", "Reviews"],
    parameters: (0, query_1.deleteRecordParams)("E-commerce review"),
    responses: (0, query_1.deleteRecordResponses)("E-commerce review"),
    permission: "delete.ecommerce.review",
    requiresAuth: true,
    logModule: "ADMIN_ECOM",
    logTitle: "Delete E-commerce Review",
};
exports.default = async (data) => {
    const { params, query, ctx } = data;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Deleting E-commerce review");
    const result = await (0, query_1.handleSingleDelete)({
        model: "ecommerceReview",
        id: params.id,
        query,
    });
    ctx === null || ctx === void 0 ? void 0 : ctx.success("Successfully deleted E-commerce review");
    return result;
};
