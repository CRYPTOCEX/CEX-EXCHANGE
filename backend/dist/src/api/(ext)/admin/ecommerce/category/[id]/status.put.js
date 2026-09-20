"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const query_1 = require("@b/utils/query");
const errors_1 = require("@b/utils/schema/errors");
exports.metadata = {
    summary: "Updates an ecommerce category status by ID",
    description: "Updates the status (active/inactive) of a specific ecommerce category. Set status to true to activate the category or false to deactivate it.",
    operationId: "updateEcommerceCategoryStatusById",
    tags: ["Admin", "Ecommerce", "Category"],
    parameters: [
        {
            index: 0,
            name: "id",
            in: "path",
            required: true,
            description: "ID of the ecommerce category to update",
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
                            description: "New status to apply to the ecommerce category (true for active, false for inactive)",
                        },
                    },
                    required: ["status"],
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
    logTitle: "Update category status",
};
exports.default = async (data) => {
    const { body, params, ctx } = data;
    const { id } = params;
    const { status } = body;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Validating status data");
    ctx === null || ctx === void 0 ? void 0 : ctx.step(`Updating category status: ${id} to ${status}`);
    const result = await (0, query_1.updateStatus)("ecommerceCategory", id, status);
    ctx === null || ctx === void 0 ? void 0 : ctx.success("Category status updated successfully");
    return result;
};
