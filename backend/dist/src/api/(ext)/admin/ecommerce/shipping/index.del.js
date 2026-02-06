"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const query_1 = require("@b/utils/query");
exports.metadata = {
    summary: "Bulk deletes e-commerce Shipping by IDs",
    operationId: "bulkDeleteEcommerceShipping",
    tags: ["Admin", "Ecommerce", "Shipping"],
    parameters: (0, query_1.commonBulkDeleteParams)("E-commerce Shipping"),
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
                            description: "Array of e-commerce shipping IDs to delete",
                        },
                    },
                    required: ["ids"],
                },
            },
        },
    },
    responses: (0, query_1.commonBulkDeleteResponses)("E-commerce Shipping"),
    requiresAuth: true,
    permission: "delete.ecommerce.shipping",
    logModule: "ADMIN_ECOM",
    logTitle: "Bulk Delete E-commerce Shipping",
};
exports.default = async (data) => {
    const { body, query, ctx } = data;
    const { ids } = body;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Deleting E-commerce shipping records");
    const result = await (0, query_1.handleBulkDelete)({
        model: "ecommerceShipping",
        ids,
        query,
    });
    ctx === null || ctx === void 0 ? void 0 : ctx.success("Successfully deleted E-commerce shipping records");
    return result;
};
