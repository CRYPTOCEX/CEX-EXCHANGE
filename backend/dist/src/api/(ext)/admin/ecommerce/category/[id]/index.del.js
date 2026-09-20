"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const query_1 = require("@b/utils/query");
const errors_1 = require("@b/utils/schema/errors");
exports.metadata = {
    summary: "Deletes an ecommerce category by ID",
    description: "Permanently deletes a specific ecommerce category by its ID. This operation cannot be undone. All related data will be affected according to the cascade rules defined in the database.",
    operationId: "deleteEcommerceCategoryById",
    tags: ["Admin", "Ecommerce", "Category"],
    parameters: [
        {
            index: 0,
            name: "id",
            in: "path",
            description: "ID of the ecommerce category to delete",
            required: true,
            schema: {
                type: "string",
            },
        },
    ],
    responses: {
        200: {
            description: "Category deleted successfully",
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
        401: errors_1.unauthorizedResponse,
        404: (0, errors_1.notFoundResponse)("Ecommerce category"),
        500: errors_1.serverErrorResponse,
    },
    permission: "delete.ecommerce.category",
    requiresAuth: true,
    logModule: "ADMIN_ECOM",
    logTitle: "Delete category",
};
exports.default = async (data) => {
    const { params, query, ctx } = data;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Validating category ID");
    ctx === null || ctx === void 0 ? void 0 : ctx.step(`Deleting category: ${params.id}`);
    const result = await (0, query_1.handleSingleDelete)({
        model: "ecommerceCategory",
        id: params.id,
        query,
    });
    ctx === null || ctx === void 0 ? void 0 : ctx.success("Category deleted successfully");
    return result;
};
