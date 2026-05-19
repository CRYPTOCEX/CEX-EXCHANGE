"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const console_1 = require("@b/utils/console");
const sequelize_1 = require("sequelize");
exports.metadata = {
    summary: "Get NFT creator dashboard data",
    operationId: "getNftCreatorDashboard",
    tags: ["NFT", "Creator", "Dashboard"],
    logModule: "NFT",
    logTitle: "Get Creator Dashboard",
    responses: {
        200: {
            description: "Creator dashboard data retrieved successfully",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            overview: {
                                type: "object",
                                properties: {
                                    totalCollections: { type: "integer" },
                                    totalTokens: { type: "integer" },
                                    totalVolume: { type: "number" },
                                    totalRoyaltyEarnings: { type: "number" },
                                    averageSalePrice: { type: "number" },
                                    totalViews: { type: "integer" }
                                }
                            },
                            collections: { type: "array" },
                            recentSales: { type: "array" },
                            topTokens: { type: "array" }
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
    var _a, _b, _c, _d, _e;
    const { user, ctx } = data;
    if (!(user === null || user === void 0 ? void 0 : user.id)) {
        throw (0, error_1.createError)({
            statusCode: 401,
            message: "Authentication required"
        });
    }
    try {
        let creator = await db_1.models.nftCreator.findOne({
            where: { userId: user.id }
        });
        if (!creator) {
            const creatorDisplayName = user.firstName
                ? `${user.firstName}${user.lastName || ''}`.toLowerCase().replace(/\s+/g, '')
                : `creator_${user.id.slice(0, 8)}`;
            creator = await db_1.models.nftCreator.create({
                userId: user.id,
                displayName: creatorDisplayName,
                bio: undefined,
                banner: undefined,
                isVerified: false,
                profilePublic: true,
                totalVolume: 0,
                totalSales: 0,
                totalItems: 0,
                floorPrice: 0,
            });
        }
        const collectionsCount = await db_1.models.nftCollection.count({
            where: { creatorId: creator.id }
        });
        const tokensStatsRaw = await db_1.models.nftToken.findOne({
            attributes: [
                [(0, sequelize_1.fn)('COUNT', (0, sequelize_1.col)('nftToken.id')), 'totalTokens'],
                [(0, sequelize_1.fn)('COALESCE', (0, sequelize_1.fn)('SUM', (0, sequelize_1.col)('nftToken.views')), 0), 'totalViews']
            ],
            where: {
                creatorId: creator.id,
                status: 'MINTED'
            },
            raw: true
        });
        const tokensStats = tokensStatsRaw;
        const salesStatsRaw = await db_1.models.nftSale.findOne({
            attributes: [
                [(0, sequelize_1.fn)('COUNT', (0, sequelize_1.col)('nftSale.id')), 'totalSales'],
                [(0, sequelize_1.fn)('COALESCE', (0, sequelize_1.fn)('SUM', (0, sequelize_1.col)('nftSale.price')), 0), 'totalVolume'],
                [(0, sequelize_1.fn)('COALESCE', (0, sequelize_1.fn)('AVG', (0, sequelize_1.col)('nftSale.price')), 0), 'averageSalePrice'],
                [(0, sequelize_1.fn)('COALESCE', (0, sequelize_1.fn)('SUM', (0, sequelize_1.col)('nftSale.royaltyFee')), 0), 'totalRoyaltyEarnings']
            ],
            include: [{
                    model: db_1.models.nftToken,
                    as: 'token',
                    attributes: [],
                    where: { creatorId: creator.id },
                    required: true
                }],
            where: {
                status: 'COMPLETED'
            },
            raw: true
        });
        const salesStats = salesStatsRaw;
        const collections = await db_1.models.nftCollection.findAll({
            where: { creatorId: creator.id },
            include: [{
                    model: db_1.models.nftToken,
                    as: 'tokens',
                    attributes: ['id', 'status'],
                    required: false
                }],
            order: [['createdAt', 'DESC']],
            limit: 10
        });
        const recentSales = await db_1.models.nftSale.findAll({
            include: [{
                    model: db_1.models.nftToken,
                    as: 'token',
                    attributes: ['id', 'name', 'image'],
                    where: { creatorId: creator.id },
                    include: [{
                            model: db_1.models.nftCollection,
                            as: 'collection',
                            attributes: ['id', 'name']
                        }],
                    required: true
                }, {
                    model: db_1.models.user,
                    as: 'buyer',
                    attributes: ['id', 'firstName', 'lastName', 'avatar'],
                    required: false
                }],
            where: {
                status: 'COMPLETED'
            },
            order: [['createdAt', 'DESC']],
            limit: 10
        });
        const topTokens = await db_1.models.nftToken.findAll({
            where: {
                creatorId: creator.id,
                status: 'MINTED'
            },
            include: [{
                    model: db_1.models.nftCollection,
                    as: 'collection',
                    attributes: ['id', 'name']
                }],
            order: [['views', 'DESC']],
            limit: 10
        });
        const response = {
            creator: {
                id: user.id,
                displayName: user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : null,
                firstName: user.firstName,
                lastName: user.lastName,
                avatar: user.avatar,
                createdAt: user.createdAt,
                verificationTier: null
            },
            overview: {
                totalCollections: collectionsCount,
                totalTokens: parseInt(((_a = tokensStats === null || tokensStats === void 0 ? void 0 : tokensStats.totalTokens) === null || _a === void 0 ? void 0 : _a.toString()) || '0'),
                totalVolume: parseFloat(((_b = salesStats === null || salesStats === void 0 ? void 0 : salesStats.totalVolume) === null || _b === void 0 ? void 0 : _b.toString()) || '0'),
                totalRoyaltyEarnings: parseFloat(((_c = salesStats === null || salesStats === void 0 ? void 0 : salesStats.totalRoyaltyEarnings) === null || _c === void 0 ? void 0 : _c.toString()) || '0'),
                averageSalePrice: parseFloat(((_d = salesStats === null || salesStats === void 0 ? void 0 : salesStats.averageSalePrice) === null || _d === void 0 ? void 0 : _d.toString()) || '0'),
                totalViews: parseInt(((_e = tokensStats === null || tokensStats === void 0 ? void 0 : tokensStats.totalViews) === null || _e === void 0 ? void 0 : _e.toString()) || '0')
            },
            collections: collections.map(collection => {
                var _a;
                return ({
                    ...collection.toJSON(),
                    tokenCount: ((_a = collection.tokens) === null || _a === void 0 ? void 0 : _a.length) || 0
                });
            }),
            recentSales: recentSales.map(sale => sale.toJSON()),
            topTokens: topTokens.map(token => token.toJSON())
        };
        ctx === null || ctx === void 0 ? void 0 : ctx.success("Get Creator Dashboard completed successfully");
        return response;
    }
    catch (error) {
        console_1.logger.error("NFT", "Failed to retrieve creator dashboard data", error);
        throw (0, error_1.createError)({
            statusCode: 500,
            message: "Failed to retrieve creator dashboard data"
        });
    }
};
