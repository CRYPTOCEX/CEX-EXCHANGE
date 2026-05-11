"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const console_1 = require("@b/utils/console");
const sequelize_1 = require("sequelize");
exports.metadata = {
    summary: "Get trending NFT collections",
    operationId: "getTrendingNftCollections",
    tags: ["NFT", "Collection", "Trending"],
    parameters: [
        {
            name: "limit",
            in: "query",
            description: "Number of trending collections to return",
            required: false,
            schema: { type: "integer", minimum: 1, maximum: 50, default: 10 },
        },
        {
            name: "timeframe",
            in: "query",
            description: "Timeframe for trending calculation",
            required: false,
            schema: { type: "string", enum: ["24h", "7d", "30d"], default: "24h" },
        },
    ],
    responses: {
        200: {
            description: "Trending collections retrieved successfully",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            data: {
                                type: "array",
                                items: { $ref: "#/components/schemas/TrendingCollection" }
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
    const { query } = data;
    try {
        const limit = Math.min(parseInt(query.limit) || 10, 50);
        const timeframe = query.timeframe || "24h";
        let hoursBack = 24;
        switch (timeframe) {
            case "7d":
                hoursBack = 24 * 7;
                break;
            case "30d":
                hoursBack = 24 * 30;
                break;
            default:
                hoursBack = 24;
        }
        const timeframeCutoff = new Date(Date.now() - hoursBack * 60 * 60 * 1000);
        const trendingCollections = await db_1.models.nftCollection.findAll({
            attributes: [
                'id',
                'name',
                'slug',
                'logoImage',
                'bannerImage',
                'isVerified',
                'description',
                'totalSupply',
                [
                    (0, sequelize_1.literal)(`(
            SELECT COALESCE(SUM(s.price), 0)
            FROM nft_sale s
            INNER JOIN nft_token t ON s.tokenId = t.id
            WHERE t.collectionId = nftCollection.id
            AND s.status = 'COMPLETED'
            AND s.createdAt >= '${timeframeCutoff.toISOString()}'
          )`),
                    'recentVolume'
                ],
                [
                    (0, sequelize_1.literal)(`(
            SELECT COUNT(*)
            FROM nft_sale s
            INNER JOIN nft_token t ON s.tokenId = t.id
            WHERE t.collectionId = nftCollection.id
            AND s.status = 'COMPLETED'
            AND s.createdAt >= '${timeframeCutoff.toISOString()}'
          )`),
                    'recentSales'
                ],
                [
                    (0, sequelize_1.literal)(`(
            SELECT MIN(l.price)
            FROM nft_listing l
            INNER JOIN nft_token t ON l.tokenId = t.id
            WHERE t.collectionId = nftCollection.id
            AND l.status = 'ACTIVE'
            AND l.type = 'FIXED_PRICE'
          )`),
                    'floorPrice'
                ],
                [
                    (0, sequelize_1.literal)(`(
            SELECT COUNT(DISTINCT t.ownerId)
            FROM nft_token t
            WHERE t.collectionId = nftCollection.id
            AND t.status = 'MINTED'
          )`),
                    'uniqueOwners'
                ],
                [
                    (0, sequelize_1.literal)(`0`),
                    'volumeChange'
                ]
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
                            attributes: ["id", "firstName", "lastName", "avatar"],
                        },
                    ],
                },
                {
                    model: db_1.models.nftCategory,
                    as: "category",
                    attributes: ["id", "name", "slug"],
                },
            ],
            where: {
                status: "ACTIVE",
            },
            order: [
                [(0, sequelize_1.literal)('recentVolume'), 'DESC'],
                [(0, sequelize_1.literal)('recentSales'), 'DESC'],
                ['isVerified', 'DESC'],
                ['createdAt', 'DESC'],
            ],
            limit,
            subQuery: false,
        });
        const transformedCollections = trendingCollections.map((collection) => {
            const data = collection.toJSON();
            return {
                ...data,
                metrics: {
                    recentVolume: parseFloat(data.recentVolume) || 0,
                    recentSales: parseInt(data.recentSales) || 0,
                    floorPrice: parseFloat(data.floorPrice) || null,
                    uniqueOwners: parseInt(data.uniqueOwners) || 0,
                    volumeChange: parseFloat(data.volumeChange) || 0,
                },
                recentVolume: undefined,
                recentSales: undefined,
                floorPrice: undefined,
                uniqueOwners: undefined,
                volumeChange: undefined,
            };
        });
        return transformedCollections;
    }
    catch (error) {
        console_1.logger.error("NFT", "Failed to fetch trending collections", error);
        if (error.name === 'SequelizeDatabaseError') {
            throw (0, error_1.createError)({
                statusCode: 400,
                message: "Invalid query parameters provided",
            });
        }
        throw (0, error_1.createError)({
            statusCode: 500,
            message: "An unexpected error occurred while fetching trending collections. Please try again.",
        });
    }
};
