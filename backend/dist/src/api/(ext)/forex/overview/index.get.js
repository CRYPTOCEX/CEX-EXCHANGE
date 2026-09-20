"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const sequelize_1 = require("sequelize");
const utils_1 = require("@b/api/finance/currency/utils");
exports.metadata = { summary: "Get Forex User Dashboard Data",
    description: "Retrieves user-specific dashboard data including overview statistics, chart data, plan distribution, and recent investments.",
    operationId: "getForexUserDashboardData",
    tags: ["Forex", "Dashboard", "User"],
    requiresAuth: true,
    logModule: "FOREX",
    logTitle: "Get Forex Overview",
    parameters: [
        { name: "timeframe",
            in: "query",
            description: "Timeframe for chart data: 1m, 3m, or 1y",
            required: false,
            schema: { type: "string", enum: ["1m", "3m", "1y"] },
        },
    ],
    responses: { 200: { description: "User dashboard data retrieved successfully.",
            content: { "application/json": { schema: { type: "object",
                        properties: { overview: { type: "object",
                                properties: { totalInvested: { type: "number",
                                        description: "Total invested, converted to USD at each plan currency's own rate.",
                                    },
                                    totalProfit: { type: "number",
                                        description: "Total profit, converted to USD at each plan currency's own rate.",
                                    },
                                    profitPercentage: { type: "number",
                                        nullable: true,
                                        description: "Profit as a percentage of the amount invested. Null when nothing is invested — a return with no denominator has no percentage, and 0 would read as 'flat'.",
                                    },
                                    activeInvestments: { type: "number" },
                                    completedInvestments: { type: "number" },
                                    unpricedCurrencies: { type: "array",
                                        items: { type: "string" },
                                        description: "Plan currencies with no usable USD rate, across every USD figure on this payload (the totals above, the chart series and the plan distribution). Their amounts are excluded from those figures, which are a lower bound whenever this is non-empty.",
                                    },
                                },
                            },
                            chartData: { type: "array",
                                description: "Amount invested per bucket of the requested timeframe, priced into USD before it is summed. Buckets with no rows are present with a value of 0.",
                                items: { type: "object",
                                    properties: { name: { type: "string" },
                                        value: { type: "number",
                                            description: "USD. Excludes anything listed in overview.unpricedCurrencies.",
                                        },
                                    },
                                },
                            },
                            planDistribution: { type: "array",
                                description: "One entry per plan this user actually holds a non-rejected investment in. Plans they never touched are not listed.",
                                items: { type: "object",
                                    properties: { name: { type: "string" },
                                        currency: { type: "string" },
                                        amount: { type: "number",
                                            description: "Invested in the plan's own currency.",
                                        },
                                        value: { type: "number",
                                            description: "The same figure in USD, 0 when unpriced.",
                                        },
                                        unpriced: { type: "boolean" },
                                        percentage: { type: "number",
                                            nullable: true,
                                            description: "Share of the USD portfolio. Null when the plan is unpriced or the portfolio total is 0 — neither has a denominator this share could be taken against.",
                                        },
                                    },
                                },
                            },
                            recentInvestments: { type: "array",
                                description: "The 5 most recent non-rejected investments. A sample, never a population — nothing here may be totalled or ranked.",
                                items: { type: "object",
                                    properties: { id: { type: "string" },
                                        plan: { type: "string" },
                                        amount: { type: "number",
                                            description: "In `currency`, the plan's own unit — never USD.",
                                        },
                                        currency: { type: "string",
                                            nullable: true,
                                            description: "The plan's currency, null when the plan row is gone. Do not render the amount with a currency symbol when this is null.",
                                        },
                                        createdAt: { type: "string", format: "date-time" },
                                        status: { type: "string" },
                                    },
                                },
                            },
                        },
                    },
                },
            },
        },
        401: { description: "Unauthorized" },
        500: { description: "Internal Server Error" },
    },
};
function isoWeek(d) {
    const date = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
    const dayNum = date.getUTCDay() || 7;
    date.setUTCDate(date.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
    const week = Math.ceil(((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
    return { year: date.getUTCFullYear(), week };
}
function priceBucket(byCurrency, rates) {
    let total = 0;
    const unpriced = new Set();
    for (const [currency, amount] of byCurrency) {
        if (!Number.isFinite(amount) || amount === 0)
            continue;
        const rate = rates.get(currency);
        if (rate === undefined) {
            unpriced.add(currency);
            continue;
        }
        total += amount * rate;
    }
    return { total, unpriced };
}
exports.default = async (data) => {
    var _a, _b, _c;
    const { user, query, ctx } = data;
    if (!(user === null || user === void 0 ? void 0 : user.id)) {
        throw (0, error_1.createError)({ statusCode: 401, message: "Unauthorized" });
    }
    const userId = user.id;
    const { timeframe = "1y" } = query;
    const now = new Date();
    let startDate;
    let endDate;
    let groupFormat;
    let intervals;
    const year = now.getUTCFullYear();
    const month = now.getUTCMonth();
    if (timeframe === "1m") {
        startDate = new Date(Date.UTC(year, month, 1));
        endDate = new Date(Date.UTC(year, month + 1, 1));
        groupFormat = "%d";
        const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
        intervals = Array.from({ length: daysInMonth }, (_, i) => ({ key: String(i + 1).padStart(2, "0"),
            name: (i + 1).toString(),
        }));
    }
    else if (timeframe === "3m") {
        startDate = new Date(Date.UTC(year, month - 2, 1));
        endDate = new Date(Date.UTC(year, month + 1, 1));
        groupFormat = "%x-%v";
        const intervalsArr = [];
        const current = new Date(startDate);
        current.setUTCDate(current.getUTCDate() - ((current.getUTCDay() + 6) % 7));
        while (current < endDate) {
            const { year: isoYear, week } = isoWeek(current);
            const key = `${isoYear}-${String(week).padStart(2, "0")}`;
            intervalsArr.push({ key, name: key });
            current.setUTCDate(current.getUTCDate() + 7);
        }
        intervals = intervalsArr;
    }
    else {
        startDate = new Date(Date.UTC(year, 0, 1));
        endDate = new Date(Date.UTC(year + 1, 0, 1));
        groupFormat = "%m";
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
        ].map((name, i) => ({ key: String(i + 1).padStart(2, "0"), name }));
    }
    const [overviewRows, chartDataRaw, planDistributionRaw, recentInvestmentsRaw] = await Promise.all([
        db_1.models.forexInvestment.findAll({
            attributes: [
                [(0, sequelize_1.col)("plan.currency"), "currency"],
                "status",
                [(0, sequelize_1.fn)("SUM", (0, sequelize_1.col)("forexInvestment.amount")), "totalAmount"],
                [(0, sequelize_1.fn)("SUM", (0, sequelize_1.col)("forexInvestment.profit")), "totalProfit"],
                [(0, sequelize_1.fn)("COUNT", (0, sequelize_1.col)("forexInvestment.id")), "count"],
            ],
            where: { userId, status: { [sequelize_1.Op.ne]: "REJECTED" } },
            include: [
                {
                    model: db_1.models.forexPlan,
                    as: "plan",
                    attributes: [],
                    paranoid: false,
                },
            ],
            group: ["plan.currency", "forexInvestment.status"],
            raw: true,
        }),
        db_1.models.forexInvestment.findAll({
            attributes: [
                [
                    (0, sequelize_1.fn)("DATE_FORMAT", (0, sequelize_1.col)("forexInvestment.createdAt"), groupFormat),
                    "period",
                ],
                [(0, sequelize_1.col)("plan.currency"), "currency"],
                [(0, sequelize_1.fn)("SUM", (0, sequelize_1.col)("forexInvestment.amount")), "totalInvested"],
            ],
            where: {
                userId,
                status: { [sequelize_1.Op.ne]: "REJECTED" },
                createdAt: { [sequelize_1.Op.gte]: startDate, [sequelize_1.Op.lt]: endDate },
            },
            include: [
                {
                    model: db_1.models.forexPlan,
                    as: "plan",
                    attributes: [],
                    paranoid: false,
                },
            ],
            group: ["period", "plan.currency"],
            raw: true,
        }),
        db_1.models.forexPlan.findAll({
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
                    where: { userId, status: { [sequelize_1.Op.ne]: "REJECTED" } },
                    required: true,
                },
            ],
            paranoid: false,
            group: ["forexPlan.id"],
            raw: true,
        }),
        db_1.models.forexInvestment.findAll({
            where: { userId, status: { [sequelize_1.Op.ne]: "REJECTED" } },
            include: [
                {
                    model: db_1.models.forexPlan,
                    as: "plan",
                    attributes: ["name", "title", "currency"],
                    paranoid: false,
                },
            ],
            order: [["createdAt", "DESC"]],
            limit: 5,
        }),
    ]);
    const UNKNOWN_CURRENCY = "UNKNOWN";
    const investedByCurrency = new Map();
    const profitByCurrency = new Map();
    let activeInvestments = 0;
    let completedInvestments = 0;
    for (const row of overviewRows) {
        const currency = row.currency || UNKNOWN_CURRENCY;
        investedByCurrency.set(currency, ((_a = investedByCurrency.get(currency)) !== null && _a !== void 0 ? _a : 0) + (Number(row.totalAmount) || 0));
        profitByCurrency.set(currency, ((_b = profitByCurrency.get(currency)) !== null && _b !== void 0 ? _b : 0) + (Number(row.totalProfit) || 0));
        const count = Number(row.count) || 0;
        if (row.status === "ACTIVE")
            activeInvestments += count;
        else if (row.status === "COMPLETED")
            completedInvestments += count;
    }
    const chartBuckets = new Map();
    for (const row of chartDataRaw) {
        const period = String(row.period);
        if (!chartBuckets.has(period))
            chartBuckets.set(period, new Map());
        const byCurrency = chartBuckets.get(period);
        const currency = row.currency || UNKNOWN_CURRENCY;
        byCurrency.set(currency, ((_c = byCurrency.get(currency)) !== null && _c !== void 0 ? _c : 0) + (Number(row.totalInvested) || 0));
    }
    const currencies = new Set();
    for (const currency of investedByCurrency.keys())
        currencies.add(currency);
    for (const currency of profitByCurrency.keys())
        currencies.add(currency);
    for (const byCurrency of chartBuckets.values()) {
        for (const currency of byCurrency.keys())
            currencies.add(currency);
    }
    for (const plan of planDistributionRaw) {
        if (plan.currency)
            currencies.add(plan.currency);
    }
    currencies.delete(UNKNOWN_CURRENCY);
    const rates = await (0, utils_1.getUsdRates)([...currencies]);
    const unpriced = new Set();
    const invested = priceBucket(investedByCurrency, rates);
    const profit = priceBucket(profitByCurrency, rates);
    invested.unpriced.forEach((currency) => unpriced.add(currency));
    profit.unpriced.forEach((currency) => unpriced.add(currency));
    const totalInvested = invested.total;
    const totalProfit = profit.total;
    const profitPercentage = totalInvested > 0 ? (totalProfit / totalInvested) * 100 : null;
    const chartData = intervals.map(({ key, name }) => {
        const byCurrency = chartBuckets.get(key);
        if (!byCurrency)
            return { name, value: 0 };
        const priced = priceBucket(byCurrency, rates);
        priced.unpriced.forEach((currency) => unpriced.add(currency));
        return { name, value: Number(priced.total.toFixed(2)) };
    });
    const planDistribution = planDistributionRaw.map((plan) => {
        const amount = Number(plan.totalInvested) || 0;
        const rate = rates.get(plan.currency);
        const investedUSD = rate === undefined ? 0 : amount * rate;
        if (rate === undefined && amount !== 0)
            unpriced.add(plan.currency);
        const percentage = rate === undefined || totalInvested <= 0
            ? null
            : (investedUSD / totalInvested) * 100;
        return { name: plan.name,
            currency: plan.currency,
            amount,
            unpriced: rate === undefined,
            value: investedUSD,
            percentage,
        };
    });
    const overview = { totalInvested,
        totalProfit,
        profitPercentage,
        activeInvestments,
        completedInvestments,
        unpricedCurrencies: [...unpriced],
    };
    const recentInvestments = recentInvestmentsRaw.map((inv) => { var _a, _b, _c; var _d; return ({ id: inv.id,
        plan: ((_a = inv.plan) === null || _a === void 0 ? void 0 : _a.title) || ((_b = inv.plan) === null || _b === void 0 ? void 0 : _b.name) || "Unknown",
        amount: inv.amount,
        currency: (_d = (_c = inv.plan) === null || _c === void 0 ? void 0 : _c.currency) !== null && _d !== void 0 ? _d : null,
        createdAt: inv.createdAt,
        status: inv.status, }); });
    ctx === null || ctx === void 0 ? void 0 : ctx.success("Request completed successfully");
    return { overview,
        chartData,
        planDistribution,
        recentInvestments,
    };
};
