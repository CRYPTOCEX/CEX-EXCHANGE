"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const query_1 = require("@b/utils/query");
const errors_1 = require("@b/utils/schema/errors");
exports.metadata = {
    summary: "Bulk deletes ecommerce categories",
    description: "Permanently deletes multiple ecommerce categories by their IDs. This operation cannot be undone. All related data will be affected according to the cascade rules defined in the database.",
    operationId: "bulkDeleteEcommerceCategories",
    tags: ["Admin", "Ecommerce", "Category"],
    parameters: (0, query_1.commonBulkDeleteParams)("Ecommerce categories"),
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
                            description: "Array of ecommerce category IDs to delete",
                        },
                    },
                    required: ["ids"],
                },
            },
        },
    },
    responses: {
        200: {
            description: "Categories deleted successfully",
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
    permission: "delete.ecommerce.category",
    logModule: "ADMIN_ECOM",
    logTitle: "Bulk delete categories",
};
exports.default = async (data) => {
    const { body, query, ctx } = data;
    const { ids } = body;
    ctx === null || ctx === void 0 ? void 0 : ctx.step(`Validating ${ids.length} category IDs`);
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Performing bulk delete operation");
    const result = await (0, query_1.handleBulkDelete)({
        model: "ecommerceCategory",
        ids,
        query,
    });
    ctx === null || ctx === void 0 ? void 0 : ctx.success(`Successfully deleted ${ids.length} categories`);
    return result;
};
