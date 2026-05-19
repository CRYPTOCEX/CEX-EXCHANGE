"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sanitizeAuthInput = exports.canManageListing = exports.requireNFTAdminPermissions = exports.checkNFTAdminPermissions = exports.requireCollectionOwnership = exports.requireNFTOwnership = exports.verifyBidOwnership = exports.verifyOfferOwnership = exports.verifyListingOwnership = exports.verifyCreatorProfileOwnership = exports.verifyCollectionOwnership = exports.verifyNFTOwnership = void 0;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const sequelize_1 = require("sequelize");
const verifyNFTOwnership = async (userId, tokenId) => {
    if (!userId || !tokenId) {
        return false;
    }
    const token = await db_1.models.nftToken.findOne({
        where: {
            id: tokenId,
            ownerId: userId,
            status: { [sequelize_1.Op.ne]: "BURNED" },
        },
    });
    return !!token;
};
exports.verifyNFTOwnership = verifyNFTOwnership;
const verifyCollectionOwnership = async (userId, collectionId) => {
    if (!userId || !collectionId) {
        return false;
    }
    const collection = await db_1.models.nftCollection.findOne({
        where: {
            id: collectionId,
            creatorId: userId,
        },
    });
    return !!collection;
};
exports.verifyCollectionOwnership = verifyCollectionOwnership;
const verifyCreatorProfileOwnership = async (userId, creatorId) => {
    if (!userId || !creatorId) {
        return false;
    }
    return userId === creatorId;
};
exports.verifyCreatorProfileOwnership = verifyCreatorProfileOwnership;
const verifyListingOwnership = async (userId, listingId) => {
    if (!userId || !listingId) {
        return false;
    }
    const listing = await db_1.models.nftListing.findOne({
        where: {
            id: listingId,
        },
        include: [
            {
                model: db_1.models.nftToken,
                as: "token",
                where: {
                    ownerId: userId,
                    status: { [sequelize_1.Op.ne]: "BURNED" },
                },
                required: true,
            },
        ],
    });
    return !!listing;
};
exports.verifyListingOwnership = verifyListingOwnership;
const verifyOfferOwnership = async (userId, offerId) => {
    if (!userId || !offerId) {
        return false;
    }
    const offer = await db_1.models.nftOffer.findOne({
        where: {
            id: offerId,
            userId: userId,
        },
    });
    return !!offer;
};
exports.verifyOfferOwnership = verifyOfferOwnership;
const verifyBidOwnership = async (userId, bidId) => {
    if (!userId || !bidId) {
        return false;
    }
    const bid = await db_1.models.nftBid.findOne({
        where: {
            id: bidId,
            userId: userId,
        },
    });
    return !!bid;
};
exports.verifyBidOwnership = verifyBidOwnership;
const requireNFTOwnership = async (userId, tokenId, errorMessage = "You don't own this NFT token") => {
    const isOwner = await (0, exports.verifyNFTOwnership)(userId, tokenId);
    if (!isOwner) {
        throw (0, error_1.createError)({
            statusCode: 403,
            message: errorMessage,
        });
    }
};
exports.requireNFTOwnership = requireNFTOwnership;
const requireCollectionOwnership = async (userId, collectionId, errorMessage = "You don't own this NFT collection") => {
    const isOwner = await (0, exports.verifyCollectionOwnership)(userId, collectionId);
    if (!isOwner) {
        throw (0, error_1.createError)({
            statusCode: 403,
            message: errorMessage,
        });
    }
};
exports.requireCollectionOwnership = requireCollectionOwnership;
const checkNFTAdminPermissions = (user) => {
    var _a, _b;
    return (((_b = (_a = user === null || user === void 0 ? void 0 : user.role) === null || _a === void 0 ? void 0 : _a.permissions) === null || _b === void 0 ? void 0 : _b.some((permission) => { var _a; return ((_a = permission.permission) === null || _a === void 0 ? void 0 : _a.name) === "access.nft"; })) || false);
};
exports.checkNFTAdminPermissions = checkNFTAdminPermissions;
const requireNFTAdminPermissions = (user, errorMessage = "Insufficient permissions for NFT operations") => {
    const hasPermissions = (0, exports.checkNFTAdminPermissions)(user);
    if (!hasPermissions) {
        throw (0, error_1.createError)({
            statusCode: 403,
            message: errorMessage,
        });
    }
};
exports.requireNFTAdminPermissions = requireNFTAdminPermissions;
const canManageListing = async (userId, listingId, user) => {
    if ((0, exports.checkNFTAdminPermissions)(user)) {
        return true;
    }
    return await (0, exports.verifyListingOwnership)(userId, listingId);
};
exports.canManageListing = canManageListing;
const sanitizeAuthInput = (input) => {
    if (!input || typeof input !== 'string') {
        return '';
    }
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    const sanitized = input.trim();
    if (!uuidRegex.test(sanitized)) {
        throw (0, error_1.createError)({
            statusCode: 400,
            message: "Invalid ID format provided",
        });
    }
    return sanitized;
};
exports.sanitizeAuthInput = sanitizeAuthInput;
