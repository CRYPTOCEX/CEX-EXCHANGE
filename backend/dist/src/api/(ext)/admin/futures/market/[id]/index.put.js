"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const query_1 = require("@b/utils/query");
const utils_1 = require("../utils");
const errors_1 = require("@b/utils/schema/errors");
exports.metadata = {
    summary: "Updates a specific futures market",
    operationId: "updateFuturesMarket",
    tags: ["Admin", "Futures", "Market"],
    description: "Updates futures market settings including trending indicators, hot status, and trading parameters (precision, limits, leverage, fees).",
    parameters: [
        {
            index: 0,
            name: "id",
            in: "path",
            description: "ID of the futures market to update",
            required: true,
            schema: {
                type: "string",
            },
        },
    ],
    requestBody: {
        description: "New data for the futures market",
        content: {
            "application/json": {
                schema: utils_1.FuturesMarketUpdateSchema,
            },
        },
    },
    responses: {
        200: {
            description: "Futures market updated successfully",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: utils_1.baseFuturesMarketSchema,
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
    logTitle: "Update futures market",
};
exports.default = async (data) => {
    const { body, params, ctx } = data;
    const { id } = params;
    const { metadata } = body;
    try {
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Updating futures market metadata");
        const result = await (0, query_1.updateRecord)("futuresMarket", id, {
            metadata,
        });
        ctx === null || ctx === void 0 ? void 0 : ctx.success("Futures market updated successfully");
        return result;
    }
    catch (error) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail(`Failed to update futures market: ${error.message}`);
        throw error;
    }
};
