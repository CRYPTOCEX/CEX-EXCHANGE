"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const console_1 = require("@b/utils/console");
const sequelize_1 = require("sequelize");
exports.metadata = {
    summary: "Get unified NFT dashboard data",
    operationId: "getNftDashboard",
    tags: ["NFT", "Dashboard"],
    logModule: "NFT",
    logTitle: "Get Creator Overview",
    description: "Get comprehensive dashboard data showing both owned and created NFTs",
    responses: {
        200: {
            description: "Dashboard data retrieved successfully",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            user: { type: "object" },
                            portfolio: {
                                type: "object",
                                properties: {
                                    ownedNFTs: { type: "integer" },
                                    createdNFTs: { type: "integer" },
                                    totalCollections: { type: "integer" },
                                    totalValue: { type: "number" },
                                    totalVolume: { type: "number" },
                                    totalViews: { type: "integer" }
                                }
                            },
                            owned: { type: "object" },
                            created: { type: "object" },
                            activity: { type: "array" }
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
    var _a, _b, _c, _d, _e, _f, _g, _h;
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
        const ownedStatsRaw = await db_1.models.nftToken.findOne({
            attributes: [
                [(0, sequelize_1.fn)('COUNT', (0, sequelize_1.col)('nftToken.id')), 'totalOwned'],
                [(0, sequelize_1.fn)('COALESCE', (0, sequelize_1.fn)('SUM', (0, sequelize_1.col)('nftToken.views')), 0), 'totalViews']
            ],
            where: {
                ownerId: user.id,
                status: 'MINTED'
            },
            raw: true
        });
        const ownedStats = ownedStatsRaw;
        const createdStatsRaw = await db_1.models.nftToken.findOne({
            attributes: [
                [(0, sequelize_1.fn)('COUNT', (0, sequelize_1.col)('nftToken.id')), 'totalCreated'],
                [(0, sequelize_1.fn)('COALESCE', (0, sequelize_1.fn)('SUM', (0, sequelize_1.col)('nftToken.views')), 0), 'createdViews']
            ],
            where: {
                creatorId: creator.id,
                status: 'MINTED'
            },
            raw: true
        });
        const createdStats = createdStatsRaw;
        const collectionsCount = await db_1.models.nftCollection.count({
            where: { creatorId: creator.id }
        });
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
            where: { status: 'ACTIVE' },
            group: [(0, sequelize_1.col)('token.collection.chain')],
            raw: true
        });
        const totalValue = listingValues.reduce((sum, val) => sum + parseFloat(val.totalValue || '0'), 0);
        const salesVolumeRaw = await db_1.models.nftSale.findOne({
            attributes: [
                [(0, sequelize_1.fn)('COUNT', (0, sequelize_1.col)('nftSale.id')), 'totalSales'],
                [(0, sequelize_1.fn)('COALESCE', (0, sequelize_1.fn)('SUM', (0, sequelize_1.col)('nftSale.price')), 0), 'totalVolume'],
                [(0, sequelize_1.fn)('COALESCE', (0, sequelize_1.fn)('SUM', (0, sequelize_1.col)('nftSale.royaltyFee')), 0), 'totalRoyalties']
            ],
            include: [{
                    model: db_1.models.nftToken,
                    as: 'token',
                    attributes: [],
                    where: { creatorId: creator.id },
                    required: true
                }],
            where: { status: 'COMPLETED' },
            raw: true
        });
        const salesVolume = salesVolumeRaw;
        const ownedByChain = await db_1.models.nftToken.findAll({
            attributes: [
                [(0, sequelize_1.col)('collection.chain'), 'chain'],
                [(0, sequelize_1.fn)('COUNT', (0, sequelize_1.col)('nftToken.id')), 'count']
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
        const recentOwned = await db_1.models.nftToken.findAll({
            where: {
                ownerId: user.id,
                status: 'MINTED'
            },
            include: [{
                    model: db_1.models.nftCollection,
                    as: 'collection',
                    attributes: ['id', 'name', 'chain']
                }],
            order: [['createdAt', 'DESC']],
            limit: 6
        });
        const recentCreated = await db_1.models.nftToken.findAll({
            where: {
                creatorId: creator.id,
                status: 'MINTED'
            },
            include: [{
                    model: db_1.models.nftCollection,
                    as: 'collection',
                    attributes: ['id', 'name', 'chain']
                }],
            order: [['views', 'DESC']],
            limit: 6
        });
        const collections = await db_1.models.nftCollection.findAll({
            where: { creatorId: creator.id },
            include: [{
                    model: db_1.models.nftToken,
                    as: 'tokens',
                    attributes: ['id', 'status'],
                    required: false
                }],
            order: [['createdAt', 'DESC']],
            limit: 6
        });
        const recentActivity = await db_1.models.nftActivity.findAll({
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
            where: { status: 'COMPLETED' },
            order: [['createdAt', 'DESC']],
            limit: 5
        });
        const response = {
            user: {
                id: user.id,
                firstName: user.firstName,
                lastName: user.lastName,
                avatar: user.avatar,
                createdAt: user.createdAt
            },
            portfolio: {
                ownedNFTs: parseInt(((_a = ownedStats === null || ownedStats === void 0 ? void 0 : ownedStats.totalOwned) === null || _a === void 0 ? void 0 : _a.toString()) || '0'),
                createdNFTs: parseInt(((_b = createdStats === null || createdStats === void 0 ? void 0 : createdStats.totalCreated) === null || _b === void 0 ? void 0 : _b.toString()) || '0'),
                totalCollections: collectionsCount,
                totalValue: totalValue,
                totalVolume: parseFloat(((_c = salesVolume === null || salesVolume === void 0 ? void 0 : salesVolume.totalVolume) === null || _c === void 0 ? void 0 : _c.toString()) || '0'),
                totalViews: parseInt(((_d = ownedStats === null || ownedStats === void 0 ? void 0 : ownedStats.totalViews) === null || _d === void 0 ? void 0 : _d.toString()) || '0') + parseInt(((_e = createdStats === null || createdStats === void 0 ? void 0 : createdStats.createdViews) === null || _e === void 0 ? void 0 : _e.toString()) || '0')
            },
            owned: {
                byChain: ownedByChain.map((item) => ({
                    chain: item.chain || 'ETH',
                    count: parseInt(item.count || '0')
                })),
                recent: recentOwned.map(token => token.toJSON()),
                valueByChain: listingValues.map((val) => ({
                    chain: val.chain || 'ETH',
                    value: parseFloat(val.totalValue || '0')
                }))
            },
            created: {
                stats: {
                    totalSales: parseInt(((_f = salesVolume === null || salesVolume === void 0 ? void 0 : salesVolume.totalSales) === null || _f === void 0 ? void 0 : _f.toString()) || '0'),
                    totalVolume: parseFloat(((_g = salesVolume === null || salesVolume === void 0 ? void 0 : salesVolume.totalVolume) === null || _g === void 0 ? void 0 : _g.toString()) || '0'),
                    totalRoyalties: parseFloat(((_h = salesVolume === null || salesVolume === void 0 ? void 0 : salesVolume.totalRoyalties) === null || _h === void 0 ? void 0 : _h.toString()) || '0')
                },
                recent: recentCreated.map(token => token.toJSON()),
                recentSales: recentSales.map(sale => sale.toJSON()),
                collections: collections.map(collection => {
                    var _a;
                    return ({
                        ...collection.toJSON(),
                        tokenCount: ((_a = collection.tokens) === null || _a === void 0 ? void 0 : _a.length) || 0
                    });
                })
            },
            activity: recentActivity.map(activity => activity.toJSON())
        };
        ctx === null || ctx === void 0 ? void 0 : ctx.success("Get Creator Overview completed successfully");
        return response;
    }
    catch (error) {
        console_1.logger.error("NFT", "Failed to retrieve dashboard data", error);
        throw (0, error_1.createError)({
            statusCode: 500,
            message: "Failed to retrieve dashboard data"
        });
    }
};
