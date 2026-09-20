"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const console_1 = require("@b/utils/console");
const nft_auth_1 = require("@b/api/(ext)/nft/utils/nft-auth");
const verification_1 = require("@b/api/(ext)/nft/utils/verification");
const settlement_1 = require("@b/api/(ext)/nft/utils/settlement");
const sequelize_1 = require("sequelize");
exports.metadata = {
    summary: "Confirm blockchain transfer for accepted offer",
    operationId: "confirmOfferTransfer",
    tags: ["NFT", "Offer"],
    logModule: "NFT",
    logTitle: "Confirm Offer Transfer",
    parameters: [
        {
            name: "id",
            in: "path",
            description: "Offer ID",
            required: true,
            schema: { type: "string", format: "uuid" },
        },
    ],
    requestBody: {
        required: true,
        content: {
            "application/json": {
                schema: {
                    type: "object",
                    properties: {
                        transactionHash: {
                            type: "string",
                            description: "Blockchain transaction hash of the payment/transfer"
                        },
                    },
                    required: ["transactionHash"],
                },
            },
        },
    },
    responses: {
        200: { description: "Transfer confirmed successfully" },
        400: { description: "Bad Request" },
        401: { description: "Unauthorized" },
        403: { description: "Access denied - not the buyer" },
        404: { description: "Offer not found" },
        409: { description: "Transfer cannot be confirmed" },
        500: { description: "Internal Server Error" },
    },
    requiresAuth: true,
};
exports.default = async (data) => {
    var _a, _b;
    var _c;
    const { user, params, body, ctx } = data;
    const { id } = params;
    const { transactionHash } = body;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Validate user authorization");
    if (!(user === null || user === void 0 ? void 0 : user.id)) {
        throw (0, error_1.createError)({ statusCode: 401, message: "Unauthorized" });
    }
    if (!id || !transactionHash) {
        throw (0, error_1.createError)({
            statusCode: 400,
            message: "Offer ID and transaction hash are required",
        });
    }
    try {
        const sanitizedOfferId = (0, nft_auth_1.sanitizeAuthInput)(id);
        const sanitizedTxHash = transactionHash.trim();
        if (!sanitizedTxHash.match(/^0x[a-fA-F0-9]{64}$/)) {
            throw (0, error_1.createError)({
                statusCode: 400,
                message: "Invalid transaction hash format",
            });
        }
        const offer = await db_1.models.nftOffer.findOne({
            where: {
                id: sanitizedOfferId,
            },
            include: [
                {
                    model: db_1.models.nftToken,
                    as: "token",
                    attributes: ["id", "name", "image", "ownerId", "isListed", "collectionId", "tokenId", "blockchainTokenId"],
                    required: true,
                    include: [
                        {
                            model: db_1.models.nftCollection,
                            as: "collection",
                            attributes: ["id", "name", "chain", "contractAddress", "standard", "royaltyPercentage", "creatorId"],
                            include: [
                                {
                                    model: db_1.models.nftCreator,
                                    as: "creator",
                                    attributes: ["id", "userId"],
                                },
                            ],
                        },
                        {
                            model: db_1.models.user,
                            as: "owner",
                            attributes: ["id", "walletAddress"],
                        },
                    ],
                },
                {
                    model: db_1.models.user,
                    as: "user",
                    attributes: ["id", "firstName", "lastName", "walletAddress"],
                },
            ],
        });
        if (!offer) {
            throw (0, error_1.createError)({
                statusCode: 404,
                message: "Offer not found",
            });
        }
        const token = offer.token;
        if (!token) {
            throw (0, error_1.createError)({
                statusCode: 404,
                message: "Token not found for this offer",
            });
        }
        const tokenId = token.id;
        const collection = token.collection;
        if (!collection) {
            throw (0, error_1.createError)({
                statusCode: 404,
                message: "Collection not found for this token",
            });
        }
        if (offer.userId !== user.id && token.ownerId !== user.id) {
            throw (0, error_1.createError)({
                statusCode: 403,
                message: "Only the buyer or the seller can confirm this transfer",
            });
        }
        if (offer.status !== "ACCEPTED") {
            throw (0, error_1.createError)({
                statusCode: 409,
                message: `Offer must be in ACCEPTED status to confirm transfer. Current status: ${offer.status}`,
            });
        }
        const existingActivity = await db_1.models.nftActivity.findOne({
            where: {
                offerId: offer.id,
                type: "TRANSFER",
                transactionHash: { [sequelize_1.Op.ne]: null },
            },
        });
        if (existingActivity) {
            throw (0, error_1.createError)({
                statusCode: 409,
                message: "Transfer already confirmed for this offer",
            });
        }
        const chain = collection.chain;
        if (!chain) {
            throw (0, error_1.createError)({
                statusCode: 503,
                message: "Chain verification unavailable: collection has no chain configured",
            });
        }
        if (!collection.contractAddress) {
            throw (0, error_1.createError)({
                statusCode: 400,
                message: "Cannot verify transfer: the collection contract is not deployed",
            });
        }
        if (!token.blockchainTokenId) {
            throw (0, error_1.createError)({
                statusCode: 400,
                message: "Cannot verify transfer: this token has not been minted on chain",
            });
        }
        const sellerWalletAddress = (_a = token.owner) === null || _a === void 0 ? void 0 : _a.walletAddress;
        const buyerWalletAddress = (_b = offer.user) === null || _b === void 0 ? void 0 : _b.walletAddress;
        if (!sellerWalletAddress || !buyerWalletAddress) {
            throw (0, error_1.createError)({
                statusCode: 400,
                message: "Cannot verify transfer: both the buyer and the seller must have a wallet address set in their profile",
            });
        }
        let transactionReceipt = null;
        try {
            transactionReceipt = await verification_1.TransactionVerificationService.verifyNftTransfer(sanitizedTxHash, chain, {
                contractAddress: collection.contractAddress,
                blockchainTokenId: String(token.blockchainTokenId),
                expectedFrom: sellerWalletAddress,
                expectedTo: buyerWalletAddress,
                standard: collection.standard,
            });
        }
        catch (error) {
            console_1.logger.error("BLOCKCHAIN_VERIFICATION", "On-chain transfer verification failed", error);
            if (error === null || error === void 0 ? void 0 : error.statusCode) {
                throw error;
            }
            throw (0, error_1.createError)({
                statusCode: 400,
                message: `Transfer verification failed: ${(_c = error === null || error === void 0 ? void 0 : error.message) !== null && _c !== void 0 ? _c : "verification failed"}`,
            });
        }
        const verificationFailed = false;
        const verificationError = "";
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Complete transfer in database transaction");
        const settlement = await db_1.sequelize.transaction({
            isolationLevel: sequelize_1.Transaction.ISOLATION_LEVELS.SERIALIZABLE
        }, async (transaction) => {
            var _a, _b;
            const lockedOffer = await db_1.models.nftOffer.findByPk(offer.id, {
                transaction,
                lock: transaction.LOCK.UPDATE,
            });
            if (!lockedOffer) {
                throw (0, error_1.createError)({
                    statusCode: 404,
                    message: "Offer not found during lock",
                });
            }
            if (lockedOffer.status !== "ACCEPTED") {
                throw (0, error_1.createError)({
                    statusCode: 409,
                    message: "Offer status changed during processing",
                });
            }
            const settled = await (0, settlement_1.settleAcceptedOffer)({
                offerId: offer.id,
                transactionHash: sanitizedTxHash,
                transaction,
            });
            await db_1.models.nftToken.update({
                ownerId: offer.userId,
                isListed: false,
            }, {
                where: { id: tokenId },
                transaction,
            });
            const currentListing = await db_1.models.nftListing.findOne({
                where: {
                    tokenId,
                    status: "ACTIVE",
                },
                transaction,
            });
            if (currentListing) {
                await currentListing.update({
                    status: "SOLD",
                    soldAt: new Date(),
                }, { transaction });
            }
            await lockedOffer.update({
                metadata: JSON.stringify({
                    ...lockedOffer.metadata,
                    transactionHash: sanitizedTxHash,
                    confirmedAt: new Date().toISOString(),
                    blockchainVerified: !verificationFailed,
                    verificationError: verificationError || null,
                    marketplaceFee: settled.marketplaceFee,
                    royalty: settled.royalty,
                    sellerReceives: settled.sellerReceives,
                    buyerPaid: settled.buyerPaid,
                }),
            }, { transaction });
            await db_1.models.nftActivity.create({
                tokenId,
                offerId: offer.id,
                listingId: (_a = currentListing === null || currentListing === void 0 ? void 0 : currentListing.id) !== null && _a !== void 0 ? _a : undefined,
                type: "TRANSFER",
                fromUserId: settled.sellerId,
                toUserId: offer.userId,
                price: offer.amount,
                currency: offer.currency,
                transactionHash: sanitizedTxHash,
                metadata: JSON.stringify({
                    transferType: "offer_acceptance",
                    tokenName: token.name,
                    confirmedAt: new Date().toISOString(),
                    blockchainVerified: !verificationFailed,
                    marketplaceFee: settled.marketplaceFee,
                    royalty: settled.royalty,
                    sellerReceives: settled.sellerReceives,
                    ...(transactionReceipt && {
                        blockNumber: transactionReceipt.blockNumber,
                        gasUsed: transactionReceipt.gasUsed.toString(),
                    }),
                }),
            }, { transaction });
            await db_1.models.nftPriceHistory.create({
                tokenId,
                collectionId: (_b = token.collectionId) !== null && _b !== void 0 ? _b : undefined,
                price: offer.amount,
                currency: offer.currency,
                saleType: "OFFER",
                buyerId: offer.userId,
                sellerId: settled.sellerId,
            }, { transaction });
            return settled;
        });
        ctx === null || ctx === void 0 ? void 0 : ctx.success("Transfer confirmed successfully");
        return {
            message: "Transfer confirmed successfully",
            data: {
                offerId: offer.id,
                tokenId,
                transactionHash: sanitizedTxHash,
                blockchainVerified: !verificationFailed,
                newOwner: {
                    id: offer.userId,
                    name: (0, nft_auth_1.actorDisplayName)(await (0, nft_auth_1.loadActor)(offer.userId)),
                },
                previousOwner: {
                    id: token.ownerId,
                },
                payment: {
                    total: offer.amount,
                    marketplaceFee: settlement.marketplaceFee,
                    royalty: settlement.royalty,
                    sellerReceives: settlement.sellerReceives,
                    buyerPaid: settlement.buyerPaid,
                    currency: offer.currency,
                },
                ...(transactionReceipt && {
                    blockchain: {
                        blockNumber: transactionReceipt.blockNumber,
                        gasUsed: transactionReceipt.gasUsed.toString(),
                        status: "confirmed",
                    },
                }),
            },
        };
    }
    catch (error) {
        console_1.logger.error("NFT_OFFER_CONFIRM_TRANSFER", "Failed to confirm transfer", error);
        if (error.statusCode) {
            throw error;
        }
        throw (0, error_1.createError)({
            statusCode: 500,
            message: "An unexpected error occurred while confirming the transfer. Please try again.",
        });
    }
};
