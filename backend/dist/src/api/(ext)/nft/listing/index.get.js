"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const console_1 = require("@b/utils/console");
const sequelize_1 = require("sequelize");
const display_name_1 = require("@b/utils/display-name");
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
            name: "sortField",
            in: "query",
            description: "Alias for sortBy. Used when sortBy is not supplied.",
            schema: {
                type: "string",
                enum: ["recently_listed", "price_low_high", "price_high_low", "ending_soon", "most_viewed"],
            },
        },
        {
            name: "filter",
            in: "query",
            description: "JSON-encoded filter object. Supports { search: string } matched against the token's name and description (LIKE %search%). Invalid JSON is ignored.",
            schema: { type: "string" },
        },
        {
            name: "endingSoon",
            in: "query",
            description: "When true, restricts results to listings whose endTime falls within the next 24 hours.",
            schema: { type: "string", enum: ["true", "false"] },
        },
        {
            name: "hasOffers",
            in: "query",
            description: "When true, restricts results to listings that have at least one related nftOffer row.",
            schema: { type: "string", enum: ["true", "false"] },
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
    const { status = "ACTIVE", type, categoryId, collectionId, minPrice, maxPrice, sortBy, sortField, filter, endingSoon, hasOffers, limit = 20, offset = 0, } = data.query;
    try {
        const effectiveSort = sortBy || sortField || "recently_listed";
        let searchTerm;
        if (filter) {
            try {
                const parsed = typeof filter === "string" ? JSON.parse(filter) : filter;
                if (parsed && typeof parsed.search === "string" && parsed.search.trim()) {
                    searchTerm = parsed.search.trim();
                }
            }
            catch (_a) {
            }
        }
        const endingSoonActive = endingSoon === "true" || endingSoon === true;
        const hasOffersActive = hasOffers === "true" || hasOffers === true;
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
        if (endingSoonActive) {
            const now = new Date();
            const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);
            where.endTime = { [sequelize_1.Op.between]: [now, in24h] };
        }
        let order = [];
        switch (effectiveSort) {
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
        const tokenWhere = {};
        if (searchTerm) {
            tokenWhere[sequelize_1.Op.or] = [
                { name: { [sequelize_1.Op.like]: `%${searchTerm}%` } },
                { description: { [sequelize_1.Op.like]: `%${searchTerm}%` } },
            ];
        }
        const include = [
            {
                model: db_1.models.nftToken,
                as: "token",
                required: true,
                where: Object.keys(tokenWhere).length ? tokenWhere : undefined,
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
                                        attributes: ["id", ...display_name_1.PUBLIC_NAME_ATTRIBUTES, "avatar"],
                                    },
                                ],
                            },
                        ],
                    },
                    {
                        model: db_1.models.user,
                        as: "owner",
                        attributes: ["id", ...display_name_1.PUBLIC_NAME_ATTRIBUTES, "avatar"],
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
                ],
            },
            {
                model: db_1.models.user,
                as: "seller",
                attributes: ["id", ...display_name_1.PUBLIC_NAME_ATTRIBUTES, "avatar"],
            },
        ];
        if (hasOffersActive) {
            include.push({
                model: db_1.models.nftOffer,
                as: "offers",
                required: true,
                attributes: ["id"],
            });
        }
        const { count, rows: listings } = await db_1.models.nftListing.findAndCountAll({
            where,
            include,
            order,
            limit: parseInt(limit),
            offset: parseInt(offset),
            distinct: true,
        });
        return (0, display_name_1.redactPublicNames)({
            items: listings.map((listing) => listing.get({ plain: true })),
            pagination: {
                total: count,
                limit: parseInt(limit),
                offset: parseInt(offset),
                hasMore: count > parseInt(offset) + parseInt(limit),
            },
        });
    }
    catch (error) {
        console_1.logger.error("NFT", "Error fetching NFT listings", error);
        throw (0, error_1.createError)({
            statusCode: 500,
            message: error.message || "Failed to fetch NFT listings",
        });
    }
};
