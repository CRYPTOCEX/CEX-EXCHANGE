"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const query_1 = require("@b/utils/query");
const errors_1 = require("@b/utils/schema/errors");
exports.metadata = {
    summary: "Updates the status of a specific futures market",
    operationId: "updateFuturesMarketStatus",
    tags: ["Admin", "Futures", "Market"],
    description: "Updates the active/inactive status of a futures market. Active markets are available for trading, while inactive markets are hidden from users.",
    parameters: [
        {
            index: 0,
            name: "id",
            in: "path",
            required: true,
            description: "ID of the futures market to update",
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
                            description: "New status to apply to the futures market (true for active, false for inactive)",
                        },
                    },
                    required: ["status"],
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
        404: (0, errors_1.notFoundResponse)("Futures Market"),
        500: errors_1.serverErrorResponse,
    },
    requiresAuth: true,
    permission: "edit.futures.market",
    logModule: "ADMIN_FUTURES",
    logTitle: "Update futures market status",
};
exports.default = async (data) => {
    const { body, params, ctx } = data;
    const { id } = params;
    const { status } = body;
    try {
        ctx === null || ctx === void 0 ? void 0 : ctx.step(`Updating market status to ${status ? 'active' : 'inactive'}`);
        const result = await (0, query_1.updateStatus)("futuresMarket", id, status);
        ctx === null || ctx === void 0 ? void 0 : ctx.success("Futures market status updated successfully");
        return result;
    }
    catch (error) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail(`Failed to update market status: ${error.message}`);
        throw error;
    }
};
