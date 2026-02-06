"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const utils_1 = require("@b/api/finance/wallet/utils");
const blockchain_1 = require("@b/api/(ext)/ecosystem/utils/blockchain");
const matchingEngine_1 = require("@b/api/(ext)/ecosystem/utils/matchingEngine");
const queries_1 = require("@b/api/(ext)/ecosystem/utils/scylla/queries");
const wallet_1 = require("@b/api/(ext)/ecosystem/utils/wallet");
const error_1 = require("@b/utils/error");
const query_1 = require("@b/utils/query");
exports.metadata = {
    summary: "Cancels an existing trading order",
    description: "Cancels an open trading order and refunds the unfulfilled amount, including fee adjustments for partial fills.",
    operationId: "cancelOrder",
    tags: ["Trading", "Orders"],
    logModule: "ECOSYSTEM",
    logTitle: "Cancel trading order",
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
    const { params, query, user, ctx } = data;
    if (!(user === null || user === void 0 ? void 0 : user.id)) {
        throw (0, error_1.createError)({ statusCode: 401, message: "Unauthorized" });
    }
    const { id } = params;
    const { timestamp } = query;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Validating request parameters");
    if (!id || !timestamp) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail("Missing order ID or timestamp");
        throw (0, error_1.createError)({
            statusCode: 400,
            message: "Invalid request parameters",
        });
    }
    try {
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Retrieving order details");
        const timestampValue = !isNaN(Number(timestamp))
            ? new Date(Number(timestamp)).toISOString()
            : timestamp;
        const order = await (0, queries_1.getOrderByUuid)(user.id, id, timestampValue);
        if (!order) {
            ctx === null || ctx === void 0 ? void 0 : ctx.fail(`Order ${id} not found`);
            throw (0, error_1.createError)({ statusCode: 404, message: "Order not found" });
        }
        if (order.status !== "OPEN") {
            ctx === null || ctx === void 0 ? void 0 : ctx.fail(`Order ${id} is not open (status: ${order.status})`);
            throw (0, error_1.createError)({ statusCode: 400, message: "Order is not open" });
        }
        const totalAmount = BigInt(order.amount);
        const remaining = BigInt(order.remaining);
        const totalCost = BigInt(order.cost);
        const totalFee = BigInt(order.fee);
        const price = BigInt(order.price);
        const side = order.side;
        const symbol = order.symbol;
        if (remaining === BigInt(0)) {
            throw (0, error_1.createError)({ statusCode: 400, message: "Order is fully filled; nothing to cancel." });
        }
        const [currency, pair] = symbol.split("/");
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Calculating refund amount");
        let refundAmount = 0;
        if (side === "BUY") {
            const fillRatio = Number(remaining) / Number(totalAmount);
            const remainingCost = (remaining * price) / BigInt(1e18);
            const remainingFee = (totalFee * BigInt(Math.floor(fillRatio * 1e18))) / BigInt(1e18);
            refundAmount = (0, blockchain_1.fromBigInt)(remainingCost + remainingFee);
        }
        else {
            refundAmount = (0, blockchain_1.fromBigInt)(remaining);
        }
        const refundCurrency = side === "BUY" ? pair : currency;
        ctx === null || ctx === void 0 ? void 0 : ctx.step(`Retrieving ${refundCurrency} wallet`);
        const wallet = await (0, utils_1.getWallet)(user.id, "ECO", refundCurrency, false, ctx);
        if (!wallet) {
            ctx === null || ctx === void 0 ? void 0 : ctx.fail(`${refundCurrency} wallet not found`);
            throw (0, error_1.createError)({ statusCode: 404, message: `${refundCurrency} wallet not found` });
        }
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Cancelling order in database");
        await (0, queries_1.cancelOrderByUuid)(user.id, id, timestampValue, symbol, BigInt(order.price), side, totalAmount);
        ctx === null || ctx === void 0 ? void 0 : ctx.step(`Refunding ${refundAmount} ${refundCurrency} to wallet`);
        const idempotencyKey = `eco_order_cancel_${id}_${wallet.id}`;
        await (0, wallet_1.updateWalletBalance)(wallet, refundAmount, "add", idempotencyKey);
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Removing order from matching engine");
        const matchingEngine = await matchingEngine_1.MatchingEngine.getInstance();
        await matchingEngine.handleOrderCancellation(id, symbol);
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Checking for copy trading cancellation");
        try {
            const { triggerCopyTradingCancellation } = await Promise.resolve().then(() => __importStar(require("@b/utils/safe-imports")));
            triggerCopyTradingCancellation(id, user.id, symbol).catch(() => { });
        }
        catch (importError) {
        }
        ctx === null || ctx === void 0 ? void 0 : ctx.success(`Order ${id} cancelled, refunded ${refundAmount} ${refundCurrency}`);
        return {
            message: "Order cancelled and leftover balance refunded successfully",
        };
    }
    catch (error) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail(`Order cancellation failed: ${error.message}`);
        throw (0, error_1.createError)({
            statusCode: 500,
            message: `Failed to cancel order: ${error.message}`,
        });
    }
};
