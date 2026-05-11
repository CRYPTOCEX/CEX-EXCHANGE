"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const sequelize_1 = require("sequelize");
exports.metadata = {
    summary: "Retrieves AI Investment dashboard statistics",
    description: "Retrieves comprehensive statistics for the AI Investment admin dashboard including total investments, active users, plan performance, investment results, financial metrics, and recent activity.",
    operationId: "getAiInvestmentDashboardStats",
    tags: ["Admin", "AI Investment", "Dashboard"],
    requiresAuth: true,
    parameters: [
        {
            name: "timeframe",
            in: "query",
            description: "Range of data to retrieve",
            required: false,
            schema: { type: "string", enum: ["1m", "3m", "1y"] },
        },
    ],
    logModule: "ADMIN_AI",
    logTitle: "Get AI Investment Dashboard",
    responses: {
        200: {
            description: "AI Investment dashboard statistics retrieved successfully.",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            overview: {
                                type: "object",
                                properties: {
                                    totalInvestments: { type: "number" },
                                    totalAmount: { type: "number" },
                                    totalProfit: { type: "number" },
                                    activeInvestments: { type: "number" },
                                    completedInvestments: { type: "number" },
                                    cancelledInvestments: { type: "number" },
                                    rejectedInvestments: { type: "number" },
                                    winRate: { type: "number" },
                                    activePlans: { type: "number" },
                                    totalDurations: { type: "number" },
                                    spotInvestments: { type: "number" },
                                    ecoInvestments: { type: "number" },
                                    averageInvestment: { type: "number" },
                                },
                            },
                            investmentResults: {
                                type: "object",
                                properties: {
                                    win: { type: "number" },
                                    loss: { type: "number" },
                                    draw: { type: "number" },
                                },
                            },
                            chartData: {
                                type: "array",
                                items: {
                                    type: "object",
                                    properties: {
                                        name: { type: "string" },
                                        value: { type: "number" },
                                    },
                                },
                            },
                            planDistribution: {
                                type: "array",
                                items: {
                                    type: "object",
                                    properties: {
                                        name: { type: "string" },
                                        value: { type: "number" },
                                        count: { type: "number" },
                                    },
                                },
                            },
                            recentInvestments: {
                                type: "array",
                                items: { type: "object" },
                            },
                            topPlans: {
                                type: "array",
                                items: { type: "object" },
                            },
                        },
                    },
                },
            },
        },
        401: { description: "Unauthorized" },
        500: { description: "Internal Server Error" },
    },
    permission: "access.ai.investment",
};
function getWeekNumber(d) {
    const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    const dayNum = date.getUTCDay() || 7;
    date.setUTCDate(date.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
    return Math.ceil(((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}
exports.default = async (data) => {
    const { user, query } = data;
    const { timeframe = "1y" } = query;
    if (!(user === null || user === void 0 ? void 0 : user.id)) {
        throw (0, error_1.createError)({ statusCode: 401, message: "Unauthorized" });
    }
    const now = new Date();
    let startDate, endDate, groupFormat, intervals;
    if (timeframe === "1m") {
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        groupFormat = "%d";
        const daysInMonth = endDate.getDate();
        intervals = Array.from({ length: daysInMonth }, (_, i) => (i + 1).toString());
    }
    else if (timeframe === "3m") {
        startDate = new Date(now.getFullYear(), now.getMonth() - 2, 1);
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        groupFormat = "%Y-%u";
        const intervalsArr = [];
        const current = new Date(startDate);
        while (current <= endDate) {
            intervalsArr.push(`${current.getFullYear()}-${getWeekNumber(current)}`);
            current.setDate(current.getDate() + 7);
        }
        intervals = intervalsArr;
    }
    else {
        startDate = new Date(now.getFullYear(), 0, 1);
        endDate = new Date(now.getFullYear(), 11, 31);
        groupFormat = "%b";
        intervals = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    }
    const [investmentStats, statusStats, resultStats, typeStats, planStats, durationStats,] = await Promise.all([
        db_1.models.aiInvestment.findOne({
            attributes: [
                [(0, sequelize_1.fn)("COUNT", (0, sequelize_1.literal)("id")), "total"],
                [(0, sequelize_1.fn)("COALESCE", (0, sequelize_1.fn)("SUM", (0, sequelize_1.col)("amount")), 0), "totalAmount"],
                [(0, sequelize_1.fn)("COALESCE", (0, sequelize_1.fn)("SUM", (0, sequelize_1.col)("profit")), 0), "totalProfit"],
                [(0, sequelize_1.fn)("COALESCE", (0, sequelize_1.fn)("AVG", (0, sequelize_1.col)("amount")), 0), "avgAmount"],
            ],
            where: { status: { [sequelize_1.Op.ne]: "REJECTED" } },
            raw: true,
        }),
        db_1.models.aiInvestment.findOne({
            attributes: [
                [(0, sequelize_1.fn)("COUNT", (0, sequelize_1.literal)("CASE WHEN status = 'ACTIVE' THEN 1 END")), "active"],
                [(0, sequelize_1.fn)("COUNT", (0, sequelize_1.literal)("CASE WHEN status = 'COMPLETED' THEN 1 END")), "completed"],
                [(0, sequelize_1.fn)("COUNT", (0, sequelize_1.literal)("CASE WHEN status = 'CANCELLED' THEN 1 END")), "cancelled"],
                [(0, sequelize_1.fn)("COUNT", (0, sequelize_1.literal)("CASE WHEN status = 'REJECTED' THEN 1 END")), "rejected"],
            ],
            raw: true,
        }),
        db_1.models.aiInvestment.findOne({
            attributes: [
                [(0, sequelize_1.fn)("COUNT", (0, sequelize_1.literal)("CASE WHEN result = 'WIN' THEN 1 END")), "win"],
                [(0, sequelize_1.fn)("COUNT", (0, sequelize_1.literal)("CASE WHEN result = 'LOSS' THEN 1 END")), "loss"],
                [(0, sequelize_1.fn)("COUNT", (0, sequelize_1.literal)("CASE WHEN result = 'DRAW' THEN 1 END")), "draw"],
            ],
            where: { status: "COMPLETED" },
            raw: true,
        }),
        db_1.models.aiInvestment.findOne({
            attributes: [
                [(0, sequelize_1.fn)("COUNT", (0, sequelize_1.literal)("CASE WHEN type = 'SPOT' THEN 1 END")), "spot"],
                [(0, sequelize_1.fn)("COUNT", (0, sequelize_1.literal)("CASE WHEN type = 'ECO' THEN 1 END")), "eco"],
            ],
            raw: true,
        }),
        db_1.models.aiInvestmentPlan.findOne({
            attributes: [[(0, sequelize_1.fn)("COUNT", (0, sequelize_1.literal)("CASE WHEN status = true THEN 1 END")), "active"]],
            raw: true,
        }),
        db_1.models.aiInvestmentDuration.findOne({
            attributes: [[(0, sequelize_1.fn)("COUNT", (0, sequelize_1.literal)("id")), "total"]],
            raw: true,
        }),
    ]);
    const totalInvestments = parseInt((investmentStats === null || investmentStats === void 0 ? void 0 : investmentStats.total) || "0", 10);
    const totalAmount = parseFloat((investmentStats === null || investmentStats === void 0 ? void 0 : investmentStats.totalAmount) || "0");
    const totalProfit = parseFloat((investmentStats === null || investmentStats === void 0 ? void 0 : investmentStats.totalProfit) || "0");
    const averageInvestment = parseFloat((investmentStats === null || investmentStats === void 0 ? void 0 : investmentStats.avgAmount) || "0");
    const activeInvestments = parseInt((statusStats === null || statusStats === void 0 ? void 0 : statusStats.active) || "0", 10);
    const completedInvestments = parseInt((statusStats === null || statusStats === void 0 ? void 0 : statusStats.completed) || "0", 10);
    const cancelledInvestments = parseInt((statusStats === null || statusStats === void 0 ? void 0 : statusStats.cancelled) || "0", 10);
    const rejectedInvestments = parseInt((statusStats === null || statusStats === void 0 ? void 0 : statusStats.rejected) || "0", 10);
    const winCount = parseInt((resultStats === null || resultStats === void 0 ? void 0 : resultStats.win) || "0", 10);
    const lossCount = parseInt((resultStats === null || resultStats === void 0 ? void 0 : resultStats.loss) || "0", 10);
    const drawCount = parseInt((resultStats === null || resultStats === void 0 ? void 0 : resultStats.draw) || "0", 10);
    const totalResults = winCount + lossCount + drawCount;
    const winRate = totalResults > 0 ? Math.round((winCount / totalResults) * 100) : 0;
    const spotInvestments = parseInt((typeStats === null || typeStats === void 0 ? void 0 : typeStats.spot) || "0", 10);
    const ecoInvestments = parseInt((typeStats === null || typeStats === void 0 ? void 0 : typeStats.eco) || "0", 10);
    const activePlans = parseInt((planStats === null || planStats === void 0 ? void 0 : planStats.active) || "0", 10);
    const totalDurations = parseInt((durationStats === null || durationStats === void 0 ? void 0 : durationStats.total) || "0", 10);
    const overview = {
        totalInvestments,
        totalAmount,
        totalProfit,
        activeInvestments,
        completedInvestments,
        cancelledInvestments,
        rejectedInvestments,
        winRate,
        activePlans,
        totalDurations,
        spotInvestments,
        ecoInvestments,
        averageInvestment,
    };
    const investmentResults = {
        win: winCount,
        loss: lossCount,
        draw: drawCount,
    };
    const chartDataRaw = await db_1.models.aiInvestment.findAll({
        attributes: [
            [(0, sequelize_1.fn)("DATE_FORMAT", (0, sequelize_1.col)("createdAt"), groupFormat), "period"],
            [(0, sequelize_1.fn)("SUM", (0, sequelize_1.col)("amount")), "totalInvested"],
        ],
        where: {
            status: { [sequelize_1.Op.ne]: "REJECTED" },
            createdAt: { [sequelize_1.Op.between]: [startDate, endDate] },
        },
        group: ["period"],
        raw: true,
    });
    const chartDataMap = {};
    chartDataRaw.forEach((item) => {
        chartDataMap[item.period] = parseFloat(item.totalInvested) || 0;
    });
    const chartData = intervals.map((interval) => ({
        name: interval,
        value: chartDataMap[interval] || 0,
    }));
    const planDistributionRaw = await db_1.models.aiInvestmentPlan.findAll({
        attributes: [
            "id",
            "name",
            [(0, sequelize_1.fn)("COALESCE", (0, sequelize_1.fn)("SUM", (0, sequelize_1.col)("investments.amount")), 0), "totalInvested"],
            [(0, sequelize_1.fn)("COUNT", (0, sequelize_1.col)("investments.id")), "investmentCount"],
        ],
        include: [
            {
                model: db_1.models.aiInvestment,
                as: "investments",
                attributes: [],
                where: { status: { [sequelize_1.Op.ne]: "REJECTED" } },
                required: false,
            },
        ],
        group: ["aiInvestmentPlan.id"],
        raw: true,
    });
    const planDistribution = planDistributionRaw.map((plan) => ({
        name: plan.name,
        value: parseFloat(plan.totalInvested) || 0,
        count: parseInt(plan.investmentCount || "0", 10),
    }));
    const recentInvestmentsRaw = await db_1.models.aiInvestment.findAll({
        include: [
            { model: db_1.models.user, as: "user", attributes: ["id", "firstName", "lastName", "avatar"] },
            { model: db_1.models.aiInvestmentPlan, as: "plan", attributes: ["id", "name", "title"] },
            { model: db_1.models.aiInvestmentDuration, as: "duration", attributes: ["id", "duration", "timeframe"] },
        ],
        order: [["createdAt", "DESC"]],
        limit: 10,
        raw: true,
        nest: true,
    });
    const recentInvestments = recentInvestmentsRaw.map((inv) => {
        var _a, _b;
        return ({
            id: inv.id,
            user: inv.user ? `${inv.user.firstName || ""} ${inv.user.lastName || ""}`.trim() || "Unknown" : "Unknown",
            userId: inv.userId,
            userAvatar: (_a = inv.user) === null || _a === void 0 ? void 0 : _a.avatar,
            plan: ((_b = inv.plan) === null || _b === void 0 ? void 0 : _b.name) || "Unknown",
            planId: inv.planId,
            duration: inv.duration ? `${inv.duration.duration} ${inv.duration.timeframe}` : "N/A",
            symbol: inv.symbol,
            type: inv.type,
            amount: inv.amount,
            profit: inv.profit || 0,
            result: inv.result,
            status: inv.status,
            createdAt: inv.createdAt,
        });
    });
    const topPlans = await db_1.models.aiInvestmentPlan.findAll({
        attributes: [
            "id",
            "name",
            "title",
            "image",
            "minAmount",
            "maxAmount",
            "minProfit",
            "maxProfit",
            "profitPercentage",
            "invested",
            "status",
            "trending",
        ],
        where: { status: true },
        order: [
            ["trending", "DESC"],
            ["invested", "DESC"],
        ],
        limit: 5,
        raw: true,
    });
    return {
        overview,
        investmentResults,
        chartData,
        planDistribution,
        recentInvestments,
        topPlans,
    };
};
