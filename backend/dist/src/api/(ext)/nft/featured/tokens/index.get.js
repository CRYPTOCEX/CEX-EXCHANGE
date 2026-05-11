"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const console_1 = require("@b/utils/console");
exports.metadata = {
    summary: "Get featured NFT tokens",
    operationId: "getFeaturedNftTokens",
    tags: ["NFT", "Token", "Featured"],
    logModule: "NFT",
    logTitle: "Get Featured Tokens",
    parameters: [
        {
            name: "limit",
            in: "query",
            description: "Number of featured tokens to return",
            required: false,
            schema: { type: "integer", minimum: 1, maximum: 50, default: 12 },
        },
        {
            name: "category",
            in: "query",
            description: "Filter by category slug",
            required: false,
            schema: { type: "string" },
        },
    ],
    responses: {
        200: {
            description: "Featured tokens retrieved successfully",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            data: {
                                type: "array",
                                items: { $ref: "#/components/schemas/NftToken" }
                            }
                        }
                    }
                }
            }
        },
        500: { description: "Internal Server Error" }
    },
    requiresAuth: false,
};
exports.default = async (data) => {
    const { query, user, ctx } = data;
    try {
        const limit = Math.min(parseInt(query.limit) || 12, 50);
        const categorySlug = query.category;
        const whereConditions = {
            status: "MINTED",
            isListed: true,
        };
        const categoryInclude = {
            model: db_1.models.nftCollection,
            as: "collection",
            attributes: ["id", "name", "symbol", "slug", "logoImage", "isVerified"],
            where: { status: "ACTIVE" },
            required: true,
            include: [
                {
                    model: db_1.models.nftCategory,
                    as: "category",
                    attributes: ["id", "name", "slug"],
                    required: false,
                }
            ]
        };
        if (categorySlug) {
            categoryInclude.include[0].where = { slug: categorySlug };
            categoryInclude.include[0].required = true;
            categoryInclude.required = true;
        }
        const featuredTokens = await db_1.models.nftToken.findAll({
            attributes: [
                'id',
                'tokenId',
                'name',
                'description',
                'image',
                'metadataUri',
                'attributes',
                'rarity',
                'views',
                'createdAt',
            ],
            where: whereConditions,
            include: [
                categoryInclude,
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
                    as: "listings",
                    attributes: ["id", "type", "price", "currency", "startTime", "endTime"],
                    where: { status: "ACTIVE" },
                    required: false,
                    separate: true,
                    limit: 1,
                    order: [['createdAt', 'DESC']],
                },
                ...((user === null || user === void 0 ? void 0 : user.id) ? [{
                        model: db_1.models.nftFavorite,
                        as: "favorites",
                        attributes: ["id"],
                        where: { userId: user.id },
                        required: false,
                    }] : []),
            ],
            order: [
                ['views', 'DESC'],
                ['updatedAt', 'DESC'],
                ['createdAt', 'DESC'],
            ],
            limit,
        });
        const transformedTokens = featuredTokens.map((token) => {
            const data = token.toJSON();
            ctx === null || ctx === void 0 ? void 0 : ctx.success("Get Featured Tokens completed successfully");
            return {
                ...data,
                isFavorited: (user === null || user === void 0 ? void 0 : user.id) ? (data.favorites && data.favorites.length > 0) : false,
                favorites: undefined,
                currentListing: data.listings && data.listings.length > 0 ? data.listings[0] : null,
                listings: undefined,
                attributes: typeof data.attributes === 'string'
                    ? JSON.parse(data.attributes || '[]')
                    : data.attributes || [],
            };
        });
        return transformedTokens;
    }
    catch (error) {
        console_1.logger.error("NFT", "Failed to fetch featured tokens", error);
        if (error.name === 'SequelizeDatabaseError') {
            throw (0, error_1.createError)({
                statusCode: 400,
                message: "Invalid query parameters provided",
            });
        }
        throw (0, error_1.createError)({
            statusCode: 500,
            message: "An unexpected error occurred while fetching featured tokens. Please try again.",
        });
    }
};
