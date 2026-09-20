"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const sequelize_1 = require("sequelize");
const utils_1 = require("@b/api/finance/currency/utils");
const display_name_1 = require("@b/utils/display-name");
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
                                    recentSales: { type: "array" },
                                    unpricedCurrencies: {
                                        type: "array",
                                        items: { type: "string" },
                                        description: "Currencies sales were settled in that have no usable USD rate. Their volume is excluded from every USD figure above, so a non-empty list makes those figures a lower bound."
                                    }
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
    var _a;
    var _b;
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
        const rates = new Map();
        const unpriced = new Set();
        const priced = (rate) => typeof rate === "number" && Number.isFinite(rate) && rate > 0;
        const loadRates = async (currencies) => {
            const missing = [...new Set(currencies)].filter((c) => Boolean(c) && !rates.has(c));
            if (!missing.length)
                return;
            const resolved = await (0, utils_1.getUsdRates)(missing);
            for (const [currency, rate] of resolved)
                rates.set(currency, rate);
            if (missing.includes("USDT") && !priced(rates.get("USDT"))) {
                rates.set("USDT", await (0, utils_1.getUsdtPriceInUSD)());
            }
        };
        const toUSD = (amount, currency) => {
            if (!Number.isFinite(amount))
                return null;
            const rate = currency ? rates.get(currency) : undefined;
            if (!priced(rate)) {
                unpriced.add(currency || "UNKNOWN");
                return null;
            }
            return amount * rate;
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
        await loadRates([
            ...currentSales.map((sale) => sale.currency),
            ...previousSales.map((sale) => sale.currency),
        ]);
        let currentVolumeUSD = 0;
        let pricedCurrentSales = 0;
        const uniqueTraders = new Set();
        for (const sale of currentSales) {
            uniqueTraders.add(sale.buyerId);
            uniqueTraders.add(sale.sellerId);
            const priceUSD = toUSD(parseFloat(String(sale.price)), sale.currency);
            if (priceUSD === null)
                continue;
            currentVolumeUSD += priceUSD;
            pricedCurrentSales++;
        }
        let previousVolumeUSD = 0;
        let pricedPreviousSales = 0;
        for (const sale of previousSales) {
            const priceUSD = toUSD(parseFloat(String(sale.price)), sale.currency);
            if (priceUSD === null)
                continue;
            previousVolumeUSD += priceUSD;
            pricedPreviousSales++;
        }
        const currentAveragePrice = pricedCurrentSales > 0 ? currentVolumeUSD / pricedCurrentSales : 0;
        const previousAveragePrice = pricedPreviousSales > 0 ? previousVolumeUSD / pricedPreviousSales : 0;
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
                [(0, sequelize_1.col)('nftSale.currency'), 'currency'],
                [(0, sequelize_1.fn)('SUM', (0, sequelize_1.col)('price')), 'volume'],
                [(0, sequelize_1.fn)('COUNT', (0, sequelize_1.col)('nftSale.id')), 'sales']
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
            group: ['token.collectionId', 'token.collection.id', 'nftSale.currency'],
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
                    attributes: ["id", ...display_name_1.PUBLIC_NAME_ATTRIBUTES, "avatar"]
                },
                {
                    model: db_1.models.user,
                    as: "seller",
                    attributes: ["id", ...display_name_1.PUBLIC_NAME_ATTRIBUTES, "avatar"]
                }
            ],
            order: [['createdAt', 'DESC']],
            limit: 20
        });
        await loadRates([
            ...collectionsData.map((item) => item.dataValues.currency),
            ...recentSales.map((sale) => sale.currency),
        ]);
        const collectionTotals = new Map();
        for (const item of collectionsData) {
            const collectionId = item.dataValues.collectionId;
            const salesCount = parseInt(item.dataValues.sales || "0");
            const bucket = (_b = collectionTotals.get(collectionId)) !== null && _b !== void 0 ? _b : {
                collection: ((_a = item.token) === null || _a === void 0 ? void 0 : _a.collection) || { id: collectionId, name: "Unknown", logoImage: null },
                volumeUSD: 0,
                sales: 0,
                pricedSales: 0,
                unpricedCurrencies: []
            };
            bucket.sales += salesCount;
            const volumeUSD = toUSD(parseFloat(item.dataValues.volume || "0"), item.dataValues.currency);
            if (volumeUSD !== null) {
                bucket.volumeUSD += volumeUSD;
                bucket.pricedSales += salesCount;
            }
            else {
                bucket.unpricedCurrencies.push(item.dataValues.currency || "UNKNOWN");
            }
            collectionTotals.set(collectionId, bucket);
        }
        const topCollections = [...collectionTotals.values()]
            .sort((a, b) => b.volumeUSD - a.volumeUSD)
            .slice(0, 10)
            .map((entry) => ({
            collection: entry.collection,
            volumeUSD: entry.volumeUSD,
            sales: entry.sales,
            avgPriceUSD: entry.pricedSales > 0 ? entry.volumeUSD / entry.pricedSales : null,
            unpricedCurrencies: entry.unpricedCurrencies
        }));
        const recentSalesUSD = recentSales.map((sale) => ({
            ...sale.toJSON(),
            priceUSD: toUSD(parseFloat(String(sale.price)), sale.currency)
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
        return (0, display_name_1.redactPublicNames)({
            overview,
            trends,
            topCollections,
            recentSales: recentSalesUSD,
            timeRange,
            currency: "USD",
            unpricedCurrencies: [...unpriced]
        });
    }
    catch (error) {
        console.error("Get marketplace stats error:", error);
        throw (0, error_1.createError)({
            statusCode: 500,
            message: "Failed to retrieve marketplace statistics"
        });
    }
};
