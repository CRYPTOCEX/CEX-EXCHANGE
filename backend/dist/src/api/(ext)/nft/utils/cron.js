"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.expireOffers = expireOffers;
exports.settleAuctions = settleAuctions;
const db_1 = require("@b/db");
const console_1 = require("@b/utils/console");
const broadcast_1 = require("@b/cron/broadcast");
const sequelize_1 = require("sequelize");
const auction_service_1 = require("./auction-service");
async function expireOffers() {
    var _a, _b;
    const cronName = "expireOffers";
    const startTime = Date.now();
    let processedCount = 0;
    let errorCount = 0;
    try {
        (0, broadcast_1.broadcastStatus)(cronName, "running");
        (0, broadcast_1.broadcastLog)(cronName, "Starting offer expiration job");
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
        });
        if (expiredOffers.length === 0) {
            (0, broadcast_1.broadcastLog)(cronName, "No expired offers found", "info");
            (0, broadcast_1.broadcastStatus)(cronName, "completed", { duration: Date.now() - startTime });
            return;
        }
        (0, broadcast_1.broadcastLog)(cronName, `Found ${expiredOffers.length} expired offers to process`);
        for (const offer of expiredOffers) {
            try {
                await db_1.sequelize.transaction(async (transaction) => {
                    var _a, _b;
                    await offer.update({
                        status: "EXPIRED",
                        expiredAt: new Date(),
                    }, { transaction });
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
                        }),
                    }, { transaction });
                });
                processedCount++;
                (0, broadcast_1.broadcastLog)(cronName, `Expired offer ${offer.id} for ${((_a = offer.token) === null || _a === void 0 ? void 0 : _a.name) || ((_b = offer.collection) === null || _b === void 0 ? void 0 : _b.name)}`, "success");
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
    var _a;
    const cronName = "settleAuctions";
    const startTime = Date.now();
    let processedCount = 0;
    let errorCount = 0;
    let noReserveCount = 0;
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
                            attributes: ["id", "name", "chain"],
                        },
                    ],
                },
                {
                    model: db_1.models.nftBid,
                    as: "bids",
                    attributes: ["id", "amount", "userId", "status", "createdAt"],
                    where: { status: "ACTIVE" },
                    required: false,
                    order: [["amount", "DESC"]],
                    include: [
                        {
                            model: db_1.models.user,
                            as: "user",
                            attributes: ["id", "firstName", "lastName"],
                        },
                    ],
                },
            ],
        });
        if (endedAuctions.length === 0) {
            (0, broadcast_1.broadcastLog)(cronName, "No ended auctions found", "info");
            (0, broadcast_1.broadcastStatus)(cronName, "completed", { duration: Date.now() - startTime });
            return;
        }
        (0, broadcast_1.broadcastLog)(cronName, `Found ${endedAuctions.length} ended auctions to process`);
        for (const auction of endedAuctions) {
            try {
                const winningBid = auction.bids && auction.bids.length > 0 ? auction.bids[0] : null;
                if (auction.reservePrice && (!winningBid || winningBid.amount < auction.reservePrice)) {
                    (0, broadcast_1.broadcastLog)(cronName, `Auction ${auction.id} reserve price not met (${(winningBid === null || winningBid === void 0 ? void 0 : winningBid.amount) || 0} < ${auction.reservePrice})`, "warning");
                    await db_1.sequelize.transaction(async (transaction) => {
                        await auction.update({
                            status: "EXPIRED",
                            endedAt: new Date(),
                        }, { transaction });
                        await db_1.models.nftToken.update({ isListed: false }, {
                            where: { id: auction.tokenId },
                            transaction,
                        });
                        if (auction.bids && auction.bids.length > 0) {
                            const bidIds = auction.bids.map((bid) => bid.id);
                            await db_1.models.nftBid.update({
                                status: "REJECTED",
                                rejectedAt: new Date(),
                            }, {
                                where: { id: bidIds },
                                transaction,
                            });
                        }
                        await db_1.models.nftActivity.create({
                            tokenId: auction.tokenId,
                            listingId: auction.id,
                            type: "AUCTION_ENDED",
                            fromUserId: undefined,
                            toUserId: auction.token.ownerId,
                            price: (winningBid === null || winningBid === void 0 ? void 0 : winningBid.amount) || 0,
                            currency: auction.currency,
                            transactionHash: undefined,
                            metadata: JSON.stringify({
                                tokenName: auction.token.name,
                                reservePriceNotMet: true,
                                reservePrice: auction.reservePrice,
                                highestBid: (winningBid === null || winningBid === void 0 ? void 0 : winningBid.amount) || 0,
                                endedAt: new Date().toISOString(),
                                endedBy: "system_cron",
                            }),
                        }, { transaction });
                    });
                    noReserveCount++;
                    continue;
                }
                if (!winningBid) {
                    (0, broadcast_1.broadcastLog)(cronName, `Auction ${auction.id} ended with no bids`, "info");
                    await db_1.sequelize.transaction(async (transaction) => {
                        await auction.update({
                            status: "EXPIRED",
                            endedAt: new Date(),
                        }, { transaction });
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
                    processedCount++;
                    continue;
                }
                let blockchainResult = null;
                if (auction_service_1.getNFTAuctionService && auction.auctionContractAddress && ((_a = auction.token.collection) === null || _a === void 0 ? void 0 : _a.chain)) {
                    try {
                        const auctionService = await (0, auction_service_1.getNFTAuctionService)(auction.token.collection.chain);
                        if (auctionService) {
                            blockchainResult = await auctionService.settleAuction(auction.auctionContractAddress);
                            if (blockchainResult) {
                                (0, broadcast_1.broadcastLog)(cronName, `Settled auction ${auction.id} on blockchain: ${blockchainResult.transactionHash}`, "success");
                            }
                        }
                    }
                    catch (error) {
                        console_1.logger.error("NFT_AUCTION", `Blockchain settlement failed for auction ${auction.id}`, error);
                        (0, broadcast_1.broadcastLog)(cronName, `Blockchain settlement failed for auction ${auction.id}, continuing with database settlement`, "warning");
                    }
                }
                await db_1.sequelize.transaction(async (transaction) => {
                    var _a, _b, _c, _d;
                    await auction.update({
                        status: "SOLD",
                        soldAt: new Date(),
                        endedAt: new Date(),
                    }, { transaction });
                    await winningBid.update({
                        status: "ACCEPTED",
                        acceptedAt: new Date(),
                    }, { transaction });
                    if (auction.bids && auction.bids.length > 1) {
                        const losingBidIds = auction.bids
                            .filter((bid) => bid.id !== winningBid.id)
                            .map((bid) => bid.id);
                        if (losingBidIds.length > 0) {
                            await db_1.models.nftBid.update({
                                status: "REJECTED",
                                rejectedAt: new Date(),
                            }, {
                                where: { id: losingBidIds },
                                transaction,
                            });
                        }
                    }
                    await db_1.models.nftToken.update({
                        ownerId: winningBid.userId,
                        isListed: false,
                    }, {
                        where: { id: auction.tokenId },
                        transaction,
                    });
                    await db_1.models.nftActivity.create({
                        tokenId: auction.tokenId,
                        listingId: auction.id,
                        bidId: winningBid.id,
                        type: "SALE",
                        fromUserId: auction.token.ownerId,
                        toUserId: winningBid.userId,
                        price: winningBid.amount,
                        currency: auction.currency,
                        transactionHash: (_a = blockchainResult === null || blockchainResult === void 0 ? void 0 : blockchainResult.transactionHash) !== null && _a !== void 0 ? _a : undefined,
                        metadata: JSON.stringify({
                            saleType: "auction",
                            tokenName: auction.token.name,
                            winningBid: winningBid.amount,
                            totalBids: ((_b = auction.bids) === null || _b === void 0 ? void 0 : _b.length) || 1,
                            auctionEndTime: auction.endTime,
                            settledAt: new Date().toISOString(),
                            settledBy: "system_cron",
                            ...(blockchainResult && {
                                onChain: true,
                                blockNumber: blockchainResult.blockNumber,
                                gasUsed: blockchainResult.gasUsed,
                            }),
                        }),
                    }, { transaction });
                    await db_1.models.nftActivity.create({
                        tokenId: auction.tokenId,
                        listingId: auction.id,
                        bidId: winningBid.id,
                        type: "TRANSFER",
                        fromUserId: auction.token.ownerId,
                        toUserId: winningBid.userId,
                        price: winningBid.amount,
                        currency: auction.currency,
                        transactionHash: (_c = blockchainResult === null || blockchainResult === void 0 ? void 0 : blockchainResult.transactionHash) !== null && _c !== void 0 ? _c : undefined,
                        metadata: JSON.stringify({
                            transferType: "auction_settlement",
                            tokenName: auction.token.name,
                            settledAt: new Date().toISOString(),
                            settledBy: "system_cron",
                        }),
                    }, { transaction });
                    await db_1.models.nftPriceHistory.create({
                        tokenId: auction.tokenId,
                        collectionId: ((_d = auction.token) === null || _d === void 0 ? void 0 : _d.collectionId) || null,
                        price: winningBid.amount,
                        currency: auction.currency,
                        saleType: "AUCTION",
                        buyerId: winningBid.userId,
                        sellerId: auction.sellerId,
                    }, { transaction });
                });
                processedCount++;
                (0, broadcast_1.broadcastLog)(cronName, `Settled auction ${auction.id}: Winner ${winningBid.user.firstName} ${winningBid.user.lastName} - ${winningBid.amount} ${auction.currency}`, "success");
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
        });
        (0, broadcast_1.broadcastLog)(cronName, `Auction settlement job completed: ${processedCount} processed, ${noReserveCount} no reserve, ${errorCount} errors`, "success");
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
exports.default = { expireOffers, settleAuctions };
