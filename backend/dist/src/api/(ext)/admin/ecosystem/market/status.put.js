"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const query_1 = require("@b/utils/query");
const errors_1 = require("@b/utils/schema/errors");
exports.metadata = {
    summary: "Bulk updates ecosystem market status",
    description: "Updates the active/inactive status for multiple ecosystem markets at once. Accepts an array of market IDs and a boolean status value to apply to all specified markets.",
    operationId: "bulkUpdateEcosystemMarketStatus",
    tags: ["Admin", "Ecosystem", "Market"],
    logModule: "ADMIN_ECO",
    logTitle: "Bulk update market status",
    requestBody: {
        required: true,
        content: {
            "application/json": {
                schema: {
                    type: "object",
                    properties: {
                        ids: {
                            type: "array",
                            description: "Array of ecosystem market IDs to update (at least 1 required)",
                            items: { type: "string", format: "uuid" },
                        },
                        status: {
                            type: "boolean",
                            description: "New status to apply to the ecosystem markets (true for active, false for inactive)",
                        },
                    },
                    required: ["ids", "status"],
                },
            },
        },
    },
    responses: {
        200: {
            description: "Market status updated successfully",
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
        404: (0, errors_1.notFoundResponse)("Ecosystem Market"),
        500: errors_1.serverErrorResponse,
    },
    requiresAuth: true,
    permission: "edit.ecosystem.market",
};
exports.default = async (data) => {
    const { body, ctx } = data;
    const { ids, status } = body;
    ctx === null || ctx === void 0 ? void 0 : ctx.step(`Updating status for ${ids.length} market(s) to ${status}`);
    const result = await (0, query_1.updateStatus)("ecosystemMarket", ids, status);
    ctx === null || ctx === void 0 ? void 0 : ctx.success(`Market status updated for ${ids.length} market(s)`);
    return result;
};
