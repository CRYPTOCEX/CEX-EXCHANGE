"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const sequelize_1 = require("sequelize");
const json_safe_1 = require("../utils/json-safe");
exports.metadata = {
    summary: "Get P2P Landing Page Data",
    description: "Retrieves comprehensive data for the P2P landing page including stats, top cryptos, featured offers, top traders, and payment methods.",
    operationId: "getP2PLandingData",
    tags: ["P2P", "Landing"],
    requiresAuth: false,
    responses: {
        200: {
            description: "P2P landing data retrieved successfully",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            stats: { type: "object" },
                            topCryptos: { type: "array" },
                            featuredOffers: { type: "object" },
                            topTraders: { type: "array" },
                            popularPaymentMethods: { type: "array" },
                            recentActivity: { type: "array" },
                            trustMetrics: { type: "object" },
                        },
                    },
                },
            },
        },
    },
};
exports.default = async (data) => {
    const now = new Date();
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const previousMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const previousMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
    const [tradeStats, topCryptos, buyOffers, sellOffers, topTraderReviews, popularPaymentMethods, recentTrades, disputeStats, activeOffersCount, uniqueCountries,] = await Promise.all([
        db_1.models.p2pTrade.findOne({
            attributes: [
                [(0, sequelize_1.fn)("COUNT", (0, sequelize_1.col)("id")), "totalTrades"],
                [
                    (0, sequelize_1.fn)("SUM", (0, sequelize_1.literal)("CASE WHEN status = 'COMPLETED' THEN 1 ELSE 0 END")),
                    "completedTrades",
                ],
                [
                    (0, sequelize_1.fn)("SUM", (0, sequelize_1.literal)("CASE WHEN status = 'COMPLETED' THEN total ELSE 0 END")),
                    "totalVolume",
                ],
                [
                    (0, sequelize_1.fn)("AVG", (0, sequelize_1.literal)("CASE WHEN status = 'COMPLETED' THEN total ELSE NULL END")),
                    "avgTradeSize",
                ],
                [(0, sequelize_1.fn)("COUNT", (0, sequelize_1.literal)("DISTINCT buyerId")), "uniqueBuyers"],
                [(0, sequelize_1.fn)("COUNT", (0, sequelize_1.literal)("DISTINCT sellerId")), "uniqueSellers"],
                [
                    (0, sequelize_1.fn)("SUM", (0, sequelize_1.literal)(`CASE WHEN status = 'COMPLETED' AND createdAt >= '${currentMonthStart.toISOString()}' THEN total ELSE 0 END`)),
                    "currentVolume",
                ],
                [
                    (0, sequelize_1.fn)("SUM", (0, sequelize_1.literal)(`CASE WHEN status = 'COMPLETED' AND createdAt BETWEEN '${previousMonthStart.toISOString()}' AND '${previousMonthEnd.toISOString()}' THEN total ELSE 0 END`)),
                    "previousVolume",
                ],
            ],
            raw: true,
        }),
        db_1.models.p2pTrade.findAll({
            attributes: [
                "currency",
                [(0, sequelize_1.fn)("SUM", (0, sequelize_1.col)("total")), "totalVolume"],
                [(0, sequelize_1.fn)("COUNT", (0, sequelize_1.col)("id")), "tradeCount"],
                [(0, sequelize_1.fn)("AVG", (0, sequelize_1.col)("price")), "avgPrice"],
            ],
            where: { status: "COMPLETED" },
            group: ["currency"],
            order: [[(0, sequelize_1.literal)("totalVolume"), "DESC"]],
            limit: 6,
            raw: true,
        }),
        db_1.models.p2pOffer.findAll({
            where: { type: "SELL", status: "ACTIVE" },
            include: [
                {
                    model: db_1.models.user,
                    as: "user",
                    attributes: ["id", "firstName", "lastName", "avatar"],
                },
                {
                    model: db_1.models.p2pPaymentMethod,
                    as: "paymentMethods",
                    attributes: ["id", "name", "icon"],
                    through: { attributes: [] },
                },
            ],
            order: [["createdAt", "DESC"]],
            limit: 4,
        }),
        db_1.models.p2pOffer.findAll({
            where: { type: "BUY", status: "ACTIVE" },
            include: [
                {
                    model: db_1.models.user,
                    as: "user",
                    attributes: ["id", "firstName", "lastName", "avatar"],
                },
                {
                    model: db_1.models.p2pPaymentMethod,
                    as: "paymentMethods",
                    attributes: ["id", "name", "icon"],
                    through: { attributes: [] },
                },
            ],
            order: [["createdAt", "DESC"]],
            limit: 4,
        }),
        db_1.models.p2pReview.findAll({
            attributes: [
                "revieweeId",
                [(0, sequelize_1.fn)("COUNT", (0, sequelize_1.col)("id")), "reviewCount"],
                [
                    (0, sequelize_1.fn)("AVG", (0, sequelize_1.literal)("(communicationRating + speedRating + trustRating) / 3")),
                    "avgRating",
                ],
                [(0, sequelize_1.fn)("AVG", (0, sequelize_1.col)("communicationRating")), "avgCommunicationRating"],
                [(0, sequelize_1.fn)("AVG", (0, sequelize_1.col)("speedRating")), "avgSpeedRating"],
                [(0, sequelize_1.fn)("AVG", (0, sequelize_1.col)("trustRating")), "avgTrustRating"],
            ],
            group: ["revieweeId"],
            having: (0, sequelize_1.literal)("COUNT(id) >= 3"),
            order: [[(0, sequelize_1.literal)("avgRating"), "DESC"]],
            limit: 6,
            raw: true,
        }),
        db_1.models.p2pPaymentMethod.findAll({
            where: { isGlobal: true, available: true },
            attributes: ["id", "name", "icon", "processingTime"],
            order: [["popularityRank", "DESC"]],
            limit: 8,
        }),
        db_1.models.p2pTrade.findAll({
            where: { status: "COMPLETED" },
            attributes: ["currency", "amount", "total", "createdAt"],
            order: [["createdAt", "DESC"]],
            limit: 10,
            raw: true,
        }),
        db_1.models.p2pDispute.findOne({
            attributes: [
                [(0, sequelize_1.fn)("COUNT", (0, sequelize_1.col)("id")), "totalDisputes"],
                [
                    (0, sequelize_1.fn)("SUM", (0, sequelize_1.literal)("CASE WHEN status = 'RESOLVED' THEN 1 ELSE 0 END")),
                    "resolvedDisputes",
                ],
            ],
            raw: true,
        }),
        db_1.models.p2pOffer.count({ where: { status: "ACTIVE" } }),
        db_1.models.p2pOffer.findAll({
            attributes: [
                [
                    (0, sequelize_1.fn)("DISTINCT", (0, sequelize_1.literal)("JSON_EXTRACT(locationSettings, '$.country')")),
                    "country",
                ],
            ],
            where: {
                status: "ACTIVE",
                locationSettings: { [sequelize_1.Op.ne]: null },
            },
            raw: true,
        }),
    ]);
    const totalTrades = parseInt(tradeStats === null || tradeStats === void 0 ? void 0 : tradeStats.totalTrades) || 0;
    const completedTrades = parseInt(tradeStats === null || tradeStats === void 0 ? void 0 : tradeStats.completedTrades) || 0;
    const totalVolume = parseFloat(tradeStats === null || tradeStats === void 0 ? void 0 : tradeStats.totalVolume) || 0;
    const avgTradeSize = parseFloat(tradeStats === null || tradeStats === void 0 ? void 0 : tradeStats.avgTradeSize) || 0;
    const successRate = totalTrades > 0 ? Math.round((completedTrades / totalTrades) * 100) : 0;
    const uniqueBuyers = parseInt(tradeStats === null || tradeStats === void 0 ? void 0 : tradeStats.uniqueBuyers) || 0;
    const uniqueSellers = parseInt(tradeStats === null || tradeStats === void 0 ? void 0 : tradeStats.uniqueSellers) || 0;
    const uniqueTraders = uniqueBuyers + uniqueSellers;
    const currentVolume = parseFloat(tradeStats === null || tradeStats === void 0 ? void 0 : tradeStats.currentVolume) || 0;
    const previousVolume = parseFloat(tradeStats === null || tradeStats === void 0 ? void 0 : tradeStats.previousVolume) || 0;
    const volumeGrowth = previousVolume > 0
        ? Math.round(((currentVolume - previousVolume) / previousVolume) * 100)
        : 0;
    const countriesServed = uniqueCountries.filter((c) => c.country && c.country !== "null").length;
    const traderIds = topTraderReviews.map((t) => t.revieweeId);
    const traderUsers = traderIds.length > 0
        ? await db_1.models.user.findAll({
            where: { id: { [sequelize_1.Op.in]: traderIds } },
            attributes: ["id", "firstName", "lastName", "avatar", "createdAt"],
        })
        : [];
    const traderUserMap = {};
    traderUsers.forEach((u) => {
        traderUserMap[u.id] = u;
    });
    const traderTradeCounts = traderIds.length > 0
        ? await db_1.models.p2pTrade.findAll({
            attributes: [
                "sellerId",
                [(0, sequelize_1.fn)("COUNT", (0, sequelize_1.col)("id")), "tradeCount"],
                [(0, sequelize_1.fn)("SUM", (0, sequelize_1.col)("total")), "totalVolume"],
            ],
            where: {
                status: "COMPLETED",
                sellerId: { [sequelize_1.Op.in]: traderIds },
            },
            group: ["sellerId"],
            raw: true,
        })
        : [];
    const tradeCountMap = {};
    traderTradeCounts.forEach((t) => {
        tradeCountMap[t.sellerId] = t;
    });
    const transformedTraders = topTraderReviews.map((t) => {
        const user = traderUserMap[t.revieweeId];
        const trades = tradeCountMap[t.revieweeId] || {};
        return {
            id: t.revieweeId,
            firstName: (user === null || user === void 0 ? void 0 : user.firstName) || "Trader",
            lastName: (user === null || user === void 0 ? void 0 : user.lastName) || "",
            avatar: (user === null || user === void 0 ? void 0 : user.avatar) || null,
            completedTrades: parseInt(trades.tradeCount) || 0,
            totalVolume: parseFloat(trades.totalVolume) || 0,
            successRate: 100,
            avgRating: parseFloat(t.avgRating) || 0,
            avgCommunicationRating: parseFloat(t.avgCommunicationRating) || 0,
            avgSpeedRating: parseFloat(t.avgSpeedRating) || 0,
            avgTrustRating: parseFloat(t.avgTrustRating) || 0,
            memberSince: user === null || user === void 0 ? void 0 : user.createdAt,
        };
    });
    const transformOffer = (offer) => {
        var _a, _b, _c;
        const priceConfig = (0, json_safe_1.safeParse)(offer.priceConfig, {});
        const amountConfig = (0, json_safe_1.safeParse)(offer.amountConfig, {});
        const tradeSettings = (0, json_safe_1.safeParse)(offer.tradeSettings, {});
        return {
            id: offer.id,
            currency: offer.currency,
            priceCurrency: offer.priceCurrency || (priceConfig === null || priceConfig === void 0 ? void 0 : priceConfig.currency) || "USD",
            price: (priceConfig === null || priceConfig === void 0 ? void 0 : priceConfig.finalPrice) || (priceConfig === null || priceConfig === void 0 ? void 0 : priceConfig.fixedPrice) || (priceConfig === null || priceConfig === void 0 ? void 0 : priceConfig.value) || 0,
            priceModel: (priceConfig === null || priceConfig === void 0 ? void 0 : priceConfig.model) || "FIXED",
            minAmount: (amountConfig === null || amountConfig === void 0 ? void 0 : amountConfig.min) || 0,
            maxAmount: (amountConfig === null || amountConfig === void 0 ? void 0 : amountConfig.max) || (amountConfig === null || amountConfig === void 0 ? void 0 : amountConfig.total) || 0,
            availableAmount: (amountConfig === null || amountConfig === void 0 ? void 0 : amountConfig.availableBalance) || (amountConfig === null || amountConfig === void 0 ? void 0 : amountConfig.total) || 0,
            termsOfTrade: (tradeSettings === null || tradeSettings === void 0 ? void 0 : tradeSettings.termsOfTrade) || "",
            trader: {
                id: (_a = offer.user) === null || _a === void 0 ? void 0 : _a.id,
                firstName: ((_b = offer.user) === null || _b === void 0 ? void 0 : _b.firstName) || "Trader",
                avatar: (_c = offer.user) === null || _c === void 0 ? void 0 : _c.avatar,
            },
        };
    };
    const recentActivity = recentTrades.map((trade) => {
        const timeAgo = getTimeAgo(new Date(trade.createdAt));
        return {
            type: "TRADE_COMPLETED",
            currency: trade.currency,
            amount: trade.amount,
            total: trade.total,
            timeAgo,
        };
    });
    const totalDisputes = parseInt(disputeStats === null || disputeStats === void 0 ? void 0 : disputeStats.totalDisputes) || 0;
    const resolvedDisputes = parseInt(disputeStats === null || disputeStats === void 0 ? void 0 : disputeStats.resolvedDisputes) || 0;
    const disputeResolutionRate = totalDisputes > 0
        ? Math.round((resolvedDisputes / totalDisputes) * 100)
        : 100;
    const disputeRate = completedTrades > 0
        ? Math.round((totalDisputes / completedTrades) * 100 * 10) / 10
        : 0;
    return {
        stats: {
            totalTrades,
            completedTrades,
            totalVolume,
            averageTradeSize: avgTradeSize,
            successRate,
            uniqueTraders,
            activeOffers: activeOffersCount,
            avgCompletionTime: 15,
            disputeResolutionRate,
            countriesServed: countriesServed || 50,
            volumeGrowth,
            tradersGrowth: 0,
            offersGrowth: 0,
        },
        topCryptos: topCryptos.map((c) => ({
            currency: c.currency,
            totalVolume: parseFloat(c.totalVolume) || 0,
            tradeCount: parseInt(c.tradeCount) || 0,
            avgPrice: parseFloat(c.avgPrice) || 0,
        })),
        featuredOffers: {
            buy: buyOffers.map(transformOffer),
            sell: sellOffers.map(transformOffer),
        },
        topTraders: transformedTraders,
        popularPaymentMethods: popularPaymentMethods.map((pm) => ({
            id: pm.id,
            name: pm.name,
            icon: pm.icon,
            processingTime: pm.processingTime,
        })),
        recentActivity,
        trustMetrics: {
            avgEscrowReleaseTime: 15,
            disputeRate,
            disputeResolutionRate,
            satisfactionRate: 95,
        },
    };
};
function getTimeAgo(date) {
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
    if (seconds < 60)
        return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60)
        return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24)
        return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
}
