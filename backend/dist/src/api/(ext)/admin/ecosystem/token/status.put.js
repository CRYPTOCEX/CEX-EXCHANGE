"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const query_1 = require("@b/utils/query");
const errors_1 = require("@b/utils/schema/errors");
exports.metadata = {
    summary: "Bulk updates ecosystem token status",
    description: "Updates the status (active/inactive) for multiple ecosystem tokens simultaneously. Use this endpoint to enable or disable tokens in bulk.",
    operationId: "bulkUpdateEcosystemTokenStatus",
    tags: ["Admin", "Ecosystem", "Token"],
    logModule: "ADMIN_ECO",
    logTitle: "Bulk update token status",
    requestBody: {
        required: true,
        content: {
            "application/json": {
                schema: {
                    type: "object",
                    properties: {
                        ids: {
                            type: "array",
                            description: "Array of ecosystem token IDs to update",
                            items: { type: "string" },
                        },
                        status: {
                            type: "boolean",
                            description: "New status to apply to the ecosystem tokens (true for active, false for inactive)",
                        },
                    },
                    required: ["ids", "status"],
                },
            },
        },
    },
    responses: {
        200: {
            description: "Ecosystem token status updated successfully",
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
        401: query_1.unauthorizedResponse,
        404: (0, errors_1.notFoundResponse)("Ecosystem Token"),
        500: query_1.serverErrorResponse,
    },
    requiresAuth: true,
    permission: "edit.ecosystem.token",
};
exports.default = async (data) => {
    const { body, ctx } = data;
    const { ids, status } = body;
    ctx === null || ctx === void 0 ? void 0 : ctx.step(`Updating status for ${ids.length} token(s) to ${status}`);
    const result = await (0, query_1.updateStatus)("ecosystemToken", ids, status);
    ctx === null || ctx === void 0 ? void 0 : ctx.success(`Status updated for ${ids.length} token(s)`);
    return result;
};
