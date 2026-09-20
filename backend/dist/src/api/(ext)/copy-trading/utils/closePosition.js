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
exports.closeFollowerPosition = closeFollowerPosition;
const db_1 = require("@b/db");
const console_1 = require("@b/utils/console");
const queries_1 = require("@b/api/(ext)/ecosystem/utils/scylla/queries");
const wallet_1 = require("@b/api/(ext)/ecosystem/utils/wallet");
const blockchain_1 = require("@b/api/(ext)/ecosystem/utils/blockchain");
const cancelOrder_1 = require("@b/api/(ext)/ecosystem/utils/cancelOrder");
async function closeFollowerPosition(tradeId, reason) {
    var _a;
    try {
        await (0, queries_1.assertMatchingQueueAcceptsOrders)();
    }
    catch (error) {
        const message = (_a = error === null || error === void 0 ? void 0 : error.message) !== null && _a !== void 0 ? _a : String(error);
        console_1.logger.error("COPY_TRADING_CLOSE", `Refusing to close trade ${tradeId} (${reason}): ${message} Nothing was written — the ` +
            "position is still open and its funds are untouched.");
        return { success: false, error: message };
    }
    const t = await db_1.sequelize.transaction();
    let placedOrder = null;
    try {
        const trade = await db_1.models.copyTradingTrade.findByPk(tradeId, {
            transaction: t,
            lock: t.LOCK.UPDATE,
            include: [
                {
                    model: db_1.models.copyTradingFollower,
                    as: "follower",
                },
            ],
        });
        if (!trade) {
            await t.rollback();
            return { success: false, error: "Trade not found" };
        }
        if (trade.status === "CLOSING") {
            await t.rollback();
            return {
                success: true,
                closeOrderId: trade.closeOrderId,
                error: undefined,
            };
        }
        if (trade.status === "CLOSED" || trade.status === "CANCELLED") {
            await t.rollback();
            return { success: false, error: `Trade already ${trade.status}` };
        }
        if (!trade.followerId || !trade.follower) {
            await t.rollback();
            return { success: false, error: "Not a follower trade" };
        }
        const filledAmount = Number(trade.executedAmount) || 0;
        const orderedAmount = Number(trade.amount) || 0;
        if (trade.followerOrderId && filledAmount < orderedAmount) {
            try {
                const cancelResult = await (0, cancelOrder_1.cancelEcosystemOrder)(trade.follower.userId, trade.followerOrderId, "COPY_TRADING");
                if (cancelResult.reason === "deferred") {
                    console_1.logger.info("COPY_TRADING_CLOSE", `Entry remainder for trade ${tradeId} was queued for cancellation on the matching ` +
                        `leaseholder; the exit proceeds and the hold is released when it is served.`);
                }
                else if (cancelResult.reason === "deferral_failed") {
                    console_1.logger.error("COPY_TRADING_CLOSE", `Could not queue cancellation of the entry remainder for trade ${tradeId}. ` +
                        `The unfilled portion stays OPEN and funded until it is cancelled by hand.`);
                }
            }
            catch (cancelError) {
                console_1.logger.warn("COPY_TRADING_CLOSE", `Could not cancel unfilled entry remainder for trade ${tradeId}: ${cancelError === null || cancelError === void 0 ? void 0 : cancelError.message}`);
            }
        }
        if (!(filledAmount > 0)) {
            await trade.update({
                status: "CANCELLED",
                closedAt: new Date(),
                errorMessage: `Closed before any fill (${reason})`,
            }, { transaction: t });
            await t.commit();
            return { success: true, nothingToClose: true };
        }
        const [baseCurrency, quoteCurrency] = String(trade.symbol).split("/");
        const closeSide = trade.side === "BUY" ? "SELL" : "BUY";
        const closeOrder = await (0, queries_1.createOrder)({
            userId: trade.follower.userId,
            symbol: trade.symbol,
            amount: (0, blockchain_1.toBigIntFloat)(filledAmount),
            price: (0, blockchain_1.toBigIntFloat)(Number(trade.executedPrice) || Number(trade.price) || 0),
            cost: (0, blockchain_1.toBigIntFloat)(0),
            type: "MARKET",
            side: closeSide,
            fee: (0, blockchain_1.toBigIntFloat)(0),
            feeCurrency: quoteCurrency,
            walletType: "COPY_TRADING",
        });
        placedOrder = closeOrder;
        if (closeSide === "SELL") {
            const baseWallet = await (0, wallet_1.getWalletByUserIdAndCurrency)(trade.follower.userId, baseCurrency, "COPY_TRADING", t, true);
            if (!baseWallet) {
                throw new Error(`No COPY_TRADING ${baseCurrency} wallet to close from`);
            }
            await (0, wallet_1.updateWalletBalance)(baseWallet, filledAmount, "subtract", `ct_close_lock_${closeOrder.id}`, t);
        }
        else {
            const referencePrice = Number(trade.executedPrice) || Number(trade.price) || 0;
            const holdQuote = filledAmount * referencePrice * 1.02;
            const quoteWallet = await (0, wallet_1.getWalletByUserIdAndCurrency)(trade.follower.userId, quoteCurrency, "COPY_TRADING", t, true);
            if (!quoteWallet) {
                throw new Error(`No COPY_TRADING ${quoteCurrency} wallet to close from`);
            }
            await (0, wallet_1.updateWalletBalance)(quoteWallet, holdQuote, "subtract", `ct_close_lock_${closeOrder.id}`, t);
        }
        await trade.update({
            status: "CLOSING",
            closeOrderId: closeOrder.id,
            errorMessage: null,
        }, { transaction: t });
        await t.commit();
        try {
            await (0, queries_1.addOrderToMatchingQueue)(closeOrder);
        }
        catch (queueError) {
            console_1.logger.error("COPY_TRADING_CLOSE", `Failed to enqueue close order ${closeOrder.id} for trade ${tradeId}: ${queueError === null || queueError === void 0 ? void 0 : queueError.message}`, queueError);
        }
        console_1.logger.info("COPY_TRADING_CLOSE", `Placed ${closeSide} exit ${closeOrder.id} for trade ${tradeId} (${filledAmount} ${baseCurrency}, ${reason})`);
        return { success: true, closeOrderId: closeOrder.id };
    }
    catch (error) {
        try {
            await t.rollback();
        }
        catch (_b) {
        }
        if (placedOrder) {
            try {
                const { rollbackOrderCreation } = await Promise.resolve().then(() => __importStar(require("@b/api/(ext)/ecosystem/utils/scylla/queries")));
                await rollbackOrderCreation(placedOrder.id, placedOrder.userId, placedOrder.createdAt);
                console_1.logger.warn("COPY_TRADING_CLOSE", `Compensated orphaned close order ${placedOrder.id} after rollback`);
            }
            catch (compError) {
                console_1.logger.error("COPY_TRADING_CLOSE", `Failed to compensate orphaned close order ${placedOrder.id}: ${compError === null || compError === void 0 ? void 0 : compError.message}`);
            }
        }
        console_1.logger.error("COPY_TRADING_CLOSE", `Error closing position ${tradeId}: ${error === null || error === void 0 ? void 0 : error.message}`, error);
        return { success: false, error: error === null || error === void 0 ? void 0 : error.message };
    }
}
