"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const query_1 = require("@b/utils/query");
const utils_1 = require("../utils");
exports.metadata = {
    summary: "Updates a specific ecommerce product by ID",
    operationId: "updateEcommerceProduct",
    tags: ["Admin", "Ecommerce", "Product"],
    description: "Updates an existing ecommerce product with new information. All product fields can be modified including name, description, price, inventory, category, and status.",
    parameters: [
        {
            index: 0,
            name: "id",
            in: "path",
            description: "ID of the ecommerce product to update",
            required: true,
            schema: {
                type: "string",
            },
        },
    ],
    requestBody: {
        description: "Updated product data",
        content: {
            "application/json": {
                schema: utils_1.ecommerceProductUpdateSchema,
            },
        },
    },
    responses: (0, query_1.updateRecordResponses)("Ecommerce Product"),
    requiresAuth: true,
    permission: "edit.ecommerce.product",
    logModule: "ADMIN_ECOM",
    logTitle: "Update Ecommerce Product",
};
exports.default = async (data) => {
    const { body, params, ctx } = data;
    const { id } = params;
    const { name, description, shortDescription, type, price, status, image, currency, walletType, inventoryQuantity, } = body;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Updating E-commerce product");
    const result = await (0, query_1.updateRecord)("ecommerceProduct", id, {
        name,
        description,
        shortDescription,
        type,
        price,
        status,
        image,
        currency,
        walletType,
        inventoryQuantity,
    });
    ctx === null || ctx === void 0 ? void 0 : ctx.success("Successfully updated E-commerce product");
    return result;
};
