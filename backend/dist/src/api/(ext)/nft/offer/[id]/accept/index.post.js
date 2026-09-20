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
const wallet_1 = require("@b/services/wallet");
const sequelize_1 = require("sequelize");
const settlement_1 = require("@b/api/(ext)/nft/utils/settlement");
const storefront_1 = require("@b/utils/storefront");
exports.metadata = {
    summary: "Accept NFT offer (seller side - step 1)",
    operationId: "acceptNftOffer",
    tags: ["NFT", "Offer"],
    logModule: "NFT",
    logTitle: "Accept NFT Offer",
    description: "Seller accepts offer. Buyer must then complete blockchain transfer using returned instructions.",
    parameters: [
        {
            name: "id",
            in: "path",
            description: "Offer ID",
            required: true,
            schema: { type: "string", format: "uuid" },
        },
    ],
    responses: {
        200: { description: "Offer accepted - buyer must complete blockchain transfer" },
        403: { description: "Access denied - not the NFT owner" },
        404: { description: "Offer not found" },
        409: { description: "Offer cannot be accepted" },
        500: { description: "Internal Server Error" },
    },
    requiresAuth: true,
};
exports.default = async (data) => {
    var _a, _b;
    var _c;
    (0, storefront_1.assertPurchaseAllowedOnNativeApp)(data, "accept offers");
    const { user, params, ctx } = data;
    const { id } = params;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Validate user authorization");
    if (!(user === null || user === void 0 ? void 0 : user.id)) {
        throw (0, error_1.createError)({ statusCode: 401, message: "Unauthorized" });
    }
    if (!id) {
        throw (0, error_1.createError)({
            statusCode: 400,
            message: "Offer ID is required",
        });
    }
    try {
        const sanitizedOfferId = (0, nft_auth_1.sanitizeAuthInput)(id);
        const offer = await db_1.models.nftOffer.findOne({
            where: {
                id: sanitizedOfferId,
            },
            include: [
                {
                    model: db_1.models.nftToken,
                    as: "token",
                    attributes: [
                        "id",
                        "name",
                        "image",
                        "ownerId",
                        "isListed",
                        "collectionId",
                        "blockchainTokenId",
                        "tokenId",
                    ],
                    required: false,
                    include: [
                        {
                            model: db_1.models.nftCollection,
                            as: "collection",
                            attributes: ["id", "name", "chain", "contractAddress", "royaltyPercentage", "creatorId"],
                        },
                    ],
                },
                {
                    model: db_1.models.user,
                    as: "user",
                    attributes: ["id", "firstName", "lastName", "email"],
                },
            ],
        });
        if (!offer) {
            throw (0, error_1.createError)({
                statusCode: 404,
                message: "Offer not found",
            });
        }
        if (!offer.tokenId || !offer.token) {
            throw (0, error_1.createError)({
                statusCode: 400,
                message: "Collection offers cannot be directly accepted. Please use collection offer acceptance flow.",
            });
        }
        const offerToken = offer.token;
        const offerTokenId = offer.tokenId;
        if (offerToken.ownerId !== user.id) {
            throw (0, error_1.createError)({
                statusCode: 403,
                message: "Access denied: You don't own this NFT",
            });
        }
        if (offer.status === "ACCEPTED") {
            throw (0, error_1.createError)({
                statusCode: 409,
                message: "Offer is already accepted",
            });
        }
        if (offer.status === "CANCELLED") {
            throw (0, error_1.createError)({
                statusCode: 409,
                message: "Cannot accept a cancelled offer",
            });
        }
        if (offer.status === "EXPIRED") {
            throw (0, error_1.createError)({
                statusCode: 409,
                message: "Cannot accept an expired offer",
            });
        }
        if (offer.status === "REJECTED") {
            throw (0, error_1.createError)({
                statusCode: 409,
                message: "Cannot accept a rejected offer",
            });
        }
        if (offer.expiresAt && new Date(offer.expiresAt) <= new Date()) {
            throw (0, error_1.createError)({
                statusCode: 409,
                message: "Offer has expired",
            });
        }
        const tokenCollection = offer.token.collection;
        if (!tokenCollection) {
            throw (0, error_1.createError)({
                statusCode: 400,
                message: "Token collection not found",
            });
        }
        const { CacheManager } = await Promise.resolve().then(() => __importStar(require("@b/utils/cache")));
        const cacheManager = CacheManager.getInstance();
        const settings = await cacheManager.getSettings();
        const marketplaceFeePercent = (0, settlement_1.marketplaceFeePercent)(settings);
        const maxRoyaltyPercent = parseFloat((_c = settings.get('nftMaxRoyaltyPercentage')) !== null && _c !== void 0 ? _c : '10');
        const royaltyPercent = Math.min(Number(tokenCollection.royaltyPercentage) || 0, Number.isFinite(maxRoyaltyPercent) ? maxRoyaltyPercent : 10);
        const offerAmount = Number(offer.amount);
        const marketplaceFee = offerAmount * (marketplaceFeePercent / 100);
        const royalty = offerAmount * (royaltyPercent / 100);
        const sellerReceives = offerAmount - royalty;
        const buyerPays = offerAmount + marketplaceFee;
        const marketplaceContract = await ((_a = db_1.models.nftMarketplace) === null || _a === void 0 ? void 0 : _a.findOne({
            where: {
                chain: tokenCollection.chain,
                status: "ACTIVE",
            },
        }));
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Accept offer and release competing escrow in database transaction");
        await db_1.sequelize.transaction({
            isolationLevel: sequelize_1.Transaction.ISOLATION_LEVELS.SERIALIZABLE
        }, async (transaction) => {
            const lockedOffer = await db_1.models.nftOffer.findByPk(offer.id, {
                transaction,
                lock: transaction.LOCK.UPDATE,
            });
            if (!lockedOffer || lockedOffer.status !== "ACTIVE") {
                throw (0, error_1.createError)({
                    statusCode: 409,
                    message: "Offer status changed while processing. Please try again.",
                });
            }
            await lockedOffer.update({
                status: "ACCEPTED",
                acceptedAt: new Date(),
                sellerId: user.id,
            }, { transaction });
            const competingOffers = await db_1.models.nftOffer.findAll({
                where: {
                    tokenId: offerTokenId,
                    status: "ACTIVE",
                    id: { [sequelize_1.Op.ne]: offer.id },
                },
                transaction,
            });
            if (competingOffers.length > 0) {
                await db_1.models.nftOffer.update({
                    status: "REJECTED",
                    rejectedAt: new Date(),
                }, {
                    where: {
                        tokenId: offerTokenId,
                        status: "ACTIVE",
                        id: { [sequelize_1.Op.ne]: offer.id },
                    },
                    transaction,
                });
                for (const competing of competingOffers) {
                    const competingAmount = Number(competing.amount) || 0;
                    const competingHeld = await (0, settlement_1.escrowHeldFor)(competing.id, transaction);
                    const competingEscrow = competingHeld !== null && competingHeld !== void 0 ? competingHeld : competingAmount * (1 + marketplaceFeePercent / 100);
                    try {
                        await wallet_1.walletService.release({
                            idempotencyKey: `nft_offer_release_${competing.id}`,
                            userId: competing.userId,
                            walletType: "SPOT",
                            currency: competing.currency,
                            amount: competingEscrow,
                            operationType: "NFT_OFFER",
                            description: `Release escrow ${competingEscrow} ${competing.currency} - competing NFT offer auto-rejected`,
                            metadata: {
                                offerId: competing.id,
                                reason: "auto_rejected_accept_other",
                                acceptedOfferId: offer.id,
                            },
                            transaction,
                        });
                    }
                    catch (releaseError) {
                        if ((releaseError === null || releaseError === void 0 ? void 0 : releaseError.name) === "DuplicateOperationError" ||
                            (releaseError === null || releaseError === void 0 ? void 0 : releaseError.name) === "InsufficientHeldFundsError") {
                            console_1.logger.warn("NFT_OFFER", `Competing offer ${competing.id} escrow release skipped: ${releaseError.name}`);
                        }
                        else {
                            throw releaseError;
                        }
                    }
                }
            }
            const currentListing = await db_1.models.nftListing.findOne({
                where: {
                    tokenId: offerTokenId,
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
            await db_1.models.nftActivity.create({
                tokenId: offerTokenId,
                listingId: currentListing === null || currentListing === void 0 ? void 0 : currentListing.id,
                offerId: offer.id,
                type: "SALE",
                fromUserId: user.id,
                toUserId: offer.userId,
                price: offer.amount,
                currency: offer.currency,
                transactionHash: undefined,
                metadata: JSON.stringify({
                    saleType: "offer_accepted",
                    tokenName: offerToken.name,
                    offerPrice: offer.amount,
                    acceptedAt: new Date().toISOString(),
                    pendingBlockchainConfirmation: true,
                    marketplaceFee,
                    royalty,
                    sellerReceives,
                    buyerPays,
                    escrowSettled: false,
                }),
            }, { transaction });
        });
        ctx === null || ctx === void 0 ? void 0 : ctx.success("Offer accepted! Buyer must complete blockchain transfer to finalize.");
        return {
            message: "Offer accepted! Buyer must complete blockchain transfer to finalize.",
            data: {
                offerId: offer.id,
                tokenId: offerTokenId,
                status: "ACCEPTED",
                acceptedAt: new Date().toISOString(),
                payment: {
                    offerAmount: offer.amount,
                    marketplaceFee,
                    marketplaceFeePercent,
                    royalty,
                    royaltyPercent,
                    sellerReceives,
                    totalBuyerPays: buyerPays,
                    currency: offer.currency,
                    breakdown: {
                        description: "Payment distribution",
                        seller: {
                            receives: sellerReceives,
                            percentage: ((sellerReceives / offer.amount) * 100).toFixed(2) + "%",
                        },
                        marketplace: {
                            receives: marketplaceFee,
                            percentage: marketplaceFeePercent + "%",
                        },
                        creator: {
                            receives: royalty,
                            percentage: royaltyPercent + "%",
                        },
                    },
                },
                web3Instructions: {
                    step: 1,
                    description: "Buyer must complete blockchain transfer",
                    nftContract: tokenCollection.contractAddress,
                    tokenId: offerToken.tokenId,
                    chain: tokenCollection.chain,
                    marketplaceContract: (marketplaceContract === null || marketplaceContract === void 0 ? void 0 : marketplaceContract.contractAddress) || "CONFIGURE_IN_SETTINGS",
                    transferInstructions: {
                        step1: "The seller approves the marketplace contract (if not already approved)",
                        step2: "The seller transfers the NFT to the buyer's wallet on chain",
                        step3: `Either party calls POST /api/nft/offer/${offer.id}/confirm with the transaction hash`,
                        step4: `On confirmation the escrowed ${buyerPays} ${offer.currency} is split between seller, creator and platform`,
                    },
                    smartContractCall: {
                        contract: (marketplaceContract === null || marketplaceContract === void 0 ? void 0 : marketplaceContract.contractAddress) || "MARKETPLACE_CONTRACT_ADDRESS",
                        method: "acceptOffer",
                        parameters: {
                            nftContract: tokenCollection.contractAddress,
                            tokenId: offerToken.tokenId,
                            offerId: offer.id,
                            seller: user.id,
                            buyer: offer.userId,
                            price: offer.amount,
                            marketplaceFee,
                            royalty,
                        },
                        value: buyerPays,
                        currency: offer.currency,
                    },
                },
                buyer: {
                    id: offer.userId,
                    name: offer.user ? `${offer.user.firstName} ${offer.user.lastName}` : "Unknown",
                    email: ((_b = offer.user) === null || _b === void 0 ? void 0 : _b.email) || "",
                },
                seller: {
                    id: user.id,
                    name: (0, nft_auth_1.actorDisplayName)(await (0, nft_auth_1.loadActor)(user.id)),
                },
                nft: {
                    id: offerToken.id,
                    name: offerToken.name,
                    image: offerToken.image,
                    collection: tokenCollection.name,
                },
                nextSteps: {
                    forBuyer: [
                        "1. Review the payment breakdown above",
                        `2. ${buyerPays} ${offer.currency} is already held in escrow — no further payment is needed`,
                        "3. Once the seller has transferred the NFT on chain, confirm it with the transaction hash",
                    ],
                    forSeller: [
                        "1. Transfer the NFT to the buyer's wallet on chain",
                        "2. Call the confirm endpoint with the transaction hash",
                        `3. You will receive ${sellerReceives} ${offer.currency} the moment the transfer is confirmed`,
                    ],
                },
            },
        };
    }
    catch (error) {
        console_1.logger.error("NFT_OFFER_ACCEPT", "Failed to accept NFT offer", error);
        if (error.statusCode) {
            throw error;
        }
        if (error.name === 'SequelizeForeignKeyConstraintError') {
            throw (0, error_1.createError)({
                statusCode: 400,
                message: "Referenced offer or token no longer exists",
            });
        }
        if (error.name === 'SequelizeUniqueConstraintError') {
            throw (0, error_1.createError)({
                statusCode: 409,
                message: "Offer acceptance conflict",
            });
        }
        const detail = Array.isArray(error === null || error === void 0 ? void 0 : error.errors)
            ? error.errors.map((e) => e.message).filter(Boolean).join("; ")
            : error === null || error === void 0 ? void 0 : error.message;
        throw (0, error_1.createError)({
            statusCode: 500,
            message: detail
                ? `Failed to accept the offer: ${detail}`
                : "An unexpected error occurred while accepting the offer. Please try again.",
        });
    }
};
