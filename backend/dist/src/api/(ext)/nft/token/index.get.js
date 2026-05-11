"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const query_1 = require("@b/utils/query");
const error_1 = require("@b/utils/error");
const sequelize_1 = require("sequelize");
const console_1 = require("@b/utils/console");
const sanitizeSearchInput = (input) => {
    if (!input || typeof input !== 'string')
        return '';
    return input
        .replace(/[%_\\]/g, '\\$&')
        .replace(/['"`;]/g, '')
        .trim()
        .substring(0, 100);
};
exports.metadata = {
    summary: "List NFT tokens",
    operationId: "listNFTTokens",
    tags: ["NFT", "Token"],
    parameters: [
        {
            name: "search",
            in: "query",
            description: "Search in token name and description",
            schema: { type: "string" },
        },
        {
            name: "collectionId",
            in: "query",
            description: "Filter by collection ID",
            schema: { type: "string" },
        },
        {
            name: "categoryId",
            in: "query",
            description: "Filter by category ID",
            schema: { type: "string" },
        },
        {
            name: "creatorId",
            in: "query",
            description: "Filter by creator ID",
            schema: { type: "string" },
        },
        {
            name: "ownerId",
            in: "query",
            description: "Filter by current owner ID",
            schema: { type: "string" },
        },
        {
            name: "status",
            in: "query",
            description: "Filter by token status",
            schema: { type: "string", enum: ["MINTED", "LAZY", "BURNED"] },
        },
        {
            name: "rarity",
            in: "query",
            description: "Filter by rarity",
            schema: { type: "string", enum: ["COMMON", "UNCOMMON", "RARE", "EPIC", "LEGENDARY"] },
        },
        {
            name: "isListed",
            in: "query",
            description: "Filter by listing status",
            schema: { type: "boolean" },
        },
        {
            name: "priceRange",
            in: "query",
            description: "Price range filter (e.g., '0-1', '1-5', '5-10', '10+')",
            schema: { type: "string" },
        },
        {
            name: "sortBy",
            in: "query",
            description: "Sort order",
            schema: {
                type: "string",
                enum: ["recent", "oldest", "price_low", "price_high", "popular", "ending_soon"]
            },
        },
        {
            name: "page",
            in: "query",
            description: "Page number",
            schema: { type: "integer", minimum: 1 },
        },
        {
            name: "limit",
            in: "query",
            description: "Items per page",
            schema: { type: "integer", minimum: 1, maximum: 100 },
        },
    ],
    responses: {
        200: { description: "NFT tokens retrieved successfully" },
        500: { description: "Internal Server Error" },
    },
    requiresAuth: false,
};
exports.default = async (data) => {
    const { query, user } = data;
    try {
        const whereConditions = {
            status: "MINTED",
        };
        if (query.search) {
            const sanitizedSearch = sanitizeSearchInput(query.search);
            if (sanitizedSearch.length >= 2) {
                whereConditions[sequelize_1.Op.or] = [
                    { name: { [sequelize_1.Op.like]: `%${sanitizedSearch}%` } },
                    { description: { [sequelize_1.Op.like]: `%${sanitizedSearch}%` } },
                ];
            }
        }
        if (query.collectionId) {
            whereConditions.collectionId = query.collectionId;
        }
        if (query.creatorId) {
            whereConditions.creatorId = query.creatorId;
        }
        if (query.ownerId) {
            whereConditions.ownerId = query.ownerId;
        }
        if (query.rarity) {
            whereConditions.rarity = query.rarity;
        }
        if (query.isListed !== undefined) {
            whereConditions.isListed = query.isListed === "true";
        }
        if (query.excludeId) {
            whereConditions.id = { [sequelize_1.Op.ne]: query.excludeId };
        }
        const includeModels = [
            {
                model: db_1.models.nftCollection,
                as: "collection",
                attributes: ["id", "name", "symbol", "slug", "logoImage", "isVerified"],
                where: {
                    status: "ACTIVE",
                    ...(query.categoryId ? { categoryId: query.categoryId } : {}),
                },
                required: true,
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
            {
                model: db_1.models.user,
                as: "owner",
                attributes: ["id", "firstName", "lastName", "avatar"],
            },
            {
                model: db_1.models.nftListing,
                as: "currentListing",
                attributes: ["id", "type", "price", "currency", "startTime", "endTime"],
                where: { status: "ACTIVE" },
                required: false,
            },
        ];
        if (query.priceRange) {
            const [min, max] = query.priceRange.split("-");
            const priceWhere = {};
            if (min && min !== "0") {
                priceWhere.price = { [sequelize_1.Op.gte]: parseFloat(min) };
            }
            if (max && max !== "+") {
                priceWhere.price = {
                    ...priceWhere.price,
                    [sequelize_1.Op.lte]: parseFloat(max),
                };
            }
            else if (query.priceRange.endsWith("+")) {
                priceWhere.price = { [sequelize_1.Op.gte]: parseFloat(min) };
            }
            const listingInclude = includeModels.find(inc => inc.as === "currentListing");
            if (listingInclude) {
                listingInclude.where = { ...listingInclude.where, ...priceWhere };
                listingInclude.required = true;
            }
        }
        if (user === null || user === void 0 ? void 0 : user.id) {
            includeModels.push({
                model: db_1.models.nftFavorite,
                as: "favorites",
                attributes: ["id"],
                where: { userId: user.id },
                required: false,
            });
        }
        let sortField = "createdAt";
        let sortOrder = "DESC";
        switch (query.sortBy) {
            case "oldest":
                sortField = "createdAt";
                sortOrder = "ASC";
                break;
            case "price_low":
                sortField = "price";
                sortOrder = "ASC";
                break;
            case "price_high":
                sortField = "price";
                sortOrder = "DESC";
                break;
            case "popular":
                sortField = "views";
                sortOrder = "DESC";
                break;
            case "ending_soon":
                sortField = "endTime";
                sortOrder = "ASC";
                break;
            default:
                sortField = "createdAt";
                sortOrder = "DESC";
        }
        const result = await (0, query_1.getFiltered)({
            model: db_1.models.nftToken,
            query,
            where: whereConditions,
            includeModels,
            sortField,
        });
        const transformedItems = result.items.map((token) => ({
            ...token,
            isFavorited: token.favorites && token.favorites.length > 0,
            favorites: undefined,
        }));
        return {
            items: transformedItems,
            pagination: result.pagination,
        };
    }
    catch (error) {
        console_1.logger.error("NFT_TOKENS", "Failed to fetch NFT tokens", error);
        if (error.statusCode) {
            throw error;
        }
        if (error.name === 'SequelizeDatabaseError') {
            throw (0, error_1.createError)({
                statusCode: 400,
                message: "Invalid search parameters provided",
            });
        }
        throw (0, error_1.createError)({
            statusCode: 500,
            message: "An unexpected error occurred while fetching NFT tokens. Please try again.",
        });
    }
};
