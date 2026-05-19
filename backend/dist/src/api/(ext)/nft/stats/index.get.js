"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const console_1 = require("@b/utils/console");
const sequelize_1 = require("sequelize");
exports.metadata = {
    summary: "Get public NFT marketplace statistics",
    operationId: "getNftStats",
    tags: ["NFT", "Stats", "Public"],
    parameters: [
        {
            name: "timeframe",
            in: "query",
            description: "Timeframe for statistics calculation",
            required: false,
            schema: { type: "string", enum: ["24h", "7d", "30d", "all"], default: "24h" },
        },
    ],
    responses: {
        200: {
            description: "NFT statistics retrieved successfully",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            message: { type: "string" },
                            data: {
                                type: "object",
                                properties: {
                                    overview: { type: "object" },
                                    volume: { type: "object" },
                                    collections: { type: "object" },
                                    activity: { type: "object" },
                                    timeframe: { type: "string" },
                                    generatedAt: { type: "string" },
                                    cutoffDate: { type: "string", nullable: true }
                                }
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
    var _a, _b, _c;
    const { query } = data;
    try {
        const timeframe = query.timeframe || "24h";
        let timeframeCutoff;
        switch (timeframe) {
            case "7d":
                timeframeCutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
                break;
            case "30d":
                timeframeCutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
                break;
            case "all":
                timeframeCutoff = new Date(0);
                break;
            default:
                timeframeCutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
        }
        const [overallStats, volumeStats, collectionStats, activityStats, topCollections] = await Promise.all([
            db_1.models.nftToken.findOne({
                attributes: [
                    [(0, sequelize_1.fn)('COUNT', (0, sequelize_1.col)('id')), 'totalTokens'],
                    [(0, sequelize_1.fn)('COUNT', (0, sequelize_1.fn)('DISTINCT', (0, sequelize_1.col)('collectionId'))), 'totalCollections'],
                    [(0, sequelize_1.fn)('COUNT', (0, sequelize_1.fn)('DISTINCT', (0, sequelize_1.col)('ownerId'))), 'totalOwners'],
                    [(0, sequelize_1.fn)('COUNT', (0, sequelize_1.fn)('DISTINCT', (0, sequelize_1.col)('creatorId'))), 'totalCreators'],
                ],
                where: { status: 'MINTED' },
                raw: true,
            }),
            db_1.models.nftSale.findOne({
                attributes: [
                    [(0, sequelize_1.fn)('COUNT', (0, sequelize_1.col)('id')), 'totalSales'],
                    [(0, sequelize_1.fn)('SUM', (0, sequelize_1.col)('price')), 'totalVolume'],
                    [(0, sequelize_1.fn)('AVG', (0, sequelize_1.col)('price')), 'averagePrice'],
                    [(0, sequelize_1.fn)('MAX', (0, sequelize_1.col)('price')), 'highestSale'],
                ],
                where: {
                    status: 'COMPLETED',
                    ...(timeframe !== 'all' && { createdAt: { [sequelize_1.Op.gte]: timeframeCutoff } }),
                },
                raw: true,
            }),
            db_1.models.nftCollection.findOne({
                attributes: [
                    [(0, sequelize_1.fn)('COUNT', (0, sequelize_1.col)('id')), 'totalCollections'],
                    [(0, sequelize_1.literal)('COUNT(CASE WHEN isVerified = 1 THEN 1 END)'), 'verifiedCollections'],
                ],
                where: {
                    status: 'ACTIVE',
                    ...(timeframe !== 'all' && { createdAt: { [sequelize_1.Op.gte]: timeframeCutoff } }),
                },
                raw: true,
            }),
            db_1.models.nftActivity.findAll({
                attributes: [
                    'type',
                    [(0, sequelize_1.fn)('COUNT', (0, sequelize_1.col)('id')), 'count'],
                ],
                where: {
                    ...(timeframe !== 'all' && { createdAt: { [sequelize_1.Op.gte]: timeframeCutoff } }),
                },
                group: ['type'],
                raw: true,
            }),
            db_1.models.nftCollection.findAll({
                attributes: [
                    'id',
                    'name',
                    'slug',
                    'logoImage',
                    'isVerified',
                    [
                        (0, sequelize_1.literal)(`(
              SELECT COALESCE(SUM(s.price), 0)
              FROM nft_sale s
              INNER JOIN nft_token t ON s.tokenId = t.id
              WHERE t.collectionId = nftCollection.id
              AND s.status = 'COMPLETED'
              ${timeframe !== 'all' ? `AND s.createdAt >= '${timeframeCutoff.toISOString()}'` : ''}
            )`),
                        'volume'
                    ],
                    [
                        (0, sequelize_1.literal)(`(
              SELECT COUNT(*)
              FROM nft_sale s
              INNER JOIN nft_token t ON s.tokenId = t.id
              WHERE t.collectionId = nftCollection.id
              AND s.status = 'COMPLETED'
              ${timeframe !== 'all' ? `AND s.createdAt >= '${timeframeCutoff.toISOString()}'` : ''}
            )`),
                        'sales'
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
                ],
                where: {
                    status: 'ACTIVE',
                },
                having: (0, sequelize_1.literal)('volume > 0'),
                order: [[(0, sequelize_1.literal)('volume'), 'DESC']],
                limit: 10,
                subQuery: false,
            }),
        ]);
        const priceRanges = await db_1.models.nftListing.findAll({
            attributes: [
                [(0, sequelize_1.fn)('MIN', (0, sequelize_1.col)('price')), 'minPrice'],
                [(0, sequelize_1.fn)('MAX', (0, sequelize_1.col)('price')), 'maxPrice'],
                [(0, sequelize_1.fn)('COUNT', (0, sequelize_1.col)('id')), 'totalListings'],
            ],
            where: {
                status: 'ACTIVE',
                type: 'FIXED_PRICE',
            },
            raw: true,
        });
        const activityByType = activityStats.reduce((acc, stat) => {
            acc[stat.type] = parseInt(stat.count);
            return acc;
        }, {});
        const transformedTopCollections = topCollections.map((collection) => {
            const data = collection.toJSON();
            return {
                ...data,
                volume: parseFloat(data.volume) || 0,
                sales: parseInt(data.sales) || 0,
                floorPrice: parseFloat(data.floorPrice) || null,
            };
        });
        const overallStatsData = overallStats;
        const volumeStatsData = volumeStats;
        const collectionStatsData = collectionStats;
        const priceRangesData = priceRanges;
        const stats = {
            overview: {
                totalTokens: parseInt(String((overallStatsData === null || overallStatsData === void 0 ? void 0 : overallStatsData.totalTokens) || 0)),
                totalCollections: parseInt(String((overallStatsData === null || overallStatsData === void 0 ? void 0 : overallStatsData.totalCollections) || 0)),
                totalOwners: parseInt(String((overallStatsData === null || overallStatsData === void 0 ? void 0 : overallStatsData.totalOwners) || 0)),
                totalCreators: parseInt(String((overallStatsData === null || overallStatsData === void 0 ? void 0 : overallStatsData.totalCreators) || 0)),
                totalListings: parseInt(String(((_a = priceRangesData[0]) === null || _a === void 0 ? void 0 : _a.totalListings) || 0)),
            },
            volume: {
                totalSales: parseInt(String((volumeStatsData === null || volumeStatsData === void 0 ? void 0 : volumeStatsData.totalSales) || 0)),
                totalVolume: parseFloat(String((volumeStatsData === null || volumeStatsData === void 0 ? void 0 : volumeStatsData.totalVolume) || 0)),
                averagePrice: parseFloat(String((volumeStatsData === null || volumeStatsData === void 0 ? void 0 : volumeStatsData.averagePrice) || 0)),
                highestSale: parseFloat(String((volumeStatsData === null || volumeStatsData === void 0 ? void 0 : volumeStatsData.highestSale) || 0)),
                priceRange: {
                    min: parseFloat(String(((_b = priceRangesData[0]) === null || _b === void 0 ? void 0 : _b.minPrice) || 0)),
                    max: parseFloat(String(((_c = priceRangesData[0]) === null || _c === void 0 ? void 0 : _c.maxPrice) || 0)),
                },
            },
            collections: {
                total: parseInt(String((collectionStatsData === null || collectionStatsData === void 0 ? void 0 : collectionStatsData.totalCollections) || 0)),
                verified: parseInt(String((collectionStatsData === null || collectionStatsData === void 0 ? void 0 : collectionStatsData.verifiedCollections) || 0)),
                topByVolume: transformedTopCollections,
            },
            activity: {
                breakdown: activityByType,
                total: Object.values(activityByType).reduce((sum, count) => sum + count, 0),
            },
        };
        return {
            ...stats,
            timeframe,
            generatedAt: new Date().toISOString(),
            cutoffDate: timeframe !== 'all' ? timeframeCutoff.toISOString() : null,
        };
    }
    catch (error) {
        console_1.logger.error("NFT_STATS", "Failed to fetch NFT statistics", error);
        if (error.name === 'SequelizeDatabaseError') {
            throw (0, error_1.createError)({
                statusCode: 400,
                message: "Invalid timeframe parameter provided",
            });
        }
        throw (0, error_1.createError)({
            statusCode: 500,
            message: "An unexpected error occurred while fetching NFT statistics. Please try again.",
        });
    }
};
