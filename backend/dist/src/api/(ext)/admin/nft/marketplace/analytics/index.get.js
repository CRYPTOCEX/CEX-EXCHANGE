"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const sequelize_1 = require("sequelize");
const utils_1 = require("@b/api/finance/currency/utils");
exports.metadata = {
    summary: "Get marketplace analytics (Admin)",
    operationId: "getMarketplaceAnalytics",
    tags: ["Admin", "NFT", "Marketplace", "Analytics"],
    logModule: "ADMIN_NFT",
    logTitle: "Get NFT Marketplace Analytics",
    parameters: [
        {
            name: "timeRange",
            in: "query",
            description: "Time range for analytics",
            schema: {
                type: "string",
                enum: ["24h", "7d", "30d", "90d", "1y", "all"],
                default: "30d"
            }
        }
    ],
    responses: {
        200: {
            description: "Marketplace analytics retrieved successfully",
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
                                    trends: { type: "object" },
                                    distribution: { type: "object" },
                                    performance: { type: "object" }
                                }
                            }
                        }
                    }
                }
            }
        },
        401: { description: "Unauthorized" },
        403: { description: "Forbidden" },
        500: { description: "Internal Server Error" }
    },
    requiresAuth: true,
    permission: "access.nft.marketplace"
};
exports.default = async (data) => {
    var _a, _b;
    try {
        const { query, ctx } = data;
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Fetching marketplace analytics");
        const timeRange = query.timeRange || "30d";
        const now = new Date();
        let startDate;
        let previousStartDate;
        switch (timeRange) {
            case "24h":
                startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
                previousStartDate = new Date(startDate.getTime() - 24 * 60 * 60 * 1000);
                break;
            case "7d":
                startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                previousStartDate = new Date(startDate.getTime() - 7 * 24 * 60 * 60 * 1000);
                break;
            case "30d":
                startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
                previousStartDate = new Date(startDate.getTime() - 30 * 24 * 60 * 60 * 1000);
                break;
            case "90d":
                startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
                previousStartDate = new Date(startDate.getTime() - 90 * 24 * 60 * 60 * 1000);
                break;
            case "1y":
                startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
                previousStartDate = new Date(startDate.getTime() - 365 * 24 * 60 * 60 * 1000);
                break;
            case "all":
                startDate = new Date(0);
                previousStartDate = new Date(0);
                break;
            default:
                startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
                previousStartDate = new Date(startDate.getTime() - 30 * 24 * 60 * 60 * 1000);
        }
        const convertPriceToUSD = async (price, currency) => {
            try {
                if (!currency || currency === 'USD' || currency === 'USDT') {
                    return price;
                }
                if (['EUR', 'GBP', 'JPY', 'CAD', 'AUD'].includes(currency)) {
                    const rate = await (0, utils_1.getFiatPriceInUSD)(currency);
                    return price * rate;
                }
                else if (['BTC', 'ETH', 'BNB', 'ADA'].includes(currency)) {
                    const rate = await (0, utils_1.getSpotPriceInUSD)(currency);
                    return price * rate;
                }
                else {
                    const rate = await (0, utils_1.getEcoPriceInUSD)(currency);
                    return price * rate;
                }
            }
            catch (error) {
                console.log(`Failed to convert ${currency} to USD, using raw price:`, error.message);
                return price;
            }
        };
        const [totalListings, activeListings, totalSales, totalAuctions, completedAuctions] = await Promise.all([
            db_1.models.nftListing.count(),
            db_1.models.nftListing.count({ where: { status: "ACTIVE" } }),
            db_1.models.nftSale.count({ where: { status: "COMPLETED" } }),
            db_1.models.nftListing.count({ where: { type: "AUCTION" } }),
            db_1.models.nftListing.count({ where: { type: "AUCTION", status: "SOLD" } })
        ]);
        const flaggedListings = 0;
        const currentSales = await db_1.models.nftSale.findAll({
            attributes: ['price', 'currency', 'createdAt'],
            where: {
                status: "COMPLETED",
                createdAt: { [sequelize_1.Op.gte]: startDate }
            },
            raw: true
        });
        const previousSales = await db_1.models.nftSale.findAll({
            attributes: ['price', 'currency'],
            where: {
                status: "COMPLETED",
                createdAt: {
                    [sequelize_1.Op.gte]: previousStartDate,
                    [sequelize_1.Op.lt]: startDate
                }
            },
            raw: true
        });
        let currentVolumeUSD = 0;
        let currentTotalPrices = 0;
        for (const sale of currentSales) {
            const priceValue = typeof sale.price === 'number' ? sale.price : parseFloat(String(sale.price));
            const priceUSD = await convertPriceToUSD(priceValue, sale.currency);
            currentVolumeUSD += priceUSD;
            currentTotalPrices += priceUSD;
        }
        let previousVolumeUSD = 0;
        let previousTotalPrices = 0;
        for (const sale of previousSales) {
            const priceValue = typeof sale.price === 'number' ? sale.price : parseFloat(String(sale.price));
            const priceUSD = await convertPriceToUSD(priceValue, sale.currency);
            previousVolumeUSD += priceUSD;
            previousTotalPrices += priceUSD;
        }
        const volumeChange = previousVolumeUSD > 0 ?
            ((currentVolumeUSD - previousVolumeUSD) / previousVolumeUSD) * 100 : 0;
        const salesChange = previousSales.length > 0 ?
            ((currentSales.length - previousSales.length) / previousSales.length) * 100 : 0;
        const avgPriceCurrent = currentSales.length > 0 ? currentTotalPrices / currentSales.length : 0;
        const avgPricePrevious = previousSales.length > 0 ? previousTotalPrices / previousSales.length : 0;
        const priceChange = avgPricePrevious > 0 ?
            ((avgPriceCurrent - avgPricePrevious) / avgPricePrevious) * 100 : 0;
        const listingsByType = (await db_1.models.nftListing.findAll({
            attributes: [
                'type',
                [(0, sequelize_1.fn)('COUNT', (0, sequelize_1.col)('id')), 'count']
            ],
            group: ['type'],
            raw: true
        }));
        const listingsByStatus = (await db_1.models.nftListing.findAll({
            attributes: [
                'status',
                [(0, sequelize_1.fn)('COUNT', (0, sequelize_1.col)('id')), 'count']
            ],
            group: ['status'],
            raw: true
        }));
        const auctionPerformance = (await db_1.models.nftListing.findAll({
            attributes: [
                [(0, sequelize_1.fn)('AVG', (0, sequelize_1.literal)('CASE WHEN type = "AUCTION" AND status = "SOLD" THEN DATEDIFF(soldAt, createdAt) END')), 'avgAuctionDuration'],
                [(0, sequelize_1.fn)('AVG', (0, sequelize_1.literal)('CASE WHEN type = "FIXED_PRICE" AND status = "SOLD" THEN DATEDIFF(soldAt, createdAt) END')), 'avgFixedPriceDuration']
            ],
            raw: true
        }));
        const topCollections = (await db_1.models.nftSale.findAll({
            attributes: [
                [(0, sequelize_1.col)('token.collection.name'), 'collectionName'],
                [(0, sequelize_1.col)('token.collection.id'), 'collectionId'],
                [(0, sequelize_1.fn)('COUNT', (0, sequelize_1.col)('nftSale.id')), 'salesCount'],
                [(0, sequelize_1.fn)('SUM', (0, sequelize_1.col)('price')), 'totalVolume'],
                [(0, sequelize_1.fn)('AVG', (0, sequelize_1.col)('price')), 'avgPrice']
            ],
            include: [
                {
                    model: db_1.models.nftToken,
                    as: "token",
                    attributes: [],
                    include: [
                        {
                            model: db_1.models.nftCollection,
                            as: "collection",
                            attributes: []
                        }
                    ]
                }
            ],
            where: {
                status: "COMPLETED",
                createdAt: { [sequelize_1.Op.gte]: startDate }
            },
            group: ['token.collection.id'],
            order: [[(0, sequelize_1.literal)('totalVolume'), 'DESC']],
            limit: 10,
            raw: true
        }));
        const recentAdminActions = await db_1.models.nftActivity.findAll({
            where: {
                type: "TRANSFER",
                createdAt: { [sequelize_1.Op.gte]: startDate }
            },
            include: [
                {
                    model: db_1.models.user,
                    as: "fromUser",
                    attributes: ["id", "firstName", "lastName"]
                },
                {
                    model: db_1.models.nftToken,
                    as: "token",
                    attributes: ["id", "name"]
                }
            ],
            order: [['createdAt', 'DESC']],
            limit: 20
        });
        const overview = {
            totalListings,
            activeListings,
            totalSales,
            totalAuctions,
            completedAuctions,
            flaggedListings,
            currentVolume: currentVolumeUSD,
            avgPrice: avgPriceCurrent,
            auctionSuccessRate: totalAuctions > 0 ? (completedAuctions / totalAuctions) * 100 : 0
        };
        const trends = {
            volumeChange,
            salesChange,
            priceChange,
            period: timeRange
        };
        const distribution = {
            byType: listingsByType.reduce((acc, item) => {
                acc[item.type] = parseInt(item.count);
                return acc;
            }, {}),
            byStatus: listingsByStatus.reduce((acc, item) => {
                acc[item.status] = parseInt(item.count);
                return acc;
            }, {})
        };
        const performance = {
            avgAuctionDuration: parseFloat(((_a = auctionPerformance[0]) === null || _a === void 0 ? void 0 : _a.avgAuctionDuration) || "0"),
            avgFixedPriceDuration: parseFloat(((_b = auctionPerformance[0]) === null || _b === void 0 ? void 0 : _b.avgFixedPriceDuration) || "0"),
            topCollections: topCollections.map((item) => ({
                collectionId: item.collectionId,
                collectionName: item.collectionName || "Unknown",
                salesCount: parseInt(item.salesCount),
                totalVolume: parseFloat(item.totalVolume),
                avgPrice: parseFloat(item.avgPrice)
            })),
            recentAdminActions: recentAdminActions.map(action => {
                var _a;
                return ({
                    id: action.id,
                    adminUser: action.fromUser ? `${action.fromUser.firstName} ${action.fromUser.lastName}` : "Unknown",
                    tokenName: ((_a = action.token) === null || _a === void 0 ? void 0 : _a.name) || "Unknown",
                    metadata: action.metadata,
                    createdAt: action.createdAt
                });
            })
        };
        ctx === null || ctx === void 0 ? void 0 : ctx.success("Marketplace analytics retrieved successfully");
        return {
            message: "Marketplace analytics retrieved successfully",
            data: {
                overview,
                trends,
                distribution,
                performance,
                timeRange,
                currency: "USD"
            }
        };
    }
    catch (error) {
        console.error("Get marketplace analytics error:", error);
        throw (0, error_1.createError)({
            statusCode: 500,
            message: "Failed to retrieve marketplace analytics"
        });
    }
};
