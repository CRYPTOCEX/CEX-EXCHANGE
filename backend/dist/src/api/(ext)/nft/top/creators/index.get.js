"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const console_1 = require("@b/utils/console");
const sequelize_1 = require("sequelize");
exports.metadata = {
    summary: "Get top NFT creators",
    operationId: "getTopNftCreators",
    tags: ["NFT", "Creator", "Top"],
    parameters: [
        {
            name: "limit",
            in: "query",
            required: false,
            schema: { type: "integer", minimum: 1, maximum: 50, default: 10 },
        },
        {
            name: "timeframe",
            in: "query",
            required: false,
            schema: { type: "string", enum: ["24h", "7d", "30d", "all"], default: "all" },
        },
        {
            name: "sortBy",
            in: "query",
            required: false,
            schema: { type: "string", enum: ["volume", "sales", "items", "followers"], default: "volume" },
        },
    ],
    responses: {
        200: {
            description: "Top creators retrieved successfully",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            data: {
                                type: "array",
                                items: { $ref: "#/components/schemas/TopCreator" }
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
        const timeframe = query.timeframe || "all";
        const sortBy = query.sortBy || "volume";
        let timeframeCutoff;
        switch (timeframe) {
            case "24h":
                timeframeCutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
                break;
            case "7d":
                timeframeCutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
                break;
            case "30d":
                timeframeCutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
                break;
            default:
                timeframeCutoff = new Date(0);
        }
        const topCreators = await db_1.models.nftCreator.findAll({
            attributes: [
                'id',
                'displayName',
                'bio',
                'banner',
                'isVerified',
                'verificationTier',
                'createdAt',
                'userId',
                [
                    (0, sequelize_1.literal)(`(
            SELECT COUNT(*)
            FROM nft_token t
            WHERE t.creatorId = nftCreator.id
            AND t.status = 'MINTED'
          )`),
                    'totalItems'
                ],
                [
                    (0, sequelize_1.literal)(`(
            SELECT COUNT(*)
            FROM nft_sale s
            INNER JOIN nft_token t ON s.tokenId = t.id
            WHERE t.creatorId = nftCreator.id
            AND s.status = 'COMPLETED'
            ${timeframe !== 'all' ? `AND s.createdAt >= '${timeframeCutoff.toISOString()}'` : ''}
          )`),
                    'totalSales'
                ],
                [
                    (0, sequelize_1.literal)(`(
            SELECT COALESCE(SUM(s.price), 0)
            FROM nft_sale s
            INNER JOIN nft_token t ON s.tokenId = t.id
            WHERE t.creatorId = nftCreator.id
            AND s.status = 'COMPLETED'
            ${timeframe !== 'all' ? `AND s.createdAt >= '${timeframeCutoff.toISOString()}'` : ''}
          )`),
                    'totalVolume'
                ],
                [
                    (0, sequelize_1.literal)(`(
            SELECT COUNT(*)
            FROM nft_collection c
            WHERE c.creatorId = nftCreator.id
            AND c.status = 'ACTIVE'
          )`),
                    'totalCollections'
                ],
                [
                    (0, sequelize_1.literal)(`(
            SELECT COUNT(*)
            FROM nft_creator_follows f
            WHERE f.followingId = nftCreator.userId
          )`),
                    'followersCount'
                ],
            ],
            include: [
                {
                    model: db_1.models.user,
                    as: "user",
                    attributes: ["id", "firstName", "lastName", "avatar", "email"],
                },
            ],
            where: {
                [sequelize_1.Op.and]: [
                    (0, sequelize_1.literal)(`(
            SELECT COUNT(*)
            FROM nft_token t
            WHERE t.creatorId = nftCreator.id
            AND t.status = 'MINTED'
          ) > 0`)
                ]
            },
            order: (() => {
                switch (sortBy) {
                    case "sales":
                        return [[(0, sequelize_1.literal)('totalSales'), 'DESC']];
                    case "items":
                        return [[(0, sequelize_1.literal)('totalItems'), 'DESC']];
                    case "volume":
                    default:
                        return [[(0, sequelize_1.literal)('totalVolume'), 'DESC']];
                }
            })(),
            limit,
            subQuery: false,
        });
        const transformedCreators = topCreators.map((creator) => {
            var _a;
            const data = creator.toJSON();
            return {
                id: data.id,
                userId: data.userId,
                displayName: data.displayName,
                username: data.user ? `${data.user.firstName} ${data.user.lastName}`.trim() : data.displayName,
                bio: data.bio,
                avatar: (_a = data.user) === null || _a === void 0 ? void 0 : _a.avatar,
                banner: data.banner,
                isVerified: data.isVerified || false,
                verificationTier: data.verificationTier,
                user: data.user,
                followers: parseInt(data.followersCount) || 0,
                metrics: {
                    totalItems: parseInt(data.totalItems) || 0,
                    totalSales: parseInt(data.totalSales) || 0,
                    totalVolume: parseFloat(data.totalVolume) || 0,
                    totalCollections: parseInt(data.totalCollections) || 0,
                },
                createdAt: data.createdAt,
            };
        });
        return {
            data: transformedCreators,
            metadata: {
                timeframe,
                sortBy,
                limit,
                totalFound: transformedCreators.length,
                generatedAt: new Date().toISOString(),
            },
        };
    }
    catch (error) {
        console_1.logger.error("NFT", "Failed to fetch top creators", error);
        if (error.name === 'SequelizeDatabaseError') {
            throw (0, error_1.createError)({
                statusCode: 400,
                message: "Invalid query parameters provided",
            });
        }
        throw (0, error_1.createError)({
            statusCode: 500,
            message: "An unexpected error occurred while fetching top creators. Please try again.",
        });
    }
};
