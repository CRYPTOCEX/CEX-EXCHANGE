"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const query_1 = require("@b/utils/query");
const utils_1 = require("../utils");
exports.metadata = {
    summary: "Updates a specific ecommerce shipping",
    operationId: "updateEcommerceShipping",
    tags: ["Admin", "Ecommerce", "Shipping"],
    parameters: [
        {
            index: 0,
            name: "id",
            in: "path",
            description: "ID of the ecommerce shipping to update",
            required: true,
            schema: {
                type: "string",
            },
        },
    ],
    requestBody: {
        description: "New data for the ecommerce shipping",
        content: {
            "application/json": {
                schema: utils_1.ecommerceShippingUpdateSchema,
            },
        },
    },
    responses: (0, query_1.updateRecordResponses)("Ecommerce Shipping"),
    requiresAuth: true,
    permission: "edit.ecommerce.shipping",
    logModule: "ADMIN_ECOM",
    logTitle: "Update E-commerce Shipping",
};
exports.default = async (data) => {
    const { body, params, ctx } = data;
    const { id } = params;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Updating E-commerce shipping record");
    const result = await (0, query_1.updateRecord)("ecommerceShipping", id, {
        ...body,
    });
    ctx === null || ctx === void 0 ? void 0 : ctx.success("Successfully updated E-commerce shipping record");
    return result;
};
