"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const query_1 = require("@b/utils/query");
const errors_1 = require("@b/utils/schema/errors");
exports.metadata = {
    summary: "Bulk updates ecommerce category status",
    description: "Updates the status (active/inactive) of multiple ecommerce categories simultaneously. Set status to true to activate categories or false to deactivate them.",
    operationId: "bulkUpdateEcommerceCategoryStatus",
    tags: ["Admin", "Ecommerce", "Category"],
    requestBody: {
        required: true,
        content: {
            "application/json": {
                schema: {
                    type: "object",
                    properties: {
                        ids: {
                            type: "array",
                            description: "Array of ecommerce category IDs to update",
                            items: { type: "string" },
                        },
                        status: {
                            type: "boolean",
                            description: "New status to apply to the ecommerce categories (true for active, false for inactive)",
                        },
                    },
                    required: ["ids", "status"],
                },
            },
        },
    },
    responses: {
        200: {
            description: "Category status updated successfully",
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
    logTitle: "Bulk update category status",
};
exports.default = async (data) => {
    const { body, ctx } = data;
    const { ids, status } = body;
    ctx === null || ctx === void 0 ? void 0 : ctx.step(`Validating ${ids.length} category IDs`);
    ctx === null || ctx === void 0 ? void 0 : ctx.step(`Updating status to ${status} for ${ids.length} categories`);
    const result = await (0, query_1.updateStatus)("ecommerceCategory", ids, status);
    ctx === null || ctx === void 0 ? void 0 : ctx.success(`Successfully updated status for ${ids.length} categories`);
    return result;
};
