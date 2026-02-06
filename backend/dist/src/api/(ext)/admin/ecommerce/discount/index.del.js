"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const query_1 = require("@b/utils/query");
exports.metadata = {
    summary: "Bulk deletes ecommerce discounts by IDs",
    operationId: "bulkDeleteEcommerceDiscounts",
    tags: ["Admin", "Ecommerce", "Discount"],
    description: "Deletes multiple ecommerce discount records in a single operation. This endpoint accepts an array of discount IDs and removes them from the database. All associated discount codes and their product relationships will be permanently deleted.",
    parameters: (0, query_1.commonBulkDeleteParams)("E-commerce Discounts"),
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
                            description: "Array of e-commerce discount IDs to delete",
                        },
                    },
                    required: ["ids"],
                },
            },
        },
    },
    responses: (0, query_1.commonBulkDeleteResponses)("E-commerce Discounts"),
    requiresAuth: true,
    permission: "delete.ecommerce.discount",
    logModule: "ADMIN_ECOM",
    logTitle: "Bulk delete discounts",
};
exports.default = async (data) => {
    const { body, query, ctx } = data;
    const { ids } = body;
    ctx === null || ctx === void 0 ? void 0 : ctx.step(`Validating ${ids.length} discount IDs`);
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Performing bulk delete operation");
    const result = await (0, query_1.handleBulkDelete)({
        model: "ecommerceDiscount",
        ids,
        query,
    });
    ctx === null || ctx === void 0 ? void 0 : ctx.success(`Successfully deleted ${ids.length} discounts`);
    return result;
};
