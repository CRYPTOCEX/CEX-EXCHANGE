"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MARKETPLACE_FEE_SETTING = void 0;
exports.settingEnabled = settingEnabled;
exports.marketplaceFeePercent = marketplaceFeePercent;
exports.escrowHeldFor = escrowHeldFor;
exports.royaltyRecipientUserId = royaltyRecipientUserId;
exports.settleAcceptedOffer = settleAcceptedOffer;
const db_1 = require("@b/db");
const sequelize_1 = require("sequelize");
const wallet_1 = require("@b/services/wallet");
const fees_1 = require("@b/utils/fees");
const error_1 = require("@b/utils/error");
const console_1 = require("@b/utils/console");
const cache_1 = require("@b/utils/cache");
const offer_split_1 = require("./offer-split");
exports.MARKETPLACE_FEE_SETTING = "nftMarketplaceFeePercentage";
function settingEnabled(value, fallback) {
    if (value === undefined || value === null || value === "")
        return fallback;
    if (typeof value === "boolean")
        return value;
    const normalised = String(value).trim().toLowerCase();
    if (["false", "0", "no", "off", "disabled"].includes(normalised))
        return false;
    if (["true", "1", "yes", "on", "enabled"].includes(normalised))
        return true;
    return fallback;
}
function marketplaceFeePercent(settings) {
    const raw = settings.get(exports.MARKETPLACE_FEE_SETTING);
    const parsed = parseFloat(raw !== null && raw !== void 0 ? raw : "");
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : 2.5;
}
async function escrowHeldFor(offerId, transaction) {
    const rows = await db_1.sequelize.query("SELECT amount FROM transaction WHERE idempotencyKey = :key LIMIT 1", {
        replacements: { key: `nft_offer_hold_${offerId}` },
        type: sequelize_1.QueryTypes.SELECT,
        transaction,
    });
    if (!rows.length)
        return null;
    const amount = Number(rows[0].amount);
    return Number.isFinite(amount) ? amount : null;
}
async function royaltyRecipientUserId(collectionId, transaction) {
    var _a;
    const collection = await db_1.models.nftCollection.findByPk(collectionId, {
        attributes: ["id", "creatorId"],
        transaction,
    });
    if (!collection)
        return null;
    const creator = await db_1.models.nftCreator.findByPk(collection.creatorId, {
        attributes: ["id", "userId"],
        transaction,
    });
    return (_a = creator === null || creator === void 0 ? void 0 : creator.userId) !== null && _a !== void 0 ? _a : null;
}
async function settleAcceptedOffer(opts) {
    var _a, _b;
    const { offerId, transactionHash, transaction } = opts;
    const offer = await db_1.models.nftOffer.findByPk(offerId, { transaction });
    if (!offer) {
        throw (0, error_1.createError)({ statusCode: 404, message: "Offer not found" });
    }
    const token = await db_1.models.nftToken.findByPk(offer.tokenId, {
        attributes: ["id", "ownerId", "collectionId"],
        transaction,
    });
    const sellerId = (_a = offer.sellerId) !== null && _a !== void 0 ? _a : token === null || token === void 0 ? void 0 : token.ownerId;
    if (!sellerId) {
        throw (0, error_1.createError)({
            statusCode: 409,
            message: "Cannot settle this offer: the seller could not be resolved",
        });
    }
    const settings = await cache_1.CacheManager.getInstance().getSettings();
    const feePercent = marketplaceFeePercent(settings);
    const collection = (token === null || token === void 0 ? void 0 : token.collectionId)
        ? await db_1.models.nftCollection.findByPk(token.collectionId, {
            attributes: ["id", "royaltyPercentage"],
            transaction,
        })
        : null;
    const maxRoyaltyPercent = parseFloat((_b = settings.get("nftMaxRoyaltyPercentage")) !== null && _b !== void 0 ? _b : "10");
    const royaltyPercent = Math.min(Number(collection === null || collection === void 0 ? void 0 : collection.royaltyPercentage) || 0, Number.isFinite(maxRoyaltyPercent) ? maxRoyaltyPercent : 10);
    const amount = Number(offer.amount);
    const held = await escrowHeldFor(offerId, transaction);
    const { buyerPaid, marketplaceFee, royalty, sellerReceives, feePercent: settledFeePercent, } = (0, offer_split_1.splitOfferEscrow)({
        amount,
        heldAmount: held,
        currentFeePercent: feePercent,
        royaltyPercent,
    });
    await wallet_1.walletService.executeFromHold({
        idempotencyKey: `nft_offer_execute_${offerId}`,
        userId: offer.userId,
        walletType: "SPOT",
        currency: offer.currency,
        amount: buyerPaid,
        operationType: "NFT_PURCHASE",
        description: `Settle NFT offer ${offerId}: deduct ${buyerPaid} ${offer.currency} from escrow`,
        referenceId: `${offerId}_settle`,
        metadata: {
            offerId,
            tokenId: offer.tokenId,
            offerAmount: amount,
            marketplaceFee,
            royalty,
            transactionHash,
        },
        transaction,
    });
    await wallet_1.walletService.credit({
        idempotencyKey: `nft_offer_credit_seller_${offerId}`,
        userId: sellerId,
        walletType: "SPOT",
        currency: offer.currency,
        amount: sellerReceives,
        operationType: "NFT_SALE",
        description: `NFT sale proceeds ${sellerReceives} ${offer.currency} from offer ${offerId}`,
        referenceId: `${offerId}_seller`,
        metadata: {
            offerId,
            tokenId: offer.tokenId,
            buyerId: offer.userId,
            offerAmount: amount,
            marketplaceFee,
            royalty,
            transactionHash,
        },
        transaction,
    });
    if (royalty > 0 && (token === null || token === void 0 ? void 0 : token.collectionId)) {
        const royaltyUserId = await royaltyRecipientUserId(token.collectionId, transaction);
        if (royaltyUserId) {
            await wallet_1.walletService.credit({
                idempotencyKey: `nft_offer_royalty_${offerId}`,
                userId: royaltyUserId,
                walletType: "SPOT",
                currency: offer.currency,
                amount: royalty,
                operationType: "NFT_SALE",
                description: `Creator royalty ${royalty} ${offer.currency} from offer ${offerId}`,
                referenceId: `${offerId}_royalty`,
                metadata: {
                    offerId,
                    tokenId: offer.tokenId,
                    collectionId: token.collectionId,
                    royaltyPercent,
                    sellerIsCreator: royaltyUserId === sellerId,
                },
                transaction,
            });
        }
        else {
            console_1.logger.warn("NFT_OFFER", `No creator user resolved for collection ${token.collectionId}; royalty ${royalty} not paid`);
        }
    }
    if (marketplaceFee > 0) {
        await (0, fees_1.collectPlatformFee)({
            userId: sellerId,
            currency: offer.currency,
            walletType: "SPOT",
            feeAmount: marketplaceFee,
            type: "NFT_SALE",
            description: `Marketplace fee from NFT offer ${offerId}`,
            referenceId: offerId,
            metadata: {
                offerId,
                tokenId: offer.tokenId,
                sellerId,
                buyerId: offer.userId,
            },
            transaction,
        });
    }
    return {
        marketplaceFee,
        marketplaceFeePercent: settledFeePercent,
        royalty,
        royaltyPercent,
        sellerReceives,
        buyerPaid,
        sellerId,
        currency: offer.currency,
    };
}
