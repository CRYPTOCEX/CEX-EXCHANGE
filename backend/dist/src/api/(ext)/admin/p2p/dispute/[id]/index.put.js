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
const fees_1 = require("@b/utils/fees");
const Middleware_1 = require("@b/handler/Middleware");
const ownership_1 = require("../../../../p2p/utils/ownership");
const wallet_1 = require("@b/services/wallet");
const errors_1 = require("@b/utils/schema/errors");
exports.metadata = {
    summary: "Update P2P dispute",
    description: "Updates a P2P dispute including status changes, resolution details, and admin messages. Handles fund distribution when resolving disputes based on the outcome (BUYER_WINS, SELLER_WINS, SPLIT, CANCELLED).",
    operationId: "updateAdminP2PDispute",
    tags: ["Admin", "P2P", "Dispute"],
    requiresAuth: true,
    middleware: [Middleware_1.p2pAdminDisputeRateLimit],
    logModule: "ADMIN_P2P",
    logTitle: "Update P2P dispute",
    parameters: [
        {
            index: 0,
            name: "id",
            in: "path",
            description: "Dispute ID",
            required: true,
            schema: { type: "string" },
        },
    ],
    requestBody: {
        description: "Dispute update data",
        required: true,
        content: {
            "application/json": {
                schema: {
                    type: "object",
                    properties: {
                        status: { type: "string", enum: ["PENDING", "IN_PROGRESS", "RESOLVED"] },
                        resolution: {
                            type: "object",
                            properties: {
                                outcome: {
                                    type: "string",
                                    enum: ["BUYER_WINS", "SELLER_WINS", "SPLIT", "CANCELLED"],
                                    description: "Resolution outcome - determines how funds are handled"
                                },
                                notes: { type: "string" },
                            },
                        },
                        message: { type: "string", description: "Admin message to add to dispute" },
                    },
                },
            },
        },
    },
    responses: {
        200: { description: "Dispute updated successfully." },
        401: errors_1.unauthorizedResponse,
        404: (0, errors_1.notFoundResponse)("P2P resource"),
        500: errors_1.serverErrorResponse,
    },
    permission: "edit.p2p.dispute",
};
exports.default = async (data) => {
    var _a, _b, _c, _d, _e, _f, _g, _h;
    const { params, body, user, ctx } = data;
    const { id } = params;
    const { status, resolution, message } = body;
    const { sanitizeInput } = await Promise.resolve().then(() => __importStar(require("../../../../p2p/utils/validation")));
    const { notifyTradeEvent } = await Promise.resolve().then(() => __importStar(require("../../../../p2p/utils/notifications")));
    const { broadcastP2PTradeEvent } = await Promise.resolve().then(() => __importStar(require("../../../../p2p/trade/[id]/index.ws")));
    const { getWalletSafe } = await Promise.resolve().then(() => __importStar(require("@b/api/finance/wallet/utils")));
    const { parseAmountConfig } = await Promise.resolve().then(() => __importStar(require("../../../../p2p/utils/json-parser")));
    const transaction = await db_1.sequelize.transaction();
    try {
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Fetching dispute");
        const dispute = await db_1.models.p2pDispute.findByPk(id, {
            include: [{
                    model: db_1.models.p2pTrade,
                    as: "trade",
                    include: [{
                            model: db_1.models.p2pOffer,
                            as: "offer",
                            attributes: ["currency", "walletType", "type", "id"],
                        }],
                }],
            lock: true,
            transaction,
        });
        if (!dispute) {
            await transaction.rollback();
            ctx === null || ctx === void 0 ? void 0 : ctx.fail("Dispute not found");
            throw (0, error_1.createError)({ statusCode: 404, message: "Dispute not found" });
        }
        const trade = await db_1.models.p2pTrade.findByPk(dispute.tradeId, {
            lock: true,
            transaction,
            include: [{
                    model: db_1.models.p2pOffer,
                    as: "offer",
                    attributes: ["currency", "walletType", "type", "id"],
                }],
        });
        let tradeUpdated = false;
        let fundsHandled = false;
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Processing dispute update");
        if (status) {
            const validStatuses = ["PENDING", "IN_PROGRESS", "RESOLVED"];
            if (!validStatuses.includes(status)) {
                await transaction.rollback();
                throw (0, error_1.createError)({
                    statusCode: 400,
                    message: "Invalid status. Must be PENDING, IN_PROGRESS, or RESOLVED"
                });
            }
            dispute.status = status;
        }
        if (resolution && resolution.outcome) {
            ctx === null || ctx === void 0 ? void 0 : ctx.step(`Resolving dispute with outcome: ${resolution.outcome}`);
            const sanitizedNotes = resolution.notes ? sanitizeInput(resolution.notes) : "";
            const outcome = resolution.outcome;
            const validOutcomes = ["BUYER_WINS", "SELLER_WINS", "SPLIT", "CANCELLED"];
            if (!validOutcomes.includes(outcome)) {
                await transaction.rollback();
                throw (0, error_1.createError)({
                    statusCode: 400,
                    message: "Invalid resolution outcome"
                });
            }
            if (trade && trade.status === "DISPUTED" && trade.offer) {
                let finalTradeStatus = "COMPLETED";
                if (outcome === "BUYER_WINS" || outcome === "SPLIT") {
                    const sellerWallet = await getWalletSafe(trade.sellerId, trade.offer.walletType, trade.offer.currency);
                    if (sellerWallet) {
                        const safeUnlockAmount = Math.min((_a = trade.amount) !== null && _a !== void 0 ? _a : 0, (_b = sellerWallet.inOrder) !== null && _b !== void 0 ? _b : 0);
                        if (safeUnlockAmount > 0) {
                            const sellerIsAdmin = await (0, fees_1.isSuperAdmin)(trade.sellerId);
                            const escrowFeeAmount = parseFloat(trade.escrowFee || "0");
                            const platformFee = sellerIsAdmin ? 0 : Math.min(escrowFeeAmount, trade.amount);
                            const buyerNetAmount = Math.max(0, trade.amount - platformFee);
                            const sellerIdempotencyKey = `p2p_dispute_seller_${trade.id}`;
                            await wallet_1.walletService.executeFromHold({
                                idempotencyKey: sellerIdempotencyKey,
                                userId: trade.sellerId,
                                walletId: sellerWallet.id,
                                walletType: trade.offer.walletType,
                                currency: trade.offer.currency,
                                amount: trade.amount,
                                operationType: "P2P_DISPUTE_RESOLVE",
                                description: `P2P dispute resolved (${outcome}) - seller debit`,
                                metadata: {
                                    tradeId: trade.id,
                                    disputeId: dispute.id,
                                    resolution: outcome,
                                    adminId: user.id,
                                    platformFee,
                                },
                                transaction,
                            });
                            if (safeUnlockAmount < trade.amount) {
                                console_1.logger.warn("P2P_DISPUTE", `Partial fund handling for trade ${trade.id}: unlocked=${safeUnlockAmount}, expected=${trade.amount}`);
                            }
                            const buyerWallet = await wallet_1.walletCreationService.getOrCreateWallet(trade.buyerId, trade.offer.walletType, trade.offer.currency);
                            const buyerIdempotencyKey = `p2p_dispute_buyer_${trade.id}`;
                            await wallet_1.walletService.credit({
                                idempotencyKey: buyerIdempotencyKey,
                                userId: trade.buyerId,
                                walletId: buyerWallet.id,
                                walletType: trade.offer.walletType,
                                currency: trade.offer.currency,
                                amount: buyerNetAmount,
                                operationType: "P2P_DISPUTE_RECEIVE",
                                description: `P2P dispute resolved (${outcome}) - buyer credit`,
                                metadata: {
                                    tradeId: trade.id,
                                    disputeId: dispute.id,
                                    resolution: outcome,
                                    adminId: user.id,
                                    originalAmount: trade.amount,
                                    platformFee,
                                },
                                transaction,
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
                                if (systemAdmin) {
                                    await db_1.models.p2pCommission.create({
                                        adminId: systemAdmin.id,
                                        amount: platformFee,
                                        description: `P2P escrow fee for disputed trade #${trade.id.slice(0, 8)}... - ${trade.amount} ${trade.offer.currency} (${outcome})`,
                                        tradeId: trade.id,
                                    }, { transaction });
                                    await (0, fees_1.collectPlatformFee)({
                                        userId: trade.sellerId,
                                        currency: trade.offer.currency,
                                        walletType: trade.offer.walletType,
                                        feeAmount: platformFee,
                                        type: "P2P_TRADE",
                                        description: `P2P escrow fee for trade #${trade.id.slice(0, 8)}`,
                                        referenceId: trade.id,
                                        metadata: { tradeId: trade.id, buyerId: trade.buyerId, sellerId: trade.sellerId, disputeId: dispute.id, outcome },
                                        transaction,
                                    });
                                    console_1.logger.info("P2P_DISPUTE", `Platform commission recorded for trade ${trade.id}: ${platformFee} ${trade.offer.currency}`);
                                }
                                else {
                                    console_1.logger.warn("P2P_DISPUTE", "No super admin found to assign commission");
                                }
                            }
                            fundsHandled = true;
                            console_1.logger.success("P2P_DISPUTE", `Funds transferred to buyer for trade ${trade.id}: ${buyerNetAmount} ${trade.offer.currency} (fee: ${platformFee})`);
                        }
                        else {
                            console_1.logger.warn("P2P_DISPUTE", `No funds available to transfer for trade ${trade.id}`);
                        }
                    }
                    finalTradeStatus = "COMPLETED";
                }
                else if (outcome === "SELLER_WINS" || outcome === "CANCELLED") {
                    const tradeOffer = trade.offer;
                    if (tradeOffer && tradeOffer.type === "BUY") {
                        const sellerWallet = await getWalletSafe(trade.sellerId, trade.offer.walletType, trade.offer.currency);
                        if (sellerWallet) {
                            const safeUnlockAmount = Math.min((_c = trade.amount) !== null && _c !== void 0 ? _c : 0, (_d = sellerWallet.inOrder) !== null && _d !== void 0 ? _d : 0);
                            if (safeUnlockAmount > 0) {
                                const releaseIdempotencyKey = `p2p_dispute_release_${trade.id}`;
                                await wallet_1.walletService.release({
                                    idempotencyKey: releaseIdempotencyKey,
                                    userId: trade.sellerId,
                                    walletId: sellerWallet.id,
                                    walletType: trade.offer.walletType,
                                    currency: trade.offer.currency,
                                    amount: safeUnlockAmount,
                                    operationType: "P2P_DISPUTE_RESOLVE",
                                    description: `P2P dispute resolved (${outcome}) - funds returned to seller`,
                                    metadata: {
                                        tradeId: trade.id,
                                        disputeId: dispute.id,
                                        resolution: outcome,
                                        adminId: user.id,
                                    },
                                    transaction,
                                });
                                fundsHandled = true;
                                if (safeUnlockAmount < trade.amount) {
                                    console_1.logger.warn("P2P_DISPUTE", `Partial unlock for trade ${trade.id}: ${safeUnlockAmount}/${trade.amount}`);
                                }
                            }
                            else {
                                console_1.logger.warn("P2P_DISPUTE", `No funds to unlock for trade ${trade.id}`);
                            }
                        }
                    }
                    else if (tradeOffer && tradeOffer.type === "SELL") {
                        fundsHandled = true;
                        console_1.logger.info("P2P_DISPUTE", `SELL offer: funds remain locked for offer ${tradeOffer.id}`);
                    }
                    if (trade.offerId) {
                        const offer = await db_1.models.p2pOffer.findByPk(trade.offerId, {
                            lock: true,
                            transaction,
                        });
                        if (offer && ["ACTIVE", "PAUSED"].includes(offer.status)) {
                            const amountConfig = parseAmountConfig(offer.amountConfig);
                            const tradeAmount = (_e = trade.amount) !== null && _e !== void 0 ? _e : 0;
                            const originalTotal = (_f = amountConfig.originalTotal) !== null && _f !== void 0 ? _f : (amountConfig.total + tradeAmount);
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
                                console_1.logger.info("P2P_DISPUTE", `Restored offer ${offer.id} amount: ${amountConfig.total} -> ${safeTotal}`);
                            }
                            else {
                                console_1.logger.debug("P2P_DISPUTE", `Skipped offer ${offer.id} restoration - at or above limit`);
                            }
                        }
                    }
                    finalTradeStatus = "CANCELLED";
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
                    event: "DISPUTE_RESOLVED",
                    message: `Dispute resolved by admin: ${outcome}${sanitizedNotes ? ` - ${sanitizedNotes}` : ""}`,
                    userId: user.id,
                    adminName: `${user.firstName} ${user.lastName}`,
                    resolution: outcome,
                    createdAt: new Date().toISOString(),
                });
                await trade.update({
                    status: finalTradeStatus,
                    timeline,
                    resolution: { outcome, notes: sanitizedNotes, resolvedBy: user.id },
                    completedAt: finalTradeStatus === "COMPLETED" ? new Date() : null,
                    cancelledAt: finalTradeStatus === "CANCELLED" ? new Date() : null,
                }, { transaction });
                tradeUpdated = true;
            }
            dispute.resolution = {
                outcome,
                notes: sanitizedNotes,
                resolvedBy: user.id,
                resolvedAt: new Date().toISOString(),
                fundsHandled,
            };
            dispute.resolvedOn = new Date();
            dispute.status = "RESOLVED";
        }
        let sanitizedMessage;
        if (message) {
            sanitizedMessage = sanitizeInput(message);
            if (!sanitizedMessage || sanitizedMessage.length === 0) {
                await transaction.rollback();
                throw (0, error_1.createError)({
                    statusCode: 400,
                    message: "Message cannot be empty"
                });
            }
            const messageId = `msg-${Date.now()}-${user.id}`;
            const messageTimestamp = new Date().toISOString();
            let existingMessages = dispute.messages;
            if (!Array.isArray(existingMessages)) {
                existingMessages = [];
            }
            existingMessages.push({
                id: messageId,
                sender: user.id,
                senderName: `${user.firstName} ${user.lastName}`,
                content: sanitizedMessage,
                createdAt: messageTimestamp,
                isAdmin: true,
            });
            dispute.messages = existingMessages;
            if (trade) {
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
                    id: messageId,
                    event: "MESSAGE",
                    message: sanitizedMessage,
                    senderId: user.id,
                    senderName: `${user.firstName} ${user.lastName}`,
                    isAdminMessage: true,
                    createdAt: messageTimestamp,
                });
                await trade.update({ timeline }, { transaction });
                broadcastP2PTradeEvent(trade.id, {
                    type: "MESSAGE",
                    data: {
                        id: messageId,
                        message: sanitizedMessage,
                        senderId: user.id,
                        senderName: `${user.firstName} ${user.lastName}`,
                        isAdminMessage: true,
                        createdAt: messageTimestamp,
                    },
                });
                notifyTradeEvent(trade.id, "ADMIN_MESSAGE", {
                    buyerId: trade.buyerId,
                    sellerId: trade.sellerId,
                    amount: trade.amount,
                    currency: ((_g = trade.offer) === null || _g === void 0 ? void 0 : _g.currency) || trade.currency,
                    message: sanitizedMessage,
                }).catch((err) => console_1.logger.error("P2P_DISPUTE", `Notification error: ${err}`));
            }
        }
        await dispute.save({ transaction });
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Logging activity");
        await db_1.models.p2pActivityLog.create({
            userId: user.id,
            type: "ADMIN_DISPUTE_UPDATE",
            action: "ADMIN_DISPUTE_UPDATE",
            relatedEntity: "DISPUTE",
            relatedEntityId: dispute.id,
            details: JSON.stringify({
                status: dispute.status,
                hasResolution: !!resolution,
                resolution: resolution === null || resolution === void 0 ? void 0 : resolution.outcome,
                hasMessage: !!message,
                tradeUpdated,
                fundsHandled,
                adminId: user.id,
                adminName: `${user.firstName} ${user.lastName}`,
            }),
        }, { transaction });
        await (0, ownership_1.logP2PAdminAction)(user.id, "DISPUTE_UPDATE", "DISPUTE", dispute.id, {
            status: status || dispute.status,
            hasResolution: !!resolution,
            resolution: resolution === null || resolution === void 0 ? void 0 : resolution.outcome,
            hasMessage: !!message,
            tradeUpdated,
            fundsHandled,
            adminName: `${user.firstName} ${user.lastName}`,
        }, undefined, transaction);
        await transaction.commit();
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Broadcasting updates");
        if (tradeUpdated && trade) {
            const finalStatus = (resolution === null || resolution === void 0 ? void 0 : resolution.outcome) === "BUYER_WINS" || (resolution === null || resolution === void 0 ? void 0 : resolution.outcome) === "SPLIT"
                ? "COMPLETED"
                : "CANCELLED";
            broadcastP2PTradeEvent(trade.id, {
                type: "STATUS_CHANGE",
                data: {
                    status: finalStatus,
                    previousStatus: "DISPUTED",
                    disputeResolved: true,
                    resolution: resolution === null || resolution === void 0 ? void 0 : resolution.outcome,
                },
            });
            notifyTradeEvent(trade.id, finalStatus === "COMPLETED" ? "TRADE_COMPLETED" : "TRADE_CANCELLED", {
                buyerId: trade.buyerId,
                sellerId: trade.sellerId,
                amount: trade.amount,
                currency: ((_h = trade.offer) === null || _h === void 0 ? void 0 : _h.currency) || trade.currency,
                disputeResolved: true,
                resolution: resolution === null || resolution === void 0 ? void 0 : resolution.outcome,
            }).catch((err) => console_1.logger.error("P2P_DISPUTE", `Trade notification error: ${err}`));
        }
        const updatedDispute = await db_1.models.p2pDispute.findByPk(id, {
            include: [
                {
                    model: db_1.models.p2pTrade,
                    as: "trade",
                    include: [
                        {
                            model: db_1.models.p2pOffer,
                            as: "offer",
                            attributes: ["id", "type", "currency", "walletType"],
                        },
                        {
                            model: db_1.models.user,
                            as: "buyer",
                            attributes: ["id", "firstName", "lastName", "email", "avatar"],
                        },
                        {
                            model: db_1.models.user,
                            as: "seller",
                            attributes: ["id", "firstName", "lastName", "email", "avatar"],
                        },
                    ],
                },
                {
                    model: db_1.models.user,
                    as: "reportedBy",
                    attributes: ["id", "firstName", "lastName", "email", "avatar"],
                },
                {
                    model: db_1.models.user,
                    as: "against",
                    attributes: ["id", "firstName", "lastName", "email", "avatar"],
                },
            ],
        });
        const plainDispute = (updatedDispute === null || updatedDispute === void 0 ? void 0 : updatedDispute.get({ plain: true })) || dispute.toJSON();
        const messages = Array.isArray(plainDispute.messages) ? plainDispute.messages.map((msg) => ({
            id: msg.id || `${msg.createdAt}-${msg.sender}`,
            sender: msg.senderName || msg.sender || "Unknown",
            senderId: msg.sender,
            content: msg.content || msg.message || "",
            timestamp: msg.createdAt || msg.timestamp,
            isAdmin: msg.isAdmin || false,
            avatar: msg.avatar,
            senderInitials: msg.senderName ? msg.senderName.split(" ").map((n) => n[0]).join("").toUpperCase() : "?",
        })) : [];
        const activityLog = Array.isArray(plainDispute.activityLog) ? plainDispute.activityLog : [];
        const adminNotes = activityLog
            .filter((entry) => entry.type === "note")
            .map((entry) => ({
            content: entry.content || entry.note,
            createdAt: entry.createdAt,
            createdBy: entry.adminName || "Admin",
            adminId: entry.adminId,
        }));
        const evidence = Array.isArray(plainDispute.evidence) ? plainDispute.evidence.map((e) => ({
            ...e,
            submittedBy: e.submittedBy || "admin",
            timestamp: e.createdAt || e.timestamp,
        })) : [];
        ctx === null || ctx === void 0 ? void 0 : ctx.success("Dispute updated successfully");
        return {
            ...plainDispute,
            messages,
            adminNotes,
            evidence,
        };
    }
    catch (err) {
        await transaction.rollback();
        if (err.statusCode) {
            throw err;
        }
        ctx === null || ctx === void 0 ? void 0 : ctx.fail("Failed to update dispute");
        throw (0, error_1.createError)({
            statusCode: 500,
            message: "Internal Server Error: " + err.message,
        });
    }
};
