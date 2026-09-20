"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const query_1 = require("@b/utils/query");
exports.metadata = {
    summary: "Updates the status of a specific ecommerce product",
    operationId: "updateEcommerceProductStatus",
    tags: ["Admin", "Ecommerce", "Product"],
    description: "Updates the active/inactive status of a single ecommerce product. Use this to enable or disable a product from being displayed or purchased.",
    parameters: [
        {
            index: 0,
            name: "id",
            in: "path",
            required: true,
            description: "ID of the ecommerce product to update",
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
                            description: "New status to apply to the ecommerce product (true for active, false for inactive)",
                        },
                    },
                    required: ["status"],
                },
            },
        },
    },
    responses: (0, query_1.updateRecordResponses)("Ecommerce Product"),
    requiresAuth: true,
    permission: "edit.ecommerce.product",
    logModule: "ADMIN_ECOM",
    logTitle: "Update Ecommerce Product Status",
};
exports.default = async (data) => {
    const { body, params, ctx } = data;
    const { id } = params;
    const { status } = body;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Updating E-commerce product status");
    const result = await (0, query_1.updateStatus)("ecommerceProduct", id, status);
    ctx === null || ctx === void 0 ? void 0 : ctx.success("Successfully updated E-commerce product status");
    return result;
};
