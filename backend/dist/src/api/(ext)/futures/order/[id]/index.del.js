"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const utils_1 = require("@b/api/finance/wallet/utils");
const matchingEngine_1 = require("@b/api/(ext)/futures/utils/matchingEngine");
let fromBigInt;
let updateWalletBalance;
try {
    const blockchainModule = require("@b/api/(ext)/ecosystem/utils/blockchain");
    fromBigInt = blockchainModule.fromBigInt;
}
catch (e) {
}
try {
    const walletModule = require("@b/api/(ext)/ecosystem/utils/wallet");
    updateWalletBalance = walletModule.updateWalletBalance;
}
catch (e) {
}
const error_1 = require("@b/utils/error");
const query_1 = require("@b/utils/query");
const order_1 = require("@b/api/(ext)/futures/utils/queries/order");
exports.metadata = {
    summary: "Cancels an existing futures trading order",
    description: "Cancels an open futures trading order and refunds the unfulfilled amount.",
    operationId: "cancelFuturesOrder",
    tags: ["Futures", "Orders"],
    logModule: "FUTURES",
    logTitle: "Cancel futures order",
    parameters: [
        {
            index: 0,
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string", description: "UUID of the order" },
        },
        {
            name: "timestamp",
            in: "query",
            required: true,
            schema: { type: "string", description: "Timestamp of the order" },
        },
    ],
    responses: {
        200: {
            description: "Order cancelled successfully",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            message: { type: "string", description: "Success message" },
                        },
                    },
                },
            },
        },
        401: query_1.unauthorizedResponse,
        404: (0, query_1.notFoundMetadataResponse)("Order"),
        500: query_1.serverErrorResponse,
    },
    requiresAuth: true,
};
exports.default = async (data) => {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p;
    const { params, query, user, ctx } = data;
    (_a = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _a === void 0 ? void 0 : _a.call(ctx, "Validating user authentication");
    if (!(user === null || user === void 0 ? void 0 : user.id)) {
        (_b = ctx === null || ctx === void 0 ? void 0 : ctx.fail) === null || _b === void 0 ? void 0 : _b.call(ctx, "User not authenticated");
        throw (0, error_1.createError)({ statusCode: 401, message: "Unauthorized" });
    }
    const { id } = params;
    const { timestamp } = query;
    (_c = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _c === void 0 ? void 0 : _c.call(ctx, "Validating request parameters");
    if (!id || !timestamp) {
        (_d = ctx === null || ctx === void 0 ? void 0 : ctx.fail) === null || _d === void 0 ? void 0 : _d.call(ctx, "Missing order ID or timestamp");
        throw (0, error_1.createError)({
            statusCode: 400,
            message: "Invalid request parameters",
        });
    }
    try {
        (_e = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _e === void 0 ? void 0 : _e.call(ctx, `Fetching order ${id}`);
        const order = await (0, order_1.getOrderByUuid)(user.id, id, timestamp);
        if (!order) {
            (_f = ctx === null || ctx === void 0 ? void 0 : ctx.fail) === null || _f === void 0 ? void 0 : _f.call(ctx, "Order not found");
            throw (0, error_1.createError)({
                statusCode: 404,
                message: "Order not found",
            });
        }
        if (order.status !== "OPEN") {
            (_g = ctx === null || ctx === void 0 ? void 0 : ctx.fail) === null || _g === void 0 ? void 0 : _g.call(ctx, "Order is not open");
            throw (0, error_1.createError)({
                statusCode: 400,
                message: "Order is not open",
            });
        }
        (_h = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _h === void 0 ? void 0 : _h.call(ctx, `Cancelling order for ${order.symbol}`);
        await (0, order_1.cancelOrderByUuid)(user.id, id, timestamp, order.symbol, BigInt(order.price), order.side, BigInt(order.amount));
        const [currency, pair] = order.symbol.split("/");
        const refundAmount = fromBigInt(order.cost) + fromBigInt(order.fee);
        const walletCurrency = order.side === "BUY" ? pair : currency;
        (_j = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _j === void 0 ? void 0 : _j.call(ctx, `Fetching ${walletCurrency} wallet for refund`);
        const wallet = await (0, utils_1.getWallet)(user.id, "FUTURES", walletCurrency, false, ctx);
        if (!wallet) {
            (_k = ctx === null || ctx === void 0 ? void 0 : ctx.fail) === null || _k === void 0 ? void 0 : _k.call(ctx, `${walletCurrency} wallet not found`);
            throw (0, error_1.createError)({
                statusCode: 404,
                message: `${walletCurrency} wallet not found`,
            });
        }
        (_l = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _l === void 0 ? void 0 : _l.call(ctx, `Refunding ${refundAmount} ${walletCurrency}`);
        await updateWalletBalance(wallet, refundAmount, "add");
        (_m = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _m === void 0 ? void 0 : _m.call(ctx, "Notifying matching engine of cancellation");
        const matchingEngine = await matchingEngine_1.FuturesMatchingEngine.getInstance();
        await matchingEngine.handleOrderCancellation(id, order.symbol);
        (_o = ctx === null || ctx === void 0 ? void 0 : ctx.success) === null || _o === void 0 ? void 0 : _o.call(ctx, `Order ${id} cancelled and refunded successfully`);
        return { message: "Order cancelled and balance refunded successfully" };
    }
    catch (error) {
        (_p = ctx === null || ctx === void 0 ? void 0 : ctx.fail) === null || _p === void 0 ? void 0 : _p.call(ctx, `Failed to cancel order: ${error.message}`);
        throw (0, error_1.createError)({
            statusCode: 500,
            message: `Failed to cancel order: ${error.message}`,
        });
    }
};
