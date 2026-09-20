"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const query_1 = require("@b/utils/query");
exports.metadata = {
    summary: "Bulk deletes e-commerce orders by IDs",
    operationId: "bulkDeleteEcommerceOrders",
    tags: ["Admin", "Ecommerce", "Orders"],
    parameters: (0, query_1.commonBulkDeleteParams)("E-commerce Orders"),
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
                            description: "Array of e-commerce order IDs to delete",
                        },
                    },
                    required: ["ids"],
                },
            },
        },
    },
    responses: (0, query_1.commonBulkDeleteResponses)("E-commerce Orders"),
    requiresAuth: true,
    permission: "delete.ecommerce.order",
    logModule: "ADMIN_ECOM",
    logTitle: "Bulk delete orders",
};
exports.default = async (data) => {
    const { body, query, ctx } = data;
    const { ids } = body;
    ctx === null || ctx === void 0 ? void 0 : ctx.step(`Validating ${ids.length} order IDs`);
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Performing bulk delete operation");
    const result = await (0, query_1.handleBulkDelete)({
        model: "ecommerceOrder",
        ids,
        query,
    });
    ctx === null || ctx === void 0 ? void 0 : ctx.success(`Successfully deleted ${ids.length} orders`);
    return result;
};
