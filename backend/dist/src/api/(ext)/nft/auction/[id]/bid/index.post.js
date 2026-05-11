"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const cache_1 = require("@b/utils/cache");
const verification_1 = require("../../../utils/verification");
const balance_service_1 = require("../../../utils/balance-service");
const console_1 = require("@b/utils/console");
const sequelize_1 = require("sequelize");
exports.metadata = {
    summary: "Place bid on NFT auction",
    operationId: "placeBidOnAuction",
    tags: ["NFT", "Auction", "Bid"],
    logModule: "NFT",
    logTitle: "Place auction bid",
    parameters: [
        {
            name: "id",
            in: "path",
            required: true,
            description: "Auction/Listing ID",
            schema: { type: "string" }
        }
    ],
    requestBody: {
        required: true,
        content: {
            "application/json": {
                schema: {
                    type: "object",
                    properties: {
                        amount: {
                            type: "number",
                            description: "Bid amount",
                            minimum: 0
                        },
                        transactionHash: {
                            type: "string",
                            description: "Transaction hash for bid verification"
                        }
                    },
                    required: ["amount", "transactionHash"]
                }
            }
        }
    },
    responses: {
        200: {
            description: "Bid placed successfully",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            message: { type: "string" },
                            data: {
                                type: "object",
                                properties: {
                                    bid: { $ref: "#/components/schemas/NftBid" },
                                    auction: { $ref: "#/components/schemas/NftListing" }
                                }
                            }
                        }
                    }
                }
            }
        },
        400: { description: "Bad Request" },
        401: { description: "Unauthorized" },
        403: { description: "Cannot bid on own auction" },
        404: { description: "Auction not found" },
        409: { description: "Auction ended or bid too low" },
        500: { description: "Internal Server Error" }
    },
    requiresAuth: true
};
exports.default = async (data) => {
    var _a, _b, _c, _d, _e, _f, _g, _h;
    const { user, params, body, ctx } = data;
    const { id } = params;
    const { amount, transactionHash } = body;
    if (!(user === null || user === void 0 ? void 0 : user.id)) {
        throw (0, error_1.createError)({ statusCode: 401, message: "Unauthorized" });
    }
    if (!user.walletAddress) {
        throw (0, error_1.createError)({
            statusCode: 400,
            message: "User must have a wallet address set to place bids"
        });
    }
    if (!amount || amount <= 0) {
        throw (0, error_1.createError)({
            statusCode: 400,
            message: "Bid amount must be greater than 0"
        });
    }
    if (!transactionHash) {
        throw (0, error_1.createError)({
            statusCode: 400,
            message: "Transaction hash is required for bid verification"
        });
    }
    try {
        ctx === null || ctx === void 0 ? void 0 : ctx.step(`Retrieving auction ${id}`);
        const auction = await db_1.models.nftListing.findOne({
            where: {
                id,
                type: "AUCTION",
                status: "ACTIVE"
            },
            include: [
                {
                    model: db_1.models.nftToken,
                    as: "token",
                    include: [
                        {
                            model: db_1.models.nftCollection,
                            as: "collection",
                            attributes: ["id", "name", "chain", "contractAddress"]
                        }
                    ]
                },
                {
                    model: db_1.models.user,
                    as: "seller",
                    attributes: ["id", "firstName", "lastName", "walletAddress"]
                },
                {
                    model: db_1.models.nftBid,
                    as: "bids",
                    order: [["amount", "DESC"]],
                    limit: 1,
                    include: [
                        {
                            model: db_1.models.user,
                            as: "bidder",
                            attributes: ["id", "firstName", "lastName"]
                        }
                    ]
                }
            ]
        });
        if (!auction) {
            throw (0, error_1.createError)({
                statusCode: 404,
                message: "Auction not found or not active"
            });
        }
        if (auction.endTime && new Date() > new Date(auction.endTime)) {
            throw (0, error_1.createError)({
                statusCode: 409,
                message: "Auction has ended"
            });
        }
        if (auction.sellerId === user.id) {
            throw (0, error_1.createError)({
                statusCode: 403,
                message: "You cannot bid on your own auction"
            });
        }
        const cacheManager = cache_1.CacheManager.getInstance();
        const settings = await cacheManager.getSettings();
        const minBidIncrement = (_a = settings.get('nftMinBidIncrement')) !== null && _a !== void 0 ? _a : 0.01;
        const antiSnipeEnabled = (_b = settings.get('nftEnableAntiSnipe')) !== null && _b !== void 0 ? _b : true;
        const antiSnipeExtension = (_c = settings.get('nftAntiSnipeExtension')) !== null && _c !== void 0 ? _c : 300;
        const currentHighestBid = auction.bids && auction.bids.length > 0
            ? parseFloat(String(auction.bids[0].amount))
            : parseFloat(String(auction.price));
        const minimumBid = currentHighestBid + minBidIncrement;
        if (amount < minimumBid) {
            throw (0, error_1.createError)({
                statusCode: 400,
                message: `Bid must be at least ${minimumBid} ${auction.currency} (current highest: ${currentHighestBid} + ${minBidIncrement} increment)`
            });
        }
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Validating bid amount and minimum increment");
        if (!auction.token) {
            throw (0, error_1.createError)({
                statusCode: 500,
                message: "Token data not found for this auction"
            });
        }
        if (!auction.seller) {
            throw (0, error_1.createError)({
                statusCode: 500,
                message: "Seller data not found for this auction"
            });
        }
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Checking user balance");
        try {
            const balanceCheck = await (0, balance_service_1.checkUserBalance)(user.walletAddress, ((_d = auction.token.collection) === null || _d === void 0 ? void 0 : _d.chain) || "ETH", "bid", amount.toString(), (_e = auction.token.collection) === null || _e === void 0 ? void 0 : _e.contractAddress);
            if (!balanceCheck.hasBalance) {
                throw (0, error_1.createError)({
                    statusCode: 400,
                    message: `Insufficient balance. You need ${balanceCheck.totalRequired} ${balanceCheck.currency} but only have ${balanceCheck.currentBalance} ${balanceCheck.currency}`
                });
            }
        }
        catch (balanceError) {
            if (balanceError.statusCode) {
                throw balanceError;
            }
            console_1.logger.warn("AUCTION_BID", `Balance check failed for user ${user.id}: ${balanceError.message}`);
            console_1.logger.error("AUCTION_BID_BALANCE_CHECK", "Balance check failed for technical reasons", balanceError);
        }
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Verifying transaction on blockchain");
        try {
            await verification_1.TransactionVerificationService.validateNFTTransaction(transactionHash, ((_f = auction.token.collection) === null || _f === void 0 ? void 0 : _f.chain) || "ETH", "bid", {
                expectedAmount: amount.toString(),
                expectedSender: user.walletAddress,
                expectedRecipient: ((_g = auction.token.collection) === null || _g === void 0 ? void 0 : _g.contractAddress) || auction.seller.walletAddress
            });
        }
        catch (verificationError) {
            throw (0, error_1.createError)({
                statusCode: 400,
                message: `Bid transaction verification failed: ${verificationError.message}`
            });
        }
        const existingBid = await db_1.models.nftBid.findOne({
            where: { transactionHash }
        });
        if (existingBid) {
            throw (0, error_1.createError)({
                statusCode: 409,
                message: "This transaction has already been used for a bid"
            });
        }
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Creating bid record");
        const dbTransaction = await db_1.sequelize.transaction();
        try {
            const bid = await db_1.models.nftBid.create({
                listingId: auction.id,
                userId: user.id,
                amount,
                currency: auction.currency,
                transactionHash,
                status: "ACTIVE"
            }, { transaction: dbTransaction });
            await db_1.models.nftListing.update({
                currentBid: amount
            }, {
                where: { id: auction.id },
                transaction: dbTransaction
            });
            let extendedEndTime = null;
            if (antiSnipeEnabled && auction.endTime) {
                const timeUntilEnd = new Date(auction.endTime).getTime() - new Date().getTime();
                const antiSnipeThreshold = antiSnipeExtension * 1000;
                if (timeUntilEnd > 0 && timeUntilEnd < antiSnipeThreshold) {
                    extendedEndTime = new Date(Date.now() + antiSnipeExtension * 1000);
                    await db_1.models.nftListing.update({
                        endTime: extendedEndTime
                    }, {
                        where: { id: auction.id },
                        transaction: dbTransaction
                    });
                }
            }
            if (auction.bids && auction.bids.length > 0) {
                await db_1.models.nftBid.update({
                    status: "OUTBID"
                }, {
                    where: {
                        listingId: auction.id,
                        id: { [sequelize_1.Op.ne]: bid.id },
                        status: "ACTIVE"
                    },
                    transaction: dbTransaction
                });
            }
            await db_1.models.nftActivity.create({
                tokenId: auction.tokenId,
                listingId: auction.id,
                bidId: bid.id,
                type: "BID",
                fromUserId: undefined,
                toUserId: user.id,
                price: amount,
                currency: auction.currency,
                transactionHash,
                metadata: JSON.stringify({
                    previousHighestBid: currentHighestBid,
                    bidIncrement: amount - currentHighestBid,
                    antiSnipeTriggered: !!extendedEndTime,
                    newEndTime: extendedEndTime === null || extendedEndTime === void 0 ? void 0 : extendedEndTime.toISOString()
                })
            }, { transaction: dbTransaction });
            try {
                const bidderWallet = await db_1.models.wallet.findOne({
                    where: {
                        userId: user.id,
                        currency: auction.currency,
                        type: 'SPOT'
                    },
                    transaction: dbTransaction
                });
                if (bidderWallet) {
                    await db_1.models.transaction.create({
                        userId: user.id,
                        walletId: bidderWallet.id,
                        type: "NFT_AUCTION_BID",
                        status: "COMPLETED",
                        amount: amount,
                        fee: 0,
                        description: `Placed bid of ${amount} ${auction.currency} on NFT auction`,
                        metadata: JSON.stringify({
                            bidId: bid.id,
                            auctionId: auction.id,
                            tokenId: auction.tokenId,
                            chain: ((_h = auction.token.collection) === null || _h === void 0 ? void 0 : _h.chain) || "ETH",
                            transactionHash
                        }),
                        trxId: transactionHash
                    }, { transaction: dbTransaction });
                }
            }
            catch (error) {
                console_1.logger.warn("AUCTION_BID", `Failed to create transaction record: ${error.message}`);
            }
            await dbTransaction.commit();
            ctx === null || ctx === void 0 ? void 0 : ctx.success(`Bid of ${amount} ${auction.currency} placed successfully on auction ${id}`);
            const createdBid = await db_1.models.nftBid.findByPk(bid.id, {
                include: [
                    {
                        model: db_1.models.user,
                        as: "user",
                        attributes: ["id", "firstName", "lastName", "avatar"]
                    },
                    {
                        model: db_1.models.nftListing,
                        as: "listing",
                        attributes: ["id", "endTime", "currentBid"]
                    }
                ]
            });
            return {
                message: "Bid placed successfully",
                data: {
                    bid: createdBid,
                    auction: {
                        id: auction.id,
                        currentBid: amount,
                        endTime: extendedEndTime || auction.endTime,
                        antiSnipeTriggered: !!extendedEndTime
                    }
                }
            };
        }
        catch (error) {
            await dbTransaction.rollback();
            throw error;
        }
    }
    catch (error) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail(`Failed to place bid: ${error.message}`);
        console_1.logger.error("AUCTION_BID_ERROR", "Failed to place bid on auction", error);
        if (error.statusCode) {
            throw error;
        }
        throw (0, error_1.createError)({
            statusCode: 500,
            message: "Failed to place bid on auction"
        });
    }
};
