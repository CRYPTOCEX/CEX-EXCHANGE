"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const console_1 = require("@b/utils/console");
exports.metadata = {
    summary: "Get all active NFT listings",
    operationId: "getNFTListings",
    tags: ["NFT", "Marketplace"],
    parameters: [
        {
            name: "status",
            in: "query",
            description: "Filter by listing status",
            schema: { type: "string", enum: ["ACTIVE", "SOLD", "CANCELLED", "EXPIRED"] },
        },
        {
            name: "type",
            in: "query",
            description: "Filter by listing type",
            schema: { type: "string", enum: ["FIXED_PRICE", "AUCTION", "BUNDLE"] },
        },
        {
            name: "categoryId",
            in: "query",
            description: "Filter by category ID",
            schema: { type: "string" },
        },
        {
            name: "collectionId",
            in: "query",
            description: "Filter by collection ID",
            schema: { type: "string" },
        },
        {
            name: "minPrice",
            in: "query",
            description: "Minimum price filter",
            schema: { type: "number" },
        },
        {
            name: "maxPrice",
            in: "query",
            description: "Maximum price filter",
            schema: { type: "number" },
        },
        {
            name: "sortBy",
            in: "query",
            description: "Sort listings by field",
            schema: {
                type: "string",
                enum: ["recently_listed", "price_low_high", "price_high_low", "ending_soon", "most_viewed"],
            },
        },
        {
            name: "limit",
            in: "query",
            description: "Number of results to return",
            schema: { type: "number", default: 20 },
        },
        {
            name: "offset",
            in: "query",
            description: "Number of results to skip",
            schema: { type: "number", default: 0 },
        },
    ],
    responses: {
        200: { description: "List of NFT listings retrieved successfully" },
        500: { description: "Internal Server Error" },
    },
    requiresAuth: false,
};
exports.default = async (data) => {
    const { status = "ACTIVE", type, categoryId, collectionId, minPrice, maxPrice, sortBy = "recently_listed", limit = 20, offset = 0, } = data.query;
    try {
        const where = {
            status: status || "ACTIVE",
        };
        if (type) {
            where.type = type;
        }
        if (minPrice || maxPrice) {
            where.price = {};
            if (minPrice)
                where.price.$gte = parseFloat(minPrice);
            if (maxPrice)
                where.price.$lte = parseFloat(maxPrice);
        }
        let order = [];
        switch (sortBy) {
            case "price_low_high":
                order = [["price", "ASC"]];
                break;
            case "price_high_low":
                order = [["price", "DESC"]];
                break;
            case "ending_soon":
                order = [["endTime", "ASC"]];
                break;
            case "most_viewed":
                order = [["views", "DESC"]];
                break;
            case "recently_listed":
            default:
                order = [["createdAt", "DESC"]];
                break;
        }
        const include = [
            {
                model: db_1.models.nftToken,
                as: "token",
                required: true,
                attributes: [
                    "id",
                    "tokenId",
                    "name",
                    "description",
                    "image",
                    "metadataUri",
                    "collectionId",
                    "ownerId",
                    "creatorId",
                    "views",
                    "likes",
                    "rarity",
                    "status",
                ],
                include: [
                    {
                        model: db_1.models.nftCollection,
                        as: "collection",
                        attributes: ["id", "name", "slug", "logoImage", "isVerified", "chain", "network"],
                        required: (collectionId || categoryId) ? true : false,
                        where: {
                            ...(collectionId && { id: collectionId }),
                            ...(categoryId && { categoryId }),
                        },
                        include: [
                            {
                                model: db_1.models.nftCreator,
                                as: "creator",
                                attributes: ["id", "displayName", "banner", "isVerified"],
                                include: [
                                    {
                                        model: db_1.models.user,
                                        as: "user",
                                        attributes: ["id", "firstName", "lastName", "avatar"],
                                    },
                                ],
                            },
                        ],
                    },
                    {
                        model: db_1.models.user,
                        as: "owner",
                        attributes: ["id", "firstName", "lastName", "avatar"],
                    },
                    {
                        model: db_1.models.nftCreator,
                        as: "creator",
                        attributes: ["id", "displayName", "banner", "isVerified"],
                        include: [
                            {
                                model: db_1.models.user,
                                as: "user",
                                attributes: ["id", "firstName", "lastName", "avatar"],
                            },
                        ],
                    },
                ],
            },
            {
                model: db_1.models.user,
                as: "seller",
                attributes: ["id", "firstName", "lastName", "avatar"],
            },
        ];
        const { count, rows: listings } = await db_1.models.nftListing.findAndCountAll({
            where,
            include,
            order,
            limit: parseInt(limit),
            offset: parseInt(offset),
            distinct: true,
        });
        return {
            items: listings,
            pagination: {
                total: count,
                limit: parseInt(limit),
                offset: parseInt(offset),
                hasMore: count > parseInt(offset) + parseInt(limit),
            },
        };
    }
    catch (error) {
        console_1.logger.error("NFT", "Error fetching NFT listings", error);
        throw (0, error_1.createError)({
            statusCode: 500,
            message: error.message || "Failed to fetch NFT listings",
        });
    }
};
