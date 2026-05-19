"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const query_1 = require("@b/utils/query");
const errors_1 = require("@b/utils/schema/errors");
exports.metadata = {
    summary: "Bulk updates the status of futures markets",
    operationId: "bulkUpdateFuturesMarketStatus",
    tags: ["Admin", "Futures", "Market"],
    description: "Updates the active/inactive status of multiple futures markets simultaneously. Active markets are available for trading, while inactive markets are hidden from users.",
    requestBody: {
        required: true,
        content: {
            "application/json": {
                schema: {
                    type: "object",
                    properties: {
                        ids: {
                            type: "array",
                            description: "Array of futures market IDs to update",
                            items: { type: "string" },
                        },
                        status: {
                            type: "boolean",
                            description: "New status to apply to the futures markets (true for active, false for inactive)",
                        },
                    },
                    required: ["ids", "status"],
                },
            },
        },
    },
    responses: {
        200: {
            description: "Futures market status updated successfully",
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
        404: (0, errors_1.notFoundResponse)("Futures Markets"),
        500: errors_1.serverErrorResponse,
    },
    requiresAuth: true,
    permission: "edit.futures.market",
    logModule: "ADMIN_FUTURES",
    logTitle: "Bulk update futures market status",
};
exports.default = async (data) => {
    const { body, ctx } = data;
    const { ids, status } = body;
    try {
        ctx === null || ctx === void 0 ? void 0 : ctx.step(`Updating ${ids.length} markets to ${status ? 'active' : 'inactive'}`);
        const result = await (0, query_1.updateStatus)("futuresMarket", ids, status);
        ctx === null || ctx === void 0 ? void 0 : ctx.success(`Successfully updated status for ${ids.length} futures markets`);
        return result;
    }
    catch (error) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail(`Failed to bulk update market status: ${error.message}`);
        throw error;
    }
};
