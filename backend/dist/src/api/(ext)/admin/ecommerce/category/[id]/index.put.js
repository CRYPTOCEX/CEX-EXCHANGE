"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const query_1 = require("@b/utils/query");
const utils_1 = require("../utils");
const errors_1 = require("@b/utils/schema/errors");
exports.metadata = {
    summary: "Updates an ecommerce category by ID",
    description: "Updates an existing ecommerce category with new information. All fields in the request body will be updated. Partial updates are supported.",
    operationId: "updateEcommerceCategoryById",
    tags: ["Admin", "Ecommerce", "Category"],
    parameters: [
        {
            index: 0,
            name: "id",
            in: "path",
            description: "ID of the ecommerce category to update",
            required: true,
            schema: {
                type: "string",
            },
        },
    ],
    requestBody: {
        description: "Updated category data",
        required: true,
        content: {
            "application/json": {
                schema: utils_1.ecommerceCategoryUpdateSchema,
            },
        },
    },
    responses: {
        200: {
            description: "Category updated successfully",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            message: {
                                type: "string",
                                description: "Success message",
                            },
                        },
                    },
                },
            },
        },
        400: errors_1.badRequestResponse,
        401: errors_1.unauthorizedResponse,
        404: (0, errors_1.notFoundResponse)("Ecommerce category"),
        500: errors_1.serverErrorResponse,
    },
    requiresAuth: true,
    permission: "edit.ecommerce.category",
    logModule: "ADMIN_ECOM",
    logTitle: "Update category",
};
exports.default = async (data) => {
    const { body, params, ctx } = data;
    const { id } = params;
    const { name, description, image, status } = body;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Validating category data");
    ctx === null || ctx === void 0 ? void 0 : ctx.step(`Updating category: ${id}`);
    const result = await (0, query_1.updateRecord)("ecommerceCategory", id, {
        name,
        description,
        image,
        status,
    });
    ctx === null || ctx === void 0 ? void 0 : ctx.success("Category updated successfully");
    return result;
};
