"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const query_1 = require("@b/utils/query");
exports.metadata = {
    summary: "Bulk updates the status of ecommerce discounts",
    operationId: "bulkUpdateEcommerceDiscountStatus",
    description: "Updates the active/inactive status of multiple ecommerce discounts simultaneously. This allows enabling or disabling multiple discount codes in a single operation. Inactive discounts cannot be used by customers during checkout.",
    tags: ["Admin", "Ecommerce", "Discount"],
    requestBody: {
        required: true,
        content: {
            "application/json": {
                schema: {
                    type: "object",
                    properties: {
                        ids: {
                            type: "array",
                            description: "Array of ecommerce discount IDs to update",
                            items: { type: "string" },
                        },
                        status: {
                            type: "boolean",
                            description: "New status to apply to the ecommerce discounts (true for active, false for inactive)",
                        },
                    },
                    required: ["ids", "status"],
                },
            },
        },
    },
    responses: (0, query_1.updateRecordResponses)("Ecommerce Discount"),
    requiresAuth: true,
    permission: "edit.ecommerce.discount",
    logModule: "ADMIN_ECOM",
    logTitle: "Bulk update discount status",
};
exports.default = async (data) => {
    const { body, ctx } = data;
    const { ids, status } = body;
    ctx === null || ctx === void 0 ? void 0 : ctx.step(`Validating ${ids.length} discount IDs`);
    ctx === null || ctx === void 0 ? void 0 : ctx.step(`Updating status to ${status} for ${ids.length} discounts`);
    const result = await (0, query_1.updateStatus)("ecommerceDiscount", ids, status);
    ctx === null || ctx === void 0 ? void 0 : ctx.success(`Successfully updated status for ${ids.length} discounts`);
    return result;
};
