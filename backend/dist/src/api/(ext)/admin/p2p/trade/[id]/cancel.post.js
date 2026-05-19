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
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const console_1 = require("@b/utils/console");
const ownership_1 = require("../../../../p2p/utils/ownership");
const wallet_1 = require("@b/services/wallet");
const Middleware_1 = require("@b/handler/Middleware");
exports.metadata = {
    summary: "Cancel Trade (Admin)",
    description: "Cancels a trade with a provided cancellation reason, releases locked funds back to seller.",
    operationId: "cancelAdminP2PTrade",
    tags: ["Admin", "Trades", "P2P"],
    requiresAuth: true,
    middleware: [Middleware_1.p2pAdminTradeRateLimit],
    logModule: "ADMIN_P2P",
    logTitle: "Cancel P2P trade",
    parameters: [
        {
            index: 0,
            name: "id",
            in: "path",
            description: "Trade ID",
            required: true,
            schema: { type: "string" },
        },
    ],
    requestBody: {
        description: "Cancellation reason",
        required: true,
        content: {
            "application/json": {
                schema: {
                    type: "object",
                    properties: {
                        reason: { type: "string", description: "Reason for cancellation" },
                    },
                    required: ["reason"],
                },
            },
        },
    },
    responses: {
        200: { description: "Trade cancelled successfully." },
        401: { description: "Unauthorized." },
        404: { description: "Trade not found." },
        500: { description: "Internal Server Error." },
    },
    permission: "edit.p2p.trade",
};
exports.default = async (data) => {
    var _a, _b, _c, _d;
    const { params, body, user, ctx } = data;
    const { id } = params;
    const { reason } = body;
    const { notifyTradeEvent } = await Promise.resolve().then(() => __importStar(require("../../../../p2p/utils/notifications")));
    const { broadcastP2PTradeEvent } = await Promise.resolve().then(() => __importStar(require("../../../../p2p/trade/[id]/index.ws")));
    const { getWalletSafe } = await Promise.resolve().then(() => __importStar(require("@b/api/finance/wallet/utils")));
    const { sanitizeInput } = await Promise.resolve().then(() => __importStar(require("../../../../p2p/utils/validation")));
    const { parseAmountConfig } = await Promise.resolve().then(() => __importStar(require("../../../../p2p/utils/json-parser")));
    const transaction = await db_1.sequelize.transaction();
    try {
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Fetching trade");
        const trade = await db_1.models.p2pTrade.findByPk(id, {
            include: [{
                    model: db_1.models.p2pOffer,
                    as: "offer",
                    attributes: ["id", "currency", "walletType", "amountConfig", "status", "type"],
                }],
            lock: true,
            transaction,
        });
        if (!trade) {
            await transaction.rollback();
            ctx === null || ctx === void 0 ? void 0 : ctx.fail("Trade not found");
            throw (0, error_1.createError)({ statusCode: 404, message: "Trade not found" });
        }
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Validating trade status");
        if (["COMPLETED", "CANCELLED", "EXPIRED"].includes(trade.status)) {
            await transaction.rollback();
            ctx === null || ctx === void 0 ? void 0 : ctx.fail(`Cannot cancel trade with status: ${trade.status}`);
            throw (0, error_1.createError)({
                statusCode: 400,
                message: `Cannot cancel trade with status: ${trade.status}`
            });
        }
        const sanitizedReason = reason ? sanitizeInput(reason) : "Cancelled by admin";
        const previousStatus = trade.status;
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Processing fund unlocking and offer restoration");
        if (["PENDING", "PAYMENT_SENT", "DISPUTED"].includes(trade.status) && trade.offer) {
            const isBuyOffer = trade.offer.type === "BUY";
            if (isBuyOffer) {
                try {
                    const sellerWallet = await getWalletSafe(trade.sellerId, trade.offer.walletType, trade.offer.currency);
                    if (sellerWallet) {
                        const safeUnlockAmount = Math.min(trade.amount, (_a = sellerWallet.inOrder) !== null && _a !== void 0 ? _a : 0);
                        if (safeUnlockAmount > 0) {
                            const idempotencyKey = `p2p_admin_cancel_release_${trade.id}`;
                            await wallet_1.walletService.release({
                                idempotencyKey,
                                userId: trade.sellerId,
                                walletId: sellerWallet.id,
                                walletType: trade.offer.walletType,
                                currency: trade.offer.currency,
                                amount: safeUnlockAmount,
                                operationType: "P2P_ADMIN_TRADE_CANCEL",
                                description: `Release ${safeUnlockAmount} ${trade.offer.currency} - P2P trade cancelled by admin`,
                                metadata: {
                                    tradeId: trade.id,
                                    offerId: trade.offerId,
                                    adminId: user.id,
                                    reason: sanitizedReason,
                                },
                                transaction,
                            });
                            console_1.logger.info("P2P_ADMIN_CANCEL", `Released ${safeUnlockAmount} ${trade.offer.currency} for seller ${trade.sellerId} (BUY offer)`);
                            if (safeUnlockAmount < trade.amount) {
                                console_1.logger.warn("P2P_ADMIN_CANCEL", `Partial unlock for trade ${trade.id}: ${safeUnlockAmount}/${trade.amount}`);
                            }
                        }
                        else {
                            console_1.logger.warn("P2P_ADMIN_CANCEL", `No funds to unlock for trade ${trade.id} - inOrder is already 0`);
                        }
                    }
                }
                catch (walletError) {
                    console_1.logger.error("P2P_ADMIN_CANCEL", `Failed to release wallet funds: ${walletError}`);
                    throw (0, error_1.createError)({
                        statusCode: 500,
                        message: "Failed to release wallet funds. Trade cannot be cancelled safely. Please investigate manually."
                    });
                }
            }
            else {
                console_1.logger.info("P2P_ADMIN_CANCEL", `SELL offer - funds remain locked for offer ${trade.offerId}`);
            }
            if (trade.offerId) {
                const offer = await db_1.models.p2pOffer.findByPk(trade.offerId, {
                    lock: true,
                    transaction,
                });
                if (offer && ["ACTIVE", "PAUSED"].includes(offer.status)) {
                    const amountConfig = parseAmountConfig(offer.amountConfig);
                    const originalTotal = (_b = amountConfig.originalTotal) !== null && _b !== void 0 ? _b : (amountConfig.total + trade.amount);
                    const proposedTotal = amountConfig.total + trade.amount;
                    const safeTotal = Math.min(proposedTotal, originalTotal);
                    if (safeTotal > amountConfig.total) {
                        await offer.update({
                            amountConfig: {
                                ...amountConfig,
                                total: safeTotal,
                            },
                        }, { transaction });
                        console_1.logger.info("P2P_ADMIN_CANCEL", `Restored offer ${offer.id} amount: ${amountConfig.total} -> ${safeTotal}`);
                    }
                    else {
                        console_1.logger.debug("P2P_ADMIN_CANCEL", `Skipped offer ${offer.id} restoration - at or above limit`);
                    }
                }
            }
        }
        let timeline = trade.timeline || [];
        if (typeof timeline === "string") {
            try {
                timeline = JSON.parse(timeline);
            }
            catch (e) {
                timeline = [];
            }
        }
        if (!Array.isArray(timeline)) {
            timeline = [];
        }
        timeline.push({
            event: "ADMIN_CANCELLED",
            message: `Trade cancelled by admin: ${sanitizedReason}`,
            userId: user.id,
            adminName: `${user.firstName} ${user.lastName}`,
            createdAt: new Date().toISOString(),
        });
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Updating trade status");
        await trade.update({
            status: "CANCELLED",
            timeline,
        }, { transaction });
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Logging activity");
        await db_1.models.p2pActivityLog.create({
            userId: user.id,
            type: "ADMIN_TRADE_CANCELLED",
            action: "ADMIN_TRADE_CANCELLED",
            relatedEntity: "TRADE",
            relatedEntityId: trade.id,
            details: JSON.stringify({
                previousStatus,
                reason: sanitizedReason,
                amount: trade.amount,
                currency: (_c = trade.offer) === null || _c === void 0 ? void 0 : _c.currency,
                buyerId: trade.buyerId,
                sellerId: trade.sellerId,
                adminId: user.id,
                adminName: `${user.firstName} ${user.lastName}`,
            }),
        }, { transaction });
        await (0, ownership_1.logP2PAdminAction)(user.id, "TRADE_CANCELLED", "TRADE", trade.id, {
            previousStatus,
            reason: sanitizedReason,
            amount: trade.amount,
        }, undefined, transaction);
        await transaction.commit();
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Sending notifications");
        notifyTradeEvent(trade.id, "TRADE_CANCELLED", {
            buyerId: trade.buyerId,
            sellerId: trade.sellerId,
            amount: trade.amount,
            currency: ((_d = trade.offer) === null || _d === void 0 ? void 0 : _d.currency) || trade.currency,
            cancelledBy: user.id,
            reason: sanitizedReason,
            adminCancelled: true,
        }).catch((err) => console_1.logger.error("P2P_ADMIN_CANCEL", `Notification error: ${err}`));
        broadcastP2PTradeEvent(trade.id, {
            type: "STATUS_CHANGE",
            data: {
                status: "CANCELLED",
                previousStatus,
                cancelledAt: new Date(),
                cancellationReason: sanitizedReason,
                adminCancelled: true,
                timeline,
            },
        });
        ctx === null || ctx === void 0 ? void 0 : ctx.success("Trade cancelled successfully");
        return {
            message: "Trade cancelled successfully.",
            trade: {
                id: trade.id,
                status: "CANCELLED",
            }
        };
    }
    catch (err) {
        await transaction.rollback();
        if (err.statusCode) {
            throw err;
        }
        ctx === null || ctx === void 0 ? void 0 : ctx.fail("Failed to cancel trade");
        throw (0, error_1.createError)({
            statusCode: 500,
            message: "Internal Server Error: " + err.message,
        });
    }
};
