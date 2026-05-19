"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const query_1 = require("@b/utils/query");
const errors_1 = require("@b/utils/schema/errors");
exports.metadata = {
    summary: "Bulk deletes ecosystem tokens",
    description: "Deletes multiple ecosystem tokens by their IDs. This operation performs a soft delete, marking the tokens as deleted without removing them from the database permanently.",
    operationId: "bulkDeleteEcosystemTokens",
    tags: ["Admin", "Ecosystem", "Token"],
    parameters: (0, query_1.commonBulkDeleteParams)("Ecosystem Tokens"),
    logModule: "ADMIN_ECO",
    logTitle: "Bulk delete tokens",
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
                            description: "Array of ecosystem token IDs to delete",
                        },
                    },
                    required: ["ids"],
                },
            },
        },
    },
    responses: {
        200: {
            description: "Ecosystem tokens deleted successfully",
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
    permission: "delete.ecosystem.token",
};
exports.default = async (data) => {
    const { body, query, ctx } = data;
    const { ids } = body;
    ctx === null || ctx === void 0 ? void 0 : ctx.step(`Deleting ${ids.length} token(s)`);
    const result = await (0, query_1.handleBulkDelete)({
        model: "ecosystemToken",
        ids,
        query,
    });
    ctx === null || ctx === void 0 ? void 0 : ctx.success(`${ids.length} token(s) deleted successfully`);
    return result;
};
