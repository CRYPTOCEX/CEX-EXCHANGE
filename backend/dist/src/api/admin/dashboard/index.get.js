"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const sequelize_1 = require("sequelize");
const utils_1 = require("@b/api/finance/currency/utils");
const console_1 = require("@b/utils/console");
const cache_1 = require("@b/utils/cache");
function periodWindow(period, now = new Date()) {
    switch (period) {
        case "yearly": {
            const start = new Date(now.getFullYear(), 0, 1);
            return {
                start,
                prevStart: new Date(now.getFullYear() - 1, 0, 1),
                prevEnd: start,
            };
        }
        case "weekly": {
            const start = new Date(now);
            start.setDate(now.getDate() - now.getDay());
            start.setHours(0, 0, 0, 0);
            const prevStart = new Date(start);
            prevStart.setDate(start.getDate() - 7);
            return { start, prevStart, prevEnd: start };
        }
        default: {
            const start = new Date(now.getTime() - 28 * 24 * 60 * 60 * 1000);
            return {
                start,
                prevStart: new Date(now.getTime() - 56 * 24 * 60 * 60 * 1000),
                prevEnd: start,
            };
        }
    }
}
function generateDateRange(period = "monthly") {
    const dates = [];
    const now = new Date();
    if (period === "yearly") {
        const year = now.getFullYear();
        for (let month = 0; month < 12; month++) {
            dates.push(new Date(year, month, 1).toISOString().split("T")[0]);
        }
    }
    else if (period === "weekly") {
        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - now.getDay());
        for (let day = 0; day < 7; day++) {
            const date = new Date(startOfWeek);
            date.setDate(startOfWeek.getDate() + day);
            dates.push(date.toISOString().split("T")[0]);
        }
    }
    else {
        for (let week = 3; week >= 0; week--) {
            const date = new Date(now);
            date.setDate(now.getDate() - week * 7);
            const dayOfWeek = date.getDay();
            date.setDate(date.getDate() + (dayOfWeek === 0 ? -6 : 1 - dayOfWeek));
            dates.push(date.toISOString().split("T")[0]);
        }
    }
    return dates;
}
function bucketExpressions(period, dateColumn = "createdAt") {
    const column = (0, sequelize_1.col)(dateColumn);
    if (period === "yearly") {
        return {
            group: [(0, sequelize_1.fn)("YEAR", column), (0, sequelize_1.fn)("MONTH", column)],
            label: (0, sequelize_1.fn)("CONCAT", (0, sequelize_1.fn)("YEAR", column), "-", (0, sequelize_1.fn)("LPAD", (0, sequelize_1.fn)("MONTH", column), 2, "0"), "-01"),
        };
    }
    if (period === "monthly") {
        return {
            group: [(0, sequelize_1.fn)("YEARWEEK", column, 1)],
            label: (0, sequelize_1.fn)("DATE", (0, sequelize_1.fn)("DATE_SUB", column, (0, sequelize_1.literal)(`INTERVAL WEEKDAY(\`${dateColumn}\`) DAY`))),
        };
    }
    return { group: [(0, sequelize_1.fn)("DATE", column)], label: (0, sequelize_1.fn)("DATE", column) };
}
const PROFIT_STREAMS = {
    DEPOSIT: { label: "Deposits", extension: null },
    WITHDRAW: { label: "Withdrawals", extension: null },
    TRANSFER: { label: "Transfers", extension: null },
    TRADE: { label: "Spot Trading", extension: null },
    EXCHANGE_ORDER: { label: "Spot Trading", extension: null },
    BINARY_ORDER: { label: "Binary Trading", extension: null },
    INVESTMENT: { label: "Investments", extension: null },
    REFERRAL_REWARD: { label: "Referrals", extension: "mlm" },
    AI_INVESTMENT: { label: "AI Investment", extension: "ai_investment" },
    FOREX_DEPOSIT: { label: "Forex", extension: "forex" },
    FOREX_WITHDRAW: { label: "Forex", extension: "forex" },
    FOREX_INVESTMENT: { label: "Forex", extension: "forex" },
    ICO_CONTRIBUTION: { label: "ICO", extension: "ico" },
    STAKING: { label: "Staking", extension: "staking" },
    P2P_TRADE: { label: "P2P", extension: "p2p" },
    NFT_SALE: { label: "NFT", extension: "nft" },
    NFT_AUCTION: { label: "NFT", extension: "nft" },
    NFT_OFFER: { label: "NFT", extension: "nft" },
    GATEWAY_PAYMENT: { label: "Payment Gateway", extension: "gateway" },
    DEX_SWAP: { label: "DEX Swap", extension: "dex" },
    DEX_LP_FEE: { label: "DEX LP Fees", extension: "dex" },
    DEX_LISTING: { label: "DEX Listing Fees", extension: "dex" },
};
exports.metadata = {
    summary: "Get Admin Dashboard Analytics",
    description: "Platform analytics for the admin dashboard: user growth, revenue attributed by product stream, trading activity and period-over-period deltas. Revenue is priced into USD before it is summed.",
    operationId: "getAdminDashboard",
    tags: ["Admin", "Dashboard", "Analytics"],
    requiresAuth: true,
    permission: "access.admin",
    parameters: [
        {
            name: "timeframe",
            in: "query",
            required: false,
            schema: {
                type: "string",
                enum: ["weekly", "monthly", "yearly"],
                default: "monthly",
            },
            description: "weekly = the 7 days of this week; monthly = the last 4 weeks; yearly = the 12 months of this year.",
        },
    ],
    responses: {
        200: {
            description: "Dashboard analytics retrieved successfully",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            timeframe: { type: "string" },
                            generatedAt: { type: "string", format: "date-time" },
                            overview: {
                                type: "object",
                                properties: {
                                    totalUsers: { type: "number" },
                                    activeUsers: { type: "number" },
                                    newUsersToday: { type: "number" },
                                    newUsersThisPeriod: { type: "number" },
                                    totalTransactions: { type: "number" },
                                    pendingKYC: { type: "number" },
                                    revenue: {
                                        type: "object",
                                        properties: {
                                            total: { type: "number" },
                                            currency: { type: "string" },
                                            unpriced: { type: "array", items: { type: "string" } },
                                        },
                                    },
                                    deltas: {
                                        type: "object",
                                        description: "Percentage change against the equivalent preceding window. Null where the previous window was empty, because growth from zero has no percentage.",
                                        properties: {
                                            users: { type: "number", nullable: true },
                                            revenue: { type: "number", nullable: true },
                                            trades: { type: "number", nullable: true },
                                        },
                                    },
                                },
                            },
                            userMetrics: { type: "object" },
                            financialMetrics: { type: "object" },
                            tradingActivity: { type: "object" },
                            revenueByStream: {
                                type: "array",
                                items: {
                                    type: "object",
                                    properties: {
                                        key: { type: "string" },
                                        label: { type: "string" },
                                        extension: { type: "string", nullable: true },
                                        amount: { type: "number" },
                                        share: { type: "number" },
                                    },
                                },
                            },
                        },
                    },
                },
            },
        },
    },
};
function delta(current, previous) {
    if (!Number.isFinite(current) || !Number.isFinite(previous))
        return null;
    if (previous === 0)
        return null;
    return Number((((current - previous) / Math.abs(previous)) * 100).toFixed(1));
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
    var _a, _b, _c, _d, _e, _f, _g, _h, _j;
    const { query, ctx } = data;
    const requested = String((query === null || query === void 0 ? void 0 : query.timeframe) || "monthly");
    const period = ["weekly", "monthly", "yearly"].includes(requested)
        ? requested
        : "monthly";
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Fetching dashboard analytics");
    const now = new Date();
    const { start, prevStart, prevEnd } = periodWindow(period, now);
    const startOfToday = new Date(new Date().setHours(0, 0, 0, 0));
    const dateRange = generateDateRange(period);
    const safe = async (label, run, fallback) => {
        try {
            return await run();
        }
        catch (error) {
            console_1.logger.debug("DASHBOARD", `${label} failed: ${error === null || error === void 0 ? void 0 : error.message}`);
            return fallback;
        }
    };
    const activeSince = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const bucket = bucketExpressions(period);
    const [totalUsers, activeUsers, newUsersToday, newUsersThisPeriod, newUsersPrevPeriod, totalTransactions, pendingKYC, profitRows, profitByStreamRows, profitPrevRows, registrationRows, kycLevelRows, volumeRows, tradeRows, prevTradeCount, assetRows, activeExtensions,] = await Promise.all([
        safe("totalUsers", () => db_1.models.user.count(), 0),
        safe("activeUsers", () => db_1.models.user.count({ where: { lastLogin: { [sequelize_1.Op.gte]: activeSince } } }), 0),
        safe("newUsersToday", () => db_1.models.user.count({ where: { createdAt: { [sequelize_1.Op.gte]: startOfToday } } }), 0),
        safe("newUsersThisPeriod", () => db_1.models.user.count({ where: { createdAt: { [sequelize_1.Op.gte]: start } } }), 0),
        safe("newUsersPrevPeriod", () => db_1.models.user.count({
            where: { createdAt: { [sequelize_1.Op.gte]: prevStart, [sequelize_1.Op.lt]: prevEnd } },
        }), 0),
        safe("totalTransactions", () => db_1.models.transaction.count(), 0),
        safe("pendingKYC", () => db_1.models.kycApplication.count({ where: { status: "PENDING" } }), 0),
        safe("revenue series", () => db_1.models.adminProfit.findAll({
            attributes: [
                [bucket.label, "date"],
                "currency",
                [(0, sequelize_1.fn)("SUM", (0, sequelize_1.col)("amount")), "total"],
            ],
            where: { createdAt: { [sequelize_1.Op.gte]: start } },
            group: [...bucket.group, "currency"],
            order: [[bucket.label, "ASC"]],
            raw: true,
        }), []),
        safe("revenue by stream", () => db_1.models.adminProfit.findAll({
            attributes: ["type", "currency", [(0, sequelize_1.fn)("SUM", (0, sequelize_1.col)("amount")), "total"]],
            where: { createdAt: { [sequelize_1.Op.gte]: start } },
            group: ["type", "currency"],
            raw: true,
        }), []),
        safe("revenue previous period", () => db_1.models.adminProfit.findAll({
            attributes: ["currency", [(0, sequelize_1.fn)("SUM", (0, sequelize_1.col)("amount")), "total"]],
            where: { createdAt: { [sequelize_1.Op.gte]: prevStart, [sequelize_1.Op.lt]: prevEnd } },
            group: ["currency"],
            raw: true,
        }), []),
        safe("registrations", () => db_1.models.user.findAll({
            attributes: [[bucket.label, "date"], [(0, sequelize_1.fn)("COUNT", (0, sequelize_1.col)("id")), "count"]],
            where: { createdAt: { [sequelize_1.Op.gte]: start } },
            group: bucket.group,
            order: [[bucket.label, "ASC"]],
            raw: true,
        }), []),
        safe("usersByLevel", () => db_1.models.kycApplication.findAll({
            attributes: [[(0, sequelize_1.fn)("COUNT", (0, sequelize_1.col)("kycApplication.userId")), "count"]],
            include: [
                {
                    model: db_1.models.kycLevel,
                    as: "level",
                    attributes: ["name", "level"],
                    required: false,
                },
            ],
            group: ["level.id", "level.name", "level.level"],
            raw: true,
        }), []),
        safe("transactionVolume", () => db_1.models.transaction.findAll({
            attributes: ["type", [(0, sequelize_1.fn)("COUNT", (0, sequelize_1.col)("id")), "count"]],
            where: { status: "COMPLETED", createdAt: { [sequelize_1.Op.gte]: start } },
            group: ["type"],
            raw: true,
        }), []),
        safe("dailyTrades", () => db_1.models.exchangeOrder.findAll({
            attributes: [
                [bucket.label, "date"],
                [(0, sequelize_1.fn)("COUNT", (0, sequelize_1.col)("id")), "count"],
                [(0, sequelize_1.fn)("SUM", (0, sequelize_1.col)("amount")), "volume"],
            ],
            where: { createdAt: { [sequelize_1.Op.gte]: start }, status: "CLOSED" },
            group: bucket.group,
            order: [[bucket.label, "ASC"]],
            raw: true,
        }), []),
        safe("prevTrades", () => db_1.models.exchangeOrder.count({
            where: {
                status: "CLOSED",
                createdAt: { [sequelize_1.Op.gte]: prevStart, [sequelize_1.Op.lt]: prevEnd },
            },
        }), 0),
        safe("topAssets", () => db_1.models.exchangeOrder.findAll({
            attributes: [
                "symbol",
                [(0, sequelize_1.fn)("SUM", (0, sequelize_1.col)("amount")), "volume"],
                [(0, sequelize_1.fn)("COUNT", (0, sequelize_1.col)("id")), "trades"],
            ],
            where: { status: "CLOSED", createdAt: { [sequelize_1.Op.gte]: start } },
            group: ["symbol"],
            order: [[(0, sequelize_1.fn)("COUNT", (0, sequelize_1.col)("id")), "DESC"]],
            limit: 6,
            raw: true,
        }), []),
        safe("extensions", async () => new Set((await cache_1.CacheManager.getInstance().getExtensions()).keys()), new Set()),
    ]);
    const currencies = new Set();
    for (const rows of [profitRows, profitByStreamRows, profitPrevRows]) {
        for (const row of rows)
            if (row.currency)
                currencies.add(row.currency);
    }
    const rates = await safe("usd rates", () => (0, utils_1.getUsdRates)([...currencies]), new Map());
    const unpriced = new Set();
    const revenueBuckets = new Map();
    for (const row of profitRows) {
        const date = String(row.date);
        if (!revenueBuckets.has(date))
            revenueBuckets.set(date, new Map());
        const byCurrency = revenueBuckets.get(date);
        const amount = parseFloat((_a = row.total) !== null && _a !== void 0 ? _a : "0") || 0;
        byCurrency.set(row.currency, ((_b = byCurrency.get(row.currency)) !== null && _b !== void 0 ? _b : 0) + amount);
    }
    const dailyRevenue = dateRange.map((date) => {
        const byCurrency = revenueBuckets.get(date);
        if (!byCurrency)
            return { date, revenue: 0 };
        const priced = priceBucket(byCurrency, rates);
        priced.unpriced.forEach((c) => unpriced.add(c));
        return { date, revenue: Number(priced.total.toFixed(2)) };
    });
    const streamTotals = new Map();
    for (const row of profitByStreamRows) {
        const stream = (_c = PROFIT_STREAMS[row.type]) !== null && _c !== void 0 ? _c : {
            label: String((_d = row.type) !== null && _d !== void 0 ? _d : "Other"),
            extension: null,
        };
        const amount = parseFloat((_e = row.total) !== null && _e !== void 0 ? _e : "0") || 0;
        if (amount === 0)
            continue;
        const rate = rates.get(row.currency);
        if (rate === undefined) {
            unpriced.add(row.currency);
            continue;
        }
        const existing = streamTotals.get(stream.label);
        if (existing) {
            existing.amount += amount * rate;
        }
        else {
            streamTotals.set(stream.label, {
                label: stream.label,
                extension: stream.extension,
                amount: amount * rate,
            });
        }
    }
    const streams = [...streamTotals.values()]
        .filter((s) => !s.extension || activeExtensions.has(s.extension))
        .map((s) => ({
        key: s.label.toLowerCase().replace(/\s+/g, "-"),
        label: s.label,
        extension: s.extension,
        amount: Number(s.amount.toFixed(2)),
    }))
        .filter((s) => s.amount !== 0)
        .sort((a, b) => b.amount - a.amount);
    const revenueTotal = Number(streams.reduce((sum, s) => sum + s.amount, 0).toFixed(2));
    const revenueByStream = streams.map((s) => ({
        ...s,
        share: revenueTotal > 0 ? Number(((s.amount / revenueTotal) * 100).toFixed(1)) : 0,
    }));
    const prevByCurrency = new Map();
    for (const row of profitPrevRows) {
        prevByCurrency.set(row.currency, parseFloat((_f = row.total) !== null && _f !== void 0 ? _f : "0") || 0);
    }
    const prevRevenue = priceBucket(prevByCurrency, rates).total;
    const registrationMap = new Map();
    for (const row of registrationRows) {
        registrationMap.set(String(row.date), parseInt((_g = row.count) !== null && _g !== void 0 ? _g : "0") || 0);
    }
    const newPerBucket = dateRange.map((date) => { var _a; return (_a = registrationMap.get(date)) !== null && _a !== void 0 ? _a : 0; });
    const cumulative = [];
    let running = totalUsers;
    for (let i = newPerBucket.length - 1; i >= 0; i--) {
        cumulative[i] = running;
        running -= newPerBucket[i];
    }
    const registrations = dateRange.map((date, i) => ({
        date,
        total: Math.max(0, cumulative[i]),
        new: newPerBucket[i],
    }));
    const usersByLevel = kycLevelRows
        .map((row) => { var _a, _b; return ({
        level: (_a = row["level.name"]) !== null && _a !== void 0 ? _a : (row["level.level"] != null ? `Level ${row["level.level"]}` : "Unverified"),
        count: parseInt((_b = row.count) !== null && _b !== void 0 ? _b : "0") || 0,
    }); })
        .filter((row) => row.count > 0);
    const transactionVolume = volumeRows
        .map((row) => { var _a, _b; return ({
        type: String((_a = row.type) !== null && _a !== void 0 ? _a : "Unknown")
            .toLowerCase()
            .replace(/_/g, " ")
            .replace(/\b\w/g, (c) => c.toUpperCase()),
        value: parseInt((_b = row.count) !== null && _b !== void 0 ? _b : "0") || 0,
    }); })
        .filter((row) => row.value > 0)
        .sort((a, b) => b.value - a.value);
    const tradesMap = new Map();
    for (const row of tradeRows) {
        tradesMap.set(String(row.date), {
            count: parseInt((_h = row.count) !== null && _h !== void 0 ? _h : "0") || 0,
            volume: parseFloat((_j = row.volume) !== null && _j !== void 0 ? _j : "0") || 0,
        });
    }
    const dailyTrades = dateRange.map((date) => { var _a, _b; var _c, _d; return ({
        date,
        count: (_c = (_a = tradesMap.get(date)) === null || _a === void 0 ? void 0 : _a.count) !== null && _c !== void 0 ? _c : 0,
        volume: (_d = (_b = tradesMap.get(date)) === null || _b === void 0 ? void 0 : _b.volume) !== null && _d !== void 0 ? _d : 0,
    }); });
    const topAssets = assetRows
        .map((row) => { var _a, _b, _c; return ({
        asset: String((_a = row.symbol) !== null && _a !== void 0 ? _a : "Unknown"),
        volume: parseFloat((_b = row.volume) !== null && _b !== void 0 ? _b : "0") || 0,
        trades: parseInt((_c = row.trades) !== null && _c !== void 0 ? _c : "0") || 0,
    }); })
        .filter((row) => row.trades > 0);
    const tradeCount = dailyTrades.reduce((sum, d) => sum + d.count, 0);
    ctx === null || ctx === void 0 ? void 0 : ctx.success("Dashboard analytics retrieved successfully");
    return {
        timeframe: period,
        generatedAt: now.toISOString(),
        overview: {
            totalUsers,
            activeUsers,
            newUsersToday,
            newUsersThisPeriod,
            totalTransactions,
            pendingKYC,
            revenue: {
                total: revenueTotal,
                currency: "USD",
                unpriced: [...unpriced],
            },
            deltas: {
                users: delta(newUsersThisPeriod, newUsersPrevPeriod),
                revenue: delta(revenueTotal, prevRevenue),
                trades: delta(tradeCount, prevTradeCount),
            },
        },
        userMetrics: { registrations, usersByLevel },
        financialMetrics: { dailyRevenue, transactionVolume },
        tradingActivity: { dailyTrades, topAssets },
        revenueByStream,
    };
};
