"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const order_1 = require("@b/api/(ext)/futures/utils/queries/order");
const query_1 = require("@b/utils/query");
const errors_1 = require("@b/utils/schema/errors");
const error_1 = require("@b/utils/error");
exports.metadata = {
    summary: "Deletes a specific futures market",
    operationId: "deleteFuturesMarket",
    tags: ["Admin", "Futures", "Market"],
    description: "Permanently deletes a futures market and all associated data including orders and positions. This operation cannot be undone.",
    parameters: (0, query_1.deleteRecordParams)("Futures Market"),
    responses: {
        200: {
            description: "Futures market deleted successfully",
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
        401: errors_1.unauthorizedResponse,
        404: (0, errors_1.notFoundResponse)("Futures Market"),
        500: errors_1.serverErrorResponse,
    },
    requiresAuth: true,
    permission: "delete.futures.market",
    logModule: "ADMIN_FUTURES",
    logTitle: "Delete futures market",
};
exports.default = async (data) => {
    const { params, query, ctx } = data;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Fetching market to delete");
    const market = await db_1.models.futuresMarket.findOne({
        where: { id: params.id },
        attributes: ["currency"],
    });
    if (!market) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail("Market not found");
        throw (0, error_1.createError)({ statusCode: 404, message: "Market not found" });
    }
    const currency = market.currency;
    const postDelete = async () => {
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Cleaning up market data");
        await (0, order_1.deleteAllMarketData)(currency);
    };
    try {
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Deleting futures market");
        const result = await (0, query_1.handleSingleDelete)({
            model: "futuresMarket",
            id: params.id,
            query: { ...query, force: true },
            postDelete,
        });
        ctx === null || ctx === void 0 ? void 0 : ctx.success("Futures market deleted successfully");
        return result;
    }
    catch (error) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail(`Failed to delete futures market: ${error.message}`);
        throw error;
    }
};
