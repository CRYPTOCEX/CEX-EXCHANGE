"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const sequelize_1 = require("sequelize");
exports.metadata = {
    summary: "Get NFT marketplace admin statistics",
    operationId: "getNftAdminStats",
    tags: ["Admin", "NFT", "Analytics"],
    logModule: "ADMIN_NFT",
    logTitle: "Get NFT Stats",
    responses: {
        200: {
            description: "NFT marketplace statistics retrieved successfully",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            data: {
                                type: "object",
                                properties: {
                                    collections: {
                                        type: "object",
                                        properties: {
                                            total: { type: "number" },
                                            active: { type: "number" },
                                            pending: { type: "number" },
                                            verified: { type: "number" }
                                        }
                                    },
                                    tokens: {
                                        type: "object",
                                        properties: {
                                            total: { type: "number" },
                                            minted: { type: "number" },
                                            listed: { type: "number" }
                                        }
                                    },
                                    listings: {
                                        type: "object",
                                        properties: {
                                            total: { type: "number" },
                                            active: { type: "number" },
                                            auctions: { type: "number" },
                                            fixedPrice: { type: "number" }
                                        }
                                    },
                                    sales: {
                                        type: "object",
                                        properties: {
                                            total: { type: "number" },
                                            volume: { type: "number" },
                                            avgPrice: { type: "number" },
                                            last24h: { type: "number" }
                                        }
                                    },
                                    activity: {
                                        type: "object",
                                        properties: {
                                            totalTransactions: { type: "number" },
                                            last24h: { type: "number" },
                                            uniqueUsers: { type: "number" },
                                            topCollection: { type: "string" }
                                        }
                                    },
                                    revenue: {
                                        type: "object",
                                        properties: {
                                            totalFees: { type: "number" },
                                            marketplaceFees: { type: "number" },
                                            royaltyFees: { type: "number" },
                                            last30Days: { type: "number" }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        },
        500: { description: "Internal Server Error" }
    },
    requiresAuth: true,
    permission: "access.nft"
};
exports.default = async (data) => {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j;
    try {
        const now = new Date();
        const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        const last30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        const [totalCollections, activeCollections, pendingCollections, verifiedCollections] = await Promise.all([
            db_1.models.nftCollection.count(),
            db_1.models.nftCollection.count({ where: { status: "ACTIVE" } }),
            db_1.models.nftCollection.count({ where: { status: "PENDING" } }),
            db_1.models.nftCollection.count({ where: { isVerified: true } })
        ]);
        const [totalTokens, mintedTokens, listedTokens] = await Promise.all([
            db_1.models.nftToken.count(),
            db_1.models.nftToken.count({ where: { isMinted: true } }),
            db_1.models.nftToken.count({ where: { isListed: true } })
        ]);
        const [totalListings, activeListings, auctionListings, fixedPriceListings] = await Promise.all([
            db_1.models.nftListing.count(),
            db_1.models.nftListing.count({ where: { status: "ACTIVE" } }),
            db_1.models.nftListing.count({ where: { type: "AUCTION", status: "ACTIVE" } }),
            db_1.models.nftListing.count({ where: { type: "FIXED_PRICE", status: "ACTIVE" } })
        ]);
        const salesData = (await db_1.models.nftSale.findAll({
            attributes: [
                [(0, sequelize_1.fn)('COUNT', (0, sequelize_1.col)('id')), 'totalSales'],
                [(0, sequelize_1.fn)('SUM', (0, sequelize_1.col)('price')), 'totalVolume'],
                [(0, sequelize_1.fn)('AVG', (0, sequelize_1.col)('price')), 'avgPrice']
            ],
            where: { status: "COMPLETED" },
            raw: true
        }));
        const sales24h = await db_1.models.nftSale.count({
            where: {
                status: "COMPLETED",
                createdAt: { [sequelize_1.Op.gte]: last24h }
            }
        });
        const [totalActivity, activity24h] = await Promise.all([
            db_1.models.nftActivity.count(),
            db_1.models.nftActivity.count({
                where: { createdAt: { [sequelize_1.Op.gte]: last24h } }
            })
        ]);
        const uniqueUserResults = await db_1.models.nftActivity.findAll({
            attributes: [[(0, sequelize_1.fn)('COUNT', (0, sequelize_1.fn)('DISTINCT', (0, sequelize_1.col)('fromUserId'))), 'count']],
            where: { fromUserId: { [sequelize_1.Op.ne]: null } },
            raw: true
        });
        const uniqueUsers = parseInt(((_a = uniqueUserResults[0]) === null || _a === void 0 ? void 0 : _a.count) || '0', 10);
        const topCollectionData = (await db_1.models.nftSale.findAll({
            attributes: [
                [(0, sequelize_1.col)('token.collection.name'), 'collectionName'],
                [(0, sequelize_1.fn)('SUM', (0, sequelize_1.col)('price')), 'totalVolume']
            ],
            include: [
                {
                    model: db_1.models.nftToken,
                    as: 'token',
                    attributes: [],
                    include: [
                        {
                            model: db_1.models.nftCollection,
                            as: 'collection',
                            attributes: []
                        }
                    ]
                }
            ],
            where: { status: "COMPLETED" },
            group: [(0, sequelize_1.col)('token.collection.id')],
            order: [[(0, sequelize_1.fn)('SUM', (0, sequelize_1.col)('price')), 'DESC']],
            limit: 1,
            raw: true
        }));
        const topCollection = ((_b = topCollectionData[0]) === null || _b === void 0 ? void 0 : _b.collectionName) || "N/A";
        const revenueData = await db_1.models.nftSale.findAll({
            attributes: [
                [(0, sequelize_1.fn)('SUM', (0, sequelize_1.col)('marketplaceFee')), 'totalMarketplaceFees'],
                [(0, sequelize_1.fn)('SUM', (0, sequelize_1.col)('royaltyFee')), 'totalRoyaltyFees'],
                [(0, sequelize_1.fn)('SUM', (0, sequelize_1.literal)('marketplaceFee + royaltyFee')), 'totalFees']
            ],
            where: { status: "COMPLETED" },
            raw: true
        });
        const revenue30Days = await db_1.models.nftSale.findAll({
            attributes: [
                [(0, sequelize_1.fn)('SUM', (0, sequelize_1.literal)('marketplaceFee + royaltyFee')), 'revenue30Days']
            ],
            where: {
                status: "COMPLETED",
                createdAt: { [sequelize_1.Op.gte]: last30Days }
            },
            raw: true
        });
        const stats = {
            collections: {
                total: totalCollections,
                active: activeCollections,
                pending: pendingCollections,
                verified: verifiedCollections
            },
            tokens: {
                total: totalTokens,
                minted: mintedTokens,
                listed: listedTokens
            },
            listings: {
                total: totalListings,
                active: activeListings,
                auctions: auctionListings,
                fixedPrice: fixedPriceListings
            },
            sales: {
                total: parseInt(((_c = salesData[0]) === null || _c === void 0 ? void 0 : _c.totalSales) || "0"),
                volume: parseFloat(((_d = salesData[0]) === null || _d === void 0 ? void 0 : _d.totalVolume) || "0"),
                avgPrice: parseFloat(((_e = salesData[0]) === null || _e === void 0 ? void 0 : _e.avgPrice) || "0"),
                last24h: sales24h
            },
            activity: {
                totalTransactions: totalActivity,
                last24h: activity24h,
                uniqueUsers: uniqueUsers,
                topCollection: topCollection
            },
            revenue: {
                totalFees: parseFloat(((_f = revenueData[0]) === null || _f === void 0 ? void 0 : _f.totalFees) || "0"),
                marketplaceFees: parseFloat(((_g = revenueData[0]) === null || _g === void 0 ? void 0 : _g.totalMarketplaceFees) || "0"),
                royaltyFees: parseFloat(((_h = revenueData[0]) === null || _h === void 0 ? void 0 : _h.totalRoyaltyFees) || "0"),
                last30Days: parseFloat(((_j = revenue30Days[0]) === null || _j === void 0 ? void 0 : _j.revenue30Days) || "0")
            }
        };
        return stats;
    }
    catch (error) {
        console.error("Error fetching NFT admin stats:", error);
        throw (0, error_1.createError)({
            statusCode: 500,
            message: "Failed to fetch NFT marketplace statistics"
        });
    }
};
