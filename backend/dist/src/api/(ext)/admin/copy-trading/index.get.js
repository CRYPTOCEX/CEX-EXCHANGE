"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const sequelize_1 = require("sequelize");
const errors_1 = require("@b/utils/schema/errors");
exports.metadata = {
    summary: "Get Copy Trading Admin Dashboard",
    description: "Retrieves admin dashboard statistics for copy trading: follower capital by state (copying / paused / dormant leader / stranded), the leaders holding capital that is not being traded, replication failures, growth analytics, the five ACTIVE leaders with the most ACTIVE followers (ranked over every eligible leader, not over a page of them), and system health. Every capital figure is a server-side aggregate over the full allocation table, and `capital.currency` is null when the open allocations span more than one quote asset.",
    operationId: "getCopyTradingAdminDashboard",
    tags: ["Admin", "Copy Trading", "Dashboard"],
    requiresAuth: true,
    logModule: "ADMIN_COPY",
    logTitle: "Get Copy Trading Dashboard",
    permission: "view.copy_trading",
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
    var _a, _b, _c, _d;
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
    const DORMANT_DAYS = 7;
    const dormantBefore = new Date(today);
    dormantBefore.setDate(dormantBefore.getDate() - DORMANT_DAYS);
    const allocationSymbols = (await db_1.models.copyTradingFollowerAllocation.findAll({
        attributes: ["symbol"],
        where: { isActive: true },
        group: ["symbol"],
        raw: true,
    }));
    const allocationQuotes = Array.from(new Set(allocationSymbols
        .map((row) => String(row.symbol || "").split("/")[1])
        .filter(Boolean)));
    const allocationCurrency = allocationQuotes.length === 1 ? allocationQuotes[0] : null;
    const capitalRows = (await db_1.models.copyTradingFollowerAllocation.findAll({
        attributes: [
            [(0, sequelize_1.col)("follower.leaderId"), "leaderId"],
            [(0, sequelize_1.col)("follower.status"), "followerStatus"],
            [(0, sequelize_1.fn)("SUM", (0, sequelize_1.col)("copyTradingFollowerAllocation.quoteAmount")), "capital"],
            [
                (0, sequelize_1.fn)("SUM", (0, sequelize_1.col)("copyTradingFollowerAllocation.quoteUsedAmount")),
                "inUse",
            ],
            [(0, sequelize_1.fn)("COUNT", (0, sequelize_1.fn)("DISTINCT", (0, sequelize_1.col)("follower.id"))), "followers"],
        ],
        where: { isActive: true },
        include: [
            {
                model: db_1.models.copyTradingFollower,
                as: "follower",
                attributes: [],
                required: true,
            },
        ],
        group: [(0, sequelize_1.col)("follower.leaderId"), (0, sequelize_1.col)("follower.status")],
        raw: true,
    }));
    const capitalLeaderIds = Array.from(new Set(capitalRows.map((row) => row.leaderId).filter(Boolean)));
    const capitalLeaders = capitalLeaderIds.length
        ? (await db_1.models.copyTradingLeader.findAll({
            attributes: ["id", "displayName", "status"],
            where: { id: { [sequelize_1.Op.in]: capitalLeaderIds } },
            raw: true,
        }))
        : [];
    const leaderById = new Map(capitalLeaders.map((leader) => [leader.id, leader]));
    const lastTradeRows = capitalLeaderIds.length
        ? (await db_1.models.copyTradingTrade.findAll({
            attributes: ["leaderId", [(0, sequelize_1.fn)("MAX", (0, sequelize_1.col)("createdAt")), "lastTradeAt"]],
            where: { isLeaderTrade: true, leaderId: { [sequelize_1.Op.in]: capitalLeaderIds } },
            group: ["leaderId"],
            raw: true,
        }))
        : [];
    const lastTradeByLeader = new Map(lastTradeRows.map((row) => [
        row.leaderId,
        row.lastTradeAt ? new Date(row.lastTradeAt) : null,
    ]));
    const capitalBands = {
        copying: { capital: 0, followers: 0 },
        paused: { capital: 0, followers: 0 },
        dormant: { capital: 0, followers: 0 },
        stranded: { capital: 0, followers: 0 },
    };
    const leaderCapital = new Map();
    let totalAllocated = 0;
    let allocatedInUse = 0;
    for (const row of capitalRows) {
        const capital = Number(row.capital) || 0;
        const inUse = Number(row.inUse) || 0;
        const followers = Number(row.followers) || 0;
        const leader = row.leaderId ? leaderById.get(row.leaderId) : null;
        const lastTradeAt = row.leaderId
            ? ((_a = lastTradeByLeader.get(row.leaderId)) !== null && _a !== void 0 ? _a : null)
            : null;
        const leaderActive = (leader === null || leader === void 0 ? void 0 : leader.status) === "ACTIVE";
        const dormant = leaderActive && (!lastTradeAt || lastTradeAt < dormantBefore);
        const band = row.followerStatus === "PAUSED"
            ? "paused"
            : !leaderActive || row.followerStatus === "STOPPED"
                ? "stranded"
                : dormant
                    ? "dormant"
                    : "copying";
        capitalBands[band].capital += capital;
        capitalBands[band].followers += followers;
        totalAllocated += capital;
        allocatedInUse += inUse;
        if (!row.leaderId)
            continue;
        const entry = (_b = leaderCapital.get(row.leaderId)) !== null && _b !== void 0 ? _b : {
            id: row.leaderId,
            displayName: (_c = leader === null || leader === void 0 ? void 0 : leader.displayName) !== null && _c !== void 0 ? _c : null,
            status: (_d = leader === null || leader === void 0 ? void 0 : leader.status) !== null && _d !== void 0 ? _d : null,
            totalCapital: 0,
            strandedCapital: 0,
            dormantCapital: 0,
            followers: 0,
            lastTradeAt: lastTradeAt ? lastTradeAt.toISOString() : null,
        };
        entry.totalCapital += capital;
        entry.followers += followers;
        if (band === "stranded")
            entry.strandedCapital += capital;
        if (band === "dormant")
            entry.dormantCapital += capital;
        leaderCapital.set(row.leaderId, entry);
    }
    const capitalAtRiskLeaders = Array.from(leaderCapital.values())
        .map((entry) => {
        const reason = entry.status !== "ACTIVE"
            ? "leader-inactive"
            : entry.dormantCapital > 0
                ? "dormant"
                : "unreleased";
        const capital = entry.strandedCapital + entry.dormantCapital;
        return {
            ...entry,
            reason,
            capital,
            daysIdle: entry.lastTradeAt
                ? Math.floor((now.getTime() - new Date(entry.lastTradeAt).getTime()) / 86400000)
                : null,
        };
    })
        .filter((entry) => entry.capital > 0)
        .sort((a, b) => b.capital - a.capital);
    const capitalAtRisk = capitalAtRiskLeaders.reduce((sum, entry) => sum + entry.capital, 0);
    const underwaterRows = (await db_1.models.copyTradingTrade.findAll({
        attributes: ["followerId", [(0, sequelize_1.fn)("SUM", (0, sequelize_1.col)("profit")), "netProfit"]],
        where: { status: "CLOSED", followerId: { [sequelize_1.Op.ne]: null } },
        group: ["followerId"],
        having: (0, sequelize_1.literal)("SUM(profit) < 0"),
        raw: true,
    }));
    const underwaterFollowers = underwaterRows.length;
    const underwaterNet = underwaterRows.reduce((sum, row) => sum + (Number(row.netProfit) || 0), 0);
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
    const revenueByCurrency = (await db_1.models.copyTradingTransaction.findAll({
        attributes: ["currency", [(0, sequelize_1.fn)("SUM", (0, sequelize_1.col)("amount")), "total"]],
        where: { type: "PROFIT_SHARE", status: "COMPLETED" },
        group: ["currency"],
        raw: true,
    }));
    const platformRevenue = revenueByCurrency.reduce((sum, row) => sum + (Number(row.total) || 0), 0);
    const revenueCurrency = revenueByCurrency.length === 1 ? revenueByCurrency[0].currency : null;
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
    const topFollowerCounts = (await db_1.models.copyTradingFollower.findAll({
        attributes: [
            [(0, sequelize_1.col)("copyTradingFollower.leaderId"), "leaderId"],
            [(0, sequelize_1.fn)("COUNT", (0, sequelize_1.col)("copyTradingFollower.id")), "followerCount"],
        ],
        where: { status: "ACTIVE" },
        include: [
            {
                model: db_1.models.copyTradingLeader,
                as: "leader",
                attributes: [],
                required: true,
                where: { status: "ACTIVE" },
            },
        ],
        group: [(0, sequelize_1.col)("copyTradingFollower.leaderId")],
        order: [[(0, sequelize_1.fn)("COUNT", (0, sequelize_1.col)("copyTradingFollower.id")), "DESC"]],
        limit: 5,
        subQuery: false,
        raw: true,
    }));
    const topLeaderIds = topFollowerCounts
        .map((row) => row.leaderId)
        .filter(Boolean);
    const followerCountByLeader = new Map(topFollowerCounts.map((row) => [
        row.leaderId,
        Number(row.followerCount) || 0,
    ]));
    const topLeaders = topLeaderIds.length
        ? await db_1.models.copyTradingLeader.findAll({
            where: { id: { [sequelize_1.Op.in]: topLeaderIds } },
            include: [
                {
                    model: db_1.models.user,
                    as: "user",
                    attributes: ["id", "firstName", "lastName", "avatar"],
                },
            ],
        })
        : [];
    const topLeadersWithStats = await Promise.all(topLeaders.map(async (leader) => {
        var _a, _b, _c;
        var _d, _e, _f;
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
            followerCount: (_d = followerCountByLeader.get(leaderData.id)) !== null && _d !== void 0 ? _d : 0,
            totalTrades,
            winRate: winRate.toFixed(1),
            totalProfit,
            capital: (_e = (_b = leaderCapital.get(leaderData.id)) === null || _b === void 0 ? void 0 : _b.totalCapital) !== null && _e !== void 0 ? _e : 0,
            lastTradeAt: (_f = (_c = lastTradeByLeader.get(leaderData.id)) === null || _c === void 0 ? void 0 : _c.toISOString()) !== null && _f !== void 0 ? _f : null,
        };
    }));
    topLeadersWithStats.sort((a, b) => b.followerCount - a.followerCount);
    const timelineDays = [];
    for (let i = 6; i >= 0; i--) {
        const dayStart = new Date(today);
        dayStart.setDate(dayStart.getDate() - i);
        const dayEnd = new Date(dayStart);
        dayEnd.setDate(dayEnd.getDate() + 1);
        timelineDays.push({ dayStart, dayEnd });
    }
    const timelineAttributes = [];
    timelineDays.forEach(({ dayStart, dayEnd }, index) => {
        const window = `createdAt BETWEEN ${db_1.sequelize.escape(dayStart)} AND ${db_1.sequelize.escape(dayEnd)}`;
        timelineAttributes.push([(0, sequelize_1.literal)(`SUM(${window})`), `trades${index}`], [
            (0, sequelize_1.literal)(`SUM(CASE WHEN ${window} THEN cost ELSE 0 END)`),
            `volume${index}`,
        ], [
            (0, sequelize_1.literal)(`SUM(CASE WHEN status = 'CLOSED' AND ${window} THEN profit ELSE 0 END)`),
            `profit${index}`,
        ]);
    });
    const timelineRow = (await db_1.models.copyTradingTrade.findOne({
        attributes: timelineAttributes,
        where: {
            createdAt: {
                [sequelize_1.Op.between]: [timelineDays[0].dayStart, timelineDays[6].dayEnd],
            },
        },
        raw: true,
    }));
    const tradeTimeline = timelineDays.map(({ dayStart }, index) => ({
        date: dayStart.toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
        }),
        trades: parseInt((timelineRow === null || timelineRow === void 0 ? void 0 : timelineRow[`trades${index}`]) || "0"),
        volume: parseFloat((timelineRow === null || timelineRow === void 0 ? void 0 : timelineRow[`volume${index}`]) || "0"),
        profit: parseFloat((timelineRow === null || timelineRow === void 0 ? void 0 : timelineRow[`profit${index}`]) || "0"),
    }));
    const formatDate = (date) => date.toISOString().split("T")[0];
    const sparklineDays = [];
    for (let i = 6; i >= 0; i--) {
        const day = new Date(today);
        day.setDate(day.getDate() - i);
        const dayEnd = new Date(day);
        dayEnd.setDate(dayEnd.getDate() + 1);
        sparklineDays.push({ day, dayEnd });
    }
    const cumulativeColumns = (column) => sparklineDays.map(({ dayEnd }, index) => [
        (0, sequelize_1.literal)(column(db_1.sequelize.escape(dayEnd))),
        `d${index}`,
    ]);
    const leadersCumulative = (await db_1.models.copyTradingLeader.findOne({
        attributes: cumulativeColumns((bound) => `SUM(createdAt < ${bound})`),
        raw: true,
    }));
    const leadersSparkline = sparklineDays.map(({ day }, index) => ({
        date: formatDate(day),
        value: parseInt((leadersCumulative === null || leadersCumulative === void 0 ? void 0 : leadersCumulative[`d${index}`]) || "0"),
    }));
    const followersCumulative = (await db_1.models.copyTradingFollower.findOne({
        attributes: cumulativeColumns((bound) => `SUM(createdAt < ${bound})`),
        raw: true,
    }));
    const followersSparkline = sparklineDays.map(({ day }, index) => ({
        date: formatDate(day),
        value: parseInt((followersCumulative === null || followersCumulative === void 0 ? void 0 : followersCumulative[`d${index}`]) || "0"),
    }));
    const revenueCumulative = (await db_1.models.copyTradingTransaction.findOne({
        attributes: cumulativeColumns((bound) => `SUM(CASE WHEN createdAt < ${bound} THEN amount ELSE 0 END)`),
        where: { type: "PROFIT_SHARE", status: "COMPLETED" },
        raw: true,
    }));
    const revenueSparkline = sparklineDays.map(({ day }, index) => ({
        date: formatDate(day),
        value: parseFloat((revenueCumulative === null || revenueCumulative === void 0 ? void 0 : revenueCumulative[`d${index}`]) || "0"),
    }));
    const allocationCumulative = (await db_1.models.copyTradingFollowerAllocation.findOne({
        attributes: cumulativeColumns((bound) => `SUM(CASE WHEN createdAt < ${bound} THEN quoteAmount ELSE 0 END)`),
        where: { isActive: true },
        raw: true,
    }));
    const allocationSparkline = sparklineDays.map(({ day }, index) => ({
        date: formatDate(day),
        value: parseFloat((allocationCumulative === null || allocationCumulative === void 0 ? void 0 : allocationCumulative[`d${index}`]) || "0"),
    }));
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
    const failedTradeWhere = {
        status: { [sequelize_1.Op.in]: ["FAILED", "REPLICATION_FAILED"] },
        createdAt: { [sequelize_1.Op.gte]: today },
    };
    const failedReplications = await db_1.models.copyTradingTrade.findAll({
        attributes: [
            "id",
            "symbol",
            "side",
            "status",
            "cost",
            "errorMessage",
            "createdAt",
        ],
        where: failedTradeWhere,
        include: [
            {
                model: db_1.models.copyTradingLeader,
                as: "leader",
                attributes: ["id", "displayName"],
                required: false,
            },
        ],
        order: [["createdAt", "DESC"]],
        limit: 5,
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
                failedToday: failedTrades,
            },
        },
        capital: {
            currency: allocationCurrency,
            quoteAssets: allocationQuotes.length,
            totalAllocated,
            inUse: allocatedInUse,
            dormantDays: DORMANT_DAYS,
            bands: ["copying", "paused", "dormant", "stranded"].map((id) => ({
                id,
                capital: capitalBands[id].capital,
                followers: capitalBands[id].followers,
            })),
            atRisk: capitalAtRisk,
            atRiskLeaders: capitalAtRiskLeaders.length,
            leaders: capitalAtRiskLeaders.slice(0, 8),
            underwaterFollowers,
            underwaterNet,
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
        failedReplications: failedReplications.map((t) => t.toJSON()),
        pendingApplications: pendingApplications.map((a) => a.toJSON()),
        recentActivity: recentActivity.map((a) => a.toJSON()),
        generatedAt: new Date().toISOString(),
        revenueCurrency,
    };
};
