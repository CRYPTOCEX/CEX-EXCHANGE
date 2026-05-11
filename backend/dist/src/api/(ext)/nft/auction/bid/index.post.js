"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const console_1 = require("@b/utils/console");
const nft_auth_1 = require("@b/api/(ext)/nft/utils/nft-auth");
const auction_service_1 = require("@b/api/(ext)/nft/utils/auction-service");
exports.metadata = {
    summary: "Place bid on NFT auction",
    operationId: "placeAuctionBid",
    tags: ["NFT", "Auction"],
    logModule: "NFT",
    logTitle: "Place Auction Bid",
    requestBody: {
        required: true,
        content: {
            "application/json": {
                schema: {
                    type: "object",
                    properties: {
                        listingId: { type: "string", format: "uuid", description: "Auction listing ID" },
                        bidAmount: { type: "number", minimum: 0, description: "Bid amount in native currency" },
                        transactionHash: { type: "string", description: "Blockchain transaction hash" },
                    },
                    required: ["listingId", "bidAmount"],
                },
            },
        },
    },
    responses: {
        200: { description: "Bid placed successfully" },
        400: { description: "Bad Request" },
        401: { description: "Unauthorized" },
        403: { description: "Cannot bid on own auction" },
        404: { description: "Auction not found" },
        409: { description: "Auction ended or bid too low" },
        500: { description: "Internal Server Error" },
    },
    requiresAuth: true,
};
exports.default = async (data) => {
    var _a, _b;
    const { user, body, ctx } = data;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Validate user authorization");
    if (!(user === null || user === void 0 ? void 0 : user.id)) {
        throw (0, error_1.createError)({ statusCode: 401, message: "Unauthorized" });
    }
    const { listingId, bidAmount, transactionHash } = body;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Extract and validate bid parameters");
    if (!listingId || !bidAmount) {
        throw (0, error_1.createError)({
            statusCode: 400,
            message: "Listing ID and bid amount are required",
        });
    }
    if (bidAmount <= 0) {
        throw (0, error_1.createError)({
            statusCode: 400,
            message: "Bid amount must be greater than zero",
        });
    }
    try {
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Sanitize listing ID input");
        const sanitizedListingId = (0, nft_auth_1.sanitizeAuthInput)(listingId);
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Fetch auction listing from database");
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
        if (listing.token.ownerId === user.id) {
            throw (0, error_1.createError)({
                statusCode: 403,
                message: "You cannot bid on your own auction",
            });
        }
        if (listing.status !== "ACTIVE") {
            throw (0, error_1.createError)({
                statusCode: 409,
                message: `Auction is ${listing.status.toLowerCase()} and not accepting bids`,
            });
        }
        if (listing.endTime && new Date(listing.endTime) <= new Date()) {
            throw (0, error_1.createError)({
                statusCode: 409,
                message: "Auction has ended",
            });
        }
        const highestBid = listing.bids && listing.bids.length > 0
            ? listing.bids[0].amount
            : listing.startingBid || listing.price;
        const minBidIncrement = listing.minBidIncrement || 0.01;
        const minimumBid = Number(highestBid) + Number(minBidIncrement);
        if (bidAmount < minimumBid) {
            throw (0, error_1.createError)({
                statusCode: 409,
                message: `Bid must be at least ${minimumBid} ${listing.currency}. Current highest bid is ${highestBid}.`,
            });
        }
        const userActiveBid = (_a = listing.bids) === null || _a === void 0 ? void 0 : _a.find(bid => bid.userId === user.id);
        let blockchainResult = null;
        const tokenCollection = (_b = listing.token) === null || _b === void 0 ? void 0 : _b.collection;
        if (listing.auctionContractAddress && (tokenCollection === null || tokenCollection === void 0 ? void 0 : tokenCollection.chain)) {
            try {
                const auctionService = await (0, auction_service_1.getNFTAuctionService)(tokenCollection.chain);
                const userWallet = await db_1.models.ecosystemCustodialWallet.findOne({
                    where: {
                        masterWalletId: user.id,
                        chain: tokenCollection.chain,
                        status: true,
                    },
                });
                if (!userWallet) {
                    throw (0, error_1.createError)({
                        statusCode: 400,
                        message: "Wallet not found for this chain. Please create a wallet first.",
                    });
                }
                blockchainResult = await auctionService.placeBid(listing.auctionContractAddress, bidAmount.toString(), userWallet.address);
            }
            catch (error) {
                console_1.logger.error("NFT_AUCTION_BID", "Blockchain bid placement failed", error);
                throw (0, error_1.createError)({
                    statusCode: 500,
                    message: `Blockchain error: ${error.message}`,
                });
            }
        }
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Create bid record in database transaction");
        const result = await db_1.sequelize.transaction(async (transaction) => {
            if (userActiveBid) {
                await db_1.models.nftBid.update({
                    status: "OUTBID",
                    outbidAt: new Date(),
                }, {
                    where: { id: userActiveBid.id },
                    transaction,
                });
            }
            if (listing.bids && listing.bids.length > 0) {
                const otherBidIds = listing.bids
                    .filter(bid => bid.userId !== user.id)
                    .map(bid => bid.id);
                if (otherBidIds.length > 0) {
                    await db_1.models.nftBid.update({
                        status: "OUTBID",
                        outbidAt: new Date(),
                    }, {
                        where: { id: otherBidIds },
                        transaction,
                    });
                }
            }
            const currentHighestBid = highestBid || 0;
            const newBid = await db_1.models.nftBid.create({
                listingId: listing.id,
                tokenId: listing.tokenId,
                userId: user.id,
                amount: bidAmount,
                currency: listing.currency,
                status: "ACTIVE",
                transactionHash: (blockchainResult === null || blockchainResult === void 0 ? void 0 : blockchainResult.transactionHash) || transactionHash || undefined,
                metadata: JSON.stringify({
                    previousHighestBid: currentHighestBid,
                    bidIncrement: bidAmount - currentHighestBid,
                    blockchainGasUsed: blockchainResult === null || blockchainResult === void 0 ? void 0 : blockchainResult.gasUsed,
                    ...(blockchainResult && { onChain: true }),
                }),
            }, { transaction });
            await listing.update({
                currentBid: bidAmount,
            }, { transaction });
            const token = listing.token;
            if (!token) {
                throw (0, error_1.createError)({ statusCode: 500, message: "Token not found" });
            }
            await db_1.models.nftActivity.create({
                tokenId: listing.tokenId,
                listingId: listing.id,
                bidId: newBid.id,
                type: "BID",
                fromUserId: user.id,
                toUserId: token.ownerId,
                price: bidAmount,
                currency: listing.currency,
                transactionHash: (blockchainResult === null || blockchainResult === void 0 ? void 0 : blockchainResult.transactionHash) || transactionHash || undefined,
                metadata: JSON.stringify({
                    tokenName: token.name,
                    previousHighestBid: currentHighestBid,
                    auctionEndTime: listing.endTime,
                    ...(blockchainResult && {
                        onChain: true,
                        blockNumber: blockchainResult.blockNumber,
                        gasUsed: blockchainResult.gasUsed,
                    }),
                }),
            }, { transaction });
            if (listing.endTime) {
                const timeRemaining = new Date(listing.endTime).getTime() - new Date().getTime();
                const extensionThreshold = 10 * 60 * 1000;
                const extensionTime = 10 * 60 * 1000;
                if (timeRemaining > 0 && timeRemaining < extensionThreshold) {
                    const newEndTime = new Date(new Date(listing.endTime).getTime() + extensionTime);
                    await listing.update({ endTime: newEndTime }, { transaction });
                    await db_1.models.nftActivity.create({
                        tokenId: listing.tokenId,
                        listingId: listing.id,
                        type: "BID",
                        fromUserId: undefined,
                        toUserId: undefined,
                        price: bidAmount,
                        currency: listing.currency,
                        transactionHash: undefined,
                        metadata: JSON.stringify({
                            action: "AUCTION_EXTENDED",
                            reason: "anti_sniping",
                            previousEndTime: listing.endTime,
                            newEndTime: newEndTime.toISOString(),
                            triggeringBidId: newBid.id,
                        }),
                    }, { transaction });
                }
            }
            return newBid;
        });
        ctx === null || ctx === void 0 ? void 0 : ctx.success("Bid placed successfully");
        return {
            message: "Bid placed successfully",
            data: {
                bidId: result.id,
                listingId: listing.id,
                tokenId: listing.tokenId,
                amount: bidAmount,
                currency: listing.currency,
                status: "ACTIVE",
                isHighestBid: true,
                previousHighestBid: highestBid,
                auctionEndTime: listing.endTime,
                ...(blockchainResult && {
                    blockchain: {
                        transactionHash: blockchainResult.transactionHash,
                        blockNumber: blockchainResult.blockNumber,
                        gasUsed: blockchainResult.gasUsed,
                    },
                }),
            },
        };
    }
    catch (error) {
        console_1.logger.error("NFT_AUCTION_BID", "Failed to place auction bid", error);
        if (error.statusCode) {
            throw error;
        }
        if (error.name === 'SequelizeUniqueConstraintError') {
            throw (0, error_1.createError)({
                statusCode: 409,
                message: "A bid conflict occurred. Please try again.",
            });
        }
        if (error.name === 'SequelizeForeignKeyConstraintError') {
            throw (0, error_1.createError)({
                statusCode: 400,
                message: "Referenced auction no longer exists",
            });
        }
        throw (0, error_1.createError)({
            statusCode: 500,
            message: "An unexpected error occurred while placing the bid. Please try again.",
        });
    }
};
