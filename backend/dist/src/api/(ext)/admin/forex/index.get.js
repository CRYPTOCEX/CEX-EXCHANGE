"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const sequelize_1 = require("sequelize");
const money_1 = require("@b/api/(ext)/forex/utils/money");
exports.metadata = {
    summary: "Retrieves Forex dashboard statistics",
    description: "Retrieves comprehensive statistics for the Forex admin dashboard including total investments, active users, active plans, total accounts, investment growth chart data, plan distribution, account metrics, signal stats, and recent activity.",
    operationId: "getForexDashboardStats",
    tags: ["Admin", "Forex", "Dashboard"],
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
    logModule: "ADMIN_FOREX",
    logTitle: "Get Forex Dashboard",
    responses: {
        200: {
            description: "Forex dashboard statistics retrieved successfully.",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            overview: {
                                type: "object",
                                properties: {
                                    totalInvestments: {
                                        type: "number",
                                        description: "Unqualified sum across every plan currency. Do not " +
                                            "render with a currency symbol — use primaryInvested.",
                                    },
                                    investmentsGrowth: { type: "number" },
                                    activeUsers: { type: "number" },
                                    usersGrowth: { type: "number" },
                                    activePlans: { type: "number" },
                                    plansGrowth: { type: "number" },
                                    totalAccounts: { type: "number" },
                                    accountsGrowth: { type: "number" },
                                    totalProfit: {
                                        type: "number",
                                        description: "Sign-aware net P&L over COMPLETED investments, summed " +
                                            "across every plan currency. Do not render with a " +
                                            "currency symbol — use profitByCurrency.",
                                    },
                                    activeInvestments: { type: "number" },
                                    completedInvestments: { type: "number" },
                                    winRate: { type: "number" },
                                    liveAccounts: { type: "number" },
                                    demoAccounts: { type: "number" },
                                    totalSignals: { type: "number" },
                                    activeSignals: { type: "number" },
                                    pendingDeposits: { type: "number" },
                                    pendingWithdrawals: { type: "number" },
                                },
                            },
                            investedByCurrency: {
                                type: "array",
                                description: "Invested and sign-aware profit totals grouped by the " +
                                    "PLAN's currency, largest pool first.",
                                items: {
                                    type: "object",
                                    properties: {
                                        currency: { type: "string" },
                                        totalInvested: { type: "number" },
                                        totalProfit: { type: "number" },
                                    },
                                },
                            },
                            primaryInvested: {
                                type: "object",
                                nullable: true,
                                description: "The largest single-currency pool — the only invested " +
                                    "figure that can honestly carry a currency name.",
                                properties: {
                                    currency: { type: "string" },
                                    totalInvested: { type: "number" },
                                    totalProfit: { type: "number" },
                                },
                            },
                            mixedCurrencies: {
                                type: "boolean",
                                description: "True when more than one plan currency holds investments.",
                            },
                            profitByCurrency: {
                                type: "array",
                                description: "Sign-aware settled P&L grouped by plan currency, over " +
                                    "COMPLETED investments only.",
                                items: {
                                    type: "object",
                                    properties: {
                                        currency: { type: "string" },
                                        totalInvested: { type: "number" },
                                        totalProfit: { type: "number" },
                                    },
                                },
                            },
                            chartCurrency: {
                                type: "string",
                                nullable: true,
                                description: "The currency chartData is scoped to (the largest pool). " +
                                    "Null only when nothing is invested.",
                            },
                            chartData: {
                                type: "array",
                                description: "Invested volume per bucket, within chartCurrency only.",
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
                                description: "Invested capital per plan, UNBOUNDED. `value` is only " +
                                    "comparable within one `currency`.",
                                items: {
                                    type: "object",
                                    properties: {
                                        name: { type: "string" },
                                        currency: { type: "string" },
                                        value: { type: "number" },
                                    },
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
                            recentInvestments: {
                                type: "array",
                                items: {
                                    type: "object",
                                    properties: {
                                        id: { type: "string" },
                                        user: { type: "string" },
                                        plan: { type: "string" },
                                        amount: { type: "number" },
                                        profit: {
                                            type: "number",
                                            description: "Sign-aware: negative on a LOSS even for rows " +
                                                "settled before the cron stored the sign itself.",
                                        },
                                        currency: {
                                            type: "string",
                                            description: "The plan's currency — this row's unit.",
                                        },
                                        date: { type: "string", format: "date-time" },
                                        status: { type: "string" },
                                        result: { type: "string" },
                                    },
                                },
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
    permission: "access.forex",
};
function getIsoWeekLabel(d) {
    const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    const dayNum = date.getUTCDay() || 7;
    date.setUTCDate(date.getUTCDate() + 4 - dayNum);
    const isoYear = date.getUTCFullYear();
    const yearStart = new Date(Date.UTC(isoYear, 0, 1));
    const week = Math.ceil(((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
    return `${isoYear}-${String(week).padStart(2, "0")}`;
}
exports.default = async (data) => {
    var _a;
    const { user, query, ctx } = data;
    const { timeframe = "1y" } = query;
    if (!(user === null || user === void 0 ? void 0 : user.id)) {
        throw (0, error_1.createError)({ statusCode: 401, message: "Unauthorized" });
    }
    const now = new Date();
    let startDate, endDate, groupFormat, intervals;
    if (timeframe === "1m") {
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        groupFormat = "%e";
        const daysInMonth = endDate.getDate();
        intervals = Array.from({ length: daysInMonth }, (_, i) => (i + 1).toString());
    }
    else if (timeframe === "3m") {
        startDate = new Date(now.getFullYear(), now.getMonth() - 2, 1);
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        groupFormat = "%x-%v";
        const intervalsArr = [];
        const current = new Date(startDate);
        while (current <= endDate) {
            const label = getIsoWeekLabel(current);
            if (!intervalsArr.includes(label))
                intervalsArr.push(label);
            current.setDate(current.getDate() + 7);
        }
        intervals = intervalsArr;
    }
    else {
        startDate = new Date(now.getFullYear(), 0, 1);
        endDate = new Date(now.getFullYear(), 11, 31);
        groupFormat = "%b";
        intervals = [
            "Jan",
            "Feb",
            "Mar",
            "Apr",
            "May",
            "Jun",
            "Jul",
            "Aug",
            "Sep",
            "Oct",
            "Nov",
            "Dec",
        ];
    }
    const [investmentStats, accountStats, planStats, userStats] = (await Promise.all([
        db_1.models.forexInvestment.findOne({
            attributes: [
                [
                    (0, sequelize_1.fn)("COALESCE", (0, sequelize_1.fn)("SUM", (0, sequelize_1.literal)("CASE WHEN status != 'REJECTED' THEN amount ELSE 0 END")), 0),
                    "totalInvestments",
                ],
                [
                    (0, sequelize_1.fn)("COALESCE", (0, sequelize_1.fn)("SUM", (0, sequelize_1.literal)(`CASE WHEN createdAt >= '${new Date(now.getFullYear(), now.getMonth(), 1).toISOString()}' AND status != 'REJECTED' THEN amount ELSE 0 END`)), 0),
                    "currentInvestments",
                ],
                [
                    (0, sequelize_1.fn)("COALESCE", (0, sequelize_1.fn)("SUM", (0, sequelize_1.literal)(`CASE WHEN createdAt BETWEEN '${new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString()}' AND '${new Date(now.getFullYear(), now.getMonth(), 0).toISOString()}' AND status != 'REJECTED' THEN amount ELSE 0 END`)), 0),
                    "previousInvestments",
                ],
            ],
            raw: true,
        }),
        db_1.models.forexAccount.findOne({
            attributes: [
                [(0, sequelize_1.fn)("COUNT", (0, sequelize_1.literal)("id")), "totalAccounts"],
                [
                    (0, sequelize_1.fn)("COUNT", (0, sequelize_1.literal)(`CASE WHEN createdAt >= '${new Date(now.getFullYear(), now.getMonth(), 1).toISOString()}' THEN id ELSE NULL END`)),
                    "currentAccounts",
                ],
                [
                    (0, sequelize_1.fn)("COUNT", (0, sequelize_1.literal)(`CASE WHEN createdAt BETWEEN '${new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString()}' AND '${new Date(now.getFullYear(), now.getMonth(), 0).toISOString()}' THEN id ELSE NULL END`)),
                    "previousAccounts",
                ],
            ],
            raw: true,
        }),
        db_1.models.forexPlan.findOne({
            attributes: [
                [(0, sequelize_1.fn)("COUNT", (0, sequelize_1.literal)("id")), "activePlans"],
                [
                    (0, sequelize_1.fn)("COUNT", (0, sequelize_1.literal)(`CASE WHEN createdAt >= '${new Date(now.getFullYear(), now.getMonth(), 1).toISOString()}' AND status = true THEN id ELSE NULL END`)),
                    "currentActivePlans",
                ],
                [
                    (0, sequelize_1.fn)("COUNT", (0, sequelize_1.literal)(`CASE WHEN createdAt BETWEEN '${new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString()}' AND '${new Date(now.getFullYear(), now.getMonth(), 0).toISOString()}' AND status = true THEN id ELSE NULL END`)),
                    "previousActivePlans",
                ],
            ],
            raw: true,
        }),
        db_1.models.forexAccount.findOne({
            attributes: [
                [(0, sequelize_1.fn)("COUNT", (0, sequelize_1.fn)("DISTINCT", (0, sequelize_1.literal)("userId"))), "activeUsers"],
                [
                    (0, sequelize_1.fn)("COUNT", (0, sequelize_1.literal)(`DISTINCT CASE WHEN createdAt >= '${new Date(now.getFullYear(), now.getMonth(), 1).toISOString()}' THEN userId ELSE NULL END`)),
                    "currentActiveUsers",
                ],
                [
                    (0, sequelize_1.fn)("COUNT", (0, sequelize_1.literal)(`DISTINCT CASE WHEN createdAt BETWEEN '${new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString()}' AND '${new Date(now.getFullYear(), now.getMonth(), 0).toISOString()}' THEN userId ELSE NULL END`)),
                    "previousActiveUsers",
                ],
            ],
            raw: true,
        }),
    ]));
    const totalInvestments = parseFloat(investmentStats.totalInvestments) || 0;
    const currentInvestments = parseFloat(investmentStats.currentInvestments) || 0;
    const previousInvestments = parseFloat(investmentStats.previousInvestments) || 0;
    const investmentsGrowth = previousInvestments > 0
        ? Math.round(((currentInvestments - previousInvestments) / previousInvestments) *
            100)
        : 0;
    const totalAccounts = parseInt(accountStats.totalAccounts, 10) || 0;
    const currentAccounts = parseInt(accountStats.currentAccounts, 10) || 0;
    const previousAccounts = parseInt(accountStats.previousAccounts, 10) || 0;
    const accountsGrowth = previousAccounts > 0
        ? Math.round(((currentAccounts - previousAccounts) / previousAccounts) * 100)
        : 0;
    const activePlans = parseInt(planStats.activePlans, 10) || 0;
    const currentActivePlans = parseInt(planStats.currentActivePlans, 10) || 0;
    const previousActivePlans = parseInt(planStats.previousActivePlans, 10) || 0;
    const plansGrowth = previousActivePlans > 0
        ? Math.round(((currentActivePlans - previousActivePlans) / previousActivePlans) *
            100)
        : 0;
    const activeUsers = parseInt(userStats.activeUsers, 10) || 0;
    const currentActiveUsers = parseInt(userStats.currentActiveUsers, 10) || 0;
    const previousActiveUsers = parseInt(userStats.previousActiveUsers, 10) || 0;
    const usersGrowth = previousActiveUsers > 0
        ? Math.round(((currentActiveUsers - previousActiveUsers) / previousActiveUsers) *
            100)
        : 0;
    const [investmentStatusStats, investmentResultStats, accountTypeStats, signalStats,] = (await Promise.all([
        db_1.models.forexInvestment.findOne({
            attributes: [
                [(0, sequelize_1.fn)("COUNT", (0, sequelize_1.literal)("CASE WHEN status = 'ACTIVE' THEN 1 END")), "active"],
                [(0, sequelize_1.fn)("COUNT", (0, sequelize_1.literal)("CASE WHEN status = 'COMPLETED' THEN 1 END")), "completed"],
                [
                    (0, sequelize_1.fn)("COALESCE", (0, sequelize_1.fn)("SUM", (0, sequelize_1.literal)(`CASE WHEN status = 'COMPLETED' THEN (${money_1.SIGNED_PROFIT_SQL}) ELSE 0 END`)), 0),
                    "totalProfit",
                ],
            ],
            raw: true,
        }),
        db_1.models.forexInvestment.findOne({
            attributes: [
                [(0, sequelize_1.fn)("COUNT", (0, sequelize_1.literal)("CASE WHEN result = 'WIN' THEN 1 END")), "win"],
                [(0, sequelize_1.fn)("COUNT", (0, sequelize_1.literal)("CASE WHEN result = 'LOSS' THEN 1 END")), "loss"],
                [(0, sequelize_1.fn)("COUNT", (0, sequelize_1.literal)("CASE WHEN result = 'DRAW' THEN 1 END")), "draw"],
            ],
            where: { status: "COMPLETED" },
            raw: true,
        }),
        db_1.models.forexAccount.findOne({
            attributes: [
                [(0, sequelize_1.fn)("COUNT", (0, sequelize_1.literal)("CASE WHEN type = 'LIVE' THEN 1 END")), "live"],
                [(0, sequelize_1.fn)("COUNT", (0, sequelize_1.literal)("CASE WHEN type = 'DEMO' THEN 1 END")), "demo"],
            ],
            raw: true,
        }),
        db_1.models.forexSignal.findOne({
            attributes: [
                [(0, sequelize_1.fn)("COUNT", (0, sequelize_1.literal)("id")), "total"],
                [(0, sequelize_1.fn)("COUNT", (0, sequelize_1.literal)("CASE WHEN status = true THEN 1 END")), "active"],
            ],
            raw: true,
        }),
    ]));
    const activeInvestments = parseInt((investmentStatusStats === null || investmentStatusStats === void 0 ? void 0 : investmentStatusStats.active) || "0", 10);
    const completedInvestments = parseInt((investmentStatusStats === null || investmentStatusStats === void 0 ? void 0 : investmentStatusStats.completed) || "0", 10);
    const totalProfit = parseFloat((investmentStatusStats === null || investmentStatusStats === void 0 ? void 0 : investmentStatusStats.totalProfit) || "0");
    const winCount = parseInt((investmentResultStats === null || investmentResultStats === void 0 ? void 0 : investmentResultStats.win) || "0", 10);
    const lossCount = parseInt((investmentResultStats === null || investmentResultStats === void 0 ? void 0 : investmentResultStats.loss) || "0", 10);
    const drawCount = parseInt((investmentResultStats === null || investmentResultStats === void 0 ? void 0 : investmentResultStats.draw) || "0", 10);
    const totalResults = winCount + lossCount + drawCount;
    const winRate = totalResults > 0 ? Math.round((winCount / totalResults) * 100) : 0;
    const liveAccounts = parseInt((accountTypeStats === null || accountTypeStats === void 0 ? void 0 : accountTypeStats.live) || "0", 10);
    const demoAccounts = parseInt((accountTypeStats === null || accountTypeStats === void 0 ? void 0 : accountTypeStats.demo) || "0", 10);
    const totalSignals = parseInt((signalStats === null || signalStats === void 0 ? void 0 : signalStats.total) || "0", 10);
    const activeSignals = parseInt((signalStats === null || signalStats === void 0 ? void 0 : signalStats.active) || "0", 10);
    const [pendingDeposits, pendingWithdrawals] = await Promise.all([
        db_1.models.transaction.count({
            where: { type: "FOREX_DEPOSIT", status: "PENDING" },
        }),
        db_1.models.transaction.count({
            where: { type: "FOREX_WITHDRAW", status: "PENDING" },
        }),
    ]);
    const [capitalPools, profitPools] = await Promise.all([
        (0, money_1.investedByCurrency)({ status: { [sequelize_1.Op.ne]: "REJECTED" } }),
        (0, money_1.investedByCurrency)({ status: "COMPLETED" }),
    ]);
    const { investedByCurrency: pools, primaryInvested, mixedCurrencies } = (0, money_1.summarise)(capitalPools);
    const overview = {
        totalInvestments,
        investmentsGrowth,
        activeUsers,
        usersGrowth,
        activePlans,
        plansGrowth,
        totalAccounts,
        accountsGrowth,
        totalProfit,
        activeInvestments,
        completedInvestments,
        winRate,
        liveAccounts,
        demoAccounts,
        totalSignals,
        activeSignals,
        pendingDeposits,
        pendingWithdrawals,
    };
    const investmentResults = {
        win: winCount,
        loss: lossCount,
        draw: drawCount,
    };
    const chartCurrency = (_a = primaryInvested === null || primaryInvested === void 0 ? void 0 : primaryInvested.currency) !== null && _a !== void 0 ? _a : null;
    const chartDataRaw = await db_1.models.forexInvestment.findAll({
        attributes: [
            [
                (0, sequelize_1.fn)("DATE_FORMAT", (0, sequelize_1.col)("forexInvestment.createdAt"), groupFormat),
                "period",
            ],
            [(0, sequelize_1.fn)("SUM", (0, sequelize_1.col)("forexInvestment.amount")), "totalInvested"],
        ],
        include: [
            {
                model: db_1.models.forexPlan,
                as: "plan",
                attributes: [],
                required: true,
                ...(chartCurrency ? { where: { currency: chartCurrency } } : {}),
            },
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
    const planDistributionRaw = await db_1.models.forexPlan.findAll({
        attributes: [
            "name",
            "currency",
            [
                (0, sequelize_1.fn)("COALESCE", (0, sequelize_1.fn)("SUM", (0, sequelize_1.col)("investments.amount")), 0),
                "totalInvested",
            ],
        ],
        include: [
            {
                model: db_1.models.forexInvestment,
                as: "investments",
                attributes: [],
                where: { status: { [sequelize_1.Op.ne]: "REJECTED" } },
                required: false,
            },
        ],
        group: ["forexPlan.id"],
        raw: true,
    });
    const planDistribution = planDistributionRaw.map((plan) => ({
        name: plan.name,
        currency: plan.currency || "",
        value: parseFloat(plan.totalInvested) || 0,
    }));
    const recentInvestmentsRaw = await db_1.models.forexInvestment.findAll({
        where: {},
        include: [
            { model: db_1.models.user, as: "user", attributes: ["firstName", "lastName"] },
            { model: db_1.models.forexPlan, as: "plan", attributes: ["name", "currency"] },
        ],
        order: [["createdAt", "DESC"]],
        limit: 5,
        raw: true,
        nest: true,
    });
    const recentInvestments = recentInvestmentsRaw.map((inv) => {
        var _a, _b;
        const rawProfit = Number(inv.profit) || 0;
        return {
            id: inv.id,
            user: inv.user ? `${inv.user.firstName} ${inv.user.lastName}` : "Unknown",
            userId: inv.userId,
            plan: ((_a = inv.plan) === null || _a === void 0 ? void 0 : _a.name) || "Unknown",
            amount: Number(inv.amount) || 0,
            profit: inv.result === "LOSS" ? -Math.abs(rawProfit) : rawProfit,
            currency: ((_b = inv.plan) === null || _b === void 0 ? void 0 : _b.currency) || "",
            date: inv.createdAt,
            status: inv.status,
            result: inv.result,
        };
    });
    const topPlans = await db_1.models.forexPlan.findAll({
        attributes: [
            "id",
            "name",
            "title",
            "image",
            "minAmount",
            "maxAmount",
            "minProfit",
            "maxProfit",
            "status",
            "trending",
        ],
        where: { status: true },
        order: [["trending", "DESC"]],
        limit: 5,
        raw: true,
    });
    return {
        overview,
        investedByCurrency: pools,
        primaryInvested,
        mixedCurrencies,
        profitByCurrency: profitPools,
        chartCurrency,
        chartData,
        planDistribution,
        investmentResults,
        recentInvestments,
        topPlans,
    };
};
