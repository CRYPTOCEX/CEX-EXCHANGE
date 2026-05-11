"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const auction_service_1 = require("../../../utils/auction-service");
const nft_blockchain_service_1 = require("../../../utils/nft-blockchain-service");
const console_1 = require("@b/utils/console");
const sequelize_1 = require("sequelize");
exports.metadata = {
    summary: "Settle/end NFT auction",
    operationId: "settleNftAuction",
    tags: ["NFT", "Auction", "Settle", "Blockchain"],
    logModule: "NFT",
    logTitle: "Settle NFT auction",
    parameters: [
        {
            name: "id",
            in: "path",
            required: true,
            description: "Listing ID",
            schema: { type: "string", format: "uuid" },
        },
    ],
    responses: {
        200: {
            description: "Auction settled successfully",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            message: { type: "string" },
                            data: {
                                type: "object",
                                properties: {
                                    listingId: { type: "string" },
                                    winner: { type: "string" },
                                    finalBid: { type: "string" },
                                    settlementHash: { type: "string" },
                                    transferHash: { type: "string" },
                                    blockNumber: { type: "integer" },
                                    gasUsed: { type: "string" },
                                    settled: { type: "boolean" }
                                }
                            }
                        }
                    }
                }
            }
        },
        400: { description: "Bad Request" },
        401: { description: "Unauthorized" },
        404: { description: "Auction not found" },
        409: { description: "Auction already settled or not ended" },
        500: { description: "Internal Server Error" }
    },
    requiresAuth: true
};
exports.default = async (data) => {
    var _a, _b, _c;
    const { user, params, ctx } = data;
    const { id } = params;
    if (!(user === null || user === void 0 ? void 0 : user.id)) {
        throw (0, error_1.createError)({ statusCode: 401, message: "Unauthorized" });
    }
    if (!id) {
        throw (0, error_1.createError)({
            statusCode: 400,
            message: "Listing ID is required"
        });
    }
    try {
        ctx === null || ctx === void 0 ? void 0 : ctx.step(`Retrieving auction listing ${id}`);
        const listing = await db_1.models.nftListing.findOne({
            where: { id },
            include: [
                {
                    model: db_1.models.nftToken,
                    as: "token",
                    attributes: ["id", "name", "blockchainTokenId", "collectionId"],
                    include: [
                        {
                            model: db_1.models.nftCollection,
                            as: "collection",
                            attributes: ["id", "name", "contractAddress", "chain", "standard", "royaltyPercentage"]
                        }
                    ]
                },
                {
                    model: db_1.models.user,
                    as: "seller",
                    attributes: ["id", "walletAddress"]
                }
            ]
        });
        if (!listing) {
            throw (0, error_1.createError)({
                statusCode: 404,
                message: "Auction listing not found"
            });
        }
        if (!listing.token) {
            throw (0, error_1.createError)({
                statusCode: 404,
                message: "Token not found for this listing"
            });
        }
        if (!listing.token.collection) {
            throw (0, error_1.createError)({
                statusCode: 404,
                message: "Collection not found for this token"
            });
        }
        if (!listing.seller) {
            throw (0, error_1.createError)({
                statusCode: 404,
                message: "Seller information not found"
            });
        }
        if (listing.type !== "AUCTION") {
            throw (0, error_1.createError)({
                statusCode: 400,
                message: "Can only settle auction-type listings"
            });
        }
        if (!listing.endTime || new Date() < listing.endTime) {
            throw (0, error_1.createError)({
                statusCode: 409,
                message: "Auction has not ended yet"
            });
        }
        if (listing.status === "SOLD" || listing.status === "CANCELLED") {
            throw (0, error_1.createError)({
                statusCode: 409,
                message: "Auction is already settled"
            });
        }
        if (!listing.auctionContractAddress) {
            throw (0, error_1.createError)({
                statusCode: 400,
                message: "No auction contract deployed for this listing"
            });
        }
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Finding winning bid");
        const winningBid = await db_1.models.nftBid.findOne({
            where: {
                listingId: id,
                status: "ACTIVE"
            },
            order: [["amount", "DESC"]],
            include: [
                {
                    model: db_1.models.user,
                    as: "user",
                    attributes: ["id", "walletAddress"]
                }
            ]
        });
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Initializing auction service");
        const auctionService = await (0, auction_service_1.getNFTAuctionService)(listing.token.collection.chain);
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Getting auction info from blockchain");
        const auctionInfo = await auctionService.getAuctionInfo(listing.auctionContractAddress);
        const reservePrice = parseFloat(((_a = listing.reservePrice) === null || _a === void 0 ? void 0 : _a.toString()) || "0");
        const highestBid = parseFloat(auctionInfo.highestBid);
        if (highestBid < reservePrice) {
            ctx === null || ctx === void 0 ? void 0 : ctx.warn(`Reserve price not met: ${highestBid} < ${reservePrice}`);
            const dbTransaction = await db_1.sequelize.transaction();
            try {
                await db_1.models.nftListing.update({
                    status: "CANCELLED",
                    cancelledAt: new Date()
                }, {
                    where: { id },
                    transaction: dbTransaction
                });
                await db_1.models.nftBid.update({
                    status: "CANCELLED"
                }, {
                    where: { listingId: id },
                    transaction: dbTransaction
                });
                await db_1.models.nftToken.update({
                    isListed: false
                }, {
                    where: { id: listing.tokenId },
                    transaction: dbTransaction
                });
                const listingToken = listing.token;
                if (listingToken) {
                    await db_1.models.nftActivity.create({
                        tokenId: listingToken.id,
                        collectionId: listingToken.collectionId,
                        listingId: listing.id,
                        type: "DELIST",
                        fromUserId: undefined,
                        toUserId: listing.sellerId,
                        price: undefined,
                        currency: undefined,
                        transactionHash: undefined,
                        metadata: JSON.stringify({
                            action: "AUCTION_ENDED",
                            cancelled: true,
                            reason: "Reserve price not met",
                            reservePrice,
                            highestBid,
                            auctionContract: listing.auctionContractAddress
                        })
                    }, { transaction: dbTransaction });
                }
                await dbTransaction.commit();
                return {
                    message: "Auction cancelled - reserve price not met",
                    data: {
                        listingId: listing.id,
                        winner: null,
                        finalBid: "0",
                        settlementHash: null,
                        transferHash: null,
                        blockNumber: null,
                        gasUsed: null,
                        settled: false,
                        cancelled: true,
                        reason: "Reserve price not met"
                    }
                };
            }
            catch (dbError) {
                await dbTransaction.rollback();
                throw dbError;
            }
        }
        if (!winningBid || !((_b = winningBid.user) === null || _b === void 0 ? void 0 : _b.walletAddress)) {
            throw (0, error_1.createError)({
                statusCode: 400,
                message: "No valid winning bid found or winner missing wallet address"
            });
        }
        if (!listing.token.collection.contractAddress) {
            throw (0, error_1.createError)({
                statusCode: 400,
                message: "Collection contract address not found"
            });
        }
        if (!listing.token.blockchainTokenId) {
            throw (0, error_1.createError)({
                statusCode: 400,
                message: "Token blockchain ID not found"
            });
        }
        if (!listing.seller.walletAddress) {
            throw (0, error_1.createError)({
                statusCode: 400,
                message: "Seller wallet address not found"
            });
        }
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Settling auction on blockchain");
        const settlementResult = await auctionService.settleAuction(listing.auctionContractAddress);
        if (!settlementResult.success) {
            throw (0, error_1.createError)({ statusCode: 500, message: "Auction settlement on blockchain failed" });
        }
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Transferring NFT to winner");
        const blockchainService = await (0, nft_blockchain_service_1.getNFTBlockchainService)(listing.token.collection.chain);
        const transferResult = await blockchainService.transferNFT(listing.token.collection.contractAddress, listing.seller.walletAddress, winningBid.user.walletAddress, listing.token.blockchainTokenId, listing.token.collection.standard);
        if (!transferResult.success) {
            throw (0, error_1.createError)({ statusCode: 500, message: "NFT transfer to winner failed" });
        }
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Recording settlement in database");
        const dbTransaction = await db_1.sequelize.transaction();
        try {
            const royaltyPercentage = listing.token.collection.royaltyPercentage || 0;
            const sale = await db_1.models.nftSale.create({
                listingId: listing.id,
                tokenId: listing.tokenId,
                sellerId: listing.sellerId,
                buyerId: winningBid.userId,
                price: winningBid.amount,
                currency: winningBid.currency,
                marketplaceFee: winningBid.amount * 0.025,
                royaltyFee: winningBid.amount * (royaltyPercentage / 100),
                totalFee: (winningBid.amount * 0.025) + (winningBid.amount * (royaltyPercentage / 100)),
                netAmount: winningBid.amount * (1 - 0.025 - (royaltyPercentage / 100)),
                transactionHash: settlementResult.transactionHash,
                blockNumber: (_c = settlementResult.blockNumber) !== null && _c !== void 0 ? _c : 0,
                status: "COMPLETED",
                metadata: {
                    saleType: "AUCTION",
                    transferHash: transferResult.transactionHash,
                    gasUsed: settlementResult.gasUsed,
                    auctionContract: listing.auctionContractAddress
                }
            }, { transaction: dbTransaction });
            await db_1.models.nftListing.update({
                status: "SOLD",
                soldAt: new Date(),
            }, {
                where: { id },
                transaction: dbTransaction
            });
            await db_1.models.nftToken.update({
                ownerId: winningBid.userId,
                isListed: false
            }, {
                where: { id: listing.tokenId },
                transaction: dbTransaction
            });
            await db_1.models.nftBid.update({
                status: "ACCEPTED",
                acceptedAt: new Date()
            }, {
                where: { id: winningBid.id },
                transaction: dbTransaction
            });
            await db_1.models.nftBid.update({
                status: "REJECTED",
                rejectedAt: new Date()
            }, {
                where: {
                    listingId: id,
                    id: { [sequelize_1.Op.ne]: winningBid.id }
                },
                transaction: dbTransaction
            });
            try {
                const sellerWallet = await db_1.models.wallet.findOne({
                    where: {
                        userId: listing.sellerId,
                        currency: winningBid.currency,
                        type: 'SPOT'
                    },
                    transaction: dbTransaction
                });
                if (sellerWallet) {
                    await db_1.models.transaction.create({
                        userId: listing.sellerId,
                        walletId: sellerWallet.id,
                        type: "NFT_AUCTION_SETTLE",
                        status: "COMPLETED",
                        amount: sale.netAmount,
                        fee: sale.totalFee,
                        description: `Received payment for NFT auction settlement`,
                        metadata: JSON.stringify({
                            saleId: sale.id,
                            listingId: listing.id,
                            tokenId: listing.tokenId,
                            buyerId: winningBid.userId,
                            auctionContract: listing.auctionContractAddress,
                            settlementHash: settlementResult.transactionHash,
                            transferHash: transferResult.transactionHash,
                            chain: listing.token.collection.chain
                        }),
                        trxId: settlementResult.transactionHash
                    }, { transaction: dbTransaction });
                }
            }
            catch (error) {
                console_1.logger.warn("AUCTION_SETTLE", `Failed to create seller transaction record: ${error.message}`);
            }
            try {
                const buyerWallet = await db_1.models.wallet.findOne({
                    where: {
                        userId: winningBid.userId,
                        currency: winningBid.currency,
                        type: 'SPOT'
                    },
                    transaction: dbTransaction
                });
                if (buyerWallet) {
                    await db_1.models.transaction.create({
                        userId: winningBid.userId,
                        walletId: buyerWallet.id,
                        type: "NFT_TRANSFER",
                        status: "COMPLETED",
                        amount: winningBid.amount,
                        fee: 0,
                        description: `Received NFT from won auction`,
                        metadata: JSON.stringify({
                            saleId: sale.id,
                            tokenId: listing.tokenId,
                            fromAddress: listing.seller.walletAddress,
                            toAddress: winningBid.user.walletAddress,
                            transferType: "AUCTION_WIN",
                            chain: listing.token.collection.chain,
                            transactionHash: transferResult.transactionHash
                        }),
                        trxId: transferResult.transactionHash
                    }, { transaction: dbTransaction });
                }
            }
            catch (error) {
                console_1.logger.warn("AUCTION_SETTLE", `Failed to create buyer transaction record: ${error.message}`);
            }
            await db_1.models.nftActivity.create({
                tokenId: listing.token.id,
                collectionId: listing.token.collectionId,
                listingId: listing.id,
                bidId: winningBid.id,
                type: "AUCTION_ENDED",
                fromUserId: listing.sellerId,
                toUserId: winningBid.userId,
                price: winningBid.amount,
                currency: winningBid.currency,
                transactionHash: settlementResult.transactionHash,
                metadata: JSON.stringify({
                    saleId: sale.id,
                    settlementHash: settlementResult.transactionHash,
                    transferHash: transferResult.transactionHash,
                    auctionContract: listing.auctionContractAddress,
                    blockchainSettlement: true
                })
            }, { transaction: dbTransaction });
            await dbTransaction.commit();
            ctx === null || ctx === void 0 ? void 0 : ctx.success(`Auction settled successfully: Winner ${winningBid.user.walletAddress}, Final bid ${winningBid.amount}`);
            return {
                message: "Auction settled successfully",
                data: {
                    listingId: listing.id,
                    winner: winningBid.user.walletAddress,
                    finalBid: winningBid.amount.toString(),
                    settlementHash: settlementResult.transactionHash,
                    transferHash: transferResult.transactionHash,
                    blockNumber: settlementResult.blockNumber,
                    gasUsed: settlementResult.gasUsed,
                    settled: true
                }
            };
        }
        catch (dbError) {
            await dbTransaction.rollback();
            throw dbError;
        }
    }
    catch (error) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail(`Failed to settle auction: ${error.message}`);
        console_1.logger.error("SETTLE_AUCTION", "Failed to settle auction", error);
        if (error.statusCode) {
            throw error;
        }
        throw (0, error_1.createError)({
            statusCode: 500,
            message: "Failed to settle auction"
        });
    }
};
