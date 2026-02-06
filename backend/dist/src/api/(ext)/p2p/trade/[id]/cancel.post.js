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
const sequelize_1 = require("sequelize");
const error_1 = require("@b/utils/error");
const json_parser_1 = require("@b/api/(ext)/p2p/utils/json-parser");
const console_1 = require("@b/utils/console");
const wallet_1 = require("@b/services/wallet");
exports.metadata = {
    summary: "Cancel Trade",
    description: "Cancels a trade with a provided cancellation reason.",
    operationId: "cancelP2PTrade",
    tags: ["P2P", "Trade"],
    requiresAuth: true,
    logModule: "P2P_TRADE",
    logTitle: "Cancel trade",
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
};
exports.default = async (data) => {
    var _a, _b;
    const { id } = data.params || {};
    const { reason } = data.body;
    const { user, ctx } = data;
    if (!(user === null || user === void 0 ? void 0 : user.id)) {
        throw (0, error_1.createError)({ statusCode: 401, message: "Unauthorized" });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Validating cancellation reason");
    const { validateTradeStatusTransition, sanitizeInput } = await Promise.resolve().then(() => __importStar(require("../../utils/validation")));
    const { notifyTradeEvent } = await Promise.resolve().then(() => __importStar(require("../../utils/notifications")));
    const { broadcastP2PTradeEvent } = await Promise.resolve().then(() => __importStar(require("./index.ws")));
    const { sequelize } = await Promise.resolve().then(() => __importStar(require("@b/db")));
    const { getWalletSafe } = await Promise.resolve().then(() => __importStar(require("@b/api/finance/wallet/utils")));
    const sanitizedReason = sanitizeInput(reason);
    if (!sanitizedReason || sanitizedReason.length < 10) {
        throw (0, error_1.createError)({
            statusCode: 400,
            message: "Cancellation reason must be at least 10 characters"
        });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Finding and locking trade");
    const transaction = await sequelize.transaction();
    try {
        const trade = await db_1.models.p2pTrade.findOne({
            where: {
                id,
                [sequelize_1.Op.or]: [{ buyerId: user.id }, { sellerId: user.id }],
            },
            include: [{
                    model: db_1.models.p2pOffer,
                    as: "offer",
                    attributes: ["currency", "walletType", "id", "type"],
                }],
            lock: true,
            transaction,
        });
        if (!trade) {
            await transaction.rollback();
            throw (0, error_1.createError)({ statusCode: 404, message: "Trade not found" });
        }
        const tradeOffer = trade.offer;
        if (!tradeOffer) {
            await transaction.rollback();
            throw (0, error_1.createError)({ statusCode: 500, message: "Trade data incomplete - offer not found" });
        }
        if (!validateTradeStatusTransition(trade.status, "CANCELLED")) {
            await transaction.rollback();
            throw (0, error_1.createError)({
                statusCode: 400,
                message: `Cannot cancel trade from status: ${trade.status}`
            });
        }
        if (trade.status === "PAYMENT_SENT" && user.id === trade.buyerId) {
            await transaction.rollback();
            throw (0, error_1.createError)({
                statusCode: 403,
                message: "Buyer cannot cancel after confirming payment. Please open a dispute instead."
            });
        }
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Processing fund unlocking and offer restoration");
        if (["PENDING", "PAYMENT_SENT"].includes(trade.status)) {
            const isBuyOffer = tradeOffer.type === "BUY";
            if (isBuyOffer) {
                ctx === null || ctx === void 0 ? void 0 : ctx.step(`Unlocking funds for BUY offer (${trade.amount} ${tradeOffer.currency})`);
                const sellerWallet = await getWalletSafe(trade.sellerId, tradeOffer.walletType, tradeOffer.currency);
                if (sellerWallet) {
                    const safeUnlockAmount = Math.min(trade.amount, (_a = sellerWallet.inOrder) !== null && _a !== void 0 ? _a : 0);
                    if (safeUnlockAmount > 0) {
                        const idempotencyKey = `p2p_cancel_release_${trade.id}`;
                        await wallet_1.walletService.release({
                            idempotencyKey,
                            userId: trade.sellerId,
                            walletId: sellerWallet.id,
                            walletType: tradeOffer.walletType,
                            currency: tradeOffer.currency,
                            amount: safeUnlockAmount,
                            operationType: "P2P_TRADE_CANCEL",
                            description: `Release ${safeUnlockAmount} ${tradeOffer.currency} - P2P trade cancelled`,
                            metadata: {
                                tradeId: trade.id,
                                offerId: trade.offerId,
                                cancelledBy: user.id,
                                reason: sanitizedReason,
                            },
                            transaction,
                        });
                        console_1.logger.info("P2P_CANCEL", `Unlocked ${safeUnlockAmount} ${tradeOffer.currency} for seller ${trade.sellerId} (BUY offer)`);
                        if (safeUnlockAmount < trade.amount) {
                            console_1.logger.warn("P2P_CANCEL", `Partial unlock for trade ${trade.id}: ${safeUnlockAmount}/${trade.amount}`);
                        }
                    }
                    else {
                        console_1.logger.warn("P2P_CANCEL", `No funds to unlock for trade ${trade.id} - inOrder is already 0`);
                    }
                }
            }
            else {
                console_1.logger.info("P2P_CANCEL", `SELL offer - funds remain locked for offer ${trade.offerId}`);
            }
            if (trade.offerId) {
                const offer = await db_1.models.p2pOffer.findByPk(trade.offerId, {
                    lock: true,
                    transaction,
                });
                if (offer && ["ACTIVE", "PAUSED"].includes(offer.status)) {
                    const amountConfig = (0, json_parser_1.parseAmountConfig)(offer.amountConfig);
                    const originalTotal = (_b = amountConfig.originalTotal) !== null && _b !== void 0 ? _b : (amountConfig.total + trade.amount);
                    const maxAllowedTotal = originalTotal;
                    const proposedTotal = amountConfig.total + trade.amount;
                    const safeTotal = Math.min(proposedTotal, maxAllowedTotal);
                    if (safeTotal > amountConfig.total) {
                        await offer.update({ amountConfig: { ...amountConfig, total: safeTotal, originalTotal } }, { transaction });
                        console_1.logger.info("P2P_CANCEL", `Restored offer ${offer.id} amount: ${amountConfig.total} -> ${safeTotal}`);
                    }
                    else {
                        console_1.logger.debug("P2P_CANCEL", `Skipped offer ${offer.id} restoration - at or above safe limit`);
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
                console_1.logger.error("P2P_CANCEL", `Failed to parse timeline JSON: ${e}`);
                timeline = [];
            }
        }
        if (!Array.isArray(timeline)) {
            timeline = [];
        }
        timeline.push({
            event: "TRADE_CANCELLED",
            message: `Trade cancelled: ${sanitizedReason}`,
            userId: user.id,
            createdAt: new Date().toISOString(),
        });
        await trade.update({ status: "CANCELLED", cancelledBy: user.id, cancellationReason: sanitizedReason, cancelledAt: new Date(), timeline }, { transaction });
        await db_1.models.p2pActivityLog.create({
            userId: user.id,
            type: "TRADE_CANCELLED",
            action: "TRADE_CANCELLED",
            relatedEntity: "TRADE",
            relatedEntityId: trade.id,
            details: JSON.stringify({
                previousStatus: trade.status,
                reason: sanitizedReason,
                amount: trade.amount,
                currency: tradeOffer.currency,
                counterpartyId: user.id === trade.buyerId ? trade.sellerId : trade.buyerId,
            }),
        }, { transaction });
        await transaction.commit();
        ctx === null || ctx === void 0 ? void 0 : ctx.success(`Cancelled trade ${trade.id.slice(0, 8)}... (${trade.amount} ${tradeOffer.currency})`);
        notifyTradeEvent(trade.id, "TRADE_CANCELLED", {
            buyerId: trade.buyerId,
            sellerId: trade.sellerId,
            amount: trade.amount,
            currency: tradeOffer.currency,
            cancelledBy: user.id,
            reason: sanitizedReason,
        }).catch((err) => console_1.logger.error("P2P_CANCEL", `Notification error: ${err}`));
        broadcastP2PTradeEvent(trade.id, {
            type: "STATUS_CHANGE",
            data: {
                status: "CANCELLED",
                previousStatus: trade.status,
                cancelledAt: trade.cancelledAt,
                cancellationReason: sanitizedReason,
                cancelledBy: user.id,
            },
        });
        return {
            message: "Trade cancelled successfully.",
            trade: {
                id: trade.id,
                status: "CANCELLED",
                cancelledAt: trade.cancelledAt,
                cancellationReason: sanitizedReason,
            }
        };
    }
    catch (err) {
        await transaction.rollback();
        if (err.statusCode) {
            throw err;
        }
        throw (0, error_1.createError)({
            statusCode: 500,
            message: "Failed to cancel trade: " + err.message,
        });
    }
};
