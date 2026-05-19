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
exports.metadata = void 0;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const console_1 = require("@b/utils/console");
const nft_auth_1 = require("@b/api/(ext)/nft/utils/nft-auth");
const sequelize_1 = require("sequelize");
const ethers_1 = require("ethers");
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
                    attributes: ["id", "name", "image", "ownerId", "isListed", "collectionId", "tokenId"],
                    required: true,
                    include: [
                        {
                            model: db_1.models.nftCollection,
                            as: "collection",
                            attributes: ["id", "name", "chain", "contractAddress", "royaltyPercentage", "creatorId"],
                            include: [
                                {
                                    model: db_1.models.nftCreator,
                                    as: "creator",
                                    attributes: ["id", "userId"],
                                },
                            ],
                        },
                    ],
                },
                {
                    model: db_1.models.user,
                    as: "user",
                    attributes: ["id", "firstName", "lastName"],
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
        const collection = token.collection;
        if (!collection) {
            throw (0, error_1.createError)({
                statusCode: 404,
                message: "Collection not found for this token",
            });
        }
        if (offer.userId !== user.id) {
            throw (0, error_1.createError)({
                statusCode: 403,
                message: "Only the buyer can confirm the transfer",
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
        let transactionReceipt = null;
        let verificationFailed = false;
        let verificationError = "";
        try {
            const chain = collection.chain;
            let rpcUrl = "";
            switch (chain === null || chain === void 0 ? void 0 : chain.toUpperCase()) {
                case "ETH":
                case "ETHEREUM":
                    rpcUrl = process.env.ETH_RPC_URL || "https://eth.llamarpc.com";
                    break;
                case "BSC":
                case "BINANCE":
                    rpcUrl = process.env.BSC_RPC_URL || "https://bsc-dataseed.binance.org";
                    break;
                case "POLYGON":
                case "MATIC":
                    rpcUrl = process.env.POLYGON_RPC_URL || "https://polygon-rpc.com";
                    break;
                default:
                    verificationFailed = true;
                    verificationError = `No RPC URL configured for chain: ${chain}`;
            }
            if (rpcUrl) {
                const provider = new ethers_1.ethers.JsonRpcProvider(rpcUrl);
                const timeout = 10000;
                transactionReceipt = await Promise.race([
                    provider.getTransactionReceipt(sanitizedTxHash),
                    new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), timeout))
                ]);
                if (!transactionReceipt) {
                    verificationFailed = true;
                    verificationError = "Transaction not found on blockchain";
                }
                else if (transactionReceipt.status !== 1) {
                    throw (0, error_1.createError)({
                        statusCode: 400,
                        message: "Transaction failed on blockchain",
                    });
                }
            }
        }
        catch (error) {
            console_1.logger.error("BLOCKCHAIN_VERIFICATION", "Blockchain verification failed", error);
            verificationFailed = true;
            verificationError = error.message;
        }
        const { CacheManager } = await Promise.resolve().then(() => __importStar(require("@b/utils/cache")));
        const cacheManager = CacheManager.getInstance();
        const settings = await cacheManager.getSettings();
        const marketplaceFeePercent = parseFloat(settings.get('nftMarketplaceFee') || '2.5');
        const royaltyPercent = collection.royaltyPercentage || 0;
        const marketplaceFee = offer.amount * (marketplaceFeePercent / 100);
        const royalty = offer.amount * (royaltyPercent / 100);
        const sellerReceives = offer.amount - marketplaceFee - royalty;
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Complete transfer in database transaction");
        await db_1.sequelize.transaction({
            isolationLevel: sequelize_1.Transaction.ISOLATION_LEVELS.SERIALIZABLE
        }, async (transaction) => {
            var _a, _b, _c, _d;
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
            await db_1.models.nftToken.update({
                ownerId: offer.userId,
                isListed: false,
            }, {
                where: { id: offer.tokenId },
                transaction,
            });
            const currentListing = await db_1.models.nftListing.findOne({
                where: {
                    tokenId: offer.tokenId,
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
                    marketplaceFee,
                    royalty,
                    sellerReceives,
                }),
            }, { transaction });
            await db_1.models.nftActivity.create({
                tokenId: offer.tokenId,
                offerId: offer.id,
                listingId: (_a = currentListing === null || currentListing === void 0 ? void 0 : currentListing.id) !== null && _a !== void 0 ? _a : undefined,
                type: "TRANSFER",
                fromUserId: token.ownerId,
                toUserId: offer.userId,
                price: offer.amount,
                currency: offer.currency,
                transactionHash: sanitizedTxHash,
                metadata: JSON.stringify({
                    transferType: "offer_acceptance",
                    tokenName: token.name,
                    confirmedAt: new Date().toISOString(),
                    blockchainVerified: !verificationFailed,
                    marketplaceFee,
                    royalty,
                    sellerReceives,
                    ...(transactionReceipt && {
                        blockNumber: transactionReceipt.blockNumber,
                        gasUsed: transactionReceipt.gasUsed.toString(),
                    }),
                }),
            }, { transaction });
            await db_1.models.nftPriceHistory.create({
                tokenId: offer.tokenId,
                collectionId: (_b = token.collectionId) !== null && _b !== void 0 ? _b : undefined,
                price: offer.amount,
                currency: offer.currency,
                saleType: "OFFER",
                buyerId: offer.userId,
                sellerId: (_c = token.ownerId) !== null && _c !== void 0 ? _c : undefined,
            }, { transaction });
            if (marketplaceFee > 0) {
                try {
                    const adminFeeWallet = await db_1.models.wallet.findOne({
                        where: {
                            userId: user.id,
                            currency: offer.currency,
                            type: 'SPOT'
                        },
                        transaction
                    });
                    if (adminFeeWallet) {
                        const profitTransaction = await db_1.models.transaction.create({
                            userId: user.id,
                            walletId: adminFeeWallet.id,
                            type: "NFT_OFFER",
                            status: "COMPLETED",
                            amount: marketplaceFee,
                            fee: 0,
                            description: `Marketplace fee from NFT offer ${offer.id}`,
                            metadata: JSON.stringify({
                                tokenId: offer.tokenId,
                                offerId: offer.id,
                                transactionHash: sanitizedTxHash,
                                tokenName: token.name,
                            }),
                        }, { transaction });
                        await db_1.models.adminProfit.create({
                            transactionId: profitTransaction.id,
                            type: "NFT_OFFER",
                            amount: marketplaceFee,
                            currency: offer.currency,
                            description: `Marketplace fee from NFT offer ${offer.id}`,
                        }, { transaction });
                    }
                }
                catch (error) {
                    console_1.logger.error("NFT_OFFER_ADMIN_PROFIT", "Failed to record admin profit", error);
                }
            }
            if (royalty > 0 && collection.creator) {
                try {
                    await ((_d = db_1.models.nftRoyalty) === null || _d === void 0 ? void 0 : _d.create({
                        collectionId: token.collectionId,
                        tokenId: offer.tokenId,
                        recipientId: collection.creatorId,
                        saleId: offer.id,
                        amount: royalty,
                        currency: offer.currency,
                        percentage: royaltyPercent,
                        transactionHash: sanitizedTxHash,
                        status: "PENDING",
                    }, { transaction }));
                }
                catch (error) {
                }
            }
        });
        ctx === null || ctx === void 0 ? void 0 : ctx.success("Transfer confirmed successfully");
        return {
            message: "Transfer confirmed successfully",
            data: {
                offerId: offer.id,
                tokenId: offer.tokenId,
                transactionHash: sanitizedTxHash,
                blockchainVerified: !verificationFailed,
                newOwner: {
                    id: user.id,
                    name: `${user.firstName} ${user.lastName}`,
                },
                previousOwner: {
                    id: token.ownerId,
                },
                payment: {
                    total: offer.amount,
                    marketplaceFee,
                    royalty,
                    sellerReceives,
                    currency: offer.currency,
                },
                ...(transactionReceipt && {
                    blockchain: {
                        blockNumber: transactionReceipt.blockNumber,
                        gasUsed: transactionReceipt.gasUsed.toString(),
                        status: "confirmed",
                    },
                }),
                ...(verificationFailed && {
                    warning: "Blockchain verification failed. Transaction will be verified manually by admin.",
                    verificationError,
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
