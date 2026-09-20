"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const query_1 = require("@b/utils/query");
const utils_1 = require("../utils");
exports.metadata = {
    summary: "Updates a specific ecommerce discount by ID",
    operationId: "updateEcommerceDiscountById",
    description: "Updates an existing ecommerce discount's properties including code, percentage, validity date, product association, and status. All fields are required. The discount code must remain unique and the percentage must be between 0 and 100.",
    tags: ["Admin", "Ecommerce", "Discount"],
    parameters: [
        {
            index: 0,
            name: "id",
            in: "path",
            description: "ID of the ecommerce discount to update",
            required: true,
            schema: {
                type: "string",
            },
        },
    ],
    requestBody: {
        required: true,
        description: "Updated discount data",
        content: {
            "application/json": {
                schema: utils_1.discountUpdateSchema,
            },
        },
    },
    responses: (0, query_1.updateRecordResponses)("Ecommerce Discount"),
    requiresAuth: true,
    permission: "edit.ecommerce.discount",
    logModule: "ADMIN_ECOM",
    logTitle: "Update discount",
};
exports.default = async (data) => {
    const { body, params, ctx } = data;
    const { id } = params;
    const { code, percentage, validUntil, productId, status } = body;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Validating discount data");
    ctx === null || ctx === void 0 ? void 0 : ctx.step(`Updating discount: ${id}`);
    const result = await (0, query_1.updateRecord)("ecommerceDiscount", id, {
        code,
        percentage,
        validUntil,
        productId,
        status,
    });
    ctx === null || ctx === void 0 ? void 0 : ctx.success("Discount updated successfully");
    return result;
};
