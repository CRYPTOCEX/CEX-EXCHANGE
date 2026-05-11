"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const sequelize_1 = require("sequelize");
const utils_1 = require("@b/api/finance/currency/utils");
exports.metadata = {
    summary: "Get NFT marketplace statistics",
    operationId: "getNftMarketplaceStats",
    tags: ["NFT", "Marketplace", "Statistics"],
    parameters: [
        {
            name: "timeRange",
            in: "query",
            description: "Time range for statistics",
            schema: {
                type: "string",
                enum: ["24h", "7d", "30d", "90d", "1y", "all"],
                default: "30d"
            }
        }
    ],
    responses: {
        200: {
            description: "Marketplace statistics retrieved successfully",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            message: { type: "string" },
                            data: {
                                type: "object",
                                properties: {
                                    overview: {
                                        type: "object",
                                        properties: {
                                            totalVolume: { type: "number" },
                                            totalSales: { type: "number" },
                                            totalListings: { type: "number" },
                                            activeAuctions: { type: "number" },
                                            averagePrice: { type: "number" },
                                            uniqueTraders: { type: "number" }
                                        }
                                    },
                                    trends: {
                                        type: "object",
                                        properties: {
                                            volumeChange: { type: "number" },
                                            salesChange: { type: "number" },
                                            priceChange: { type: "number" }
                                        }
                                    },
                                    topCollections: { type: "array" },
                                    recentSales: { type: "array" }
                                }
                            }
                        }
                    }
                }
            }
        },
        400: { description: "Bad Request" },
        500: { description: "Internal Server Error" }
    }
};
exports.default = async (data) => {
    try {
        const { query } = data;
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
        const currentSales = await db_1.models.nftSale.findAll({
            attributes: ['price', 'currency', 'buyerId', 'sellerId'],
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
        let totalCurrentPrices = 0;
        const uniqueTraders = new Set();
        for (const sale of currentSales) {
            const priceUSD = await convertPriceToUSD(parseFloat(String(sale.price)), sale.currency);
            currentVolumeUSD += priceUSD;
            totalCurrentPrices += priceUSD;
            uniqueTraders.add(sale.buyerId);
            uniqueTraders.add(sale.sellerId);
        }
        let previousVolumeUSD = 0;
        let previousTotalPrices = 0;
        for (const sale of previousSales) {
            const priceUSD = await convertPriceToUSD(parseFloat(String(sale.price)), sale.currency);
            previousVolumeUSD += priceUSD;
            previousTotalPrices += priceUSD;
        }
        const currentAveragePrice = currentSales.length > 0 ? totalCurrentPrices / currentSales.length : 0;
        const previousAveragePrice = previousSales.length > 0 ? previousTotalPrices / previousSales.length : 0;
        const totalListings = await db_1.models.nftListing.count({
            where: { status: "ACTIVE" }
        });
        const activeAuctions = await db_1.models.nftListing.count({
            where: {
                status: "ACTIVE",
                type: "AUCTION",
                endTime: { [sequelize_1.Op.gt]: now }
            }
        });
        const volumeChange = previousVolumeUSD > 0 ?
            ((currentVolumeUSD - previousVolumeUSD) / previousVolumeUSD) * 100 : 0;
        const salesChange = previousSales.length > 0 ?
            ((currentSales.length - previousSales.length) / previousSales.length) * 100 : 0;
        const priceChange = previousAveragePrice > 0 ?
            ((currentAveragePrice - previousAveragePrice) / previousAveragePrice) * 100 : 0;
        const collectionsData = await db_1.models.nftSale.findAll({
            attributes: [
                [(0, sequelize_1.col)('token.collectionId'), 'collectionId'],
                [(0, sequelize_1.fn)('SUM', (0, sequelize_1.col)('price')), 'volume'],
                [(0, sequelize_1.fn)('COUNT', (0, sequelize_1.col)('nftSale.id')), 'sales'],
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
                            attributes: ["id", "name", "logoImage"]
                        }
                    ]
                }
            ],
            where: {
                status: "COMPLETED",
                createdAt: { [sequelize_1.Op.gte]: startDate }
            },
            group: ['token.collectionId', 'token.collection.id'],
            order: [[(0, sequelize_1.literal)('volume'), 'DESC']],
            limit: 10,
            raw: false
        });
        const recentSales = await db_1.models.nftSale.findAll({
            where: {
                status: "COMPLETED",
                createdAt: { [sequelize_1.Op.gte]: startDate }
            },
            include: [
                {
                    model: db_1.models.nftToken,
                    as: "token",
                    attributes: ["id", "name", "image"],
                    include: [
                        {
                            model: db_1.models.nftCollection,
                            as: "collection",
                            attributes: ["id", "name", "logoImage"]
                        }
                    ]
                },
                {
                    model: db_1.models.user,
                    as: "buyer",
                    attributes: ["id", "firstName", "lastName", "avatar"]
                },
                {
                    model: db_1.models.user,
                    as: "seller",
                    attributes: ["id", "firstName", "lastName", "avatar"]
                }
            ],
            order: [['createdAt', 'DESC']],
            limit: 20
        });
        const topCollections = await Promise.all(collectionsData.map(async (item) => {
            var _a;
            const volumeUSD = await convertPriceToUSD(parseFloat(item.dataValues.volume || "0"), "ETH");
            const avgPriceUSD = await convertPriceToUSD(parseFloat(item.dataValues.avgPrice || "0"), "ETH");
            return {
                collection: ((_a = item.token) === null || _a === void 0 ? void 0 : _a.collection) || { id: item.dataValues.collectionId, name: "Unknown", logoImage: null },
                volumeUSD,
                sales: parseInt(item.dataValues.sales || "0"),
                avgPriceUSD
            };
        }));
        const recentSalesUSD = await Promise.all(recentSales.map(async (sale) => {
            const priceUSD = await convertPriceToUSD(parseFloat(String(sale.price)), sale.currency);
            return {
                ...sale.toJSON(),
                priceUSD
            };
        }));
        const overview = {
            totalVolume: currentVolumeUSD,
            totalSales: currentSales.length,
            totalListings,
            activeAuctions,
            averagePrice: currentAveragePrice,
            uniqueTraders: uniqueTraders.size
        };
        const trends = {
            volumeChange,
            salesChange,
            priceChange
        };
        return {
            overview,
            trends,
            topCollections,
            recentSales: recentSalesUSD,
            timeRange,
            currency: "USD"
        };
    }
    catch (error) {
        console.error("Get marketplace stats error:", error);
        throw (0, error_1.createError)({
            statusCode: 500,
            message: "Failed to retrieve marketplace statistics"
        });
    }
};
