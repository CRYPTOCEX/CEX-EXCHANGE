"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const sequelize_1 = require("sequelize");
const display_name_1 = require("@b/utils/display-name");
exports.metadata = {
    summary: "Get NFT token by ID",
    operationId: "getNFTToken",
    tags: ["NFT", "Token"],
    parameters: [
        {
            name: "id",
            in: "path",
            required: true,
            description: "NFT token ID",
            schema: { type: "string" },
        },
    ],
    responses: {
        200: { description: "NFT token retrieved successfully" },
        404: { description: "NFT token not found" },
        500: { description: "Internal Server Error" },
    },
    requiresAuth: false,
};
exports.default = async (data) => {
    var _a;
    const { params, user } = data;
    const { id } = params;
    if (!id) {
        throw (0, error_1.createError)({
            statusCode: 400,
            message: "Token ID is required",
        });
    }
    try {
        const token = await db_1.models.nftToken.findOne({
            where: { id },
            attributes: [
                "id", "collectionId", "tokenId", "blockchainTokenId", "name",
                "description", "image", "attributes", "metadataUri", "metadataHash",
                "ownerId", "creatorId", "mintedAt", "isMinted", "isListed", "views",
                "likes", "rarity", "rarityScore", "status", "createdAt", "updatedAt",
            ],
            include: [
                {
                    model: db_1.models.nftCollection,
                    as: "collection",
                    attributes: [
                        "id", "name", "symbol", "slug", "logoImage", "bannerImage",
                        "isVerified", "chain", "network", "contractAddress"
                    ],
                    include: [
                        {
                            model: db_1.models.nftCreator,
                            as: "creator",
                            attributes: ["id", "displayName", "banner", "isVerified"],
                            include: [
                                {
                                    model: db_1.models.user,
                                    as: "user",
                                    attributes: ["id", ...display_name_1.PUBLIC_NAME_ATTRIBUTES, "avatar"],
                                },
                            ],
                        },
                    ],
                },
                {
                    model: db_1.models.nftCreator,
                    as: "creator",
                    attributes: ["id", "displayName", "banner", "isVerified"],
                    include: [
                        {
                            model: db_1.models.user,
                            as: "user",
                            attributes: ["id", ...display_name_1.PUBLIC_NAME_ATTRIBUTES, "avatar"],
                        },
                    ],
                },
                {
                    model: db_1.models.user,
                    as: "owner",
                    attributes: ["id", ...display_name_1.PUBLIC_NAME_ATTRIBUTES, "avatar"],
                },
                {
                    model: db_1.models.nftListing,
                    as: "currentListing",
                    attributes: [
                        "id", "type", "price", "currency", "startTime", "endTime",
                        "reservePrice", "minBidIncrement", "buyNowPrice"
                    ],
                    where: { status: "ACTIVE" },
                    required: false,
                },
                {
                    model: db_1.models.nftActivity,
                    as: "activities",
                    attributes: [
                        "id", "type", "price", "currency", "transactionHash", "createdAt"
                    ],
                    include: [
                        {
                            model: db_1.models.user,
                            as: "fromUser",
                            attributes: ["id", ...display_name_1.PUBLIC_NAME_ATTRIBUTES, "avatar"],
                        },
                        {
                            model: db_1.models.user,
                            as: "toUser",
                            attributes: ["id", ...display_name_1.PUBLIC_NAME_ATTRIBUTES, "avatar"],
                        },
                    ],
                    order: [["createdAt", "DESC"]],
                    limit: 10,
                },
            ],
        });
        if (!token) {
            throw (0, error_1.createError)({
                statusCode: 404,
                message: "NFT token not found",
            });
        }
        await db_1.models.nftToken.increment("views", {
            where: { id },
        });
        let isFavorited = false;
        if (user === null || user === void 0 ? void 0 : user.id) {
            const favorite = await db_1.models.nftFavorite.findOne({
                where: {
                    userId: user.id,
                    tokenId: id,
                },
            });
            isFavorited = !!favorite;
        }
        const similarTokens = await db_1.models.nftToken.findAll({
            where: {
                collectionId: token.collectionId,
                id: { [sequelize_1.Op.ne]: id },
                status: "MINTED",
            },
            attributes: [
                "id", "collectionId", "tokenId", "name", "image", "rarity",
                "rarityScore", "status", "isListed", "views", "likes", "createdAt",
            ],
            include: [
                {
                    model: db_1.models.nftListing,
                    as: "currentListing",
                    attributes: ["id", "type", "price", "currency"],
                    where: { status: "ACTIVE" },
                    required: false,
                },
            ],
            limit: 6,
            order: [["createdAt", "DESC"]],
        });
        const tokenJson = token.toJSON();
        if ((user === null || user === void 0 ? void 0 : user.id) && user.id === tokenJson.ownerId) {
            const ownerOnly = await db_1.models.nftToken.findOne({
                where: { id },
                attributes: ["ownerWalletAddress"],
            });
            tokenJson.ownerWalletAddress = (_a = ownerOnly === null || ownerOnly === void 0 ? void 0 : ownerOnly.get("ownerWalletAddress")) !== null && _a !== void 0 ? _a : null;
        }
        return (0, display_name_1.redactPublicNames)({
            ...tokenJson,
            isFavorited,
            similarTokens: similarTokens.map(t => t.toJSON()),
        });
    }
    catch (error) {
        console.error("Error fetching NFT token:", error);
        if (error.statusCode) {
            throw error;
        }
        throw (0, error_1.createError)({
            statusCode: 500,
            message: "Failed to fetch NFT token",
        });
    }
};
