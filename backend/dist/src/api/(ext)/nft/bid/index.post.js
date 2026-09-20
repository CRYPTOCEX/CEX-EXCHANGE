"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const verification_1 = require("../utils/verification");
const auction_service_1 = require("../utils/auction-service");
const balance_service_1 = require("../utils/balance-service");
const console_1 = require("@b/utils/console");
const ethers_1 = require("ethers");
const cache_1 = require("@b/utils/cache");
const settlement_1 = require("@b/api/(ext)/nft/utils/settlement");
const nft_auth_1 = require("@b/api/(ext)/nft/utils/nft-auth");
const transaction_1 = require("@b/utils/transaction");
const storefront_1 = require("@b/utils/storefront");
exports.metadata = {
    summary: "Place bid on auction",
    operationId: "placeBid",
    tags: ["NFT", "Auction", "Bid"],
    logModule: "NFT",
    logTitle: "Place bid on auction",
    requestBody: {
        required: true,
        content: {
            "application/json": {
                schema: {
                    type: "object",
                    properties: {
                        listingId: { type: "string" },
                        amount: { type: ["number", "string"], minimum: 0 },
                        currency: { type: "string", default: "ETH" },
                        expiresAt: { type: "string" },
                        transactionHash: { type: "string" },
                    },
                    required: ["listingId", "amount", "currency"],
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
        409: { description: "Bid too low or auction ended" },
        500: { description: "Internal Server Error" },
    },
    requiresAuth: true,
};
exports.default = async (data) => {
    var _a, _b, _c, _d;
    var _e;
    (0, storefront_1.assertPurchaseAllowedOnNativeApp)(data, "place bids");
    const { user, body, ctx } = data;
    if (!(user === null || user === void 0 ? void 0 : user.id)) {
        throw (0, error_1.createError)({ statusCode: 401, message: "Unauthorized" });
    }
    const { listingId, amount, currency = "ETH", expiresAt, transactionHash, } = body;
    const bidderWalletAddress = (await (0, nft_auth_1.loadActor)(user.id)).walletAddress;
    if (transactionHash && !bidderWalletAddress) {
        throw (0, error_1.createError)({
            statusCode: 400,
            message: "Connect a wallet address in your profile to place bids with transaction verification"
        });
    }
    if (!listingId || !amount || !currency) {
        throw (0, error_1.createError)({
            statusCode: 400,
            message: "Listing ID, amount, and currency are required",
        });
    }
    if (amount <= 0) {
        throw (0, error_1.createError)({
            statusCode: 400,
            message: "Bid amount must be greater than zero",
        });
    }
    try {
        ctx === null || ctx === void 0 ? void 0 : ctx.step(`Retrieving auction listing ${listingId}`);
        const listing = await db_1.models.nftListing.findOne({
            where: {
                id: listingId,
                type: "AUCTION",
                status: "ACTIVE",
            },
            include: [
                {
                    model: db_1.models.nftToken,
                    as: "token",
                    attributes: ["id", "name", "collectionId"],
                    include: [
                        {
                            model: db_1.models.nftCollection,
                            as: "collection",
                            attributes: ["id", "name", "chain", "contractAddress"],
                        },
                    ],
                },
                {
                    model: db_1.models.user,
                    as: "seller",
                    attributes: ["id", "firstName", "lastName"],
                },
            ],
        });
        if (!listing) {
            throw (0, error_1.createError)({
                statusCode: 404,
                message: "Auction not found or not active",
            });
        }
        if (listing.endTime && new Date() > new Date(listing.endTime)) {
            throw (0, error_1.createError)({
                statusCode: 409,
                message: "Auction has ended",
            });
        }
        if (listing.startTime && new Date() < new Date(listing.startTime)) {
            throw (0, error_1.createError)({
                statusCode: 409,
                message: "Auction has not started yet",
            });
        }
        if (listing.sellerId === user.id) {
            throw (0, error_1.createError)({
                statusCode: 403,
                message: "You cannot bid on your own auction",
            });
        }
        if (listing.currency !== currency) {
            throw (0, error_1.createError)({
                statusCode: 400,
                message: `Bid currency must be ${listing.currency}`,
            });
        }
        const currentHighestBid = await db_1.models.nftBid.findOne({
            where: {
                listingId,
                status: "ACTIVE",
            },
            order: [["amount", "DESC"]],
        });
        const standingBid = currentHighestBid ? Number(currentHighestBid.amount) || 0 : 0;
        const bidIncrement = Number(listing.minBidIncrement) || 0.01;
        const bidAmount = Number(amount);
        const minBidAmount = currentHighestBid
            ? standingBid + bidIncrement
            : Math.max(Number(listing.price) || 0, Number(listing.reservePrice) || 0);
        if (!Number.isFinite(bidAmount) || bidAmount < minBidAmount) {
            throw (0, error_1.createError)({
                statusCode: 409,
                message: `Bid must be at least ${minBidAmount} ${currency}`,
            });
        }
        if (!listing.token) {
            throw (0, error_1.createError)({
                statusCode: 500,
                message: "Token data not found for this listing",
            });
        }
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Checking user balance");
        const bidChain = ((_a = listing.token.collection) === null || _a === void 0 ? void 0 : _a.chain) || "ETH";
        const bidIsNative = (0, balance_service_1.isChainNativeCurrency)(bidChain, listing.currency);
        if (bidderWalletAddress && listing.auctionContractAddress) {
            try {
                const balanceCheck = await (0, balance_service_1.checkUserBalance)(bidderWalletAddress, bidChain, "bid", bidIsNative ? amount.toString() : "0", listing.auctionContractAddress || undefined);
                if (!balanceCheck.hasBalance) {
                    const what = bidIsNative
                        ? `your bid plus network fees`
                        : `the network fee for an on-chain bid (your ${listing.currency} bid is escrowed by the auction contract separately)`;
                    throw (0, error_1.createError)({
                        statusCode: 400,
                        message: `Insufficient ${balanceCheck.currency} on ${bidChain} to cover ${what}. ` +
                            `You need ${balanceCheck.totalRequired} ${balanceCheck.currency} but only have ${balanceCheck.currentBalance} ${balanceCheck.currency}. ` +
                            `Shortfall: ${balanceCheck.shortfall} ${balanceCheck.currency}`,
                    });
                }
                console_1.logger.debug("NFT_BID", `Balance check passed for user ${user.id}: ${balanceCheck.currentBalance} ${balanceCheck.currency} available, ${balanceCheck.totalRequired} ${balanceCheck.currency} required`);
            }
            catch (balanceError) {
                if (balanceError.statusCode) {
                    throw balanceError;
                }
                console_1.logger.warn("NFT_BID", `Balance check failed for user ${user.id}: ${balanceError.message}`);
                console_1.logger.error("NFT_BID_BALANCE_CHECK", "Balance check failed for technical reasons", balanceError);
            }
        }
        let onChainBidResult = null;
        if (listing.auctionContractAddress) {
            ctx === null || ctx === void 0 ? void 0 : ctx.step("Executing bid on blockchain");
            if (!bidderWalletAddress) {
                throw (0, error_1.createError)({
                    statusCode: 400,
                    message: "Connect a wallet address in your profile to bid on an on-chain auction"
                });
            }
            try {
                const auctionService = await (0, auction_service_1.getNFTAuctionService)(((_b = listing.token.collection) === null || _b === void 0 ? void 0 : _b.chain) || "ETH");
                onChainBidResult = await auctionService.placeBid(listing.auctionContractAddress, amount.toString(), bidderWalletAddress);
                if (!onChainBidResult.success) {
                    throw (0, error_1.createError)({ statusCode: 500, message: "On-chain bid execution failed" });
                }
                await auctionService.checkAndExtendAuction(listing.auctionContractAddress);
            }
            catch (blockchainError) {
                throw (0, error_1.createError)({
                    statusCode: 500,
                    message: `On-chain bidding failed: ${blockchainError.message}`
                });
            }
        }
        else if (transactionHash) {
            try {
                await verification_1.TransactionVerificationService.validateNFTTransaction(transactionHash, ((_c = listing.token.collection) === null || _c === void 0 ? void 0 : _c.chain) || "ETH", "bid", {
                    expectedAmount: amount.toString(),
                    expectedSender: bidderWalletAddress,
                });
            }
            catch (verificationError) {
                throw (0, error_1.createError)({
                    statusCode: 400,
                    message: `Bid transaction verification failed: ${verificationError.message}`
                });
            }
        }
        const existingBid = await db_1.models.nftBid.findOne({
            where: {
                listingId,
                userId: user.id,
                status: "ACTIVE",
            },
        });
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Creating bid record");
        const transaction = await db_1.sequelize.transaction();
        try {
            if (existingBid) {
                await db_1.models.nftBid.update({
                    status: "OUTBID",
                }, {
                    where: { id: existingBid.id },
                    transaction,
                });
            }
            if (currentHighestBid && currentHighestBid.userId !== user.id) {
                await db_1.models.nftBid.update({
                    status: "OUTBID",
                }, {
                    where: { id: currentHighestBid.id },
                    transaction,
                });
            }
            const bid = await db_1.models.nftBid.create({
                listingId,
                userId: user.id,
                amount,
                currency,
                expiresAt: expiresAt ? new Date(expiresAt) : undefined,
                transactionHash: (onChainBidResult === null || onChainBidResult === void 0 ? void 0 : onChainBidResult.transactionHash) || transactionHash || undefined,
                status: "ACTIVE",
                metadata: JSON.stringify({
                    blockNumber: onChainBidResult === null || onChainBidResult === void 0 ? void 0 : onChainBidResult.blockNumber,
                    gasUsed: onChainBidResult === null || onChainBidResult === void 0 ? void 0 : onChainBidResult.gasUsed,
                    bidCost: onChainBidResult && onChainBidResult.gasUsed ? ethers_1.ethers.formatEther(BigInt(onChainBidResult.gasUsed) * BigInt("20000000000")) : undefined,
                    isOnChain: !!onChainBidResult,
                }),
            }, { transaction });
            await db_1.models.nftListing.update({
                currentBid: amount
            }, {
                where: { id: listingId },
                transaction,
            });
            if (onChainBidResult && onChainBidResult.success) {
                try {
                    const bidderWallet = await db_1.models.wallet.findOne({
                        where: {
                            userId: user.id,
                            currency: listing.currency,
                            type: 'SPOT'
                        },
                        transaction
                    });
                    if (bidderWallet) {
                        await db_1.models.transaction.create({
                            userId: user.id,
                            walletId: bidderWallet.id,
                            type: "NFT_AUCTION_BID",
                            status: "COMPLETED",
                            amount: amount,
                            fee: 0,
                            description: `Placed bid of ${amount} ${listing.currency} on NFT auction`,
                            metadata: JSON.stringify({
                                listingId: listing.id,
                                bidId: bid.id,
                                tokenId: listing.tokenId,
                                auctionContract: listing.auctionContractAddress,
                                bidAmount: amount.toString(),
                                isHighestBid: onChainBidResult.isHighestBid || false,
                                previousBidRefunded: onChainBidResult.previousBidRefunded || false,
                                chain: ((_d = listing.token.collection) === null || _d === void 0 ? void 0 : _d.chain) || "ETH",
                                blockNumber: onChainBidResult.blockNumber
                            }),
                            trxId: onChainBidResult.transactionHash
                        }, { transaction });
                    }
                }
                catch (error) {
                    console_1.logger.warn("NFT_BID", `Failed to create transaction record: ${error.message}`);
                }
            }
            await db_1.models.nftActivity.create({
                tokenId: listing.tokenId,
                listingId: listing.id,
                bidId: bid.id,
                type: "BID",
                fromUserId: user.id,
                toUserId: listing.sellerId,
                price: amount,
                currency,
                transactionHash: (onChainBidResult === null || onChainBidResult === void 0 ? void 0 : onChainBidResult.transactionHash) || transactionHash || undefined,
                metadata: JSON.stringify({
                    tokenName: listing.token.name,
                    bidAmount: amount,
                    previousHighestBid: (currentHighestBid === null || currentHighestBid === void 0 ? void 0 : currentHighestBid.amount) || 0,
                    isOnChain: !!onChainBidResult,
                    auctionContract: listing.auctionContractAddress,
                    blockNumber: (onChainBidResult === null || onChainBidResult === void 0 ? void 0 : onChainBidResult.blockNumber) || undefined,
                    gasUsed: (onChainBidResult === null || onChainBidResult === void 0 ? void 0 : onChainBidResult.gasUsed) || undefined,
                    isHighestBid: (onChainBidResult === null || onChainBidResult === void 0 ? void 0 : onChainBidResult.isHighestBid) || false
                }),
            }, { transaction });
            const cacheManager = cache_1.CacheManager.getInstance();
            const settings = await cacheManager.getSettings();
            const antiSnipeEnabled = (0, settlement_1.settingEnabled)(settings.get('nftEnableAntiSnipe'), true);
            const antiSnipeExtension = (_e = settings.get('nftAntiSnipeExtension')) !== null && _e !== void 0 ? _e : 300;
            const timeLeft = listing.endTime ? new Date(listing.endTime).getTime() - new Date().getTime() : 0;
            const extensionThreshold = antiSnipeExtension * 1000;
            if (antiSnipeEnabled && timeLeft < extensionThreshold && timeLeft > 0) {
                const newEndTime = new Date(Date.now() + extensionThreshold);
                await db_1.models.nftListing.update({
                    endTime: newEndTime,
                }, {
                    where: { id: listingId },
                    transaction,
                });
                await db_1.models.nftActivity.create({
                    tokenId: listing.tokenId,
                    listingId: listing.id,
                    type: "BID",
                    fromUserId: undefined,
                    toUserId: undefined,
                    price: undefined,
                    currency: undefined,
                    transactionHash: undefined,
                    metadata: JSON.stringify({
                        action: "AUCTION_EXTENDED",
                        newEndTime: newEndTime.toISOString(),
                        extendedBy: `${antiSnipeExtension} seconds`,
                        reason: "Last-minute bid",
                    }),
                }, { transaction });
            }
            await transaction.commit();
            ctx === null || ctx === void 0 ? void 0 : ctx.success(`Bid of ${amount} ${currency} placed successfully on listing ${listingId}`);
            return {
                message: "Bid placed successfully",
                data: {
                    bid: bid.toJSON(),
                    isHighestBid: true,
                    minNextBid: amount + (listing.minBidIncrement || 0.01),
                    reserveMet: listing.reservePrice ? amount >= listing.reservePrice : true,
                    timeLeft: listing.endTime ? new Date(listing.endTime).getTime() - new Date().getTime() : null,
                    auctionExtended: antiSnipeEnabled && timeLeft < extensionThreshold && timeLeft > 0,
                },
            };
        }
        catch (error) {
            await (0, transaction_1.rollbackIfActive)(transaction);
            throw error;
        }
    }
    catch (error) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail(`Failed to place bid: ${error.message}`);
        console_1.logger.error("NFT_BID_ERROR", "Failed to place bid", error);
        if (error.statusCode) {
            throw error;
        }
        throw (0, error_1.createError)({
            statusCode: 500,
            message: "Failed to place bid",
        });
    }
};
