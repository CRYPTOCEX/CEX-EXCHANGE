"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const query_1 = require("@b/utils/query");
const errors_1 = require("@b/utils/schema/errors");
exports.metadata = {
    summary: "Updates ecosystem market status",
    description: "Updates the active/inactive status of a single ecosystem market. Setting status to false will disable the market for trading, while true will enable it.",
    operationId: "updateEcosystemMarketStatus",
    tags: ["Admin", "Ecosystem", "Market"],
    logModule: "ADMIN_ECO",
    logTitle: "Update market status",
    parameters: [
        {
            index: 0,
            name: "id",
            in: "path",
            required: true,
            description: "ID of the ecosystem market to update",
            schema: { type: "string", format: "uuid" },
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
                            description: "New status to apply to the ecosystem market (true for active, false for inactive)",
                        },
                    },
                    required: ["status"],
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
    const { body, params, ctx } = data;
    const { id } = params;
    const { status } = body;
    ctx === null || ctx === void 0 ? void 0 : ctx.step(`Updating market status to ${status}`);
    const result = await (0, query_1.updateStatus)("ecosystemMarket", id, status);
    ctx === null || ctx === void 0 ? void 0 : ctx.success("Market status updated successfully");
    return result;
};
