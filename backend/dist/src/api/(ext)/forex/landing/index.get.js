"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const sequelize_1 = require("sequelize");
exports.metadata = {
    summary: "Get Forex Landing Page Data",
    description: "Retrieves optimized data for the forex landing page including stats, featured plans, performance history, and recent completions.",
    operationId: "getForexLandingData",
    tags: ["Forex", "Landing"],
    requiresAuth: false,
    responses: {
        200: {
            description: "Forex landing data retrieved successfully",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            stats: { type: "object" },
                            featuredPlans: { type: "array" },
                            topPerformingPlan: { type: "object" },
                            performanceHistory: { type: "array" },
                            signals: { type: "array" },
                            recentCompletions: { type: "array" },
                            durationOptions: { type: "object" },
                        },
                    },
                },
            },
        },
    },
};
const ACTIVE_STATUS = ["ACTIVE"];
const COMPLETED_STATUS = ["COMPLETED"];
exports.default = async (data) => {
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    const [activeInvestors, totalInvestedResult, completedInvestments, activeInvestments, winCountResult, totalCompletedResult, profitResult, featuredPlans, signals, recentCompletions, durations,] = await Promise.all([
        db_1.models.forexInvestment.count({
            distinct: true,
            col: "userId",
            where: { status: { [sequelize_1.Op.in]: ACTIVE_STATUS } },
        }),
        db_1.models.forexInvestment.sum("amount"),
        db_1.models.forexInvestment.count({
            where: { status: { [sequelize_1.Op.in]: COMPLETED_STATUS } },
        }),
        db_1.models.forexInvestment.count({
            where: { status: { [sequelize_1.Op.in]: ACTIVE_STATUS } },
        }),
        db_1.models.forexInvestment.count({
            where: {
                status: { [sequelize_1.Op.in]: COMPLETED_STATUS },
                result: "WIN",
            },
        }),
        db_1.models.forexInvestment.count({
            where: { status: { [sequelize_1.Op.in]: COMPLETED_STATUS } },
        }),
        db_1.models.forexInvestment.findOne({
            attributes: [
                [(0, sequelize_1.fn)("SUM", (0, sequelize_1.col)("profit")), "totalProfit"],
                [
                    (0, sequelize_1.fn)("AVG", (0, sequelize_1.literal)("CASE WHEN amount > 0 THEN (profit / amount) * 100 ELSE NULL END")),
                    "avgReturn",
                ],
            ],
            where: { status: { [sequelize_1.Op.in]: COMPLETED_STATUS } },
            raw: true,
        }),
        db_1.models.forexPlan.findAll({
            where: { status: true },
            include: [
                {
                    model: db_1.models.forexDuration,
                    as: "durations",
                    through: { attributes: [] },
                },
            ],
            order: [
                ["trending", "DESC"],
                ["profitPercentage", "DESC"],
            ],
            limit: 6,
        }),
        db_1.models.forexSignal.findAll({
            where: { status: true },
            limit: 4,
        }),
        db_1.models.forexInvestment.findAll({
            where: { status: { [sequelize_1.Op.in]: COMPLETED_STATUS } },
            include: [
                { model: db_1.models.forexPlan, as: "plan", attributes: ["name", "title"] },
                { model: db_1.models.forexDuration, as: "duration" },
            ],
            order: [["updatedAt", "DESC"]],
            limit: 10,
        }),
        db_1.models.forexDuration.findAll({
            order: [["timeframe", "ASC"], ["duration", "ASC"]],
        }),
    ]);
    const planInvestmentStats = await db_1.models.forexInvestment.findAll({
        attributes: [
            "planId",
            [(0, sequelize_1.fn)("SUM", (0, sequelize_1.col)("amount")), "totalInvested"],
            [(0, sequelize_1.fn)("COUNT", (0, sequelize_1.fn)("DISTINCT", (0, sequelize_1.col)("userId"))), "investorCount"],
            [
                (0, sequelize_1.fn)("SUM", (0, sequelize_1.literal)("CASE WHEN result = 'WIN' THEN 1 ELSE 0 END")),
                "winCount",
            ],
            [
                (0, sequelize_1.fn)("SUM", (0, sequelize_1.literal)("CASE WHEN status = 'COMPLETED' THEN 1 ELSE 0 END")),
                "completedCount",
            ],
        ],
        group: ["planId"],
        raw: true,
    });
    const planStatsMap = new Map(planInvestmentStats.map((s) => [s.planId, s]));
    const totalInvested = totalInvestedResult || 0;
    const totalProfit = parseFloat(profitResult === null || profitResult === void 0 ? void 0 : profitResult.totalProfit) || 0;
    const avgReturn = parseFloat(profitResult === null || profitResult === void 0 ? void 0 : profitResult.avgReturn) || 0;
    const winRate = totalCompletedResult > 0
        ? Math.round((winCountResult / totalCompletedResult) * 100)
        : 0;
    const formattedPlans = featuredPlans.map((plan) => {
        const p = plan.toJSON();
        const stats = planStatsMap.get(p.id) || {};
        const planWinRate = parseInt(stats.completedCount) > 0
            ? Math.round((parseInt(stats.winCount) / parseInt(stats.completedCount)) * 100)
            : 0;
        return {
            id: p.id,
            name: p.name,
            title: p.title,
            description: p.description,
            image: p.image,
            currency: p.currency,
            minProfit: p.minProfit,
            maxProfit: p.maxProfit,
            minAmount: p.minAmount,
            maxAmount: p.maxAmount,
            profitPercentage: p.profitPercentage,
            trending: p.trending,
            totalInvested: parseFloat(stats.totalInvested) || 0,
            investorCount: parseInt(stats.investorCount) || 0,
            winRate: planWinRate,
            durations: (p.durations || []).map((d) => ({
                duration: d.duration,
                timeframe: d.timeframe,
            })),
        };
    });
    const topPlan = formattedPlans.length > 0
        ? formattedPlans.reduce((best, current) => current.profitPercentage > best.profitPercentage ? current : best)
        : null;
    const formattedSignals = await Promise.all(signals.map(async (s) => {
        const subscriberCount = await db_1.models.forexAccountSignal.count({
            where: { forexSignalId: s.id },
        });
        return {
            id: s.id,
            title: s.title,
            image: s.image,
            subscriberCount,
        };
    }));
    const formattedCompletions = recentCompletions.map((inv) => {
        var _a, _b;
        const i = inv.toJSON();
        const profitPercent = i.amount > 0 ? (i.profit / i.amount) * 100 : 0;
        return {
            planName: ((_a = i.plan) === null || _a === void 0 ? void 0 : _a.title) || ((_b = i.plan) === null || _b === void 0 ? void 0 : _b.name) || "Unknown",
            result: i.result,
            profit: i.profit || 0,
            profitPercent: Math.round(profitPercent * 10) / 10,
            duration: i.duration
                ? `${i.duration.duration} ${i.duration.timeframe.toLowerCase()}${i.duration.duration > 1 ? "s" : ""}`
                : "N/A",
            timeAgo: getTimeAgo(i.updatedAt),
            anonymizedUser: `Investor #${String(i.userId).slice(-4)}`,
        };
    });
    const monthlyData = await db_1.models.forexInvestment.findAll({
        where: {
            status: { [sequelize_1.Op.in]: COMPLETED_STATUS },
            updatedAt: { [sequelize_1.Op.gte]: sixMonthsAgo },
        },
        attributes: [
            [(0, sequelize_1.fn)("DATE_FORMAT", (0, sequelize_1.col)("updatedAt"), "%Y-%m"), "monthKey"],
            [(0, sequelize_1.fn)("DATE_FORMAT", (0, sequelize_1.col)("updatedAt"), "%b"), "month"],
            [(0, sequelize_1.fn)("SUM", (0, sequelize_1.col)("amount")), "totalInvested"],
            [(0, sequelize_1.fn)("SUM", (0, sequelize_1.col)("profit")), "totalProfit"],
            [(0, sequelize_1.fn)("COUNT", (0, sequelize_1.col)("id")), "completions"],
        ],
        group: [(0, sequelize_1.literal)("monthKey")],
        order: [[(0, sequelize_1.literal)("monthKey"), "ASC"]],
        raw: true,
    });
    const performanceHistory = monthlyData.map((m) => ({
        month: m.month,
        totalInvested: parseFloat(m.totalInvested) || 0,
        totalProfit: parseFloat(m.totalProfit) || 0,
        avgReturn: parseFloat(m.totalInvested) > 0
            ? Math.round((parseFloat(m.totalProfit) / parseFloat(m.totalInvested)) * 100 * 10) / 10
            : 0,
        completions: parseInt(m.completions),
    }));
    const timeframeOrder = { HOUR: 1, DAY: 2, WEEK: 3, MONTH: 4 };
    const sortedDurations = durations
        .map((d) => d.toJSON())
        .sort((a, b) => {
        const orderDiff = (timeframeOrder[a.timeframe] || 5) -
            (timeframeOrder[b.timeframe] || 5);
        return orderDiff !== 0 ? orderDiff : a.duration - b.duration;
    });
    const formatDuration = (d) => `${d.duration} ${d.timeframe.toLowerCase()}${d.duration > 1 ? "s" : ""}`;
    const durationOptions = {
        shortest: sortedDurations.length > 0 ? formatDuration(sortedDurations[0]) : "1 hour",
        longest: sortedDurations.length > 0
            ? formatDuration(sortedDurations[sortedDurations.length - 1])
            : "12 months",
        mostPopular: "1 month",
    };
    return {
        stats: {
            activeInvestors,
            totalInvested,
            averageReturn: Math.round(avgReturn * 10) / 10,
            totalProfit,
            winRate,
            completedInvestments,
            activeInvestments,
            avgInvestmentAmount: activeInvestors > 0 ? Math.round(totalInvested / activeInvestors) : 0,
            topPlanRoi: (topPlan === null || topPlan === void 0 ? void 0 : topPlan.profitPercentage) || 0,
        },
        featuredPlans: formattedPlans,
        topPerformingPlan: topPlan ? { ...topPlan, badge: "top_performer" } : null,
        performanceHistory,
        signals: formattedSignals,
        recentCompletions: formattedCompletions,
        durationOptions,
    };
};
function getTimeAgo(date) {
    const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
    if (seconds < 60)
        return "just now";
    if (seconds < 3600)
        return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400)
        return `${Math.floor(seconds / 3600)}h ago`;
    if (seconds < 604800)
        return `${Math.floor(seconds / 86400)}d ago`;
    return `${Math.floor(seconds / 604800)}w ago`;
}
