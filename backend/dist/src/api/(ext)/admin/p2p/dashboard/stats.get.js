"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const sequelize_1 = require("sequelize");
exports.metadata = {
    summary: "Get Admin Dashboard Stats",
    description: "Retrieves comprehensive statistics for the P2P admin dashboard including totals, growth metrics, distributions, and analytics.",
    operationId: "getAdminP2PDashboardStats",
    tags: ["Admin", "Dashboard", "P2P"],
    logModule: "ADMIN_P2P",
    logTitle: "Get P2P Dashboard Stats",
    requiresAuth: true,
    responses: {
        200: { description: "Stats retrieved successfully." },
        401: { description: "Unauthorized." },
        500: { description: "Internal Server Error." },
    },
    permission: "access.p2p",
};
const calcGrowth = (current, previous) => {
    if (previous === 0)
        return current > 0 ? "+100%" : "0%";
    const change = ((current - previous) / previous) * 100;
    const sign = change >= 0 ? "+" : "";
    return `${sign}${change.toFixed(1)}%`;
};
const getDateRange = (days) => {
    const now = new Date();
    const start = new Date(now);
    start.setDate(start.getDate() - days);
    return { start, end: now };
};
exports.default = async (data) => {
    try {
        const { ctx } = data;
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Fetching comprehensive P2P dashboard statistics");
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        const lastWeek = new Date(today);
        lastWeek.setDate(lastWeek.getDate() - 7);
        const twoWeeksAgo = new Date(today);
        twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
        const lastMonth = new Date(today);
        lastMonth.setMonth(lastMonth.getMonth() - 1);
        const twoMonthsAgo = new Date(today);
        twoMonthsAgo.setMonth(twoMonthsAgo.getMonth() - 2);
        const totalOffers = await db_1.models.p2pOffer.count();
        const offersYesterday = await db_1.models.p2pOffer.count({
            where: { createdAt: { [sequelize_1.Op.lt]: today } },
        });
        const offerGrowth = calcGrowth(totalOffers, offersYesterday);
        const activeOffers = await db_1.models.p2pOffer.count({
            where: { status: "ACTIVE" },
        });
        const pendingOffers = await db_1.models.p2pOffer.count({
            where: { status: "PENDING_APPROVAL" },
        });
        const activeTrades = await db_1.models.p2pTrade.count({
            where: { status: { [sequelize_1.Op.in]: ["PENDING", "PAYMENT_SENT"] } },
        });
        const activeTradesLastWeek = await db_1.models.p2pTrade.count({
            where: {
                status: { [sequelize_1.Op.in]: ["PENDING", "PAYMENT_SENT"] },
                createdAt: { [sequelize_1.Op.between]: [twoWeeksAgo, lastWeek] },
            },
        });
        const tradeGrowth = calcGrowth(activeTrades, activeTradesLastWeek);
        const openDisputes = await db_1.models.p2pDispute.count({
            where: { status: { [sequelize_1.Op.in]: ["PENDING", "IN_PROGRESS"] } },
        });
        const disputesYesterday = await db_1.models.p2pDispute.count({
            where: {
                status: { [sequelize_1.Op.in]: ["PENDING", "IN_PROGRESS"] },
                createdAt: { [sequelize_1.Op.lt]: today },
            },
        });
        const disputeChange = calcGrowth(openDisputes, disputesYesterday);
        const revenueResult = (await db_1.models.p2pCommission.findOne({
            attributes: [[(0, sequelize_1.fn)("SUM", (0, sequelize_1.col)("amount")), "total"]],
            raw: true,
        }));
        const platformRevenue = parseFloat((revenueResult === null || revenueResult === void 0 ? void 0 : revenueResult.total) || "0");
        const lastMonthRevenueResult = (await db_1.models.p2pCommission.findOne({
            attributes: [[(0, sequelize_1.fn)("SUM", (0, sequelize_1.col)("amount")), "total"]],
            where: { createdAt: { [sequelize_1.Op.between]: [twoMonthsAgo, lastMonth] } },
            raw: true,
        }));
        const lastMonthRevenue = parseFloat((lastMonthRevenueResult === null || lastMonthRevenueResult === void 0 ? void 0 : lastMonthRevenueResult.total) || "0");
        const revenueGrowth = calcGrowth(platformRevenue, lastMonthRevenue);
        const pendingVerifications = pendingOffers;
        const flaggedOffers = await db_1.models.p2pOfferFlag.count({
            where: { isFlagged: true },
        });
        const completedTrades = await db_1.models.p2pTrade.count({
            where: { status: "COMPLETED" },
        });
        const volumeResult = (await db_1.models.p2pTrade.findOne({
            attributes: [[(0, sequelize_1.fn)("SUM", (0, sequelize_1.col)("total")), "volume"]],
            where: { status: "COMPLETED" },
            raw: true,
        }));
        const totalVolume = parseFloat((volumeResult === null || volumeResult === void 0 ? void 0 : volumeResult.volume) || "0");
        const weekVolumeResult = (await db_1.models.p2pTrade.findOne({
            attributes: [[(0, sequelize_1.fn)("SUM", (0, sequelize_1.col)("total")), "volume"]],
            where: {
                status: "COMPLETED",
                createdAt: { [sequelize_1.Op.gte]: lastWeek },
            },
            raw: true,
        }));
        const weekVolume = parseFloat((weekVolumeResult === null || weekVolumeResult === void 0 ? void 0 : weekVolumeResult.volume) || "0");
        const avgTradeValue = completedTrades > 0 ? totalVolume / completedTrades : 0;
        const buyOffers = await db_1.models.p2pOffer.count({
            where: { type: "BUY", status: "ACTIVE" },
        });
        const sellOffers = await db_1.models.p2pOffer.count({
            where: { type: "SELL", status: "ACTIVE" },
        });
        const offerStatusDist = (await db_1.models.p2pOffer.findAll({
            attributes: ["status", [(0, sequelize_1.fn)("COUNT", (0, sequelize_1.col)("id")), "count"]],
            group: ["status"],
            raw: true,
        }));
        const currencyDist = (await db_1.models.p2pOffer.findAll({
            attributes: ["currency", [(0, sequelize_1.fn)("COUNT", (0, sequelize_1.col)("id")), "count"]],
            where: { status: "ACTIVE" },
            group: ["currency"],
            order: [[(0, sequelize_1.literal)("count"), "DESC"]],
            limit: 10,
            raw: true,
        }));
        const paymentMethodStats = await db_1.models.p2pPaymentMethod.findAll({
            attributes: ["id", "name", "icon", "popularityRank"],
            where: { available: true },
            order: [["popularityRank", "ASC"]],
            limit: 5,
            raw: true,
        });
        const resolvedDisputes = await db_1.models.p2pDispute.count({
            where: { status: "RESOLVED" },
        });
        const highPriorityDisputes = await db_1.models.p2pDispute.count({
            where: {
                status: { [sequelize_1.Op.in]: ["PENDING", "IN_PROGRESS"] },
                priority: "HIGH",
            },
        });
        const topTraders = await db_1.models.p2pTrade.findAll({
            attributes: [
                "sellerId",
                [(0, sequelize_1.fn)("COUNT", (0, sequelize_1.col)("p2pTrade.id")), "tradeCount"],
                [(0, sequelize_1.fn)("SUM", (0, sequelize_1.col)("total")), "totalVolume"],
            ],
            where: { status: "COMPLETED" },
            include: [
                {
                    model: db_1.models.user,
                    as: "seller",
                    attributes: ["id", "firstName", "lastName", "email", "avatar"],
                },
            ],
            group: ["sellerId", "seller.id"],
            order: [[(0, sequelize_1.literal)("totalVolume"), "DESC"]],
            limit: 5,
            raw: false,
        });
        const tradeTimeline = [];
        for (let i = 6; i >= 0; i--) {
            const dayStart = new Date(today);
            dayStart.setDate(dayStart.getDate() - i);
            const dayEnd = new Date(dayStart);
            dayEnd.setDate(dayEnd.getDate() + 1);
            const dayTrades = await db_1.models.p2pTrade.count({
                where: {
                    status: "COMPLETED",
                    createdAt: { [sequelize_1.Op.between]: [dayStart, dayEnd] },
                },
            });
            const dayVolumeResult = (await db_1.models.p2pTrade.findOne({
                attributes: [[(0, sequelize_1.fn)("SUM", (0, sequelize_1.col)("total")), "volume"]],
                where: {
                    status: "COMPLETED",
                    createdAt: { [sequelize_1.Op.between]: [dayStart, dayEnd] },
                },
                raw: true,
            }));
            const dayRevenueResult = (await db_1.models.p2pCommission.findOne({
                attributes: [[(0, sequelize_1.fn)("SUM", (0, sequelize_1.col)("amount")), "revenue"]],
                where: { createdAt: { [sequelize_1.Op.between]: [dayStart, dayEnd] } },
                raw: true,
            }));
            tradeTimeline.push({
                date: dayStart.toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                }),
                trades: dayTrades,
                volume: parseFloat((dayVolumeResult === null || dayVolumeResult === void 0 ? void 0 : dayVolumeResult.volume) || "0"),
                revenue: parseFloat((dayRevenueResult === null || dayRevenueResult === void 0 ? void 0 : dayRevenueResult.revenue) || "0"),
            });
        }
        const recentTrades = await db_1.models.p2pTrade.findAll({
            attributes: [
                "id",
                "type",
                "currency",
                "amount",
                "total",
                "status",
                "createdAt",
            ],
            include: [
                {
                    model: db_1.models.user,
                    as: "buyer",
                    attributes: ["id", "firstName", "lastName", "avatar"],
                },
                {
                    model: db_1.models.user,
                    as: "seller",
                    attributes: ["id", "firstName", "lastName", "avatar"],
                },
            ],
            order: [["createdAt", "DESC"]],
            limit: 5,
            raw: false,
        });
        const recentDisputes = await db_1.models.p2pDispute.findAll({
            attributes: ["id", "reason", "status", "priority", "createdAt"],
            include: [
                {
                    model: db_1.models.user,
                    as: "reportedBy",
                    attributes: ["id", "firstName", "lastName", "avatar"],
                },
                {
                    model: db_1.models.p2pTrade,
                    as: "trade",
                    attributes: ["id", "currency", "total"],
                },
            ],
            order: [["createdAt", "DESC"]],
            limit: 5,
            raw: false,
        });
        const disputeRate = completedTrades > 0 ? (openDisputes / completedTrades) * 100 : 0;
        const pendingRate = totalOffers > 0 ? (pendingVerifications / totalOffers) * 100 : 0;
        let healthScore = 100;
        if (disputeRate > 5)
            healthScore -= 20;
        else if (disputeRate > 2)
            healthScore -= 10;
        if (highPriorityDisputes > 5)
            healthScore -= 15;
        else if (highPriorityDisputes > 2)
            healthScore -= 5;
        if (pendingRate > 20)
            healthScore -= 10;
        else if (pendingRate > 10)
            healthScore -= 5;
        if (flaggedOffers > 10)
            healthScore -= 10;
        else if (flaggedOffers > 5)
            healthScore -= 5;
        const systemHealth = healthScore >= 90
            ? "Excellent"
            : healthScore >= 70
                ? "Good"
                : healthScore >= 50
                    ? "Fair"
                    : "Needs Attention";
        ctx === null || ctx === void 0 ? void 0 : ctx.success("P2P dashboard statistics retrieved successfully");
        return {
            totalOffers,
            offerGrowth,
            activeOffers,
            pendingOffers,
            activeTrades,
            tradeGrowth,
            openDisputes,
            disputeChange,
            platformRevenue: `$${platformRevenue.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
            revenueGrowth,
            pendingVerifications,
            flaggedOffers,
            systemHealth,
            healthScore,
            completedTrades,
            totalVolume,
            weekVolume,
            avgTradeValue,
            offerTypeDist: { buy: buyOffers, sell: sellOffers },
            offerStatusDist: offerStatusDist.map((s) => ({
                status: s.status,
                count: parseInt(s.count),
            })),
            currencyDist: currencyDist.map((c) => ({
                currency: c.currency,
                count: parseInt(c.count),
            })),
            paymentMethods: paymentMethodStats,
            disputeStats: {
                open: openDisputes,
                resolved: resolvedDisputes,
                highPriority: highPriorityDisputes,
            },
            topTraders: topTraders.map((t) => {
                var _a, _b, _c, _d, _e, _f;
                return ({
                    id: (_a = t.seller) === null || _a === void 0 ? void 0 : _a.id,
                    name: `${((_b = t.seller) === null || _b === void 0 ? void 0 : _b.firstName) || ""} ${((_c = t.seller) === null || _c === void 0 ? void 0 : _c.lastName) || ""}`.trim(),
                    avatar: (_d = t.seller) === null || _d === void 0 ? void 0 : _d.avatar,
                    tradeCount: parseInt(((_e = t.dataValues) === null || _e === void 0 ? void 0 : _e.tradeCount) || t.tradeCount || "0"),
                    totalVolume: parseFloat(((_f = t.dataValues) === null || _f === void 0 ? void 0 : _f.totalVolume) || t.totalVolume || "0"),
                });
            }),
            tradeTimeline,
            recentTrades: recentTrades.map((t) => ({
                id: t.id,
                type: t.type,
                currency: t.currency,
                amount: t.amount,
                total: t.total,
                status: t.status,
                createdAt: t.createdAt,
                buyer: t.buyer
                    ? {
                        id: t.buyer.id,
                        name: `${t.buyer.firstName || ""} ${t.buyer.lastName || ""}`.trim(),
                        avatar: t.buyer.avatar,
                    }
                    : null,
                seller: t.seller
                    ? {
                        id: t.seller.id,
                        name: `${t.seller.firstName || ""} ${t.seller.lastName || ""}`.trim(),
                        avatar: t.seller.avatar,
                    }
                    : null,
            })),
            recentDisputes: recentDisputes.map((d) => ({
                id: d.id,
                reason: d.reason,
                status: d.status,
                priority: d.priority,
                createdAt: d.createdAt,
                reportedBy: d.reportedBy
                    ? {
                        id: d.reportedBy.id,
                        name: `${d.reportedBy.firstName || ""} ${d.reportedBy.lastName || ""}`.trim(),
                        avatar: d.reportedBy.avatar,
                    }
                    : null,
                trade: d.trade
                    ? {
                        id: d.trade.id,
                        currency: d.trade.currency,
                        total: d.trade.total,
                    }
                    : null,
            })),
        };
    }
    catch (err) {
        throw (0, error_1.createError)({
            statusCode: 500,
            message: "Internal Server Error: " + err.message,
        });
    }
};
