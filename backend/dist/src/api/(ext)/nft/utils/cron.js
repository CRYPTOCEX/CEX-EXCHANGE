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
exports.processNFTBackups = void 0;
exports.expireOffers = expireOffers;
exports.settleAuctions = settleAuctions;
const db_1 = require("@b/db");
const console_1 = require("@b/utils/console");
const broadcast_1 = require("@b/cron/broadcast");
const sequelize_1 = require("sequelize");
const wallet_1 = require("@b/services/wallet");
const auction_service_1 = require("./auction-service");
const settlement_1 = require("./settlement");
const cache_1 = require("@b/utils/cache");
var backup_1 = require("./backup");
Object.defineProperty(exports, "processNFTBackups", { enumerable: true, get: function () { return backup_1.processNFTBackups; } });
const OFFER_EXPIRY_BATCH = 500;
const AUCTION_SETTLE_BATCH = 100;
async function expireOffers() {
    var _a, _b, _c;
    const cronName = "expireOffers";
    const startTime = Date.now();
    let processedCount = 0;
    let errorCount = 0;
    try {
        (0, broadcast_1.broadcastStatus)(cronName, "running");
        (0, broadcast_1.broadcastLog)(cronName, "Starting offer expiration job");
        try {
            const { unwindStaleAcceptedOffers } = await Promise.resolve().then(() => __importStar(require("./stale-settlement")));
            const stale = await unwindStaleAcceptedOffers((message, level) => { var _a; return (0, broadcast_1.broadcastLog)(cronName, message, (_a = level) !== null && _a !== void 0 ? _a : "info"); });
            if (stale.reversed || stale.flagged) {
                (0, broadcast_1.broadcastLog)(cronName, `Unconfirmed sales: ${stale.reversed} reversed, ${stale.flagged} need manual resolution`, stale.flagged ? "warning" : "success");
            }
        }
        catch (staleError) {
            console_1.logger.error("NFT_OFFER", "Unconfirmed-sale sweep failed", staleError);
            (0, broadcast_1.broadcastLog)(cronName, `Unconfirmed-sale sweep failed: ${staleError === null || staleError === void 0 ? void 0 : staleError.message}`, "error");
        }
        const expiredOffers = await db_1.models.nftOffer.findAll({
            where: {
                status: "ACTIVE",
                expiresAt: {
                    [sequelize_1.Op.lte]: new Date(),
                },
            },
            include: [
                {
                    model: db_1.models.nftToken,
                    as: "token",
                    attributes: ["id", "name"],
                    required: false,
                },
                {
                    model: db_1.models.nftCollection,
                    as: "collection",
                    attributes: ["id", "name"],
                    required: false,
                },
            ],
            order: [["expiresAt", "ASC"]],
            limit: OFFER_EXPIRY_BATCH,
        });
        if (expiredOffers.length === 0) {
            (0, broadcast_1.broadcastLog)(cronName, "No expired offers found", "info");
            (0, broadcast_1.broadcastStatus)(cronName, "completed", { duration: Date.now() - startTime });
            return;
        }
        (0, broadcast_1.broadcastLog)(cronName, `Found ${expiredOffers.length} expired offers to process`);
        for (const offer of expiredOffers) {
            try {
                const holdRecord = await db_1.models.transaction.findOne({
                    where: { idempotencyKey: `nft_offer_hold_${offer.id}` },
                    attributes: ["id", "amount"],
                });
                const escrowAmount = holdRecord
                    ? parseFloat(((_a = holdRecord.amount) === null || _a === void 0 ? void 0 : _a.toString()) || "0")
                    : 0;
                let claimedOffer = true;
                await db_1.sequelize.transaction(async (transaction) => {
                    var _a, _b;
                    const [claimed] = await db_1.models.nftOffer.update({
                        status: "EXPIRED",
                        expiredAt: new Date(),
                    }, {
                        where: { id: offer.id, status: "ACTIVE" },
                        transaction,
                    });
                    if (claimed === 0) {
                        claimedOffer = false;
                        return;
                    }
                    if (escrowAmount > 0) {
                        try {
                            await wallet_1.walletService.release({
                                idempotencyKey: `nft_offer_release_${offer.id}`,
                                userId: offer.userId,
                                walletType: "SPOT",
                                currency: offer.currency,
                                amount: escrowAmount,
                                operationType: "NFT_OFFER",
                                description: `Release escrow ${escrowAmount} ${offer.currency} - NFT offer expired`,
                                metadata: {
                                    offerId: offer.id,
                                    reason: "expired_cron",
                                },
                                transaction,
                            });
                        }
                        catch (releaseError) {
                            if ((releaseError === null || releaseError === void 0 ? void 0 : releaseError.name) === "DuplicateOperationError") {
                            }
                            else if ((releaseError === null || releaseError === void 0 ? void 0 : releaseError.name) === "InsufficientHeldFundsError") {
                                console_1.logger.error("NFT_OFFER", `Escrow release for expired offer ${offer.id} failed: held funds insufficient for recorded escrow ${escrowAmount} ${offer.currency}. Manual review required.`);
                            }
                            else {
                                throw releaseError;
                            }
                        }
                    }
                    else {
                        console_1.logger.warn("NFT_OFFER", `No escrow hold record found for expired offer ${offer.id} (likely legacy); nothing to release`);
                    }
                    await db_1.models.nftActivity.create({
                        tokenId: offer.tokenId,
                        collectionId: offer.collectionId,
                        offerId: offer.id,
                        type: "OFFER",
                        fromUserId: offer.userId,
                        toUserId: undefined,
                        price: offer.amount,
                        currency: offer.currency,
                        transactionHash: undefined,
                        metadata: JSON.stringify({
                            offerType: offer.type,
                            targetName: ((_a = offer.token) === null || _a === void 0 ? void 0 : _a.name) || ((_b = offer.collection) === null || _b === void 0 ? void 0 : _b.name),
                            originalExpiresAt: offer.expiresAt,
                            expiredAt: new Date().toISOString(),
                            expiredBy: "system_cron",
                            escrowAmount,
                        }),
                    }, { transaction });
                });
                if (!claimedOffer) {
                    (0, broadcast_1.broadcastLog)(cronName, `Offer ${offer.id} status changed concurrently (accepted/cancelled); skipping expiry`, "info");
                    continue;
                }
                processedCount++;
                (0, broadcast_1.broadcastLog)(cronName, `Expired offer ${offer.id} for ${((_b = offer.token) === null || _b === void 0 ? void 0 : _b.name) || ((_c = offer.collection) === null || _c === void 0 ? void 0 : _c.name)}`, "success");
            }
            catch (error) {
                errorCount++;
                console_1.logger.error("NFT_OFFER", `Error expiring offer ${offer.id}`, error);
                (0, broadcast_1.broadcastLog)(cronName, `Error expiring offer ${offer.id}: ${error.message}`, "error");
            }
        }
        const duration = Date.now() - startTime;
        (0, broadcast_1.broadcastStatus)(cronName, "completed", {
            duration,
            processed: processedCount,
            errors: errorCount,
        });
        (0, broadcast_1.broadcastLog)(cronName, `Offer expiration job completed: ${processedCount} processed, ${errorCount} errors`, "success");
    }
    catch (error) {
        console_1.logger.error("NFT_OFFER", "Offer expiration job failed", error);
        (0, broadcast_1.broadcastStatus)(cronName, "failed", {
            duration: Date.now() - startTime,
            processed: processedCount,
            errors: errorCount + 1,
        });
        (0, broadcast_1.broadcastLog)(cronName, `Offer expiration job failed: ${error.message}`, "error");
        throw error;
    }
}
async function settleAuctions() {
    var _a, _b, _c, _d, _e;
    var _f, _g, _h;
    const cronName = "settleAuctions";
    const startTime = Date.now();
    let processedCount = 0;
    let errorCount = 0;
    let noReserveCount = 0;
    let reviewCount = 0;
    try {
        (0, broadcast_1.broadcastStatus)(cronName, "running");
        (0, broadcast_1.broadcastLog)(cronName, "Starting auction settlement job");
        const endedAuctions = await db_1.models.nftListing.findAll({
            where: {
                type: "AUCTION",
                status: "ACTIVE",
                endTime: {
                    [sequelize_1.Op.lte]: new Date(),
                },
                settlementBlockedAt: null,
            },
            include: [
                {
                    model: db_1.models.nftToken,
                    as: "token",
                    attributes: ["id", "name", "image", "ownerId", "collectionId"],
                    required: true,
                    include: [
                        {
                            model: db_1.models.nftCollection,
                            as: "collection",
                            attributes: ["id", "name", "chain", "royaltyPercentage"],
                        },
                    ],
                },
            ],
            order: [["endTime", "ASC"]],
            limit: AUCTION_SETTLE_BATCH,
        });
        if (endedAuctions.length === 0) {
            (0, broadcast_1.broadcastLog)(cronName, "No ended auctions found", "info");
            (0, broadcast_1.broadcastStatus)(cronName, "completed", { duration: Date.now() - startTime });
            return;
        }
        (0, broadcast_1.broadcastLog)(cronName, `Found ${endedAuctions.length} ended auctions to process`);
        for (const auction of endedAuctions) {
            try {
                const winningBid = await db_1.models.nftBid.findOne({
                    where: { listingId: auction.id, status: "ACTIVE" },
                    order: [
                        ["amount", "DESC"],
                        ["createdAt", "ASC"],
                    ],
                    include: [
                        {
                            model: db_1.models.user,
                            as: "user",
                            attributes: ["id", "firstName", "lastName"],
                        },
                    ],
                });
                const activeBidCount = await db_1.models.nftBid.count({
                    where: { listingId: auction.id, status: "ACTIVE" },
                });
                const winningAmount = winningBid
                    ? parseFloat(((_a = winningBid.amount) === null || _a === void 0 ? void 0 : _a.toString()) || "0")
                    : 0;
                const reservePrice = auction.reservePrice
                    ? parseFloat(auction.reservePrice.toString())
                    : 0;
                if (reservePrice > 0 && (!winningBid || winningAmount < reservePrice)) {
                    (0, broadcast_1.broadcastLog)(cronName, `Auction ${auction.id} reserve price not met (${winningAmount} < ${reservePrice})`, "warning");
                    let claimedExpired = true;
                    await db_1.sequelize.transaction(async (transaction) => {
                        const [claimed] = await db_1.models.nftListing.update({
                            status: "EXPIRED",
                            endedAt: new Date(),
                        }, {
                            where: { id: auction.id, status: "ACTIVE" },
                            transaction,
                        });
                        if (claimed === 0) {
                            claimedExpired = false;
                            return;
                        }
                        await db_1.models.nftToken.update({ isListed: false }, {
                            where: { id: auction.tokenId },
                            transaction,
                        });
                        await db_1.models.nftBid.update({
                            status: "REJECTED",
                            rejectedAt: new Date(),
                        }, {
                            where: { listingId: auction.id, status: "ACTIVE" },
                            transaction,
                        });
                        await db_1.models.nftActivity.create({
                            tokenId: auction.tokenId,
                            listingId: auction.id,
                            type: "AUCTION_ENDED",
                            fromUserId: undefined,
                            toUserId: auction.token.ownerId,
                            price: winningAmount,
                            currency: auction.currency,
                            transactionHash: undefined,
                            metadata: JSON.stringify({
                                tokenName: auction.token.name,
                                reservePriceNotMet: true,
                                reservePrice,
                                highestBid: winningAmount,
                                endedAt: new Date().toISOString(),
                                endedBy: "system_cron",
                            }),
                        }, { transaction });
                    });
                    if (!claimedExpired) {
                        (0, broadcast_1.broadcastLog)(cronName, `Auction ${auction.id} status changed concurrently; skipping expiry`, "info");
                        continue;
                    }
                    noReserveCount++;
                    continue;
                }
                if (!winningBid) {
                    (0, broadcast_1.broadcastLog)(cronName, `Auction ${auction.id} ended with no bids`, "info");
                    let claimedNoBids = true;
                    await db_1.sequelize.transaction(async (transaction) => {
                        const [claimed] = await db_1.models.nftListing.update({
                            status: "EXPIRED",
                            endedAt: new Date(),
                        }, {
                            where: { id: auction.id, status: "ACTIVE" },
                            transaction,
                        });
                        if (claimed === 0) {
                            claimedNoBids = false;
                            return;
                        }
                        await db_1.models.nftToken.update({ isListed: false }, {
                            where: { id: auction.tokenId },
                            transaction,
                        });
                        await db_1.models.nftActivity.create({
                            tokenId: auction.tokenId,
                            listingId: auction.id,
                            type: "AUCTION_ENDED",
                            fromUserId: undefined,
                            toUserId: auction.token.ownerId,
                            price: 0,
                            currency: auction.currency,
                            transactionHash: undefined,
                            metadata: JSON.stringify({
                                tokenName: auction.token.name,
                                noBids: true,
                                endedAt: new Date().toISOString(),
                                endedBy: "system_cron",
                            }),
                        }, { transaction });
                    });
                    if (!claimedNoBids) {
                        (0, broadcast_1.broadcastLog)(cronName, `Auction ${auction.id} status changed concurrently; skipping`, "info");
                        continue;
                    }
                    processedCount++;
                    continue;
                }
                if (!auction.auctionContractAddress || !((_b = auction.token.collection) === null || _b === void 0 ? void 0 : _b.chain)) {
                    reviewCount++;
                    await db_1.models.nftListing.update({ settlementBlockedAt: new Date() }, { where: { id: auction.id, status: "ACTIVE" } });
                    console_1.logger.warn("NFT_AUCTION", `Auction ${auction.id} ended with a winning bid (${winningAmount} ${auction.currency}) but has no on-chain auction contract; no funds are escrowed anywhere, so it cannot be auto-settled. Leaving ACTIVE for manual review.`);
                    (0, broadcast_1.broadcastLog)(cronName, `Auction ${auction.id} flagged for manual review: winning bid ${winningAmount} ${auction.currency} but no auction contract holds the funds`, "warning");
                    continue;
                }
                const [claimedRows] = await db_1.models.nftListing.update({ status: "SOLD", soldAt: new Date(), endedAt: new Date() }, { where: { id: auction.id, status: "ACTIVE" } });
                if (claimedRows === 0) {
                    (0, broadcast_1.broadcastLog)(cronName, `Auction ${auction.id} was settled or cancelled concurrently; skipping`, "info");
                    continue;
                }
                let blockchainResult = null;
                try {
                    const auctionService = await (0, auction_service_1.getNFTAuctionService)(auction.token.collection.chain);
                    if (!auctionService) {
                        throw new Error(`Auction service unavailable for chain ${auction.token.collection.chain}`);
                    }
                    blockchainResult = await auctionService.settleAuction(auction.auctionContractAddress);
                    if (!(blockchainResult === null || blockchainResult === void 0 ? void 0 : blockchainResult.success)) {
                        throw new Error("Auction settlement on blockchain failed");
                    }
                    (0, broadcast_1.broadcastLog)(cronName, `Settled auction ${auction.id} on blockchain: ${blockchainResult.transactionHash}`, "success");
                }
                catch (error) {
                    console_1.logger.error("NFT_AUCTION", `Blockchain settlement failed for auction ${auction.id}; reverting claim for retry`, error);
                    (0, broadcast_1.broadcastLog)(cronName, `Blockchain settlement failed for auction ${auction.id}: ${error.message}; will retry next run`, "error");
                    try {
                        await db_1.models.nftListing.update({ status: "ACTIVE", soldAt: null, endedAt: null }, { where: { id: auction.id, status: "SOLD" } });
                    }
                    catch (revertError) {
                        console_1.logger.error("NFT_AUCTION", `Failed to revert settlement claim for auction ${auction.id}`, revertError);
                    }
                    errorCount++;
                    continue;
                }
                const auctionSettings = await cache_1.CacheManager.getInstance().getSettings();
                const feePercent = (0, settlement_1.marketplaceFeePercent)(auctionSettings);
                const maxRoyaltyPercent = parseFloat((_f = auctionSettings.get("nftMaxRoyaltyPercentage")) !== null && _f !== void 0 ? _f : "10");
                const royaltyPercentage = Math.min(Number((_c = auction.token.collection) === null || _c === void 0 ? void 0 : _c.royaltyPercentage) || 0, Number.isFinite(maxRoyaltyPercent) ? maxRoyaltyPercent : 10);
                const marketplaceFee = winningAmount * (feePercent / 100);
                const royaltyFee = winningAmount * (royaltyPercentage / 100);
                const totalFee = marketplaceFee + royaltyFee;
                const netAmount = winningAmount - totalFee;
                let dbSettled = false;
                let lastDbError = null;
                for (let attempt = 1; attempt <= 3 && !dbSettled; attempt++) {
                    try {
                        await db_1.sequelize.transaction(async (transaction) => {
                            var _a, _b, _c;
                            var _d;
                            const sale = await db_1.models.nftSale.create({
                                listingId: auction.id,
                                tokenId: auction.tokenId,
                                sellerId: auction.sellerId,
                                buyerId: winningBid.userId,
                                price: winningAmount,
                                currency: auction.currency,
                                marketplaceFee,
                                royaltyFee,
                                totalFee,
                                netAmount,
                                transactionHash: blockchainResult.transactionHash,
                                blockNumber: (_d = blockchainResult.blockNumber) !== null && _d !== void 0 ? _d : 0,
                                status: "COMPLETED",
                                metadata: {
                                    saleType: "AUCTION",
                                    settledBy: "system_cron",
                                    gasUsed: blockchainResult.gasUsed,
                                    auctionContract: auction.auctionContractAddress,
                                },
                            }, { transaction });
                            await winningBid.update({
                                status: "ACCEPTED",
                                acceptedAt: new Date(),
                            }, { transaction });
                            await db_1.models.nftBid.update({
                                status: "REJECTED",
                                rejectedAt: new Date(),
                            }, {
                                where: {
                                    listingId: auction.id,
                                    status: "ACTIVE",
                                    id: { [sequelize_1.Op.ne]: winningBid.id },
                                },
                                transaction,
                            });
                            await db_1.models.nftToken.update({
                                ownerId: winningBid.userId,
                                isListed: false,
                            }, {
                                where: { id: auction.tokenId },
                                transaction,
                            });
                            try {
                                const sellerWallet = await db_1.models.wallet.findOne({
                                    where: {
                                        userId: auction.sellerId,
                                        currency: auction.currency,
                                        type: "SPOT",
                                    },
                                    transaction,
                                });
                                if (sellerWallet) {
                                    await db_1.models.transaction.create({
                                        userId: auction.sellerId,
                                        walletId: sellerWallet.id,
                                        type: "NFT_AUCTION_SETTLE",
                                        status: "COMPLETED",
                                        amount: netAmount,
                                        fee: totalFee,
                                        description: `Received payment for NFT auction settlement`,
                                        idempotencyKey: `nft_auction_settle_seller_${auction.id}`,
                                        trxId: blockchainResult.transactionHash,
                                        metadata: JSON.stringify({
                                            saleId: sale.id,
                                            listingId: auction.id,
                                            tokenId: auction.tokenId,
                                            buyerId: winningBid.userId,
                                            auctionContract: auction.auctionContractAddress,
                                            settlementHash: blockchainResult.transactionHash,
                                            chain: (_a = auction.token.collection) === null || _a === void 0 ? void 0 : _a.chain,
                                            settledBy: "system_cron",
                                        }),
                                    }, { transaction });
                                }
                            }
                            catch (recordError) {
                                console_1.logger.warn("NFT_AUCTION", `Failed to create seller transaction record for auction ${auction.id}: ${recordError.message}`);
                            }
                            try {
                                const buyerWallet = await db_1.models.wallet.findOne({
                                    where: {
                                        userId: winningBid.userId,
                                        currency: auction.currency,
                                        type: "SPOT",
                                    },
                                    transaction,
                                });
                                if (buyerWallet) {
                                    await db_1.models.transaction.create({
                                        userId: winningBid.userId,
                                        walletId: buyerWallet.id,
                                        type: "NFT_TRANSFER",
                                        status: "COMPLETED",
                                        amount: winningAmount,
                                        fee: 0,
                                        description: `Received NFT from won auction`,
                                        idempotencyKey: `nft_auction_settle_buyer_${auction.id}`,
                                        trxId: blockchainResult.transactionHash,
                                        metadata: JSON.stringify({
                                            saleId: sale.id,
                                            listingId: auction.id,
                                            tokenId: auction.tokenId,
                                            transferType: "AUCTION_WIN",
                                            auctionContract: auction.auctionContractAddress,
                                            settlementHash: blockchainResult.transactionHash,
                                            chain: (_b = auction.token.collection) === null || _b === void 0 ? void 0 : _b.chain,
                                            settledBy: "system_cron",
                                        }),
                                    }, { transaction });
                                }
                            }
                            catch (recordError) {
                                console_1.logger.warn("NFT_AUCTION", `Failed to create buyer transaction record for auction ${auction.id}: ${recordError.message}`);
                            }
                            await db_1.models.nftActivity.create({
                                tokenId: auction.tokenId,
                                listingId: auction.id,
                                bidId: winningBid.id,
                                type: "SALE",
                                fromUserId: auction.token.ownerId,
                                toUserId: winningBid.userId,
                                price: winningAmount,
                                currency: auction.currency,
                                transactionHash: blockchainResult.transactionHash,
                                metadata: JSON.stringify({
                                    saleId: sale.id,
                                    saleType: "auction",
                                    tokenName: auction.token.name,
                                    winningBid: winningAmount,
                                    totalBids: activeBidCount,
                                    auctionEndTime: auction.endTime,
                                    settledAt: new Date().toISOString(),
                                    settledBy: "system_cron",
                                    onChain: true,
                                    blockNumber: blockchainResult.blockNumber,
                                    gasUsed: blockchainResult.gasUsed,
                                }),
                            }, { transaction });
                            await db_1.models.nftActivity.create({
                                tokenId: auction.tokenId,
                                listingId: auction.id,
                                bidId: winningBid.id,
                                type: "TRANSFER",
                                fromUserId: auction.token.ownerId,
                                toUserId: winningBid.userId,
                                price: winningAmount,
                                currency: auction.currency,
                                transactionHash: blockchainResult.transactionHash,
                                metadata: JSON.stringify({
                                    transferType: "auction_settlement",
                                    tokenName: auction.token.name,
                                    settledAt: new Date().toISOString(),
                                    settledBy: "system_cron",
                                }),
                            }, { transaction });
                            await db_1.models.nftPriceHistory.create({
                                tokenId: auction.tokenId,
                                collectionId: ((_c = auction.token) === null || _c === void 0 ? void 0 : _c.collectionId) || null,
                                price: winningAmount,
                                currency: auction.currency,
                                saleType: "AUCTION",
                                buyerId: winningBid.userId,
                                sellerId: auction.sellerId,
                            }, { transaction });
                        });
                        dbSettled = true;
                    }
                    catch (dbError) {
                        lastDbError = dbError;
                        console_1.logger.error("NFT_AUCTION", `DB settlement attempt ${attempt} failed for auction ${auction.id} (on-chain tx ${blockchainResult.transactionHash}); retrying`, dbError);
                    }
                }
                if (!dbSettled) {
                    errorCount++;
                    console_1.logger.error("NFT_AUCTION", `CRITICAL: auction ${auction.id} settled ON-CHAIN (tx ${blockchainResult.transactionHash}) but DB settlement failed after retries — listing left SOLD, ownership/ledger NOT updated. Manual reconciliation required.`, lastDbError);
                    (0, broadcast_1.broadcastLog)(cronName, `Auction ${auction.id} settled on-chain but DB update failed after retries — manual reconciliation required`, "error");
                    continue;
                }
                processedCount++;
                (0, broadcast_1.broadcastLog)(cronName, `Settled auction ${auction.id}: Winner ${(_g = (_d = winningBid.user) === null || _d === void 0 ? void 0 : _d.firstName) !== null && _g !== void 0 ? _g : ""} ${(_h = (_e = winningBid.user) === null || _e === void 0 ? void 0 : _e.lastName) !== null && _h !== void 0 ? _h : ""} - ${winningAmount} ${auction.currency}`, "success");
            }
            catch (error) {
                errorCount++;
                console_1.logger.error("NFT_AUCTION", `Error settling auction ${auction.id}`, error);
                (0, broadcast_1.broadcastLog)(cronName, `Error settling auction ${auction.id}: ${error.message}`, "error");
            }
        }
        const duration = Date.now() - startTime;
        (0, broadcast_1.broadcastStatus)(cronName, "completed", {
            duration,
            processed: processedCount,
            errors: errorCount,
            noReserve: noReserveCount,
            manualReview: reviewCount,
        });
        (0, broadcast_1.broadcastLog)(cronName, `Auction settlement job completed: ${processedCount} processed, ${noReserveCount} no reserve, ${reviewCount} flagged for manual review, ${errorCount} errors`, "success");
    }
    catch (error) {
        console_1.logger.error("NFT_AUCTION", "Auction settlement job failed", error);
        (0, broadcast_1.broadcastStatus)(cronName, "failed", {
            duration: Date.now() - startTime,
            processed: processedCount,
            errors: errorCount + 1,
            noReserve: noReserveCount,
        });
        (0, broadcast_1.broadcastLog)(cronName, `Auction settlement job failed: ${error.message}`, "error");
        throw error;
    }
}
const backup_2 = require("./backup");
exports.default = { expireOffers, settleAuctions, processNFTBackups: backup_2.processNFTBackups };
