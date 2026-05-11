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
exports.p2pJobs = void 0;
exports.handleP2PTradeTimeouts = handleP2PTradeTimeouts;
exports.archiveOldP2PTrades = archiveOldP2PTrades;
exports.updateP2PReputationScores = updateP2PReputationScores;
const db_1 = require("@b/db");
const sequelize_1 = require("sequelize");
const utils_1 = require("@b/api/finance/wallet/utils");
const notifications_1 = require("@b/api/(ext)/p2p/utils/notifications");
const json_parser_1 = require("@b/api/(ext)/p2p/utils/json-parser");
const console_1 = require("@b/utils/console");
const wallet_1 = require("@b/services/wallet");
const index_ws_1 = require("@b/api/(ext)/p2p/trade/[id]/index.ws");
async function handleP2PTradeTimeouts(ctx) {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m;
    try {
        (_a = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _a === void 0 ? void 0 : _a.call(ctx, "Starting P2P trade timeout handler");
        const { CacheManager } = await Promise.resolve().then(() => __importStar(require("@b/utils/cache")));
        const cacheManager = CacheManager.getInstance();
        const defaultPaymentWindowMinutes = await cacheManager.getSetting("p2pDefaultPaymentWindow") || 30;
        const potentiallyExpiredCutoff = new Date();
        potentiallyExpiredCutoff.setMinutes(potentiallyExpiredCutoff.getMinutes() - 5);
        const potentiallyExpiredTrades = await db_1.models.p2pTrade.findAll({
            where: {
                status: "PENDING",
                createdAt: {
                    [sequelize_1.Op.lt]: potentiallyExpiredCutoff,
                },
            },
            include: [
                {
                    model: db_1.models.p2pOffer,
                    as: "offer",
                    attributes: ["id", "currency", "walletType", "userId", "type", "tradeSettings"],
                },
            ],
        });
        const expiredTrades = potentiallyExpiredTrades.filter((trade) => {
            var _a;
            const tradeOffer = trade.offer;
            const offerTimeout = ((_a = tradeOffer === null || tradeOffer === void 0 ? void 0 : tradeOffer.tradeSettings) === null || _a === void 0 ? void 0 : _a.autoCancel) || defaultPaymentWindowMinutes;
            const tradeAge = new Date().getTime() - new Date(trade.createdAt).getTime();
            const isExpired = tradeAge > (offerTimeout * 60 * 1000);
            return isExpired;
        });
        if (expiredTrades.length > 0) {
            (_b = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _b === void 0 ? void 0 : _b.call(ctx, `Processing ${expiredTrades.length} expired trades`);
            console_1.logger.info("P2P", `Processing ${expiredTrades.length} expired trades`);
        }
        for (const trade of expiredTrades) {
            (_c = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _c === void 0 ? void 0 : _c.call(ctx, `Processing expired trade ${trade.id}`);
            const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
            if (!uuidRegex.test(trade.id)) {
                console_1.logger.warn("P2P", `Invalid trade ID detected: ${trade.id}, deleting invalid trade`);
                try {
                    await db_1.models.p2pTrade.destroy({ where: { id: trade.id }, force: true });
                    console_1.logger.info("P2P", `Deleted invalid trade ${trade.id}`);
                }
                catch (deleteError) {
                    console_1.logger.error("P2P", `Failed to delete invalid trade ${trade.id}`, deleteError);
                }
                continue;
            }
            const transaction = await db_1.sequelize.transaction();
            try {
                const lockedTrade = await db_1.models.p2pTrade.findByPk(trade.id, {
                    lock: true,
                    transaction,
                });
                const tradeOffer = trade.offer;
                const offerTimeout = ((_d = tradeOffer === null || tradeOffer === void 0 ? void 0 : tradeOffer.tradeSettings) === null || _d === void 0 ? void 0 : _d.autoCancel) || defaultPaymentWindowMinutes;
                const tradeAge = new Date().getTime() - new Date(lockedTrade.createdAt).getTime();
                const isStillExpired = tradeAge > (offerTimeout * 60 * 1000);
                if (!lockedTrade ||
                    lockedTrade.status !== "PENDING" ||
                    !isStillExpired) {
                    await transaction.rollback();
                    continue;
                }
                if (lockedTrade.status === "PENDING" && trade.offer) {
                    const isBuyOffer = (tradeOffer === null || tradeOffer === void 0 ? void 0 : tradeOffer.type) === "BUY";
                    if (isBuyOffer) {
                        try {
                            const sellerWallet = await (0, utils_1.getWalletSafe)(lockedTrade.sellerId, trade.offer.walletType, trade.offer.currency || lockedTrade.currency);
                            if (sellerWallet) {
                                const safeUnlockAmount = Math.min(trade.amount, (_e = sellerWallet.inOrder) !== null && _e !== void 0 ? _e : 0);
                                if (safeUnlockAmount > 0) {
                                    const idempotencyKey = `p2p_timeout_release_${trade.id}`;
                                    await wallet_1.walletService.release({
                                        idempotencyKey,
                                        userId: lockedTrade.sellerId,
                                        walletId: sellerWallet.id,
                                        walletType: trade.offer.walletType,
                                        currency: trade.offer.currency || lockedTrade.currency,
                                        amount: safeUnlockAmount,
                                        operationType: "P2P_TRADE_EXPIRED",
                                        description: `Release ${safeUnlockAmount} ${trade.offer.currency || lockedTrade.currency} - P2P BUY offer trade expired`,
                                        metadata: {
                                            tradeId: trade.id,
                                            offerId: trade.offerId,
                                            expiredAt: new Date().toISOString(),
                                            reason: 'timeout',
                                        },
                                        transaction,
                                    });
                                    console_1.logger.info("P2P", `Released ${safeUnlockAmount} ${trade.offer.currency || lockedTrade.currency} (${trade.offer.walletType}) for seller ${lockedTrade.sellerId} (BUY offer)`);
                                    console_1.logger.debug("P2P", `Trade unlock details: amount=${trade.amount}, prevInOrder=${sellerWallet.inOrder}`);
                                    if (safeUnlockAmount < trade.amount) {
                                        console_1.logger.warn("P2P", `Partial unlock - inOrder was less than trade amount: tradeId=${trade.id}, amount=${trade.amount}, available=${sellerWallet.inOrder}, unlocked=${safeUnlockAmount}`);
                                    }
                                }
                                else {
                                    console_1.logger.warn("P2P", `No funds to unlock - inOrder is already 0: tradeId=${trade.id}, amount=${trade.amount}, currentInOrder=${sellerWallet.inOrder}`);
                                }
                            }
                        }
                        catch (walletError) {
                            console_1.logger.error("P2P", `Failed to release wallet funds for trade ${trade.id}`, walletError);
                            await transaction.rollback();
                            continue;
                        }
                    }
                    else {
                        console_1.logger.info("P2P", `SELL offer - funds remain locked for offer ${trade.offerId} (trade ${trade.id} expired)`);
                    }
                }
                let timeline = lockedTrade.timeline || [];
                if (typeof timeline === "string") {
                    try {
                        timeline = JSON.parse(timeline);
                    }
                    catch (_o) {
                        timeline = [];
                    }
                }
                if (!Array.isArray(timeline)) {
                    timeline = [];
                }
                timeline.push({
                    event: "TRADE_EXPIRED",
                    message: "Trade expired due to timeout",
                    userId: null,
                    createdAt: new Date().toISOString(),
                });
                await lockedTrade.update({
                    status: "EXPIRED",
                    timeline,
                    expiredAt: new Date(),
                }, { transaction });
                if (trade.offerId) {
                    const offer = await db_1.models.p2pOffer.findByPk(trade.offerId, {
                        lock: true,
                        transaction,
                    });
                    if (offer && ["ACTIVE", "PAUSED"].includes(offer.status)) {
                        const amountConfig = (0, json_parser_1.parseAmountConfig)(offer.amountConfig);
                        const originalTotal = (_f = amountConfig.originalTotal) !== null && _f !== void 0 ? _f : (amountConfig.total + trade.amount);
                        const proposedTotal = amountConfig.total + trade.amount;
                        const safeTotal = Math.min(proposedTotal, originalTotal);
                        if (safeTotal > amountConfig.total) {
                            await offer.update({
                                amountConfig: {
                                    ...amountConfig,
                                    total: safeTotal,
                                    originalTotal,
                                },
                            }, { transaction });
                            console_1.logger.debug("P2P", `Restored offer amount: offerId=${offer.id}, tradeAmount=${trade.amount}, prevTotal=${amountConfig.total}, newTotal=${safeTotal}`);
                        }
                        else {
                            console_1.logger.debug("P2P", `Skipped restoration - at or above limit: offerId=${offer.id}, currentTotal=${amountConfig.total}, max=${originalTotal}`);
                        }
                    }
                }
                try {
                    await db_1.models.p2pActivityLog.create({
                        userId: trade.sellerId,
                        type: "TRADE_EXPIRED",
                        action: "EXPIRED",
                        relatedEntity: "TRADE",
                        relatedEntityId: trade.id,
                        details: JSON.stringify({
                            previousStatus: lockedTrade.status,
                            amount: trade.amount,
                            currency: (_g = trade.offer) === null || _g === void 0 ? void 0 : _g.currency,
                            buyerId: trade.buyerId,
                            sellerId: trade.sellerId,
                            systemGenerated: true,
                        }),
                    }, { transaction });
                    await db_1.models.p2pActivityLog.create({
                        userId: trade.buyerId,
                        type: "TRADE_EXPIRED",
                        action: "EXPIRED",
                        relatedEntity: "TRADE",
                        relatedEntityId: trade.id,
                        details: JSON.stringify({
                            previousStatus: lockedTrade.status,
                            amount: trade.amount,
                            currency: (_h = trade.offer) === null || _h === void 0 ? void 0 : _h.currency,
                            buyerId: trade.buyerId,
                            sellerId: trade.sellerId,
                            systemGenerated: true,
                        }),
                    }, { transaction });
                }
                catch (activityLogError) {
                    console_1.logger.warn("P2P", `Failed to create activity log for trade ${trade.id}, continuing with expiration`, activityLogError);
                }
                await transaction.commit();
                (0, index_ws_1.broadcastP2PTradeEvent)(trade.id, {
                    type: "STATUS_CHANGE",
                    data: {
                        status: "EXPIRED",
                        timeline,
                        expiredAt: new Date().toISOString(),
                    },
                });
                (0, notifications_1.notifyTradeEvent)(trade.id, "TRADE_EXPIRED", {
                    buyerId: trade.buyerId,
                    sellerId: trade.sellerId,
                    amount: trade.amount,
                    currency: tradeOffer === null || tradeOffer === void 0 ? void 0 : tradeOffer.currency,
                }, ctx).catch((err) => console_1.logger.error("P2P", "Failed to notify trade event", err));
                (_j = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _j === void 0 ? void 0 : _j.call(ctx, `Successfully expired trade ${trade.id}`);
                console_1.logger.info("P2P", `Successfully expired trade ${trade.id}`);
            }
            catch (error) {
                await transaction.rollback();
                console_1.logger.error("P2P", `Failed to expire trade ${trade.id}`, error);
            }
        }
        const stalePaymentSentTrades = await db_1.models.p2pTrade.findAll({
            where: {
                status: "PAYMENT_SENT",
                updatedAt: {
                    [sequelize_1.Op.lt]: new Date(Date.now() - 24 * 60 * 60 * 1000),
                },
            },
            include: [{
                    model: db_1.models.p2pOffer,
                    as: "offer",
                    attributes: ["currency", "walletType", "type", "id"],
                }],
        });
        for (const trade of stalePaymentSentTrades) {
            try {
                const tradeTransaction = await db_1.sequelize.transaction();
                try {
                    const lockedTrade = await db_1.models.p2pTrade.findByPk(trade.id, { lock: true, transaction: tradeTransaction });
                    if (!lockedTrade || lockedTrade.status !== "PAYMENT_SENT") {
                        await tradeTransaction.rollback();
                        continue;
                    }
                    await db_1.models.p2pDispute.create({
                        tradeId: trade.id,
                        amount: (trade.amount || 0).toString(),
                        reportedById: trade.buyerId,
                        againstId: trade.sellerId,
                        reason: "Auto-dispute: Payment sent but seller did not release funds within 24 hours",
                        details: "This dispute was automatically created because the seller did not release funds within the allowed timeframe after payment was confirmed.",
                        filedOn: new Date(),
                        status: "PENDING",
                        priority: "HIGH",
                    }, { transaction: tradeTransaction });
                    await lockedTrade.update({ status: "DISPUTED" }, { transaction: tradeTransaction });
                    await tradeTransaction.commit();
                    (0, index_ws_1.broadcastP2PTradeEvent)(trade.id, {
                        type: "DISPUTE",
                        data: {
                            status: "DISPUTED",
                            reason: "Auto-dispute: Seller did not release funds within 24 hours",
                        },
                    });
                    (0, notifications_1.notifyTradeEvent)(trade.id, "TRADE_DISPUTED", {
                        buyerId: trade.buyerId,
                        sellerId: trade.sellerId,
                        amount: trade.amount,
                        currency: (_k = trade.offer) === null || _k === void 0 ? void 0 : _k.currency,
                    }).catch((err) => console_1.logger.error("P2P_TIMEOUT", "Failed to notify auto-dispute", err));
                    console_1.logger.info("P2P_TIMEOUT", `Auto-disputed stale PAYMENT_SENT trade ${trade.id}`);
                }
                catch (innerErr) {
                    await tradeTransaction.rollback();
                    console_1.logger.error("P2P_TIMEOUT", `Failed to auto-dispute trade ${trade.id}`, innerErr);
                }
            }
            catch (err) {
                console_1.logger.error("P2P_TIMEOUT", `Failed to process stale trade ${trade.id}`, err);
            }
        }
        await handleExpiredOffers(ctx);
        (_l = ctx === null || ctx === void 0 ? void 0 : ctx.success) === null || _l === void 0 ? void 0 : _l.call(ctx, "P2P trade timeout handler completed successfully");
    }
    catch (error) {
        (_m = ctx === null || ctx === void 0 ? void 0 : ctx.fail) === null || _m === void 0 ? void 0 : _m.call(ctx, error.message || "Trade timeout handler error");
        console_1.logger.error("P2P", "Trade timeout handler error", error);
    }
}
async function handleExpiredOffers(ctx) {
    var _a, _b, _c, _d, _e, _f;
    try {
        (_a = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _a === void 0 ? void 0 : _a.call(ctx, "Checking for expired offers");
        const OFFER_EXPIRY_DAYS = 30;
        const expiryDate = new Date();
        expiryDate.setDate(expiryDate.getDate() - OFFER_EXPIRY_DAYS);
        const allExpiredOffers = await db_1.models.p2pOffer.findAll({
            where: {
                status: "ACTIVE",
                updatedAt: {
                    [sequelize_1.Op.lt]: expiryDate,
                },
            },
        });
        const expiredOffers = allExpiredOffers.filter(offer => {
            const config = (0, json_parser_1.parseAmountConfig)(offer.amountConfig);
            return !config.total || config.total <= 0;
        });
        if (expiredOffers.length > 0) {
            (_b = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _b === void 0 ? void 0 : _b.call(ctx, `Processing ${expiredOffers.length} expired offers`);
            console_1.logger.info("P2P", `Processing ${expiredOffers.length} expired offers`);
        }
        for (const offer of expiredOffers) {
            (_c = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _c === void 0 ? void 0 : _c.call(ctx, `Processing expired offer ${offer.id}`);
            try {
                await offer.update({
                    status: "EXPIRED",
                    adminNotes: `Auto-expired due to inactivity and zero balance at ${new Date().toISOString()}`,
                });
                await db_1.models.p2pActivityLog.create({
                    userId: offer.userId,
                    type: "OFFER_EXPIRED",
                    action: "EXPIRED",
                    relatedEntity: "OFFER",
                    relatedEntityId: offer.id,
                    details: JSON.stringify({
                        reason: "inactivity_and_zero_balance",
                        lastUpdated: offer.updatedAt,
                        systemGenerated: true,
                    }),
                });
                const { notifyOfferEvent } = await Promise.resolve().then(() => __importStar(require("@b/api/(ext)/p2p/utils/notifications")));
                notifyOfferEvent(offer.id, "OFFER_EXPIRED", {
                    reason: "Inactivity and zero balance",
                }, ctx).catch((err) => console_1.logger.error("P2P", "Failed to notify offer event", err));
                (_d = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _d === void 0 ? void 0 : _d.call(ctx, `Expired offer ${offer.id}`);
                console_1.logger.info("P2P", `Expired offer ${offer.id}`);
            }
            catch (error) {
                console_1.logger.error("P2P", `Failed to expire offer ${offer.id}`, error);
            }
        }
        (_e = ctx === null || ctx === void 0 ? void 0 : ctx.success) === null || _e === void 0 ? void 0 : _e.call(ctx, "Expired offers handled successfully");
    }
    catch (error) {
        (_f = ctx === null || ctx === void 0 ? void 0 : ctx.fail) === null || _f === void 0 ? void 0 : _f.call(ctx, error.message || "Offer expiry handler error");
        console_1.logger.error("P2P", "Offer expiry handler error", error);
    }
}
async function archiveOldP2PTrades() {
    try {
        const ARCHIVE_DAYS = 90;
        const archiveDate = new Date();
        archiveDate.setDate(archiveDate.getDate() - ARCHIVE_DAYS);
        const tradesToArchive = await db_1.models.p2pTrade.findAll({
            where: {
                status: {
                    [sequelize_1.Op.in]: ["COMPLETED", "CANCELLED", "EXPIRED"],
                },
                updatedAt: {
                    [sequelize_1.Op.lt]: archiveDate,
                },
            },
            limit: 100,
        });
        if (tradesToArchive.length > 0) {
            console_1.logger.info("P2P", `Archiving ${tradesToArchive.length} trades`);
        }
        for (const trade of tradesToArchive) {
            try {
                await trade.update({
                    archived: true,
                    archivedAt: new Date(),
                });
            }
            catch (error) {
                console_1.logger.error("P2P", `Failed to archive trade ${trade.id}`, error);
            }
        }
    }
    catch (error) {
        console_1.logger.error("P2P", "Trade archival error", error);
    }
}
async function updateP2PReputationScores() {
    try {
        const activeUsers = await db_1.models.p2pTrade.findAll({
            attributes: [
                [(0, sequelize_1.fn)("DISTINCT", (0, sequelize_1.col)("buyerId")), "userId"],
            ],
            where: {
                createdAt: {
                    [sequelize_1.Op.gte]: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
                },
            },
            raw: true,
        });
        const sellerIds = await db_1.models.p2pTrade.findAll({
            attributes: [
                [(0, sequelize_1.fn)("DISTINCT", (0, sequelize_1.col)("sellerId")), "userId"],
            ],
            where: {
                createdAt: {
                    [sequelize_1.Op.gte]: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
                },
            },
            raw: true,
        });
        const allUserIds = [
            ...new Set([
                ...activeUsers.map((u) => u.userId),
                ...sellerIds.map((s) => s.userId),
            ]),
        ];
        if (allUserIds.length > 0) {
            console_1.logger.info("P2P", `Updating reputation for ${allUserIds.length} users`);
        }
        for (const userId of allUserIds) {
            try {
                const completedTrades = await db_1.models.p2pTrade.count({
                    where: {
                        [sequelize_1.Op.or]: [{ buyerId: userId }, { sellerId: userId }],
                        status: "COMPLETED",
                    },
                });
                const totalTrades = await db_1.models.p2pTrade.count({
                    where: {
                        [sequelize_1.Op.or]: [{ buyerId: userId }, { sellerId: userId }],
                        status: {
                            [sequelize_1.Op.ne]: "PENDING",
                        },
                    },
                });
                const disputedTrades = await db_1.models.p2pDispute.count({
                    where: {
                        againstId: userId,
                        status: "RESOLVED",
                    },
                });
                const avgRatingResult = await db_1.models.p2pReview.findOne({
                    attributes: [
                        [(0, sequelize_1.fn)("AVG", (0, sequelize_1.col)("rating")), "avgRating"],
                    ],
                    where: {
                        revieweeId: userId,
                    },
                    raw: true,
                });
                let reputationScore = 50;
                const completionRate = totalTrades > 0 ? completedTrades / totalTrades : 0;
                const avgRating = avgRatingResult ? avgRatingResult.avgRating : null;
                if (totalTrades > 0) {
                    reputationScore += completionRate * 30;
                }
                if (avgRating) {
                    reputationScore += (avgRating / 5) * 20;
                }
                reputationScore -= Math.min(disputedTrades * 5, 20);
                reputationScore = Math.max(0, Math.min(100, Math.round(reputationScore)));
                await db_1.models.p2pActivityLog.create({
                    userId,
                    type: "REPUTATION_UPDATE",
                    action: "REPUTATION_SCORE_CALCULATED",
                    details: JSON.stringify({
                        reputationScore,
                        completedTrades,
                        totalTrades,
                        avgRating,
                        disputedTrades,
                        completionRate: completionRate.toFixed(2),
                        lastUpdated: new Date().toISOString(),
                    }),
                }).catch(err => console_1.logger.error("P2P", `Failed to persist reputation for user ${userId}`, err));
                if (completedTrades >= 100 || completedTrades >= 50 || completedTrades >= 10) {
                    const { notifyReputationEvent } = await Promise.resolve().then(() => __importStar(require("@b/api/(ext)/p2p/utils/notifications")));
                    notifyReputationEvent(userId, "REPUTATION_MILESTONE", {
                        milestone: completedTrades,
                        reputationScore,
                    }).catch((err) => console_1.logger.error("P2P", "Failed to notify reputation event", err));
                }
            }
            catch (error) {
                console_1.logger.error("P2P", `Failed to update reputation for user ${userId}`, error);
            }
        }
    }
    catch (error) {
        console_1.logger.error("P2P", "Reputation update error", error);
    }
}
exports.p2pJobs = {
    handleTradeTimeouts: {
        name: "p2p-trade-timeout",
        schedule: "* * * * *",
        handler: handleP2PTradeTimeouts,
    },
    archiveTrades: {
        name: "p2p-archive-trades",
        schedule: "0 2 * * *",
        handler: archiveOldP2PTrades,
    },
    updateReputation: {
        name: "p2p-update-reputation",
        schedule: "0 * * * *",
        handler: updateP2PReputationScores,
    },
};
