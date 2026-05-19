"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const query_1 = require("@b/utils/query");
exports.metadata = {
    summary: "Updates the status of a specific ecommerce discount",
    operationId: "updateEcommerceDiscountStatusById",
    description: "Toggles the active/inactive status of a single ecommerce discount. When set to inactive, the discount code cannot be used by customers during checkout. This is useful for temporarily disabling discounts without deleting them.",
    tags: ["Admin", "Ecommerce", "Discount"],
    parameters: [
        {
            index: 0,
            name: "id",
            in: "path",
            required: true,
            description: "ID of the ecommerce discount to update",
            schema: { type: "string" },
        },
    ],
    requestBody: {
        required: true,
        content: {
            "application/json": {
                schema: {
                    type: "object",
                    properties: {
                        status: {
                            type: "boolean",
                            description: "New status to apply to the ecommerce discount (true for active, false for inactive)",
                        },
                    },
                    required: ["status"],
                },
            },
        },
    },
    responses: (0, query_1.updateRecordResponses)("E-commerce Discount"),
    requiresAuth: true,
    permission: "edit.ecommerce.discount",
    logModule: "ADMIN_ECOM",
    logTitle: "Update discount status",
};
exports.default = async (data) => {
    const { body, params, ctx } = data;
    const { id } = params;
    const { status } = body;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Validating status data");
    ctx === null || ctx === void 0 ? void 0 : ctx.step(`Updating discount status: ${id} to ${status}`);
    const result = await (0, query_1.updateStatus)("ecommerceDiscount", id, status);
    ctx === null || ctx === void 0 ? void 0 : ctx.success("Discount status updated successfully");
    return result;
};
