"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const sequelize_1 = require("sequelize");
exports.metadata = {
    summary: "Get creator analytics",
    operationId: "getCreatorAnalytics",
    tags: ["NFT", "Creator", "Analytics"],
    logModule: "NFT",
    logTitle: "Get Creator Analytics",
    parameters: [
        {
            name: "period",
            in: "query",
            description: "Time period for analytics",
            schema: {
                type: "string",
                enum: ["7d", "30d", "90d", "1y", "all"],
                default: "30d"
            },
        },
        {
            name: "granularity",
            in: "query",
            description: "Data granularity",
            schema: {
                type: "string",
                enum: ["day", "week", "month"],
                default: "day"
            },
        },
    ],
    responses: {
        200: { description: "Creator analytics retrieved successfully" },
        401: { description: "Unauthorized" },
        500: { description: "Internal Server Error" },
    },
    requiresAuth: true,
};
exports.default = async (data) => {
    var _a, _b;
    const { user, query, ctx } = data;
    if (!(user === null || user === void 0 ? void 0 : user.id)) {
        throw (0, error_1.createError)({ statusCode: 401, message: "Unauthorized" });
    }
    const { period = "30d", granularity = "day" } = query;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Fetching creator analytics data");
    try {
        const creator = await db_1.models.nftCreator.findOne({
            where: { userId: user.id }
        });
        if (!creator) {
            throw (0, error_1.createError)({
                statusCode: 404,
                message: "Creator profile not found"
            });
        }
        const creatorId = creator.id;
        const now = new Date();
        let startDate = new Date();
        switch (period) {
            case "7d":
                startDate.setDate(now.getDate() - 7);
                break;
            case "30d":
                startDate.setDate(now.getDate() - 30);
                break;
            case "90d":
                startDate.setDate(now.getDate() - 90);
                break;
            case "1y":
                startDate.setFullYear(now.getFullYear() - 1);
                break;
            case "all":
                startDate = new Date("2020-01-01");
                break;
            default:
                startDate.setDate(now.getDate() - 30);
        }
        const salesData = await db_1.models.nftSale.findAll({
            where: {
                createdAt: {
                    [sequelize_1.Op.gte]: startDate,
                },
            },
            include: [
                {
                    model: db_1.models.nftToken,
                    as: "token",
                    where: { creatorId: creatorId },
                    attributes: ["id", "name"],
                    include: [
                        {
                            model: db_1.models.nftCollection,
                            as: "collection",
                            attributes: ["id", "name"],
                        },
                    ],
                },
            ],
            order: [["createdAt", "ASC"]],
        });
        const royaltyData = await db_1.models.nftRoyalty.findAll({
            where: {
                recipientId: user.id,
                createdAt: {
                    [sequelize_1.Op.gte]: startDate,
                },
            },
            include: [
                {
                    model: db_1.models.nftSale,
                    as: "sale",
                    include: [
                        {
                            model: db_1.models.nftToken,
                            as: "token",
                            attributes: ["id", "name"],
                        },
                    ],
                },
            ],
            order: [["createdAt", "ASC"]],
        });
        const collectionPerformance = await db_1.models.nftCollection.findAll({
            where: { creatorId: creatorId },
            attributes: [
                "id", "name", "slug", "logoImage", "totalItems",
                "volumeTraded", "floorPrice", "totalSales", "createdAt",
                [
                    (0, sequelize_1.literal)(`(
            SELECT COUNT(*)
            FROM nft_sales s
            INNER JOIN nft_tokens t ON s.tokenId = t.id
            WHERE t.collectionId = nftCollection.id
            AND s.createdAt >= '${startDate.toISOString()}'
          )`),
                    "periodSales"
                ],
                [
                    (0, sequelize_1.literal)(`(
            SELECT COALESCE(SUM(s.price), 0)
            FROM nft_sales s
            INNER JOIN nft_tokens t ON s.tokenId = t.id
            WHERE t.collectionId = nftCollection.id
            AND s.createdAt >= '${startDate.toISOString()}'
          )`),
                    "periodVolume"
                ],
                [
                    (0, sequelize_1.literal)(`(
            SELECT COUNT(DISTINCT t.ownerId)
            FROM nft_tokens t
            WHERE t.collectionId = nftCollection.id
          )`),
                    "uniqueOwners"
                ],
            ],
            order: [["volumeTraded", "DESC"]],
        });
        const topSellingNFTs = await db_1.models.nftToken.findAll({
            where: { creatorId: creatorId },
            attributes: [
                "id", "name", "image", "tokenId",
                [
                    (0, sequelize_1.literal)(`(
            SELECT COUNT(*)
            FROM nft_sales s
            WHERE s.tokenId = nftToken.id
            AND s.createdAt >= '${startDate.toISOString()}'
          )`),
                    "salesCount"
                ],
                [
                    (0, sequelize_1.literal)(`(
            SELECT COALESCE(SUM(s.price), 0)
            FROM nft_sales s
            WHERE s.tokenId = nftToken.id
            AND s.createdAt >= '${startDate.toISOString()}'
          )`),
                    "totalVolume"
                ],
                [
                    (0, sequelize_1.literal)(`(
            SELECT MAX(s.price)
            FROM nft_sales s
            WHERE s.tokenId = nftToken.id
            AND s.createdAt >= '${startDate.toISOString()}'
          )`),
                    "highestSale"
                ],
            ],
            include: [
                {
                    model: db_1.models.nftCollection,
                    as: "collection",
                    attributes: ["id", "name", "slug"],
                },
            ],
            having: (0, sequelize_1.literal)("salesCount > 0"),
            order: [[(0, sequelize_1.literal)("totalVolume"), "DESC"]],
            limit: 10,
        });
        const buyerAnalytics = await db_1.models.nftSale.findAll({
            where: {
                createdAt: {
                    [sequelize_1.Op.gte]: startDate,
                },
            },
            include: [
                {
                    model: db_1.models.nftToken,
                    as: "token",
                    where: { creatorId: creatorId },
                    attributes: [],
                },
                {
                    model: db_1.models.user,
                    as: "buyer",
                    attributes: ["id", "firstName", "lastName"],
                },
            ],
            attributes: [
                "buyerId",
                [(0, sequelize_1.fn)("COUNT", (0, sequelize_1.col)("nftSale.id")), "purchaseCount"],
                [(0, sequelize_1.fn)("SUM", (0, sequelize_1.col)("nftSale.price")), "totalSpent"],
                [(0, sequelize_1.fn)("AVG", (0, sequelize_1.col)("nftSale.price")), "avgPurchase"],
            ],
            group: ["buyerId", "buyer.id", "buyer.firstName", "buyer.lastName"],
            order: [[(0, sequelize_1.literal)("totalSpent"), "DESC"]],
            limit: 10,
        });
        let dateFormat = "%Y-%m-%d";
        if (granularity === "week") {
            dateFormat = "%Y-%u";
        }
        else if (granularity === "month") {
            dateFormat = "%Y-%m";
        }
        const timeSeriesData = await db_1.models.nftSale.findAll({
            where: {
                createdAt: {
                    [sequelize_1.Op.gte]: startDate,
                },
            },
            include: [
                {
                    model: db_1.models.nftToken,
                    as: "token",
                    where: { creatorId: creatorId },
                    attributes: [],
                },
            ],
            attributes: [
                [(0, sequelize_1.fn)("DATE_FORMAT", (0, sequelize_1.col)("nftSale.createdAt"), dateFormat), "period"],
                [(0, sequelize_1.fn)("COUNT", (0, sequelize_1.col)("nftSale.id")), "sales"],
                [(0, sequelize_1.fn)("SUM", (0, sequelize_1.col)("nftSale.price")), "volume"],
                [(0, sequelize_1.fn)("SUM", (0, sequelize_1.col)("nftSale.royaltyFee")), "royalties"],
                [(0, sequelize_1.fn)("AVG", (0, sequelize_1.col)("nftSale.price")), "avgPrice"],
                [(0, sequelize_1.fn)("COUNT", (0, sequelize_1.fn)("DISTINCT", (0, sequelize_1.col)("nftSale.buyerId"))), "uniqueBuyers"],
            ],
            group: [(0, sequelize_1.fn)("DATE_FORMAT", (0, sequelize_1.col)("nftSale.createdAt"), dateFormat)],
            order: [[(0, sequelize_1.fn)("DATE_FORMAT", (0, sequelize_1.col)("nftSale.createdAt"), dateFormat), "ASC"]],
        });
        const marketPosition = await db_1.sequelize.query(`
      SELECT 
        (SELECT COUNT(*) FROM nft_creators WHERE totalVolume > ?) as rank,
        (SELECT COUNT(*) FROM nft_creators) as totalCreators,
        (SELECT AVG(totalVolume) FROM nft_creators) as avgVolume,
        (SELECT MAX(totalVolume) FROM nft_creators) as topVolume
    `, {
            replacements: [(creator === null || creator === void 0 ? void 0 : creator.totalVolume) || 0],
            type: sequelize_1.QueryTypes.SELECT,
        });
        const totalSales = salesData.length;
        const totalVolume = salesData.reduce((sum, sale) => sum + parseFloat(String(sale.price)), 0);
        const totalRoyalties = royaltyData.reduce((sum, royalty) => sum + parseFloat(String(royalty.amount)), 0);
        const avgSalePrice = totalSales > 0 ? totalVolume / totalSales : 0;
        const uniqueBuyers = new Set(salesData.map(sale => sale.buyerId)).size;
        const previousPeriodStart = new Date(startDate);
        const periodLength = now.getTime() - startDate.getTime();
        previousPeriodStart.setTime(startDate.getTime() - periodLength);
        const previousSales = await db_1.models.nftSale.count({
            where: {
                createdAt: {
                    [sequelize_1.Op.gte]: previousPeriodStart,
                    [sequelize_1.Op.lt]: startDate,
                },
            },
            include: [
                {
                    model: db_1.models.nftToken,
                    as: "token",
                    where: { creatorId: creatorId },
                    attributes: [],
                },
            ],
        });
        const previousVolumeResult = await db_1.sequelize.query(`
      SELECT COALESCE(SUM(s.price), 0) as totalVolume
      FROM nft_sales s
      INNER JOIN nft_tokens t ON s.tokenId = t.id
      WHERE t.creatorId = ?
      AND s.createdAt >= ?
      AND s.createdAt < ?
    `, {
            replacements: [creatorId, previousPeriodStart.toISOString(), startDate.toISOString()],
            type: sequelize_1.QueryTypes.SELECT,
        });
        const previousVolume = parseFloat(((_a = previousVolumeResult[0]) === null || _a === void 0 ? void 0 : _a.totalVolume) || "0");
        const salesGrowth = previousSales > 0 ? ((totalSales - previousSales) / previousSales) * 100 : 0;
        const volumeGrowth = previousVolume > 0 ? ((totalVolume - previousVolume) / previousVolume) * 100 : 0;
        ctx === null || ctx === void 0 ? void 0 : ctx.success("Get Creator Analytics completed successfully");
        return {
            period,
            granularity,
            summary: {
                totalSales,
                totalVolume,
                totalRoyalties,
                avgSalePrice,
                uniqueBuyers,
                salesGrowth,
                volumeGrowth,
                totalCollections: collectionPerformance.length,
                totalNFTs: await db_1.models.nftToken.count({ where: { creatorId: creatorId } }),
            },
            timeSeries: timeSeriesData.map(item => {
                const data = item.dataValues;
                return {
                    period: data.period,
                    sales: parseInt(String(data.sales || 0)),
                    volume: parseFloat(String(data.volume || 0)),
                    royalties: parseFloat(String(data.royalties || 0)),
                    avgPrice: parseFloat(String(data.avgPrice || 0)),
                    uniqueBuyers: parseInt(String(data.uniqueBuyers || 0)),
                };
            }),
            collections: collectionPerformance.map(collection => {
                const data = collection.dataValues;
                return {
                    ...collection.toJSON(),
                    periodSales: parseInt(String(data.periodSales || 0)),
                    periodVolume: parseFloat(String(data.periodVolume || 0)),
                    uniqueOwners: parseInt(String(data.uniqueOwners || 0)),
                    salesGrowth: 0,
                };
            }),
            topSellingNFTs: topSellingNFTs.map(nft => {
                const data = nft.dataValues;
                return {
                    ...nft.toJSON(),
                    salesCount: parseInt(String(data.salesCount || 0)),
                    totalVolume: parseFloat(String(data.totalVolume || 0)),
                    highestSale: parseFloat(String(data.highestSale || 0)),
                };
            }),
            topBuyers: buyerAnalytics.map(buyer => {
                const data = buyer.dataValues;
                return {
                    buyerId: buyer.buyerId,
                    buyer: buyer.buyer,
                    purchaseCount: parseInt(String(data.purchaseCount || 0)),
                    totalSpent: parseFloat(String(data.totalSpent || 0)),
                    avgPurchase: parseFloat(String(data.avgPurchase || 0)),
                };
            }),
            marketPosition: marketPosition[0] ? {
                rank: parseInt(marketPosition[0].rank) + 1,
                totalCreators: parseInt(marketPosition[0].totalCreators),
                percentile: ((parseInt(marketPosition[0].totalCreators) - parseInt(marketPosition[0].rank)) / parseInt(marketPosition[0].totalCreators)) * 100,
                avgVolume: parseFloat(marketPosition[0].avgVolume || "0"),
                topVolume: parseFloat(marketPosition[0].topVolume || "0"),
            } : null,
            insights: {
                bestPerformingDay: timeSeriesData.length > 0 ? (() => {
                    const best = timeSeriesData.reduce((bestItem, current) => {
                        const currentData = current.dataValues;
                        const bestData = bestItem.dataValues;
                        return parseFloat(String(currentData.volume || 0)) > parseFloat(String((bestData === null || bestData === void 0 ? void 0 : bestData.volume) || 0)) ? current : bestItem;
                    }, timeSeriesData[0]);
                    return best.dataValues.period;
                })() : null,
                mostPopularCollection: (_b = collectionPerformance[0]) === null || _b === void 0 ? void 0 : _b.name,
                avgDaysToSell: 0,
                repeatBuyerRate: buyerAnalytics.length > 0 ? buyerAnalytics.filter(b => {
                    const data = b.dataValues;
                    return parseInt(String(data.purchaseCount || 0)) > 1;
                }).length / buyerAnalytics.length * 100 : 0,
            },
        };
    }
    catch (error) {
        console.error("Error fetching creator analytics:", error);
        throw (0, error_1.createError)({
            statusCode: 500,
            message: "Failed to fetch creator analytics",
        });
    }
};
