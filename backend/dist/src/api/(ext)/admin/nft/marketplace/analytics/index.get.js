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
                                    overview: {
                                        type: "object",
                                        properties: {
                                            totalListings: { type: "number" },
                                            activeListings: { type: "number" },
                                            totalSales: { type: "number" },
                                            totalAuctions: { type: "number" },
                                            completedAuctions: { type: "number" },
                                            currentVolume: { type: "number" },
                                            avgPrice: {
                                                type: "number",
                                                nullable: true,
                                                description: "Mean USD price of the sales that could be priced. Null when none could be."
                                            },
                                            auctionSuccessRate: {
                                                type: "number",
                                                nullable: true,
                                                description: "Null when the platform has no auctions at all — a success rate over no auctions has no denominator."
                                            }
                                        }
                                    },
                                    trends: {
                                        type: "object",
                                        description: "Percentage change against the equivalent preceding window. Null where the previous window was empty, because growth from zero has no percentage.",
                                        properties: {
                                            volumeChange: { type: "number", nullable: true },
                                            salesChange: { type: "number", nullable: true },
                                            priceChange: { type: "number", nullable: true },
                                            period: { type: "string" }
                                        }
                                    },
                                    distribution: {
                                        type: "object",
                                        properties: {
                                            byType: { type: "object", additionalProperties: { type: "number" } },
                                            byStatus: { type: "object", additionalProperties: { type: "number" } }
                                        }
                                    },
                                    performance: {
                                        type: "object",
                                        properties: {
                                            avgAuctionDuration: {
                                                type: "number",
                                                nullable: true,
                                                description: "Days from listing to sale. Null when nothing has sold."
                                            },
                                            avgFixedPriceDuration: { type: "number", nullable: true },
                                            topCollections: {
                                                type: "array",
                                                items: {
                                                    type: "object",
                                                    properties: {
                                                        collectionId: { type: "string" },
                                                        collectionName: { type: "string" },
                                                        salesCount: { type: "number" },
                                                        totalVolume: { type: "number" },
                                                        avgPrice: { type: "number", nullable: true },
                                                        unpricedCurrencies: { type: "array", items: { type: "string" } }
                                                    }
                                                }
                                            },
                                            recentTransfers: {
                                                type: "object",
                                                description: "The most recent NFT TRANSFER activity rows, newest first, capped — NOT the whole window.",
                                                properties: {
                                                    limit: { type: "number" },
                                                    items: {
                                                        type: "array",
                                                        items: {
                                                            type: "object",
                                                            properties: {
                                                                id: { type: "string" },
                                                                fromUser: { type: "string", nullable: true },
                                                                toUser: { type: "string", nullable: true },
                                                                tokenName: { type: "string", nullable: true },
                                                                metadata: {},
                                                                createdAt: { type: "string", format: "date-time" }
                                                            }
                                                        }
                                                    }
                                                }
                                            }
                                        }
                                    },
                                    timeRange: { type: "string" },
                                    currency: { type: "string" },
                                    unpricedCurrencies: {
                                        type: "array",
                                        items: { type: "string" },
                                        description: "Denominations excluded from every USD figure above. Non-empty means the volumes are a LOWER BOUND."
                                    }
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
const RECENT_TRANSFER_LIMIT = 20;
function delta(current, previous) {
    if (!Number.isFinite(current) || !Number.isFinite(previous))
        return null;
    if (previous === 0)
        return null;
    return Number((((current - previous) / Math.abs(previous)) * 100).toFixed(1));
}
function numberOrNull(value) {
    if (value === null || value === undefined)
        return null;
    const parsed = typeof value === "number" ? value : parseFloat(String(value));
    return Number.isFinite(parsed) ? parsed : null;
}
exports.default = async (data) => {
    var _a, _b;
    var _c;
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
        const [totalListings, activeListings, totalSales, totalAuctions, completedAuctions, currentSalesByCurrency, previousSalesByCurrency, listingsByType, listingsByStatus, auctionPerformance, topCollections, recentTransfers] = await Promise.all([
            db_1.models.nftListing.count(),
            db_1.models.nftListing.count({ where: { status: "ACTIVE" } }),
            db_1.models.nftSale.count({ where: { status: "COMPLETED" } }),
            db_1.models.nftListing.count({ where: { type: "AUCTION" } }),
            db_1.models.nftListing.count({ where: { type: "AUCTION", status: "SOLD" } }),
            db_1.models.nftSale.findAll({
                attributes: [
                    'currency',
                    [(0, sequelize_1.fn)('SUM', (0, sequelize_1.col)('price')), 'total'],
                    [(0, sequelize_1.fn)('COUNT', (0, sequelize_1.col)('id')), 'count']
                ],
                where: {
                    status: "COMPLETED",
                    createdAt: { [sequelize_1.Op.gte]: startDate }
                },
                group: ['currency'],
                raw: true
            }),
            db_1.models.nftSale.findAll({
                attributes: [
                    'currency',
                    [(0, sequelize_1.fn)('SUM', (0, sequelize_1.col)('price')), 'total'],
                    [(0, sequelize_1.fn)('COUNT', (0, sequelize_1.col)('id')), 'count']
                ],
                where: {
                    status: "COMPLETED",
                    createdAt: {
                        [sequelize_1.Op.gte]: previousStartDate,
                        [sequelize_1.Op.lt]: startDate
                    }
                },
                group: ['currency'],
                raw: true
            }),
            db_1.models.nftListing.findAll({
                attributes: [
                    'type',
                    [(0, sequelize_1.fn)('COUNT', (0, sequelize_1.col)('id')), 'count']
                ],
                group: ['type'],
                raw: true
            }),
            db_1.models.nftListing.findAll({
                attributes: [
                    'status',
                    [(0, sequelize_1.fn)('COUNT', (0, sequelize_1.col)('id')), 'count']
                ],
                group: ['status'],
                raw: true
            }),
            db_1.models.nftListing.findAll({
                attributes: [
                    [(0, sequelize_1.fn)('AVG', (0, sequelize_1.literal)("CASE WHEN type = 'AUCTION' AND status = 'SOLD' THEN DATEDIFF(soldAt, createdAt) END")), 'avgAuctionDuration'],
                    [(0, sequelize_1.fn)('AVG', (0, sequelize_1.literal)("CASE WHEN type = 'FIXED_PRICE' AND status = 'SOLD' THEN DATEDIFF(soldAt, createdAt) END")), 'avgFixedPriceDuration']
                ],
                raw: true
            }),
            db_1.models.nftSale.findAll({
                attributes: [
                    [(0, sequelize_1.col)('token.collection.name'), 'collectionName'],
                    [(0, sequelize_1.col)('token.collection.id'), 'collectionId'],
                    [(0, sequelize_1.col)('nftSale.currency'), 'currency'],
                    [(0, sequelize_1.fn)('COUNT', (0, sequelize_1.col)('nftSale.id')), 'salesCount'],
                    [(0, sequelize_1.fn)('SUM', (0, sequelize_1.col)('price')), 'totalVolume']
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
                group: ['token.collection.id', 'nftSale.currency'],
                raw: true
            }),
            db_1.models.nftActivity.findAll({
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
                        model: db_1.models.user,
                        as: "toUser",
                        attributes: ["id", "firstName", "lastName"]
                    },
                    {
                        model: db_1.models.nftToken,
                        as: "token",
                        attributes: ["id", "name"]
                    }
                ],
                order: [['createdAt', 'DESC']],
                limit: RECENT_TRANSFER_LIMIT
            })
        ]);
        await loadRates([
            ...currentSalesByCurrency.map((row) => row.currency),
            ...previousSalesByCurrency.map((row) => row.currency),
            ...topCollections.map((item) => item.currency),
        ]);
        const foldSales = (rows) => {
            var _a, _b;
            let volumeUSD = 0;
            let pricedCount = 0;
            let totalCount = 0;
            for (const row of rows) {
                const count = parseInt((_a = row.count) !== null && _a !== void 0 ? _a : "0") || 0;
                totalCount += count;
                const bucketUSD = toUSD(parseFloat((_b = row.total) !== null && _b !== void 0 ? _b : "0"), row.currency);
                if (bucketUSD === null)
                    continue;
                volumeUSD += bucketUSD;
                pricedCount += count;
            }
            return { volumeUSD, pricedCount, totalCount };
        };
        const current = foldSales(currentSalesByCurrency);
        const previous = foldSales(previousSalesByCurrency);
        const volumeChange = delta(current.volumeUSD, previous.volumeUSD);
        const salesChange = delta(current.totalCount, previous.totalCount);
        const avgPriceCurrent = current.pricedCount > 0 ? current.volumeUSD / current.pricedCount : null;
        const avgPricePrevious = previous.pricedCount > 0 ? previous.volumeUSD / previous.pricedCount : null;
        const priceChange = avgPriceCurrent === null || avgPricePrevious === null
            ? null
            : delta(avgPriceCurrent, avgPricePrevious);
        const collectionTotals = new Map();
        for (const item of topCollections) {
            const collectionId = item.collectionId;
            const salesCount = parseInt(item.salesCount || "0");
            const bucket = (_c = collectionTotals.get(collectionId)) !== null && _c !== void 0 ? _c : {
                collectionId,
                collectionName: item.collectionName || "Unknown",
                totalVolume: 0,
                salesCount: 0,
                pricedSales: 0,
                unpricedCurrencies: []
            };
            bucket.salesCount += salesCount;
            const volumeUSD = toUSD(parseFloat(item.totalVolume || "0"), item.currency);
            if (volumeUSD !== null) {
                bucket.totalVolume += volumeUSD;
                bucket.pricedSales += salesCount;
            }
            else {
                bucket.unpricedCurrencies.push(item.currency || "UNKNOWN");
            }
            collectionTotals.set(collectionId, bucket);
        }
        const topCollectionsUSD = [...collectionTotals.values()]
            .sort((a, b) => b.totalVolume - a.totalVolume)
            .slice(0, 10);
        const overview = {
            totalListings,
            activeListings,
            totalSales,
            totalAuctions,
            completedAuctions,
            currentVolume: current.volumeUSD,
            avgPrice: avgPriceCurrent,
            auctionSuccessRate: totalAuctions > 0 ? (completedAuctions / totalAuctions) * 100 : null
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
            avgAuctionDuration: numberOrNull((_a = auctionPerformance[0]) === null || _a === void 0 ? void 0 : _a.avgAuctionDuration),
            avgFixedPriceDuration: numberOrNull((_b = auctionPerformance[0]) === null || _b === void 0 ? void 0 : _b.avgFixedPriceDuration),
            topCollections: topCollectionsUSD.map((item) => ({
                collectionId: item.collectionId,
                collectionName: item.collectionName,
                salesCount: item.salesCount,
                totalVolume: item.totalVolume,
                avgPrice: item.pricedSales > 0 ? item.totalVolume / item.pricedSales : null,
                unpricedCurrencies: item.unpricedCurrencies
            })),
            recentTransfers: {
                limit: RECENT_TRANSFER_LIMIT,
                items: recentTransfers.map(activity => { var _a; var _b; return ({
                    id: activity.id,
                    fromUser: activity.fromUser
                        ? `${activity.fromUser.firstName} ${activity.fromUser.lastName}`
                        : null,
                    toUser: activity.toUser
                        ? `${activity.toUser.firstName} ${activity.toUser.lastName}`
                        : null,
                    tokenName: (_b = (_a = activity.token) === null || _a === void 0 ? void 0 : _a.name) !== null && _b !== void 0 ? _b : null,
                    metadata: activity.metadata,
                    createdAt: activity.createdAt
                }); })
            }
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
                currency: "USD",
                unpricedCurrencies: [...unpriced]
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
