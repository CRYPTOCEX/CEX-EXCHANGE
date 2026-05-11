"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const sequelize_1 = require("sequelize");
const errors_1 = require("@b/utils/schema/errors");
exports.metadata = {
    summary: "Get Copy Trading Admin Dashboard",
    description: "Retrieves comprehensive admin dashboard statistics for copy trading including performance metrics, growth analytics, top performers, and system health.",
    operationId: "getCopyTradingAdminDashboard",
    tags: ["Admin", "Copy Trading", "Dashboard"],
    requiresAuth: true,
    logModule: "ADMIN_COPY",
    logTitle: "Get Copy Trading Dashboard",
    permission: "access.copy_trading",
    demoMask: ["pendingApplications.user.email", "topLeaders.user.email"],
    responses: {
        200: {
            description: "Dashboard data retrieved successfully",
        },
        401: errors_1.unauthorizedResponse,
        403: errors_1.forbiddenResponse,
        500: errors_1.serverErrorResponse,
    },
};
const calcGrowth = (current, previous) => {
    if (previous === 0)
        return current > 0 ? "+100%" : "0%";
    const change = ((current - previous) / previous) * 100;
    const sign = change >= 0 ? "+" : "";
    return `${sign}${change.toFixed(1)}%`;
};
exports.default = async (data) => {
    const { user, ctx } = data;
    if (!(user === null || user === void 0 ? void 0 : user.id)) {
        throw (0, error_1.createError)({ statusCode: 401, message: "Unauthorized" });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Get Copy Trading Dashboard");
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
    const leaderStats = await db_1.models.copyTradingLeader.findAll({
        attributes: ["status", [(0, sequelize_1.fn)("COUNT", (0, sequelize_1.col)("id")), "count"]],
        group: ["status"],
        raw: true,
    });
    const leaderCounts = leaderStats.reduce((acc, stat) => {
        acc[stat.status] = parseInt(stat.count);
        return acc;
    }, {});
    const totalLeaders = Object.values(leaderCounts).reduce((a, b) => a + (typeof b === "number" ? b : 0), 0);
    const leadersLastWeek = await db_1.models.copyTradingLeader.count({
        where: { createdAt: { [sequelize_1.Op.lt]: lastWeek } },
    });
    const leadersGrowth = calcGrowth(totalLeaders, leadersLastWeek);
    const followerStats = await db_1.models.copyTradingFollower.findAll({
        attributes: ["status", [(0, sequelize_1.fn)("COUNT", (0, sequelize_1.col)("id")), "count"]],
        group: ["status"],
        raw: true,
    });
    const followerCounts = followerStats.reduce((acc, stat) => {
        acc[stat.status] = parseInt(stat.count);
        return acc;
    }, {});
    const totalFollowers = Object.values(followerCounts).reduce((a, b) => a + (typeof b === "number" ? b : 0), 0);
    const followersLastWeek = await db_1.models.copyTradingFollower.count({
        where: { createdAt: { [sequelize_1.Op.lt]: lastWeek } },
    });
    const followersGrowth = calcGrowth(totalFollowers, followersLastWeek);
    const totalAllocatedResult = await db_1.models.copyTradingFollowerAllocation.findOne({
        attributes: [[(0, sequelize_1.fn)("SUM", (0, sequelize_1.col)("quoteAmount")), "total"]],
        where: { isActive: true },
        raw: true,
    });
    const totalAllocated = parseFloat((totalAllocatedResult === null || totalAllocatedResult === void 0 ? void 0 : totalAllocatedResult.total) || "0");
    const todaysTrades = await db_1.models.copyTradingTrade.count({
        where: { createdAt: { [sequelize_1.Op.gte]: today } },
    });
    const yesterdaysTrades = await db_1.models.copyTradingTrade.count({
        where: {
            createdAt: { [sequelize_1.Op.gte]: yesterday, [sequelize_1.Op.lt]: today },
        },
    });
    const tradesGrowth = calcGrowth(todaysTrades, yesterdaysTrades);
    const todaysVolumeResult = await db_1.models.copyTradingTrade.findOne({
        attributes: [[(0, sequelize_1.fn)("SUM", (0, sequelize_1.col)("cost")), "volume"]],
        where: { createdAt: { [sequelize_1.Op.gte]: today } },
        raw: true,
    });
    const todaysVolume = parseFloat((todaysVolumeResult === null || todaysVolumeResult === void 0 ? void 0 : todaysVolumeResult.volume) || "0");
    const completedTrades = await db_1.models.copyTradingTrade.count({
        where: { status: "CLOSED" },
    });
    const totalVolumeResult = await db_1.models.copyTradingTrade.findOne({
        attributes: [[(0, sequelize_1.fn)("SUM", (0, sequelize_1.col)("cost")), "volume"]],
        where: { status: "CLOSED" },
        raw: true,
    });
    const totalVolume = parseFloat((totalVolumeResult === null || totalVolumeResult === void 0 ? void 0 : totalVolumeResult.volume) || "0");
    const failedTrades = await db_1.models.copyTradingTrade.count({
        where: {
            status: { [sequelize_1.Op.in]: ["FAILED", "REPLICATION_FAILED"] },
            createdAt: { [sequelize_1.Op.gte]: today },
        },
    });
    const failureRate = todaysTrades > 0 ? (failedTrades / todaysTrades) * 100 : 0;
    const revenueResult = await db_1.models.copyTradingTransaction.findOne({
        attributes: [[(0, sequelize_1.fn)("SUM", (0, sequelize_1.col)("amount")), "total"]],
        where: { type: "PROFIT_SHARE", status: "COMPLETED" },
        raw: true,
    });
    const platformRevenue = parseFloat((revenueResult === null || revenueResult === void 0 ? void 0 : revenueResult.total) || "0");
    const monthRevenueResult = await db_1.models.copyTradingTransaction.findOne({
        attributes: [[(0, sequelize_1.fn)("SUM", (0, sequelize_1.col)("amount")), "total"]],
        where: {
            type: "PROFIT_SHARE",
            status: "COMPLETED",
            createdAt: { [sequelize_1.Op.gte]: lastMonth },
        },
        raw: true,
    });
    const monthRevenue = parseFloat((monthRevenueResult === null || monthRevenueResult === void 0 ? void 0 : monthRevenueResult.total) || "0");
    const topLeaders = await db_1.models.copyTradingLeader.findAll({
        where: { status: "ACTIVE" },
        include: [
            {
                model: db_1.models.user,
                as: "user",
                attributes: ["id", "firstName", "lastName", "avatar"],
            },
            {
                model: db_1.models.copyTradingFollower,
                as: "followers",
                attributes: ["id"],
                where: { status: "ACTIVE" },
                required: false,
            },
        ],
        limit: 5,
    });
    const topLeadersWithStats = await Promise.all(topLeaders.map(async (leader) => {
        var _a, _b;
        const leaderData = leader.toJSON();
        const tradeStats = await db_1.models.copyTradingTrade.findOne({
            attributes: [
                [(0, sequelize_1.fn)("COUNT", (0, sequelize_1.col)("id")), "totalTrades"],
                [(0, sequelize_1.fn)("SUM", (0, sequelize_1.col)("profit")), "totalProfit"],
                [
                    (0, sequelize_1.fn)("SUM", (0, sequelize_1.literal)("CASE WHEN profit > 0 THEN 1 ELSE 0 END")),
                    "winningTrades",
                ],
            ],
            where: {
                leaderId: leader.id,
                isLeaderTrade: true,
                status: "CLOSED",
            },
            raw: true,
        });
        const totalTrades = parseInt((tradeStats === null || tradeStats === void 0 ? void 0 : tradeStats.totalTrades) || "0");
        const winningTrades = parseInt((tradeStats === null || tradeStats === void 0 ? void 0 : tradeStats.winningTrades) || "0");
        const totalProfit = parseFloat((tradeStats === null || tradeStats === void 0 ? void 0 : tradeStats.totalProfit) || "0");
        const winRate = totalTrades > 0 ? (winningTrades / totalTrades) * 100 : 0;
        return {
            id: leaderData.id,
            displayName: leaderData.displayName,
            avatar: leaderData.avatar || ((_a = leaderData.user) === null || _a === void 0 ? void 0 : _a.avatar),
            tradingStyle: leaderData.tradingStyle,
            riskLevel: leaderData.riskLevel,
            followerCount: ((_b = leaderData.followers) === null || _b === void 0 ? void 0 : _b.length) || 0,
            totalTrades,
            winRate: winRate.toFixed(1),
            totalProfit,
        };
    }));
    topLeadersWithStats.sort((a, b) => b.followerCount - a.followerCount);
    const tradeTimeline = [];
    for (let i = 6; i >= 0; i--) {
        const dayStart = new Date(today);
        dayStart.setDate(dayStart.getDate() - i);
        const dayEnd = new Date(dayStart);
        dayEnd.setDate(dayEnd.getDate() + 1);
        const dayTrades = await db_1.models.copyTradingTrade.count({
            where: {
                createdAt: { [sequelize_1.Op.between]: [dayStart, dayEnd] },
            },
        });
        const dayVolumeResult = await db_1.models.copyTradingTrade.findOne({
            attributes: [[(0, sequelize_1.fn)("SUM", (0, sequelize_1.col)("cost")), "volume"]],
            where: {
                createdAt: { [sequelize_1.Op.between]: [dayStart, dayEnd] },
            },
            raw: true,
        });
        const dayProfitResult = await db_1.models.copyTradingTrade.findOne({
            attributes: [[(0, sequelize_1.fn)("SUM", (0, sequelize_1.col)("profit")), "profit"]],
            where: {
                status: "CLOSED",
                createdAt: { [sequelize_1.Op.between]: [dayStart, dayEnd] },
            },
            raw: true,
        });
        tradeTimeline.push({
            date: dayStart.toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
            }),
            trades: dayTrades,
            volume: parseFloat((dayVolumeResult === null || dayVolumeResult === void 0 ? void 0 : dayVolumeResult.volume) || "0"),
            profit: parseFloat((dayProfitResult === null || dayProfitResult === void 0 ? void 0 : dayProfitResult.profit) || "0"),
        });
    }
    const formatDate = (date) => date.toISOString().split("T")[0];
    const leadersSparkline = [];
    for (let i = 6; i >= 0; i--) {
        const day = new Date(today);
        day.setDate(day.getDate() - i);
        const dayEnd = new Date(day);
        dayEnd.setDate(dayEnd.getDate() + 1);
        const count = await db_1.models.copyTradingLeader.count({
            where: { createdAt: { [sequelize_1.Op.lt]: dayEnd } },
        });
        leadersSparkline.push({ date: formatDate(day), value: count });
    }
    const followersSparkline = [];
    for (let i = 6; i >= 0; i--) {
        const day = new Date(today);
        day.setDate(day.getDate() - i);
        const dayEnd = new Date(day);
        dayEnd.setDate(dayEnd.getDate() + 1);
        const count = await db_1.models.copyTradingFollower.count({
            where: { createdAt: { [sequelize_1.Op.lt]: dayEnd } },
        });
        followersSparkline.push({ date: formatDate(day), value: count });
    }
    const revenueSparkline = [];
    for (let i = 6; i >= 0; i--) {
        const day = new Date(today);
        day.setDate(day.getDate() - i);
        const dayEnd = new Date(day);
        dayEnd.setDate(dayEnd.getDate() + 1);
        const result = await db_1.models.copyTradingTransaction.findOne({
            attributes: [[(0, sequelize_1.fn)("SUM", (0, sequelize_1.col)("amount")), "total"]],
            where: {
                type: "PROFIT_SHARE",
                status: "COMPLETED",
                createdAt: { [sequelize_1.Op.lt]: dayEnd },
            },
            raw: true,
        });
        revenueSparkline.push({ date: formatDate(day), value: parseFloat((result === null || result === void 0 ? void 0 : result.total) || "0") });
    }
    const allocationSparkline = [];
    for (let i = 6; i >= 0; i--) {
        const day = new Date(today);
        day.setDate(day.getDate() - i);
        const dayEnd = new Date(day);
        dayEnd.setDate(dayEnd.getDate() + 1);
        const result = await db_1.models.copyTradingFollowerAllocation.findOne({
            attributes: [[(0, sequelize_1.fn)("SUM", (0, sequelize_1.col)("quoteAmount")), "total"]],
            where: {
                isActive: true,
                createdAt: { [sequelize_1.Op.lt]: dayEnd },
            },
            raw: true,
        });
        allocationSparkline.push({ date: formatDate(day), value: parseFloat((result === null || result === void 0 ? void 0 : result.total) || "0") });
    }
    const styleDistribution = await db_1.models.copyTradingLeader.findAll({
        attributes: ["tradingStyle", [(0, sequelize_1.fn)("COUNT", (0, sequelize_1.col)("id")), "count"]],
        where: { status: "ACTIVE" },
        group: ["tradingStyle"],
        raw: true,
    });
    const riskDistribution = await db_1.models.copyTradingLeader.findAll({
        attributes: ["riskLevel", [(0, sequelize_1.fn)("COUNT", (0, sequelize_1.col)("id")), "count"]],
        where: { status: "ACTIVE" },
        group: ["riskLevel"],
        raw: true,
    });
    const pendingApplications = await db_1.models.copyTradingLeader.findAll({
        where: { status: "PENDING" },
        include: [
            {
                model: db_1.models.user,
                as: "user",
                attributes: ["id", "firstName", "lastName", "email", "avatar"],
            },
        ],
        order: [["createdAt", "ASC"]],
        limit: 5,
    });
    const recentActivity = await db_1.models.copyTradingAuditLog.findAll({
        include: [
            {
                model: db_1.models.user,
                as: "user",
                attributes: ["id", "firstName", "lastName", "avatar"],
            },
            {
                model: db_1.models.user,
                as: "admin",
                attributes: ["id", "firstName", "lastName", "avatar"],
            },
        ],
        order: [["createdAt", "DESC"]],
        limit: 10,
    });
    const recentTrades = await db_1.models.copyTradingTrade.findAll({
        attributes: [
            "id",
            "symbol",
            "side",
            "type",
            "amount",
            "price",
            "cost",
            "profit",
            "profitPercent",
            "status",
            "isLeaderTrade",
            "createdAt",
        ],
        include: [
            {
                model: db_1.models.copyTradingLeader,
                as: "leader",
                attributes: ["id", "displayName"],
            },
        ],
        order: [["createdAt", "DESC"]],
        limit: 10,
    });
    const pendingTrades = await db_1.models.copyTradingTrade.count({
        where: { status: { [sequelize_1.Op.in]: ["PENDING", "PENDING_REPLICATION"] } },
    });
    let healthScore = 100;
    if (failureRate > 10)
        healthScore -= 30;
    else if (failureRate > 5)
        healthScore -= 15;
    else if (failureRate > 2)
        healthScore -= 5;
    if (pendingTrades > 100)
        healthScore -= 20;
    else if (pendingTrades > 50)
        healthScore -= 10;
    else if (pendingTrades > 20)
        healthScore -= 5;
    const systemHealth = healthScore >= 90
        ? "Excellent"
        : healthScore >= 70
            ? "Good"
            : healthScore >= 50
                ? "Fair"
                : "Needs Attention";
    ctx === null || ctx === void 0 ? void 0 : ctx.success("Copy Trading Dashboard retrieved successfully");
    return {
        stats: {
            leaders: {
                total: totalLeaders,
                active: leaderCounts.ACTIVE || 0,
                pending: leaderCounts.PENDING || 0,
                suspended: leaderCounts.SUSPENDED || 0,
                rejected: leaderCounts.REJECTED || 0,
                growth: leadersGrowth,
            },
            followers: {
                total: totalFollowers,
                active: followerCounts.ACTIVE || 0,
                paused: followerCounts.PAUSED || 0,
                stopped: followerCounts.STOPPED || 0,
                growth: followersGrowth,
            },
            trades: {
                today: todaysTrades,
                todayGrowth: tradesGrowth,
                completed: completedTrades,
                volume: totalVolume,
                todayVolume: todaysVolume,
                failureRate: failureRate.toFixed(2),
            },
            financial: {
                totalAllocated,
                platformRevenue,
                monthRevenue,
            },
            health: {
                score: healthScore,
                status: systemHealth,
                pendingTrades,
                failureRate: failureRate.toFixed(2),
            },
        },
        distributions: {
            tradingStyle: styleDistribution.map((s) => ({
                style: s.tradingStyle,
                count: parseInt(s.count),
            })),
            riskLevel: riskDistribution.map((r) => ({
                level: r.riskLevel,
                count: parseInt(r.count),
            })),
        },
        tradeTimeline,
        sparklines: {
            leaders: leadersSparkline,
            followers: followersSparkline,
            revenue: revenueSparkline,
            allocation: allocationSparkline,
        },
        topLeaders: topLeadersWithStats,
        recentTrades: recentTrades.map((t) => t.toJSON()),
        pendingApplications: pendingApplications.map((a) => a.toJSON()),
        recentActivity: recentActivity.map((a) => a.toJSON()),
    };
};
