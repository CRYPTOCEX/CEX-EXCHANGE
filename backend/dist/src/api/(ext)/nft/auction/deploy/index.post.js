"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const auction_service_1 = require("../../utils/auction-service");
const console_1 = require("@b/utils/console");
exports.metadata = {
    summary: "Deploy auction contract for NFT",
    operationId: "deployNftAuction",
    tags: ["NFT", "Auction", "Deploy", "Blockchain"],
    logModule: "NFT",
    logTitle: "Deploy auction contract",
    requestBody: {
        required: true,
        content: {
            "application/json": {
                schema: {
                    type: "object",
                    properties: {
                        listingId: {
                            type: "string",
                            format: "uuid",
                            description: "NFT listing ID for the auction"
                        },
                        auctionEndTime: {
                            type: "integer",
                            description: "Unix timestamp for auction end time"
                        }
                    },
                    required: ["listingId", "auctionEndTime"]
                }
            }
        }
    },
    responses: {
        200: {
            description: "Auction contract deployed successfully",
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
                                    contractAddress: { type: "string" },
                                    transactionHash: { type: "string" },
                                    blockNumber: { type: "integer" },
                                    gasUsed: { type: "string" },
                                    deploymentCost: { type: "string" },
                                    auctionEndTime: { type: "integer" }
                                }
                            }
                        }
                    }
                }
            }
        },
        400: { description: "Bad Request" },
        401: { description: "Unauthorized" },
        403: { description: "Not listing owner" },
        404: { description: "Listing not found" },
        409: { description: "Auction already deployed" },
        500: { description: "Internal Server Error" }
    },
    requiresAuth: true
};
exports.default = async (data) => {
    var _a, _b, _c;
    const { user, body, ctx } = data;
    const { listingId, auctionEndTime } = body;
    if (!(user === null || user === void 0 ? void 0 : user.id)) {
        throw (0, error_1.createError)({ statusCode: 401, message: "Unauthorized" });
    }
    if (!listingId || !auctionEndTime) {
        throw (0, error_1.createError)({
            statusCode: 400,
            message: "Listing ID and auction end time are required"
        });
    }
    const currentTime = Math.floor(Date.now() / 1000);
    if (auctionEndTime <= currentTime) {
        throw (0, error_1.createError)({
            statusCode: 400,
            message: "Auction end time must be in the future"
        });
    }
    try {
        ctx === null || ctx === void 0 ? void 0 : ctx.step(`Retrieving listing ${listingId}`);
        const listing = await db_1.models.nftListing.findOne({
            where: { id: listingId },
            include: [
                {
                    model: db_1.models.nftToken,
                    as: "token",
                    attributes: ["id", "name", "blockchainTokenId", "collectionId"],
                    include: [
                        {
                            model: db_1.models.nftCollection,
                            as: "collection",
                            attributes: ["id", "name", "contractAddress", "chain", "royaltyPercentage"]
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
                message: "Listing not found"
            });
        }
        if (listing.sellerId !== user.id) {
            throw (0, error_1.createError)({
                statusCode: 403,
                message: "You can only deploy auctions for your own listings"
            });
        }
        if (listing.type !== "AUCTION") {
            throw (0, error_1.createError)({
                statusCode: 400,
                message: "Can only deploy auction contracts for auction-type listings"
            });
        }
        if (listing.status !== "ACTIVE") {
            throw (0, error_1.createError)({
                statusCode: 400,
                message: "Listing must be active to deploy auction contract"
            });
        }
        if (listing.auctionContractAddress) {
            throw (0, error_1.createError)({
                statusCode: 409,
                message: "Auction contract already deployed for this listing"
            });
        }
        if (!listing.token) {
            throw (0, error_1.createError)({
                statusCode: 500,
                message: "Token data not found for this listing"
            });
        }
        if (!((_a = listing.token.collection) === null || _a === void 0 ? void 0 : _a.contractAddress)) {
            throw (0, error_1.createError)({
                statusCode: 400,
                message: "Collection contract must be deployed before creating auction"
            });
        }
        if (!listing.token.blockchainTokenId) {
            throw (0, error_1.createError)({
                statusCode: 400,
                message: "Token must be minted on blockchain before creating auction"
            });
        }
        if (!listing.seller) {
            throw (0, error_1.createError)({
                statusCode: 500,
                message: "Seller data not found for this listing"
            });
        }
        if (!listing.seller.walletAddress) {
            throw (0, error_1.createError)({
                statusCode: 400,
                message: "Seller must have wallet address set"
            });
        }
        if (listing.price === undefined || listing.price === null) {
            throw (0, error_1.createError)({
                statusCode: 400,
                message: "Listing price is required"
            });
        }
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Initializing auction service");
        const auctionService = await (0, auction_service_1.getNFTAuctionService)(listing.token.collection.chain);
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Deploying auction contract to blockchain");
        const deployResult = await auctionService.deployAuction(listing.token.collection.contractAddress, listing.token.blockchainTokenId, listing.price.toString(), ((_b = listing.reservePrice) === null || _b === void 0 ? void 0 : _b.toString()) || listing.price.toString(), ((_c = listing.minBidIncrement) === null || _c === void 0 ? void 0 : _c.toString()) || "0.01", auctionEndTime, listing.seller.walletAddress, 2.5, listing.token.collection.royaltyPercentage || 0, listing.seller.walletAddress);
        if (!deployResult.success) {
            throw (0, error_1.createError)({ statusCode: 500, message: "Auction contract deployment failed" });
        }
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Recording deployment in database");
        const dbTransaction = await db_1.sequelize.transaction();
        try {
            await db_1.models.nftListing.update({
                auctionContractAddress: deployResult.contractAddress,
                endTime: new Date(auctionEndTime * 1000)
            }, {
                where: { id: listingId },
                transaction: dbTransaction
            });
            const listingToken = listing.token;
            if (listingToken) {
                await db_1.models.nftActivity.create({
                    tokenId: listingToken.id,
                    collectionId: listingToken.collectionId,
                    listingId: listing.id,
                    type: "LIST",
                    fromUserId: user.id,
                    toUserId: undefined,
                    price: undefined,
                    currency: undefined,
                    transactionHash: deployResult.transactionHash,
                    metadata: JSON.stringify({
                        action: "AUCTION_DEPLOYED",
                        contractAddress: deployResult.contractAddress,
                        auctionEndTime,
                        deploymentCost: deployResult.deploymentCost,
                        gasUsed: deployResult.gasUsed,
                        blockNumber: deployResult.blockNumber
                    })
                }, { transaction: dbTransaction });
            }
            await dbTransaction.commit();
            ctx === null || ctx === void 0 ? void 0 : ctx.success(`Auction contract deployed successfully: ${deployResult.contractAddress}`);
            return {
                message: "Auction contract deployed successfully",
                data: {
                    listingId: listing.id,
                    contractAddress: deployResult.contractAddress,
                    transactionHash: deployResult.transactionHash,
                    blockNumber: deployResult.blockNumber,
                    gasUsed: deployResult.gasUsed,
                    deploymentCost: deployResult.deploymentCost,
                    auctionEndTime
                }
            };
        }
        catch (dbError) {
            await dbTransaction.rollback();
            throw dbError;
        }
    }
    catch (error) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail(`Failed to deploy auction contract: ${error.message}`);
        console_1.logger.error("DEPLOY_AUCTION_CONTRACT", "Failed to deploy auction contract", error);
        if (error.statusCode) {
            throw error;
        }
        throw (0, error_1.createError)({
            statusCode: 500,
            message: "Failed to deploy auction contract"
        });
    }
};
