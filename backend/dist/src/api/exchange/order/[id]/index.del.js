"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const exchange_1 = __importDefault(require("@b/utils/exchange"));
const index_get_1 = require("./index.get");
const db_1 = require("@b/db");
const utils_1 = require("../utils");
const query_1 = require("@b/utils/query");
const utils_2 = require("@b/api/finance/wallet/utils");
const index_ws_1 = require("../index.ws");
const error_1 = require("@b/utils/error");
const utils_3 = require("../../utils");
const console_1 = require("@b/utils/console");
const wallet_1 = require("@b/services/wallet");
exports.metadata = {
    summary: "Cancel Order",
    operationId: "cancelOrder",
    tags: ["Exchange", "Orders"],
    description: "Cancels a specific order for the authenticated user.",
    parameters: [
        {
            index: 0,
            name: "id",
            in: "path",
            required: true,
            description: "ID of the order to cancel.",
            schema: { type: "string" },
        },
    ],
    responses: {
        200: {
            description: "Order canceled successfully",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            message: {
                                type: "string",
                                example: "Order canceled successfully",
                            },
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
    logModule: "EXCHANGE",
    logTitle: "Cancel exchange order",
};
exports.default = async (data) => {
    var _a;
    const { user, params, ctx } = data;
    if (!(user === null || user === void 0 ? void 0 : user.id))
        throw (0, error_1.createError)(401, "Unauthorized");
    const { id } = params;
    try {
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Checking service availability");
        const unblockTime = await (0, utils_3.loadBanStatus)();
        if (await (0, utils_3.handleBanStatus)(unblockTime)) {
            const waitTime = unblockTime - Date.now();
            throw (0, error_1.createError)(503, `Service temporarily unavailable. Please try again in ${(0, utils_3.formatWaitTime)(waitTime)}.`);
        }
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Fetching order details");
        const order = await (0, index_get_1.getOrder)(id);
        if (!order)
            throw (0, error_1.createError)(404, "Order not found");
        if (order.status === "CANCELED")
            throw (0, error_1.createError)(400, "Order already canceled");
        if (order.userId !== user.id)
            throw (0, error_1.createError)(401, "Unauthorized");
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Connecting to exchange");
        const exchange = await exchange_1.default.startExchange(ctx);
        if (!exchange)
            throw (0, error_1.createError)(503, "Service currently unavailable");
        try {
            ctx === null || ctx === void 0 ? void 0 : ctx.step("Fetching latest order status from exchange");
            let orderData;
            if (exchange.has["fetchOrder"]) {
                orderData = await exchange.fetchOrder(order.referenceId, order.symbol);
            }
            else {
                const orders = await exchange.fetchOrders(order.symbol);
                orderData = orders.find((o) => o.id === order.referenceId);
            }
            if (!orderData || !orderData.id)
                throw (0, error_1.createError)(404, "Order not found");
            ctx === null || ctx === void 0 ? void 0 : ctx.step("Updating local order status");
            await (0, utils_1.updateOrderData)(id, {
                status: orderData.status.toUpperCase(),
                filled: orderData.filled,
                remaining: orderData.remaining,
                cost: orderData.cost,
                fee: orderData.fee,
                trades: JSON.stringify(orderData.trades),
            });
            if (orderData.status !== "open")
                throw (0, error_1.createError)(400, "Order is not open");
            const [currency, pair] = order.symbol.split("/");
            ctx === null || ctx === void 0 ? void 0 : ctx.step(`Fetching wallets for ${currency} and ${pair}`);
            const currencyWallet = await (0, utils_2.getWalletSafe)(user.id, "SPOT", currency, false, ctx);
            const pairWallet = await (0, utils_2.getWalletSafe)(user.id, "SPOT", pair, false, ctx);
            if (!currencyWallet || !pairWallet)
                throw (0, error_1.createError)(500, "Failed to fetch wallets");
            ctx === null || ctx === void 0 ? void 0 : ctx.step("Cancelling order on exchange");
            await exchange.cancelOrder(order.referenceId, order.symbol);
            ctx === null || ctx === void 0 ? void 0 : ctx.step("Refunding wallet balance and removing order");
            const idempotencyKey = `exchange_cancel_${id}`;
            const remainingAmount = Number((_a = orderData.remaining) !== null && _a !== void 0 ? _a : order.amount);
            await db_1.sequelize.transaction(async (transaction) => {
                var _a, _b;
                if (order.side.toUpperCase() === "BUY") {
                    const refundCost = remainingAmount * Number(order.price);
                    await wallet_1.walletService.credit({
                        idempotencyKey: `${idempotencyKey}_refund`,
                        userId: user.id,
                        walletId: pairWallet.id,
                        walletType: "SPOT",
                        currency: pair,
                        amount: refundCost,
                        operationType: "EXCHANGE_ORDER_CANCEL",
                        description: `Refund for cancelled buy order ${order.symbol} (remaining: ${remainingAmount})`,
                        metadata: {
                            orderId: id,
                            referenceId: order.referenceId,
                            symbol: order.symbol,
                            side: order.side,
                            originalAmount: Number(order.amount),
                            filledAmount: Number((_a = orderData.filled) !== null && _a !== void 0 ? _a : 0),
                            remainingAmount,
                        },
                        transaction,
                    });
                }
                else {
                    await wallet_1.walletService.credit({
                        idempotencyKey: `${idempotencyKey}_refund`,
                        userId: user.id,
                        walletId: currencyWallet.id,
                        walletType: "SPOT",
                        currency: currency,
                        amount: remainingAmount,
                        operationType: "EXCHANGE_ORDER_CANCEL",
                        description: `Refund for cancelled sell order ${order.symbol} (remaining: ${remainingAmount})`,
                        metadata: {
                            orderId: id,
                            referenceId: order.referenceId,
                            symbol: order.symbol,
                            side: order.side,
                            originalAmount: Number(order.amount),
                            filledAmount: Number((_b = orderData.filled) !== null && _b !== void 0 ? _b : 0),
                            remainingAmount,
                        },
                        transaction,
                    });
                }
                await db_1.models.exchangeOrder.destroy({
                    where: { id },
                    force: true,
                    transaction,
                });
            });
            (0, index_ws_1.removeOrderFromTrackedOrders)(user.id, id);
            ctx === null || ctx === void 0 ? void 0 : ctx.success(`Order cancelled successfully: ${order.side} ${order.amount} ${order.symbol}`);
            return {
                message: "Order cancelled successfully",
            };
        }
        catch (error) {
            console_1.logger.error("EXCHANGE", "Error cancelling order", error);
            throw (0, error_1.createError)({ statusCode: 500, message: error.message });
        }
    }
    catch (error) {
        console_1.logger.error("EXCHANGE", "Error processing order cancellation", error);
        if (error.statusCode === 503) {
            throw error;
        }
        else {
            throw (0, error_1.createError)(500, "Unable to process your request at this time");
        }
    }
};
