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
                    attributes: ["id", "name", "image", "ownerId", "isListed", "collectionId", "contractAddress", "tokenId"],
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
        const marketplaceFeePercent = parseFloat(settings.get('nftMarketplaceFee') || '2.5');
        const royaltyPercent = tokenCollection.royaltyPercentage || 0;
        const marketplaceFee = offer.amount * (marketplaceFeePercent / 100);
        const royalty = offer.amount * (royaltyPercent / 100);
        const sellerReceives = offer.amount - marketplaceFee - royalty;
        const buyerPays = offer.amount + marketplaceFee;
        const marketplaceContract = await ((_a = db_1.models.nftMarketplace) === null || _a === void 0 ? void 0 : _a.findOne({
            where: {
                chain: tokenCollection.chain,
                status: "ACTIVE",
            },
        }));
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Accept offer in database transaction");
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
            }, { transaction });
            await db_1.models.nftOffer.update({
                status: "REJECTED",
                rejectedAt: new Date(),
            }, {
                where: {
                    tokenId: offer.tokenId,
                    status: "ACTIVE",
                    id: { [sequelize_1.Op.ne]: offer.id },
                },
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
            await db_1.models.nftActivity.create({
                tokenId: offer.tokenId,
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
                }),
            }, { transaction });
        });
        ctx === null || ctx === void 0 ? void 0 : ctx.success("Offer accepted! Buyer must complete blockchain transfer to finalize.");
        return {
            message: "Offer accepted! Buyer must complete blockchain transfer to finalize.",
            data: {
                offerId: offer.id,
                tokenId: offer.tokenId,
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
                    nftContract: offerToken.contractAddress || tokenCollection.contractAddress,
                    tokenId: offerToken.tokenId,
                    chain: tokenCollection.chain,
                    marketplaceContract: (marketplaceContract === null || marketplaceContract === void 0 ? void 0 : marketplaceContract.contractAddress) || "CONFIGURE_IN_SETTINGS",
                    buyerInstructions: {
                        step1: "Approve marketplace contract to transfer NFT (if not already approved)",
                        step2: `Transfer ${buyerPays} ${offer.currency} to marketplace contract`,
                        step3: "Marketplace contract will distribute funds and transfer NFT",
                        step4: "Call the confirm endpoint with transaction hash: POST /api/nft/offer/${offer.id}/confirm",
                    },
                    smartContractCall: {
                        contract: (marketplaceContract === null || marketplaceContract === void 0 ? void 0 : marketplaceContract.contractAddress) || "MARKETPLACE_CONTRACT_ADDRESS",
                        method: "acceptOffer",
                        parameters: {
                            nftContract: offerToken.contractAddress || tokenCollection.contractAddress,
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
                    name: `${user.firstName} ${user.lastName}`,
                },
                nft: {
                    id: offerToken.id,
                    name: offerToken.name,
                    image: offerToken.image,
                    collection: tokenCollection.name,
                },
                nextSteps: {
                    forBuyer: [
                        "1. Review payment breakdown above",
                        "2. Complete blockchain transfer using Web3 wallet",
                        `3. Pay total amount: ${buyerPays} ${offer.currency}`,
                        "4. Call confirm endpoint with transaction hash",
                    ],
                    forSeller: [
                        "1. Wait for buyer to complete blockchain transfer",
                        `2. You will receive: ${sellerReceives} ${offer.currency}`,
                        "3. NFT ownership will transfer automatically after confirmation",
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
        throw (0, error_1.createError)({
            statusCode: 500,
            message: "An unexpected error occurred while accepting the offer. Please try again.",
        });
    }
};
