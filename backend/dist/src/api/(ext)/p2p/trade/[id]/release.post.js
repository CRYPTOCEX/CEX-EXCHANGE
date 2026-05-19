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
const wallet_1 = require("@b/services/wallet");
const affiliate_1 = require("@b/utils/affiliate");
const fees_1 = require("@b/utils/fees");
exports.metadata = {
    summary: "Release Funds for Trade",
    description: "Releases funds and updates the trade status to 'COMPLETED' for the authenticated seller.",
    operationId: "releaseP2PTradeFunds",
    tags: ["P2P", "Trade"],
    requiresAuth: true,
    logModule: "P2P_TRADE",
    logTitle: "Release funds",
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
    responses: {
        200: { description: "Funds released successfully." },
        401: { description: "Unauthorized." },
        404: { description: "Trade not found." },
        500: { description: "Internal Server Error." },
    },
};
exports.default = async (data) => {
    var _a;
    const { id } = data.params || {};
    const { user, ctx } = data;
    if (!(user === null || user === void 0 ? void 0 : user.id)) {
        throw (0, error_1.createError)({ statusCode: 401, message: "Unauthorized" });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Checking idempotency and validating trade");
    const { validateTradeStatusTransition } = await Promise.resolve().then(() => __importStar(require("../../utils/validation")));
    const { notifyTradeEvent } = await Promise.resolve().then(() => __importStar(require("../../utils/notifications")));
    const { broadcastP2PTradeEvent } = await Promise.resolve().then(() => __importStar(require("./index.ws")));
    const { sequelize } = await Promise.resolve().then(() => __importStar(require("@b/db")));
    const { getWalletSafe } = await Promise.resolve().then(() => __importStar(require("@b/api/finance/wallet/utils")));
    const { RedisSingleton } = await Promise.resolve().then(() => __importStar(require("@b/utils/redis")));
    const { createP2PAuditLog, P2PAuditEventType, P2PRiskLevel } = await Promise.resolve().then(() => __importStar(require("../../utils/audit")));
    const idempotencyKey = `p2p:release:${id}:${user.id}`;
    const redis = RedisSingleton.getInstance();
    try {
        const existingResult = await redis.get(idempotencyKey);
        if (existingResult) {
            return JSON.parse(existingResult);
        }
        const lockKey = `p2p:trade:${id}:action_lock`;
        const lockAcquired = await redis.set(lockKey, "1", "EX", 30, "NX");
        if (!lockAcquired) {
            throw (0, error_1.createError)({
                statusCode: 409,
                message: "Operation already in progress. Please try again."
            });
        }
    }
    catch (redisError) {
        if (redisError.statusCode === 409)
            throw redisError;
        throw (0, error_1.createError)({ statusCode: 503, message: "Service temporarily unavailable. Please retry." });
    }
    const transaction = await sequelize.transaction({
        isolationLevel: sequelize.constructor.Transaction.ISOLATION_LEVELS.SERIALIZABLE,
    });
    let committed = false;
    try {
        const trade = await db_1.models.p2pTrade.findOne({
            where: { id, sellerId: user.id },
            include: [{
                    model: db_1.models.p2pOffer,
                    as: "offer",
                    attributes: ["currency", "walletType"],
                }],
            lock: true,
            transaction,
        });
        if (!trade) {
            await transaction.rollback();
            throw (0, error_1.createError)({ statusCode: 404, message: "Trade not found" });
        }
        const offer = trade.offer;
        if (!offer) {
            await transaction.rollback();
            throw (0, error_1.createError)({ statusCode: 500, message: "Trade data incomplete - offer not found" });
        }
        if (["COMPLETED", "DISPUTED", "CANCELLED", "EXPIRED"].includes(trade.status)) {
            await transaction.rollback();
            throw (0, error_1.createError)({
                statusCode: 400,
                message: `Funds already released or trade is in final state: ${trade.status}`
            });
        }
        if (!validateTradeStatusTransition(trade.status, "COMPLETED")) {
            await transaction.rollback();
            throw (0, error_1.createError)({
                statusCode: 400,
                message: `Cannot release funds from status: ${trade.status}`
            });
        }
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Processing fund transfer from seller to buyer");
        if (trade.status === "PAYMENT_SENT") {
            const sellerWallet = await db_1.models.wallet.findOne({
                where: {
                    userId: trade.sellerId,
                    type: offer.walletType,
                    currency: offer.currency,
                },
                lock: true,
                transaction,
            });
            if (!sellerWallet) {
                await transaction.rollback();
                throw (0, error_1.createError)({
                    statusCode: 500,
                    message: "Seller wallet not found"
                });
            }
            if (((_a = sellerWallet.inOrder) !== null && _a !== void 0 ? _a : 0) < trade.amount) {
                await transaction.rollback();
                throw (0, error_1.createError)({
                    statusCode: 400,
                    message: "Insufficient locked funds available to release"
                });
            }
            const sellerIsAdmin = await (0, fees_1.isSuperAdmin)(trade.sellerId);
            const escrowFeeAmount = parseFloat(trade.escrowFee || "0");
            const platformFee = sellerIsAdmin ? 0 : Math.min(parseFloat(escrowFeeAmount.toFixed(8)), trade.amount);
            const buyerNetAmount = Math.max(0, parseFloat((trade.amount - platformFee).toFixed(8)));
            const idempotencyKey = `p2p_release_${trade.id}`;
            ctx === null || ctx === void 0 ? void 0 : ctx.step(`Releasing ${trade.amount} ${offer.currency} from seller's escrow`);
            await wallet_1.walletService.executeFromHold({
                idempotencyKey: `${idempotencyKey}_seller_execute`,
                userId: trade.sellerId,
                walletId: sellerWallet.id,
                walletType: offer.walletType,
                currency: offer.currency,
                amount: trade.amount,
                operationType: "P2P_TRADE_RELEASE",
                description: `P2P trade release #${trade.id}`,
                metadata: {
                    tradeId: trade.id,
                    buyerId: trade.buyerId,
                    escrowFee: escrowFeeAmount,
                    platformFee,
                },
                transaction,
            });
            await createP2PAuditLog({
                userId: user.id,
                eventType: P2PAuditEventType.FUNDS_UNLOCKED,
                entityType: "WALLET",
                entityId: sellerWallet.id,
                metadata: {
                    tradeId: trade.id,
                    amount: trade.amount,
                    currency: offer.currency,
                    platformFee,
                },
                riskLevel: P2PRiskLevel.HIGH,
            });
            ctx === null || ctx === void 0 ? void 0 : ctx.step(`Transferring ${buyerNetAmount} ${offer.currency} to buyer`);
            const buyerWallet = await wallet_1.walletCreationService.getOrCreateWallet(trade.buyerId, offer.walletType, offer.currency);
            await wallet_1.walletService.credit({
                idempotencyKey: `${idempotencyKey}_buyer_credit`,
                userId: trade.buyerId,
                walletId: buyerWallet.id,
                walletType: offer.walletType,
                currency: offer.currency,
                amount: buyerNetAmount,
                operationType: "P2P_TRADE_RECEIVE",
                description: `P2P trade receive #${trade.id}`,
                metadata: {
                    tradeId: trade.id,
                    sellerId: trade.sellerId,
                    originalAmount: trade.amount,
                    platformFee,
                },
                transaction,
            });
            let sellerWalletData = null;
            if (offer.walletType === "ECO") {
                sellerWalletData = await db_1.models.walletData.findOne({
                    where: { walletId: sellerWallet.id, currency: offer.currency },
                    transaction,
                });
                if (sellerWalletData) {
                    await wallet_1.walletService.ecoChainTransfer({
                        idempotencyKey: `p2p_eco_chain_${trade.id}`,
                        currency: offer.currency,
                        chain: sellerWalletData.chain,
                        fromWalletId: sellerWallet.id,
                        fromAmount: trade.amount,
                        toWalletId: buyerWallet.id,
                        toAmount: buyerNetAmount,
                        transaction,
                        metadata: { tradeId: trade.id, type: "P2P_RELEASE" },
                    });
                    console_1.logger.info("P2P", `ECO chain balances updated: chain=${sellerWalletData.chain}, seller ${sellerWallet.id} -${trade.amount}, buyer ${buyerWallet.id} +${buyerNetAmount}`);
                }
                else {
                    throw (0, error_1.createError)({
                        statusCode: 500,
                        message: "ECO wallet data not found for seller - cannot complete chain balance sync. Please contact support."
                    });
                }
            }
            await createP2PAuditLog({
                userId: user.id,
                eventType: P2PAuditEventType.FUNDS_TRANSFERRED,
                entityType: "TRADE",
                entityId: trade.id,
                metadata: {
                    fromUserId: trade.sellerId,
                    toUserId: trade.buyerId,
                    requestedAmount: trade.amount,
                    buyerNetAmount,
                    platformFee,
                    escrowFee: escrowFeeAmount,
                    currency: offer.currency,
                    walletType: offer.walletType,
                },
                riskLevel: P2PRiskLevel.CRITICAL,
            });
            if (platformFee > 0) {
                const systemAdmin = await db_1.models.user.findOne({
                    include: [{
                            model: db_1.models.role,
                            as: "role",
                            where: { name: "Super Admin" },
                        }],
                    order: [["createdAt", "ASC"]],
                    transaction,
                });
                await (0, fees_1.collectPlatformFee)({
                    userId: trade.sellerId,
                    currency: offer.currency,
                    walletType: offer.walletType,
                    chain: offer.walletType === "ECO" ? sellerWalletData === null || sellerWalletData === void 0 ? void 0 : sellerWalletData.chain : undefined,
                    feeAmount: platformFee,
                    type: "P2P_TRADE",
                    description: `P2P escrow fee for trade #${trade.id.slice(0, 8)}`,
                    referenceId: trade.id,
                    metadata: { tradeId: trade.id, buyerId: trade.buyerId, sellerId: trade.sellerId },
                    transaction,
                });
                if (systemAdmin) {
                    await db_1.models.p2pCommission.create({
                        adminId: systemAdmin.id,
                        amount: platformFee,
                        description: `P2P escrow fee for trade #${trade.id.slice(0, 8)}... - ${trade.amount} ${offer.currency}`,
                        tradeId: trade.id,
                    }, { transaction });
                    console_1.logger.debug("P2P", `Platform commission recorded: tradeId=${trade.id}, adminId=${systemAdmin.id}, fee=${platformFee} ${offer.currency}`);
                }
                else {
                    console_1.logger.warn("P2P", "No super admin found to assign commission record");
                }
            }
            console_1.logger.info("P2P", `Funds transferred: tradeId=${trade.id}, seller=${trade.sellerId}, buyer=${trade.buyerId}, ${offer.walletType} ${offer.currency}, amount=${trade.amount}, fee=${platformFee}, buyerReceives=${buyerNetAmount}`);
        }
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Updating trade status to COMPLETED");
        let timeline = trade.timeline || [];
        if (typeof timeline === "string") {
            try {
                timeline = JSON.parse(timeline);
            }
            catch (e) {
                console_1.logger.error("P2P", "Failed to parse timeline JSON", e);
                timeline = [];
            }
        }
        if (!Array.isArray(timeline)) {
            timeline = [];
        }
        timeline.push({
            event: "FUNDS_RELEASED",
            message: "Seller released funds - Trade completed",
            userId: user.id,
            createdAt: new Date().toISOString(),
        });
        const previousStatus = trade.status;
        const completedAt = new Date();
        await trade.update({
            status: "COMPLETED",
            timeline,
            completedAt,
        }, { transaction });
        await db_1.models.p2pActivityLog.create({
            userId: user.id,
            type: "TRADE_COMPLETED",
            action: "TRADE_COMPLETED",
            relatedEntity: "TRADE",
            relatedEntityId: trade.id,
            details: JSON.stringify({
                previousStatus,
                amount: trade.amount,
                currency: offer.currency,
            }),
        }, { transaction });
        await transaction.commit();
        committed = true;
        try {
            await redis.del(`p2p:trade:${id}:action_lock`);
        }
        catch (_) { }
        notifyTradeEvent(trade.id, "TRADE_COMPLETED", {
            buyerId: trade.buyerId,
            sellerId: trade.sellerId,
            amount: trade.amount,
            currency: offer.currency,
        }).catch((err) => console_1.logger.error("P2P", "Failed to notify trade event", err));
        broadcastP2PTradeEvent(trade.id, {
            type: "STATUS_CHANGE",
            data: {
                status: "COMPLETED",
                previousStatus,
                completedAt,
                timeline,
            },
        });
        const result = {
            message: "Funds released successfully. Trade completed.",
            trade: {
                id: trade.id,
                status: "COMPLETED",
                completedAt,
            }
        };
        ctx === null || ctx === void 0 ? void 0 : ctx.success(`Released funds for trade ${trade.id.slice(0, 8)}... (${trade.amount} ${offer.currency})`);
        try {
            const escrowFeeForRewards = parseFloat(trade.escrowFee || "0");
            const platformFeeForRewards = Math.min(parseFloat(escrowFeeForRewards.toFixed(8)), trade.amount);
            const buyerNetAmountForRewards = Math.max(0, parseFloat((trade.amount - platformFeeForRewards).toFixed(8)));
            await (0, affiliate_1.processRewards)(trade.buyerId, buyerNetAmountForRewards, "P2P_TRADE", offer.currency, `P2P_TRADE:p2p_trade:${trade.id}:buyer`);
            await (0, affiliate_1.processRewards)(trade.sellerId, trade.amount, "P2P_TRADE_COMPLETION", offer.currency, `P2P_TRADE_COMPLETION:p2p_trade:${trade.id}:seller`);
        }
        catch (affiliateError) {
            console_1.logger.error("P2P", "Failed to process affiliate rewards", affiliateError);
        }
        try {
            await redis.setex(idempotencyKey, 3600, JSON.stringify(result));
        }
        catch (redisError) {
            console_1.logger.error("P2P", "Redis error in caching result", redisError);
        }
        return result;
    }
    catch (err) {
        if (!committed) {
            try {
                await transaction.rollback();
            }
            catch (_) { }
        }
        try {
            await redis.del(`p2p:trade:${id}:action_lock`);
        }
        catch (_) { }
        if (err.statusCode) {
            throw err;
        }
        throw (0, error_1.createError)({
            statusCode: 500,
            message: "Failed to release funds: " + err.message,
        });
    }
};
