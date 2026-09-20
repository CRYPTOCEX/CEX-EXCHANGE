"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const order_1 = require("@b/api/(ext)/futures/utils/queries/order");
const query_1 = require("@b/utils/query");
const errors_1 = require("@b/utils/schema/errors");
const error_1 = require("@b/utils/error");
exports.metadata = {
    summary: "Bulk deletes futures markets by IDs",
    operationId: "bulkDeleteFuturesMarkets",
    tags: ["Admin", "Futures", "Market"],
    description: "Permanently deletes multiple futures markets and all associated data including orders and positions. This operation cannot be undone.",
    parameters: (0, query_1.commonBulkDeleteParams)("Futures Markets"),
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
                            description: "Array of futures market IDs to delete",
                        },
                    },
                    required: ["ids"],
                },
            },
        },
    },
    responses: {
        200: {
            description: "Futures markets deleted successfully",
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
    permission: "delete.futures.market",
    logModule: "ADMIN_FUTURES",
    logTitle: "Bulk delete futures markets",
};
exports.default = async (data) => {
    const { body, query, ctx } = data;
    const { ids } = body;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Fetching markets to delete");
    const markets = await db_1.models.futuresMarket.findAll({
        where: { id: ids },
        attributes: ["currency"],
    });
    if (!markets.length) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail("Markets not found");
        throw (0, error_1.createError)({ statusCode: 404, message: "Markets not found" });
    }
    const postDelete = async () => {
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Cleaning up market data");
        for (const market of markets) {
            await (0, order_1.deleteAllMarketData)(market.currency);
        }
    };
    try {
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Performing bulk delete");
        const result = await (0, query_1.handleBulkDelete)({
            model: "futuresMarket",
            ids: ids,
            query: { ...query, force: true },
            postDelete,
        });
        ctx === null || ctx === void 0 ? void 0 : ctx.success(`Successfully deleted ${ids.length} futures markets`);
        return result;
    }
    catch (error) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail(`Failed to delete futures markets: ${error.message}`);
        throw error;
    }
};
