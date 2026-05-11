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
const fees_1 = require("@b/utils/fees");
const Middleware_1 = require("@b/handler/Middleware");
const ownership_1 = require("../../../../p2p/utils/ownership");
exports.metadata = {
    summary: "Resolve Trade (Admin)",
    description: "Resolves a disputed trade by updating its status, handling funds based on resolution outcome.",
    operationId: "resolveAdminP2PTrade",
    tags: ["Admin", "Trades", "P2P"],
    requiresAuth: true,
    middleware: [Middleware_1.p2pAdminTradeRateLimit],
    logModule: "ADMIN_P2P",
    logTitle: "Resolve P2P trade",
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
        description: "Resolution details",
        required: true,
        content: {
            "application/json": {
                schema: {
                    type: "object",
                    properties: {
                        resolution: {
                            type: "string",
                            enum: ["BUYER_WINS", "SELLER_WINS", "SPLIT", "CANCELLED"],
                            description: "Resolution outcome"
                        },
                        notes: { type: "string", description: "Admin notes about the resolution" },
                    },
                    required: ["resolution"],
                },
            },
        },
    },
    responses: {
        200: { description: "Trade resolved successfully." },
        401: { description: "Unauthorized." },
        404: { description: "Trade not found." },
        500: { description: "Internal Server Error." },
    },
    permission: "edit.p2p.trade",
};
exports.default = async (data) => {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j;
    const { params, body, user, ctx } = data;
    const { id } = params;
    const { resolution, notes } = body;
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
                    attributes: ["currency", "walletType", "type", "id"],
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
        if (!["DISPUTED", "PAYMENT_SENT", "PENDING"].includes(trade.status)) {
            await transaction.rollback();
            ctx === null || ctx === void 0 ? void 0 : ctx.fail(`Cannot resolve trade with status: ${trade.status}`);
            throw (0, error_1.createError)({
                statusCode: 400,
                message: `Cannot resolve trade with status: ${trade.status}`
            });
        }
        const sanitizedNotes = notes ? sanitizeInput(notes) : "";
        const previousStatus = trade.status;
        let finalStatus = "COMPLETED";
        let fundsReleased = false;
        ctx === null || ctx === void 0 ? void 0 : ctx.step(`Processing resolution: ${resolution}`);
        if (resolution === "BUYER_WINS") {
            if (trade.offer && trade.status !== "COMPLETED") {
                const sellerWallet = await getWalletSafe(trade.sellerId, trade.offer.walletType, trade.offer.currency);
                if (sellerWallet) {
                    const safeUnlockAmount = Math.min((_a = trade.amount) !== null && _a !== void 0 ? _a : 0, (_b = sellerWallet.inOrder) !== null && _b !== void 0 ? _b : 0);
                    if (safeUnlockAmount > 0) {
                        const sellerIsAdmin = await (0, fees_1.isSuperAdmin)(trade.sellerId);
                        const platformFee = sellerIsAdmin ? 0 : parseFloat(trade.escrowFee || "0");
                        const buyerNetAmount = Math.max(0, trade.amount - platformFee);
                        const idempotencyKey = `p2p_resolve_seller_${trade.id}`;
                        await wallet_1.walletService.executeFromHold({
                            idempotencyKey,
                            userId: trade.sellerId,
                            walletId: sellerWallet.id,
                            walletType: trade.offer.walletType,
                            currency: trade.offer.currency,
                            amount: trade.amount,
                            operationType: "P2P_TRADE_RESOLVE",
                            description: `P2P trade resolved by admin - ${resolution}`,
                            metadata: {
                                tradeId: trade.id,
                                resolution,
                                adminId: user.id,
                                platformFee,
                            },
                            transaction,
                        });
                        if (safeUnlockAmount < trade.amount) {
                            console_1.logger.warn("P2P_RESOLVE", `Partial fund handling for trade ${trade.id}: unlocked=${safeUnlockAmount}`);
                        }
                        const buyerWallet = await wallet_1.walletCreationService.getOrCreateWallet(trade.buyerId, trade.offer.walletType, trade.offer.currency);
                        const buyerIdempotencyKey = `p2p_resolve_buyer_${trade.id}`;
                        await wallet_1.walletService.credit({
                            idempotencyKey: buyerIdempotencyKey,
                            userId: trade.buyerId,
                            walletId: buyerWallet.id,
                            walletType: trade.offer.walletType,
                            currency: trade.offer.currency,
                            amount: buyerNetAmount,
                            operationType: "P2P_TRADE_RECEIVE",
                            description: `P2P trade resolved - buyer wins`,
                            metadata: {
                                tradeId: trade.id,
                                resolution,
                                adminId: user.id,
                                originalAmount: trade.amount,
                                platformFee,
                            },
                            transaction,
                        });
                        if (platformFee > 0) {
                            const systemAdmin = await db_1.models.user.findOne({
                                include: [{ model: db_1.models.role, as: "role", where: { name: "Super Admin" } }],
                                order: [["createdAt", "ASC"]],
                                transaction,
                            });
                            if (systemAdmin) {
                                await db_1.models.p2pCommission.create({
                                    adminId: systemAdmin.id,
                                    amount: platformFee,
                                    description: `P2P escrow fee for resolved trade #${trade.id.slice(0, 8)}... - ${trade.amount} ${trade.offer.currency}`,
                                    tradeId: trade.id,
                                }, { transaction });
                            }
                            await (0, fees_1.collectPlatformFee)({
                                userId: trade.sellerId,
                                currency: trade.offer.currency,
                                walletType: trade.offer.walletType,
                                feeAmount: platformFee,
                                type: "P2P_TRADE",
                                description: `P2P escrow fee for resolved trade #${trade.id.slice(0, 8)}`,
                                referenceId: trade.id,
                                metadata: { tradeId: trade.id, resolvedBy: user.id, resolution },
                                transaction,
                            });
                            console_1.logger.info("P2P_RESOLVE", `Platform commission recorded for trade ${trade.id}: ${platformFee} ${trade.offer.currency}`);
                        }
                        fundsReleased = true;
                    }
                    else {
                        console_1.logger.warn("P2P_RESOLVE", `No funds available to transfer for trade ${trade.id}`);
                    }
                }
            }
            finalStatus = "COMPLETED";
        }
        else if (resolution === "SPLIT") {
            if (trade.offer && trade.status !== "COMPLETED") {
                const sellerWallet = await getWalletSafe(trade.sellerId, trade.offer.walletType, trade.offer.currency);
                if (sellerWallet) {
                    const safeUnlockAmount = Math.min((_c = trade.amount) !== null && _c !== void 0 ? _c : 0, (_d = sellerWallet.inOrder) !== null && _d !== void 0 ? _d : 0);
                    if (safeUnlockAmount > 0) {
                        const sellerIsAdminSplit = await (0, fees_1.isSuperAdmin)(trade.sellerId);
                        const platformFee = sellerIsAdminSplit ? 0 : parseFloat(trade.escrowFee || "0");
                        const netAmount = Math.max(0, trade.amount - platformFee);
                        const halfAmount = parseFloat((netAmount / 2).toFixed(8));
                        await wallet_1.walletService.executeFromHold({
                            idempotencyKey: `p2p_resolve_split_seller_escrow_${trade.id}`,
                            userId: trade.sellerId,
                            walletId: sellerWallet.id,
                            walletType: trade.offer.walletType,
                            currency: trade.offer.currency,
                            amount: trade.amount,
                            operationType: "P2P_TRADE_RESOLVE",
                            description: `P2P trade resolved by admin - SPLIT`,
                            metadata: { tradeId: trade.id, resolution, adminId: user.id, platformFee },
                            transaction,
                        });
                        const buyerWallet = await wallet_1.walletCreationService.getOrCreateWallet(trade.buyerId, trade.offer.walletType, trade.offer.currency);
                        await wallet_1.walletService.credit({
                            idempotencyKey: `p2p_resolve_split_buyer_${trade.id}`,
                            userId: trade.buyerId,
                            walletId: buyerWallet.id,
                            walletType: trade.offer.walletType,
                            currency: trade.offer.currency,
                            amount: halfAmount,
                            operationType: "P2P_TRADE_RECEIVE",
                            description: `P2P trade resolved - split (buyer half)`,
                            metadata: { tradeId: trade.id, resolution, adminId: user.id, originalAmount: trade.amount, platformFee },
                            transaction,
                        });
                        const sellerReceiveWallet = await wallet_1.walletCreationService.getOrCreateWallet(trade.sellerId, trade.offer.walletType, trade.offer.currency);
                        await wallet_1.walletService.credit({
                            idempotencyKey: `p2p_resolve_split_seller_${trade.id}`,
                            userId: trade.sellerId,
                            walletId: sellerReceiveWallet.id,
                            walletType: trade.offer.walletType,
                            currency: trade.offer.currency,
                            amount: halfAmount,
                            operationType: "P2P_TRADE_RECEIVE",
                            description: `P2P trade resolved - split (seller half)`,
                            metadata: { tradeId: trade.id, resolution, adminId: user.id, originalAmount: trade.amount, platformFee },
                            transaction,
                        });
                        if (platformFee > 0) {
                            const systemAdmin = await db_1.models.user.findOne({
                                include: [{ model: db_1.models.role, as: "role", where: { name: "Super Admin" } }],
                                order: [["createdAt", "ASC"]],
                                transaction,
                            });
                            if (systemAdmin) {
                                await db_1.models.p2pCommission.create({
                                    adminId: systemAdmin.id,
                                    amount: platformFee,
                                    description: `P2P escrow fee for split-resolved trade #${trade.id.slice(0, 8)}... - ${trade.amount} ${trade.offer.currency}`,
                                    tradeId: trade.id,
                                }, { transaction });
                            }
                            await (0, fees_1.collectPlatformFee)({
                                userId: trade.sellerId,
                                currency: trade.offer.currency,
                                walletType: trade.offer.walletType,
                                feeAmount: platformFee,
                                type: "P2P_TRADE",
                                description: `P2P escrow fee for split-resolved trade #${trade.id.slice(0, 8)}`,
                                referenceId: trade.id,
                                metadata: { tradeId: trade.id, resolvedBy: user.id, resolution },
                                transaction,
                            });
                        }
                        fundsReleased = true;
                    }
                    else {
                        console_1.logger.warn("P2P_RESOLVE", `No funds available to split for trade ${trade.id}`);
                    }
                }
            }
            finalStatus = "COMPLETED";
        }
        else if (resolution === "SELLER_WINS" || resolution === "CANCELLED") {
            if (trade.offer && trade.status !== "COMPLETED") {
                const isBuyOffer = trade.offer.type === "BUY";
                if (isBuyOffer) {
                    const sellerWallet = await getWalletSafe(trade.sellerId, trade.offer.walletType, trade.offer.currency);
                    if (sellerWallet) {
                        const safeUnlockAmount = Math.min((_e = trade.amount) !== null && _e !== void 0 ? _e : 0, (_f = sellerWallet.inOrder) !== null && _f !== void 0 ? _f : 0);
                        if (safeUnlockAmount > 0) {
                            const releaseIdempotencyKey = `p2p_resolve_release_${trade.id}`;
                            await wallet_1.walletService.release({
                                idempotencyKey: releaseIdempotencyKey,
                                userId: trade.sellerId,
                                walletId: sellerWallet.id,
                                walletType: trade.offer.walletType,
                                currency: trade.offer.currency,
                                amount: safeUnlockAmount,
                                operationType: "P2P_TRADE_RESOLVE",
                                description: `P2P trade resolved - ${resolution}`,
                                metadata: {
                                    tradeId: trade.id,
                                    resolution,
                                    adminId: user.id,
                                },
                                transaction,
                            });
                            fundsReleased = true;
                            console_1.logger.info("P2P_RESOLVE", `${resolution}: Unlocked ${safeUnlockAmount} for trade ${trade.id} (BUY offer)`);
                            if (safeUnlockAmount < trade.amount) {
                                console_1.logger.warn("P2P_RESOLVE", `${resolution}: Partial unlock for trade ${trade.id}: ${safeUnlockAmount}/${trade.amount}`);
                            }
                        }
                        else {
                            console_1.logger.warn("P2P_RESOLVE", `${resolution}: No funds to unlock for trade ${trade.id}`);
                        }
                    }
                }
                else {
                    console_1.logger.info("P2P_RESOLVE", `${resolution}: SELL offer - funds remain locked for offer ${trade.offerId}`);
                }
                if (trade.offerId) {
                    const offer = await db_1.models.p2pOffer.findByPk(trade.offerId, {
                        lock: true,
                        transaction,
                    });
                    if (offer && ["ACTIVE", "PAUSED"].includes(offer.status)) {
                        const amountConfig = parseAmountConfig(offer.amountConfig);
                        const tradeAmount = (_g = trade.amount) !== null && _g !== void 0 ? _g : 0;
                        const originalTotal = (_h = amountConfig.originalTotal) !== null && _h !== void 0 ? _h : (amountConfig.total + tradeAmount);
                        const proposedTotal = amountConfig.total + tradeAmount;
                        const safeTotal = Math.min(proposedTotal, originalTotal);
                        if (safeTotal > amountConfig.total) {
                            await offer.update({
                                amountConfig: {
                                    ...amountConfig,
                                    total: safeTotal,
                                    originalTotal,
                                },
                            }, { transaction });
                            console_1.logger.info("P2P_RESOLVE", `${resolution}: Restored offer ${offer.id} amount: ${amountConfig.total} -> ${safeTotal}`);
                        }
                    }
                }
            }
            finalStatus = "CANCELLED";
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
            event: "ADMIN_RESOLVED",
            message: `Trade resolved by admin: ${resolution}${sanitizedNotes ? ` - ${sanitizedNotes}` : ""}`,
            userId: user.id,
            adminName: `${user.firstName} ${user.lastName}`,
            resolution,
            createdAt: new Date().toISOString(),
        });
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Updating trade status");
        await trade.update({
            status: finalStatus,
            timeline,
            resolution: { outcome: resolution, notes: sanitizedNotes, resolvedBy: user.id },
            completedAt: finalStatus === "COMPLETED" ? new Date() : null,
            cancelledAt: finalStatus === "CANCELLED" ? new Date() : null,
        }, { transaction });
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Updating related dispute if exists");
        const dispute = await db_1.models.p2pDispute.findOne({
            where: { tradeId: id },
            transaction,
        });
        if (dispute) {
            await dispute.update({
                status: "RESOLVED",
                resolution: {
                    outcome: resolution,
                    notes: sanitizedNotes,
                    resolvedBy: user.id,
                    resolvedAt: new Date().toISOString(),
                },
                resolvedOn: new Date(),
            }, { transaction });
        }
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Logging activity");
        await db_1.models.p2pActivityLog.create({
            userId: user.id,
            type: "ADMIN_TRADE_RESOLVED",
            action: "ADMIN_TRADE_RESOLVED",
            relatedEntity: "TRADE",
            relatedEntityId: trade.id,
            details: JSON.stringify({
                previousStatus,
                finalStatus,
                resolution,
                notes: sanitizedNotes,
                fundsReleased,
                adminId: user.id,
                adminName: `${user.firstName} ${user.lastName}`,
            }),
        }, { transaction });
        await (0, ownership_1.logP2PAdminAction)(user.id, "TRADE_RESOLVED", "TRADE", trade.id, {
            previousStatus,
            finalStatus,
            resolution,
            fundsReleased,
        }, undefined, transaction);
        await transaction.commit();
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Sending notifications");
        notifyTradeEvent(trade.id, finalStatus === "COMPLETED" ? "TRADE_COMPLETED" : "TRADE_CANCELLED", {
            buyerId: trade.buyerId,
            sellerId: trade.sellerId,
            amount: trade.amount,
            currency: ((_j = trade.offer) === null || _j === void 0 ? void 0 : _j.currency) || trade.currency,
            adminResolved: true,
            resolution,
        }).catch((err) => console_1.logger.error("P2P_RESOLVE", `Notification error: ${err}`));
        broadcastP2PTradeEvent(trade.id, {
            type: "STATUS_CHANGE",
            data: {
                status: finalStatus,
                previousStatus,
                resolution,
                adminResolved: true,
                timeline,
            },
        });
        ctx === null || ctx === void 0 ? void 0 : ctx.success("Trade resolved successfully");
        return {
            message: "Trade resolved successfully.",
            trade: {
                id: trade.id,
                status: finalStatus,
                resolution,
                fundsReleased,
            }
        };
    }
    catch (err) {
        await transaction.rollback();
        if (err.statusCode) {
            throw err;
        }
        ctx === null || ctx === void 0 ? void 0 : ctx.fail("Failed to resolve trade");
        throw (0, error_1.createError)({
            statusCode: 500,
            message: "Internal Server Error: " + err.message,
        });
    }
};
