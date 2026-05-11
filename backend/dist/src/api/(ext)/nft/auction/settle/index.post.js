"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const console_1 = require("@b/utils/console");
const nft_auth_1 = require("@b/api/(ext)/nft/utils/nft-auth");
const auction_service_1 = require("@b/api/(ext)/nft/utils/auction-service");
exports.metadata = {
    summary: "Settle NFT auction",
    operationId: "settleAuction",
    tags: ["NFT", "Auction"],
    logModule: "NFT",
    logTitle: "Settle auction",
    requestBody: {
        required: true,
        content: {
            "application/json": {
                schema: {
                    type: "object",
                    properties: {
                        listingId: { type: "string", format: "uuid", description: "Auction listing ID" },
                        transactionHash: { type: "string", description: "Optional blockchain transaction hash" },
                    },
                    required: ["listingId"],
                },
            },
        },
    },
    responses: {
        200: { description: "Auction settled successfully" },
        400: { description: "Bad Request" },
        401: { description: "Unauthorized" },
        404: { description: "Auction not found" },
        409: { description: "Auction cannot be settled" },
        500: { description: "Internal Server Error" },
    },
    requiresAuth: true,
};
exports.default = async (data) => {
    var _a, _b, _c, _d, _e;
    const { user, body, ctx } = data;
    if (!(user === null || user === void 0 ? void 0 : user.id)) {
        throw (0, error_1.createError)({ statusCode: 401, message: "Unauthorized" });
    }
    const { listingId, transactionHash } = body;
    if (!listingId) {
        throw (0, error_1.createError)({
            statusCode: 400,
            message: "Listing ID is required",
        });
    }
    try {
        const sanitizedListingId = (0, nft_auth_1.sanitizeAuthInput)(listingId);
        ctx === null || ctx === void 0 ? void 0 : ctx.step(`Retrieving auction listing ${sanitizedListingId}`);
        const listing = await db_1.models.nftListing.findOne({
            where: {
                id: sanitizedListingId,
                type: "AUCTION",
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
        if (!listing) {
            throw (0, error_1.createError)({
                statusCode: 404,
                message: "Auction not found",
            });
        }
        if (!listing.token) {
            throw (0, error_1.createError)({
                statusCode: 500,
                message: "Token data not found for this listing",
            });
        }
        if (listing.token.ownerId !== user.id && ((_a = user.role) === null || _a === void 0 ? void 0 : _a.name) !== "Super Admin") {
            throw (0, error_1.createError)({
                statusCode: 403,
                message: "Only the seller can settle the auction",
            });
        }
        if (listing.status === "SOLD") {
            throw (0, error_1.createError)({
                statusCode: 409,
                message: "Auction is already settled",
            });
        }
        if (listing.status === "CANCELLED") {
            throw (0, error_1.createError)({
                statusCode: 409,
                message: "Auction is cancelled and cannot be settled",
            });
        }
        if (listing.endTime && new Date(listing.endTime) > new Date()) {
            throw (0, error_1.createError)({
                statusCode: 409,
                message: "Auction has not ended yet",
            });
        }
        const winningBid = listing.bids && listing.bids.length > 0 ? listing.bids[0] : null;
        if (listing.reservePrice && (!winningBid || winningBid.amount < listing.reservePrice)) {
            await db_1.sequelize.transaction(async (transaction) => {
                await listing.update({
                    status: "EXPIRED",
                    endedAt: new Date(),
                }, { transaction });
                await db_1.models.nftToken.update({ isListed: false }, {
                    where: { id: listing.tokenId },
                    transaction,
                });
                if (listing.bids && listing.bids.length > 0) {
                    const bidIds = listing.bids.map(bid => bid.id);
                    await db_1.models.nftBid.update({
                        status: "REJECTED",
                        rejectedAt: new Date(),
                    }, {
                        where: { id: bidIds },
                        transaction,
                    });
                }
                await db_1.models.nftActivity.create({
                    tokenId: listing.tokenId,
                    listingId: listing.id,
                    type: "AUCTION_ENDED",
                    fromUserId: undefined,
                    toUserId: listing.token.ownerId,
                    price: (winningBid === null || winningBid === void 0 ? void 0 : winningBid.amount) || 0,
                    currency: listing.currency,
                    transactionHash: undefined,
                    metadata: JSON.stringify({
                        tokenName: listing.token.name,
                        reservePriceNotMet: true,
                        reservePrice: listing.reservePrice,
                        highestBid: (winningBid === null || winningBid === void 0 ? void 0 : winningBid.amount) || 0,
                        endedAt: new Date().toISOString(),
                    }),
                }, { transaction });
            });
            return {
                message: "Auction ended without meeting reserve price",
                data: {
                    listingId: listing.id,
                    tokenId: listing.tokenId,
                    status: "EXPIRED",
                    reservePrice: listing.reservePrice,
                    highestBid: (winningBid === null || winningBid === void 0 ? void 0 : winningBid.amount) || 0,
                    reservePriceMet: false,
                },
            };
        }
        if (!winningBid) {
            await db_1.sequelize.transaction(async (transaction) => {
                await listing.update({
                    status: "EXPIRED",
                    endedAt: new Date(),
                }, { transaction });
                await db_1.models.nftToken.update({ isListed: false }, {
                    where: { id: listing.tokenId },
                    transaction,
                });
                await db_1.models.nftActivity.create({
                    tokenId: listing.tokenId,
                    listingId: listing.id,
                    type: "AUCTION_ENDED",
                    fromUserId: undefined,
                    toUserId: listing.token.ownerId,
                    price: 0,
                    currency: listing.currency,
                    transactionHash: undefined,
                    metadata: JSON.stringify({
                        tokenName: listing.token.name,
                        noBids: true,
                        endedAt: new Date().toISOString(),
                    }),
                }, { transaction });
            });
            return {
                message: "Auction ended with no bids",
                data: {
                    listingId: listing.id,
                    tokenId: listing.tokenId,
                    status: "EXPIRED",
                    hasBids: false,
                },
            };
        }
        let blockchainResult = null;
        if (listing.auctionContractAddress && ((_b = listing.token.collection) === null || _b === void 0 ? void 0 : _b.chain)) {
            try {
                ctx === null || ctx === void 0 ? void 0 : ctx.step("Settling auction on blockchain");
                const auctionService = await (0, auction_service_1.getNFTAuctionService)(listing.token.collection.chain);
                blockchainResult = await auctionService.settleAuction(listing.auctionContractAddress);
            }
            catch (error) {
                ctx === null || ctx === void 0 ? void 0 : ctx.warn(`Blockchain settlement failed: ${error.message}`);
                console_1.logger.error("AUCTION_SETTLE_BLOCKCHAIN", "Blockchain settlement failed", error);
            }
        }
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Recording settlement in database");
        await db_1.sequelize.transaction(async (transaction) => {
            var _a, _b, _c, _d, _e;
            await listing.update({
                status: "SOLD",
                soldAt: new Date(),
                endedAt: new Date(),
            }, { transaction });
            await winningBid.update({
                status: "ACCEPTED",
                acceptedAt: new Date(),
            }, { transaction });
            if (listing.bids && listing.bids.length > 1) {
                const losingBidIds = listing.bids
                    .filter(bid => bid.id !== winningBid.id)
                    .map(bid => bid.id);
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
                where: { id: listing.tokenId },
                transaction,
            });
            await db_1.models.nftActivity.create({
                tokenId: listing.tokenId,
                listingId: listing.id,
                bidId: winningBid.id,
                type: "SALE",
                fromUserId: listing.token.ownerId,
                toUserId: winningBid.userId,
                price: winningBid.amount,
                currency: listing.currency,
                transactionHash: (_a = ((blockchainResult === null || blockchainResult === void 0 ? void 0 : blockchainResult.transactionHash) || transactionHash)) !== null && _a !== void 0 ? _a : undefined,
                metadata: JSON.stringify({
                    saleType: "auction",
                    tokenName: listing.token.name,
                    winningBid: winningBid.amount,
                    totalBids: ((_b = listing.bids) === null || _b === void 0 ? void 0 : _b.length) || 1,
                    auctionEndTime: listing.endTime,
                    settledAt: new Date().toISOString(),
                    ...(blockchainResult && {
                        onChain: true,
                        blockNumber: blockchainResult.blockNumber,
                        gasUsed: blockchainResult.gasUsed,
                    }),
                }),
            }, { transaction });
            await db_1.models.nftActivity.create({
                tokenId: listing.tokenId,
                listingId: listing.id,
                bidId: winningBid.id,
                type: "TRANSFER",
                fromUserId: listing.token.ownerId,
                toUserId: winningBid.userId,
                price: winningBid.amount,
                currency: listing.currency,
                transactionHash: (_c = ((blockchainResult === null || blockchainResult === void 0 ? void 0 : blockchainResult.transactionHash) || transactionHash)) !== null && _c !== void 0 ? _c : undefined,
                metadata: JSON.stringify({
                    transferType: "auction_settlement",
                    tokenName: listing.token.name,
                    settledAt: new Date().toISOString(),
                }),
            }, { transaction });
            await db_1.models.nftPriceHistory.create({
                tokenId: listing.tokenId,
                collectionId: (_e = (_d = listing.token) === null || _d === void 0 ? void 0 : _d.collectionId) !== null && _e !== void 0 ? _e : undefined,
                price: winningBid.amount,
                currency: listing.currency,
                saleType: "AUCTION",
                buyerId: winningBid.userId,
                sellerId: listing.sellerId,
            }, { transaction });
        });
        const winnerFirstName = ((_c = winningBid.user) === null || _c === void 0 ? void 0 : _c.firstName) || 'Unknown';
        const winnerLastName = ((_d = winningBid.user) === null || _d === void 0 ? void 0 : _d.lastName) || '';
        ctx === null || ctx === void 0 ? void 0 : ctx.success(`Auction settled successfully for ${sanitizedListingId}: Winner ${winnerFirstName} ${winnerLastName}, Final bid ${winningBid.amount}`);
        return {
            message: "Auction settled successfully",
            data: {
                listingId: listing.id,
                tokenId: listing.tokenId,
                status: "SOLD",
                winnerId: winningBid.userId,
                winnerName: `${winnerFirstName} ${winnerLastName}`,
                finalBid: winningBid.amount,
                currency: listing.currency,
                totalBids: ((_e = listing.bids) === null || _e === void 0 ? void 0 : _e.length) || 1,
                settledAt: new Date().toISOString(),
                ...(blockchainResult && {
                    blockchain: {
                        transactionHash: blockchainResult.transactionHash,
                        blockNumber: blockchainResult.blockNumber,
                        gasUsed: blockchainResult.gasUsed,
                        settled: blockchainResult.settled,
                    },
                }),
            },
        };
    }
    catch (error) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail(`Failed to settle auction: ${error.message}`);
        console_1.logger.error("NFT_AUCTION_SETTLEMENT", "Failed to settle auction", error);
        if (error.statusCode) {
            throw error;
        }
        if (error.name === 'SequelizeForeignKeyConstraintError') {
            throw (0, error_1.createError)({
                statusCode: 400,
                message: "Referenced auction no longer exists",
            });
        }
        throw (0, error_1.createError)({
            statusCode: 500,
            message: "An unexpected error occurred while settling the auction. Please try again.",
        });
    }
};
