"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const console_1 = require("@b/utils/console");
const sequelize_1 = require("sequelize");
exports.metadata = {
    summary: "Get NFT user dashboard data",
    operationId: "getNftUserDashboard",
    tags: ["NFT", "User", "Dashboard"],
    responses: {
        200: {
            description: "Dashboard data retrieved successfully",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            stats: {
                                type: "object",
                                properties: {
                                    totalNFTs: { type: "integer" },
                                    totalCollections: { type: "integer" },
                                    totalViews: { type: "integer" },
                                    totalFavorites: { type: "integer" },
                                    totalSales: { type: "integer" },
                                    totalEarnings: { type: "number" }
                                }
                            },
                            recentActivity: { type: "array" },
                            ownedNFTs: { type: "array" },
                            favoriteNFTs: { type: "array" }
                        }
                    }
                }
            }
        },
        401: { description: "Unauthorized" },
        500: { description: "Internal Server Error" }
    },
    requiresAuth: true
};
exports.default = async (data) => {
    const { user } = data;
    if (!(user === null || user === void 0 ? void 0 : user.id)) {
        throw (0, error_1.createError)({
            statusCode: 401,
            message: "Authentication required"
        });
    }
    try {
        const ownedTokens = await db_1.models.nftToken.findAll({
            attributes: [
                [(0, sequelize_1.col)('collection.chain'), 'chain'],
                [(0, sequelize_1.fn)('COUNT', (0, sequelize_1.col)('nftToken.id')), 'count'],
                [(0, sequelize_1.fn)('COALESCE', (0, sequelize_1.fn)('SUM', (0, sequelize_1.col)('nftToken.views')), 0), 'totalViews']
            ],
            include: [{
                    model: db_1.models.nftCollection,
                    as: 'collection',
                    attributes: [],
                    required: true
                }],
            where: {
                ownerId: user.id,
                status: 'MINTED'
            },
            group: [(0, sequelize_1.col)('collection.chain')],
            raw: true
        });
        const totalNFTs = ownedTokens.reduce((sum, token) => sum + parseInt(token.count || '0'), 0);
        const totalViews = ownedTokens.reduce((sum, token) => sum + parseInt(token.totalViews || '0'), 0);
        const listingValues = await db_1.models.nftListing.findAll({
            attributes: [
                [(0, sequelize_1.col)('token.collection.chain'), 'chain'],
                [(0, sequelize_1.fn)('COALESCE', (0, sequelize_1.fn)('SUM', (0, sequelize_1.col)('nftListing.price')), 0), 'totalValue']
            ],
            include: [{
                    model: db_1.models.nftToken,
                    as: 'token',
                    attributes: [],
                    where: { ownerId: user.id },
                    required: true,
                    include: [{
                            model: db_1.models.nftCollection,
                            as: 'collection',
                            attributes: [],
                            required: true
                        }]
                }],
            where: {
                status: 'ACTIVE'
            },
            group: [(0, sequelize_1.col)('token.collection.chain')],
            raw: true
        });
        const favoritesCount = await db_1.models.nftFavorite.count({
            where: { userId: user.id }
        });
        const creator = await db_1.models.nftCreator.findOne({
            where: { userId: user.id }
        });
        const collectionsCount = creator
            ? await db_1.models.nftCollection.count({ where: { creatorId: creator.id } })
            : 0;
        const salesStats = await db_1.models.nftSale.findAll({
            attributes: [
                [(0, sequelize_1.col)('token.collection.chain'), 'chain'],
                [(0, sequelize_1.fn)('COUNT', (0, sequelize_1.col)('nftSale.id')), 'totalSales'],
                [(0, sequelize_1.fn)('COALESCE', (0, sequelize_1.fn)('SUM', (0, sequelize_1.col)('nftSale.price')), 0), 'totalEarnings']
            ],
            include: [{
                    model: db_1.models.nftToken,
                    as: 'token',
                    attributes: [],
                    where: { ownerId: user.id },
                    required: true,
                    include: [{
                            model: db_1.models.nftCollection,
                            as: 'collection',
                            attributes: [],
                            required: true
                        }]
                }],
            where: {
                status: 'COMPLETED'
            },
            group: [(0, sequelize_1.col)('token.collection.chain')],
            raw: true
        });
        const totalSales = salesStats.reduce((sum, stat) => sum + parseInt(stat.totalSales || '0'), 0);
        const totalEarnings = salesStats.reduce((sum, stat) => sum + parseFloat(stat.totalEarnings || '0'), 0);
        const categoryDistribution = await db_1.models.nftToken.findAll({
            attributes: [
                [(0, sequelize_1.col)('collection.category.name'), 'name'],
                [(0, sequelize_1.fn)('COUNT', (0, sequelize_1.col)('nftToken.id')), 'count']
            ],
            include: [{
                    model: db_1.models.nftCollection,
                    as: 'collection',
                    attributes: [],
                    required: true,
                    include: [{
                            model: db_1.models.nftCategory,
                            as: 'category',
                            attributes: [],
                            required: false
                        }]
                }],
            where: {
                ownerId: user.id,
                status: 'MINTED'
            },
            group: [(0, sequelize_1.col)('collection.category.name')],
            having: (0, sequelize_1.fn)('COUNT', (0, sequelize_1.col)('nftToken.id')),
            raw: true
        });
        const totalCategoryCount = categoryDistribution.reduce((sum, cat) => sum + parseInt(cat.count || '0'), 0);
        const recentActivities = await db_1.models.nftActivity.findAll({
            where: {
                [sequelize_1.Op.or]: [
                    { fromUserId: user.id },
                    { toUserId: user.id }
                ]
            },
            include: [{
                    model: db_1.models.nftToken,
                    as: 'token',
                    attributes: ['id', 'name', 'image'],
                    required: false
                }],
            order: [['createdAt', 'DESC']],
            limit: 10
        });
        const tokens = await db_1.models.nftToken.findAll({
            where: {
                ownerId: user.id,
                status: 'MINTED'
            },
            include: [{
                    model: db_1.models.nftCollection,
                    as: 'collection',
                    attributes: ['id', 'name', 'logoImage']
                }],
            order: [['createdAt', 'DESC']],
            limit: 12
        });
        const collections = creator
            ? await db_1.models.nftCollection.findAll({
                where: { creatorId: creator.id },
                order: [['createdAt', 'DESC']],
                limit: 12
            })
            : [];
        const avgPrice = listingValues.length > 0
            ? listingValues.reduce((sum, val) => sum + parseFloat(val.totalValue || '0'), 0) / totalNFTs
            : 0;
        const response = {
            overview: {
                totalNFTs,
                totalCollections: collectionsCount,
                totalValue: listingValues.reduce((sum, val) => sum + parseFloat(val.totalValue || '0'), 0),
                totalViews,
                totalSales,
                totalEarnings,
                avgPrice,
                successRate: totalSales > 0 ? Math.round((totalSales / totalNFTs) * 100) : 0
            },
            valueByChain: listingValues.map((val) => ({
                chain: val.chain || 'ETH',
                value: parseFloat(val.totalValue || '0')
            })),
            growth: {
                nftsGrowth: 0,
                collectionsGrowth: 0,
                valueGrowth: 0,
                viewsGrowth: 0,
                salesGrowth: 0,
                volumeGrowth: 0
            },
            categoryDistribution: categoryDistribution
                .filter((cat) => cat.name)
                .map((cat) => ({
                name: cat.name,
                count: parseInt(cat.count || '0'),
                percentage: totalCategoryCount > 0
                    ? Math.round((parseInt(cat.count || '0') / totalCategoryCount) * 100)
                    : 0
            })),
            recentActivities: recentActivities.map(activity => ({
                id: activity.id,
                type: activity.type,
                createdAt: activity.createdAt
            })),
            tokens: tokens.map(nft => nft.toJSON()),
            collections: collections.map(col => col.toJSON())
        };
        return response;
    }
    catch (error) {
        console_1.logger.error("NFT", "Failed to retrieve user dashboard data", error);
        throw (0, error_1.createError)({
            statusCode: 500,
            message: "Failed to retrieve dashboard data"
        });
    }
};
