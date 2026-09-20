"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const sequelize_1 = require("sequelize");
const utils_1 = require("@b/api/finance/currency/utils");
const error_1 = require("@b/utils/error");
const errors_1 = require("@b/utils/schema/errors");
const PERIODS = ["day", "week", "month", "all"];
exports.metadata = {
    summary: "Get copy trading analytics",
    description: "Analytics for copy trading: leader and follower populations, trade activity, platform revenue, the top leaders by realised profit and a 30-day activity series. Every money figure is priced into USD before it is summed, except the leader-performance figures, which the stats cron already normalises to USDT and which are labelled with that unit.",
    operationId: "getCopyTradingAnalytics",
    tags: ["Admin", "Copy Trading", "Analytics"],
    requiresAuth: true,
    logModule: "ADMIN_COPY",
    logTitle: "Get Copy Trading Analytics",
    permission: "view.copy_trading",
    parameters: [
        {
            name: "period",
            in: "query",
            schema: {
                type: "string",
                enum: ["day", "week", "month", "all"],
                default: "month",
            },
            description: "Window for the activity figures (trades, revenue, leader performance). The leader and follower head-counts are current population and are not windowed.",
        },
    ],
    responses: {
        200: {
            description: "Analytics data retrieved successfully",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            period: { type: "string" },
                            generatedAt: { type: "string", format: "date-time" },
                            unpriced: {
                                type: "array",
                                items: { type: "string" },
                                description: "Currencies no USD rate could be found for. Non-empty means every USD total in this payload is a LOWER BOUND and the UI must say so.",
                            },
                            leaders: {
                                type: "object",
                                properties: {
                                    total: { type: "number" },
                                    active: { type: "number" },
                                    pending: { type: "number" },
                                    winRate: {
                                        type: "number",
                                        nullable: true,
                                        description: "SUM(winningTrades)/SUM(trades) over copyTradingLeaderStats in the window. Null when no leader traded — a win rate with no trades has no denominator.",
                                    },
                                    roi: {
                                        type: "number",
                                        nullable: true,
                                        description: "SUM(profit)/SUM(volume) over copyTradingLeaderStats in the window: return on volume traded, not on capital. Null when volume is zero.",
                                    },
                                },
                            },
                            followers: {
                                type: "object",
                                properties: {
                                    total: { type: "number" },
                                    active: { type: "number" },
                                },
                            },
                            trades: {
                                type: "object",
                                properties: {
                                    total: { type: "number" },
                                    closed: { type: "number" },
                                    profitable: { type: "number" },
                                    profit: { type: "number" },
                                    volume: { type: "number" },
                                    fees: { type: "number" },
                                    currency: { type: "string" },
                                },
                            },
                            revenue: {
                                type: "object",
                                properties: {
                                    platformFees: {
                                        type: "number",
                                        description: "COMPLETED FEE rows, priced into USD.",
                                    },
                                    leaderPayouts: {
                                        type: "number",
                                        description: "What leaders were paid out of follower profits. A cost, not platform revenue.",
                                    },
                                    currency: { type: "string" },
                                },
                            },
                            topLeaders: {
                                type: "object",
                                properties: {
                                    rankedBy: { type: "string" },
                                    limit: { type: "number" },
                                    currency: { type: "string" },
                                    leaders: { type: "array" },
                                },
                            },
                            dailyStats: {
                                type: "object",
                                properties: {
                                    days: { type: "number" },
                                    currency: { type: "string" },
                                    series: { type: "array" },
                                },
                            },
                        },
                    },
                },
            },
        },
        401: errors_1.unauthorizedResponse,
        403: errors_1.forbiddenResponse,
        500: errors_1.serverErrorResponse,
    },
};
function periodStart(period, from) {
    switch (period) {
        case "day":
            return new Date(from.getTime() - 24 * 60 * 60 * 1000);
        case "week":
            return new Date(from.getTime() - 7 * 24 * 60 * 60 * 1000);
        case "month": {
            const start = new Date(from);
            start.setMonth(start.getMonth() - 1);
            return start;
        }
        default:
            return null;
    }
}
function dayKey(value) {
    if (value instanceof Date)
        return value.toISOString().split("T")[0];
    return String(value !== null && value !== void 0 ? value : "").split("T")[0];
}
function quoteOf(symbol) {
    const raw = String(symbol !== null && symbol !== void 0 ? symbol : "").trim();
    const parts = raw.split("/");
    if (parts.length === 2 && parts[1])
        return parts[1];
    return raw || "UNKNOWN";
}
function add(byCurrency, currency, amount) {
    var _a;
    const value = Number(amount);
    if (!Number.isFinite(value) || value === 0)
        return;
    byCurrency.set(currency, ((_a = byCurrency.get(currency)) !== null && _a !== void 0 ? _a : 0) + value);
}
function priceBucket(byCurrency, rates, unpriced) {
    let total = 0;
    for (const [currency, amount] of byCurrency) {
        const rate = rates.get(currency);
        if (rate === undefined) {
            unpriced.add(currency);
            continue;
        }
        total += amount * rate;
    }
    return Number(total.toFixed(2));
}
function rate(numerator, denominator) {
    if (!Number.isFinite(denominator) || denominator === 0)
        return null;
    return Number(((numerator / denominator) * 100).toFixed(2));
}
const TOP_LEADERS_LIMIT = 10;
const DAILY_SERIES_DAYS = 30;
exports.default = async (data) => {
    var _a, _b, _c, _d, _e, _f, _g;
    const { user, query, ctx } = data;
    if (!(user === null || user === void 0 ? void 0 : user.id)) {
        throw (0, error_1.createError)({ statusCode: 401, message: "Unauthorized" });
    }
    const requested = String((query === null || query === void 0 ? void 0 : query.period) || "month");
    const period = PERIODS.includes(requested)
        ? requested
        : "month";
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Get Copy Trading Analytics");
    const now = new Date();
    const windowStart = periodStart(period, now);
    const inWindow = windowStart ? { createdAt: { [sequelize_1.Op.gte]: windowStart } } : {};
    const statsWindow = windowStart
        ? { date: { [sequelize_1.Op.gte]: dayKey(windowStart) } }
        : {};
    const dailySince = new Date(now.getTime() - DAILY_SERIES_DAYS * 24 * 60 * 60 * 1000);
    const [leaderStatusRows, followerStatusRows, tradeStatusRows, profitableTrades, tradeMoneyRows, feeRows, payoutRows, leaderPerformance, topLeaderRows, dailyRows,] = await Promise.all([
        db_1.models.copyTradingLeader.findAll({
            attributes: ["status", [(0, sequelize_1.fn)("COUNT", (0, sequelize_1.col)("id")), "count"]],
            group: ["status"],
            raw: true,
        }),
        db_1.models.copyTradingFollower.findAll({
            attributes: ["status", [(0, sequelize_1.fn)("COUNT", (0, sequelize_1.col)("id")), "count"]],
            group: ["status"],
            raw: true,
        }),
        db_1.models.copyTradingTrade.findAll({
            attributes: ["status", [(0, sequelize_1.fn)("COUNT", (0, sequelize_1.col)("id")), "count"]],
            where: inWindow,
            group: ["status"],
            raw: true,
        }),
        db_1.models.copyTradingTrade.count({
            where: { ...inWindow, profit: { [sequelize_1.Op.gt]: 0 } },
        }),
        db_1.models.copyTradingTrade.findAll({
            attributes: [
                "symbol",
                "profitCurrency",
                "feeCurrency",
                [(0, sequelize_1.fn)("SUM", (0, sequelize_1.col)("cost")), "cost"],
                [(0, sequelize_1.fn)("SUM", (0, sequelize_1.col)("profit")), "profit"],
                [(0, sequelize_1.fn)("SUM", (0, sequelize_1.col)("fee")), "fee"],
            ],
            where: inWindow,
            group: ["symbol", "profitCurrency", "feeCurrency"],
            raw: true,
        }),
        db_1.models.copyTradingTransaction.findAll({
            attributes: ["currency", [(0, sequelize_1.fn)("SUM", (0, sequelize_1.col)("amount")), "total"]],
            where: { ...inWindow, type: "FEE", status: "COMPLETED" },
            group: ["currency"],
            raw: true,
        }),
        db_1.models.copyTradingTransaction.findAll({
            attributes: [
                "currency",
                [(0, sequelize_1.fn)("SUM", (0, sequelize_1.col)("copyTradingTransaction.amount")), "total"],
            ],
            where: {
                ...inWindow,
                type: "PROFIT_SHARE",
                status: "COMPLETED",
                userId: { [sequelize_1.Op.col]: "leader.userId" },
            },
            include: [
                {
                    model: db_1.models.copyTradingLeader,
                    as: "leader",
                    attributes: [],
                    required: true,
                    paranoid: false,
                },
            ],
            group: [(0, sequelize_1.col)("copyTradingTransaction.currency")],
            raw: true,
        }),
        db_1.models.copyTradingLeaderStats.findAll({
            attributes: [
                [(0, sequelize_1.fn)("SUM", (0, sequelize_1.col)("trades")), "trades"],
                [(0, sequelize_1.fn)("SUM", (0, sequelize_1.col)("winningTrades")), "winningTrades"],
                [(0, sequelize_1.fn)("SUM", (0, sequelize_1.col)("volume")), "volume"],
                [(0, sequelize_1.fn)("SUM", (0, sequelize_1.col)("profit")), "profit"],
            ],
            where: statsWindow,
            raw: true,
        }),
        db_1.models.copyTradingLeaderStats.findAll({
            attributes: [
                [(0, sequelize_1.col)("copyTradingLeaderStats.leaderId"), "leaderId"],
                [(0, sequelize_1.fn)("SUM", (0, sequelize_1.col)("copyTradingLeaderStats.trades")), "trades"],
                [(0, sequelize_1.fn)("SUM", (0, sequelize_1.col)("copyTradingLeaderStats.winningTrades")), "winningTrades"],
                [(0, sequelize_1.fn)("SUM", (0, sequelize_1.col)("copyTradingLeaderStats.volume")), "volume"],
                [(0, sequelize_1.fn)("SUM", (0, sequelize_1.col)("copyTradingLeaderStats.profit")), "profit"],
            ],
            where: statsWindow,
            include: [
                {
                    model: db_1.models.copyTradingLeader,
                    as: "leader",
                    attributes: [],
                    required: true,
                    where: { status: "ACTIVE" },
                },
            ],
            group: [(0, sequelize_1.col)("copyTradingLeaderStats.leaderId")],
            order: [[(0, sequelize_1.fn)("SUM", (0, sequelize_1.col)("copyTradingLeaderStats.profit")), "DESC"]],
            limit: TOP_LEADERS_LIMIT,
            subQuery: false,
            raw: true,
        }),
        db_1.models.copyTradingTrade.findAll({
            attributes: [
                [(0, sequelize_1.fn)("DATE", (0, sequelize_1.col)("createdAt")), "date"],
                "symbol",
                "profitCurrency",
                [(0, sequelize_1.fn)("COUNT", (0, sequelize_1.col)("id")), "trades"],
                [(0, sequelize_1.fn)("SUM", (0, sequelize_1.col)("cost")), "cost"],
                [(0, sequelize_1.fn)("SUM", (0, sequelize_1.col)("profit")), "profit"],
            ],
            where: { createdAt: { [sequelize_1.Op.gte]: dailySince } },
            group: [(0, sequelize_1.fn)("DATE", (0, sequelize_1.col)("createdAt")), "symbol", "profitCurrency"],
            order: [[(0, sequelize_1.fn)("DATE", (0, sequelize_1.col)("createdAt")), "ASC"]],
            raw: true,
        }),
    ]);
    const countByStatus = (rows) => {
        var _a;
        const map = new Map();
        for (const row of rows) {
            map.set(String(row.status), parseInt((_a = row.count) !== null && _a !== void 0 ? _a : "0") || 0);
        }
        return map;
    };
    const leadersByStatus = countByStatus(leaderStatusRows);
    const followersByStatus = countByStatus(followerStatusRows);
    const tradesByStatus = countByStatus(tradeStatusRows);
    const sumMap = (map) => [...map.values()].reduce((sum, value) => sum + value, 0);
    const tradeProfit = new Map();
    const tradeVolume = new Map();
    const tradeFees = new Map();
    for (const row of tradeMoneyRows) {
        const quote = quoteOf(row.symbol);
        add(tradeVolume, quote, row.cost);
        add(tradeProfit, row.profitCurrency || quote, row.profit);
        add(tradeFees, row.feeCurrency || quote, row.fee);
    }
    const platformFees = new Map();
    for (const row of feeRows)
        add(platformFees, String(row.currency), row.total);
    const leaderPayouts = new Map();
    for (const row of payoutRows)
        add(leaderPayouts, String(row.currency), row.total);
    const dailyBuckets = new Map();
    for (const row of dailyRows) {
        const date = dayKey(row.date);
        let bucket = dailyBuckets.get(date);
        if (!bucket) {
            bucket = { trades: 0, volume: new Map(), profit: new Map() };
            dailyBuckets.set(date, bucket);
        }
        const quote = quoteOf(row.symbol);
        bucket.trades += parseInt((_a = row.trades) !== null && _a !== void 0 ? _a : "0") || 0;
        add(bucket.volume, quote, row.cost);
        add(bucket.profit, row.profitCurrency || quote, row.profit);
    }
    const currencies = new Set();
    for (const bucket of [
        tradeProfit,
        tradeVolume,
        tradeFees,
        platformFees,
        leaderPayouts,
    ]) {
        for (const currency of bucket.keys())
            currencies.add(currency);
    }
    for (const bucket of dailyBuckets.values()) {
        for (const currency of bucket.volume.keys())
            currencies.add(currency);
        for (const currency of bucket.profit.keys())
            currencies.add(currency);
    }
    const topLeaderIds = topLeaderRows
        .map((row) => row.leaderId)
        .filter(Boolean);
    const [rates, topLeaderDetails] = await Promise.all([
        (0, utils_1.getUsdRates)([...currencies]),
        topLeaderIds.length
            ? db_1.models.copyTradingLeader.findAll({
                where: { id: { [sequelize_1.Op.in]: topLeaderIds } },
                attributes: ["id", "displayName", "avatar", "riskLevel", "tradingStyle"],
                include: [
                    {
                        model: db_1.models.user,
                        as: "user",
                        attributes: ["id", "firstName", "lastName", "avatar"],
                    },
                ],
            })
            : Promise.resolve([]),
    ]);
    const unpriced = new Set();
    const performance = ((_b = leaderPerformance[0]) !== null && _b !== void 0 ? _b : {});
    const perfTrades = Number(performance.trades) || 0;
    const perfWins = Number(performance.winningTrades) || 0;
    const perfVolume = Number(performance.volume) || 0;
    const perfProfit = Number(performance.profit) || 0;
    const detailById = new Map(topLeaderDetails.map((leader) => [leader.id, leader]));
    const topLeaders = topLeaderRows.map((row) => {
        var _a, _b, _c, _d, _e;
        const detail = detailById.get(row.leaderId);
        const trades = Number(row.trades) || 0;
        const winningTrades = Number(row.winningTrades) || 0;
        const volume = Number(row.volume) || 0;
        const profit = Number(row.profit) || 0;
        return {
            leaderId: row.leaderId,
            displayName: (_a = detail === null || detail === void 0 ? void 0 : detail.displayName) !== null && _a !== void 0 ? _a : null,
            avatar: (_b = detail === null || detail === void 0 ? void 0 : detail.avatar) !== null && _b !== void 0 ? _b : null,
            riskLevel: (_c = detail === null || detail === void 0 ? void 0 : detail.riskLevel) !== null && _c !== void 0 ? _c : null,
            tradingStyle: (_d = detail === null || detail === void 0 ? void 0 : detail.tradingStyle) !== null && _d !== void 0 ? _d : null,
            user: (_e = detail === null || detail === void 0 ? void 0 : detail.user) !== null && _e !== void 0 ? _e : null,
            trades,
            winningTrades,
            winRate: rate(winningTrades, trades),
            roi: rate(profit, volume),
            volume: Number(volume.toFixed(2)),
            profit: Number(profit.toFixed(2)),
        };
    });
    const series = [];
    for (let offset = DAILY_SERIES_DAYS - 1; offset >= 0; offset--) {
        const date = dayKey(new Date(now.getTime() - offset * 24 * 60 * 60 * 1000));
        const bucket = dailyBuckets.get(date);
        series.push({
            date,
            trades: (_c = bucket === null || bucket === void 0 ? void 0 : bucket.trades) !== null && _c !== void 0 ? _c : 0,
            profit: bucket ? priceBucket(bucket.profit, rates, unpriced) : 0,
            volume: bucket ? priceBucket(bucket.volume, rates, unpriced) : 0,
        });
    }
    const payload = {
        period,
        generatedAt: now.toISOString(),
        leaders: {
            total: sumMap(leadersByStatus),
            active: (_d = leadersByStatus.get("ACTIVE")) !== null && _d !== void 0 ? _d : 0,
            pending: (_e = leadersByStatus.get("PENDING")) !== null && _e !== void 0 ? _e : 0,
            winRate: rate(perfWins, perfTrades),
            roi: rate(perfProfit, perfVolume),
        },
        followers: {
            total: sumMap(followersByStatus),
            active: (_f = followersByStatus.get("ACTIVE")) !== null && _f !== void 0 ? _f : 0,
        },
        trades: {
            total: sumMap(tradesByStatus),
            closed: (_g = tradesByStatus.get("CLOSED")) !== null && _g !== void 0 ? _g : 0,
            profitable: profitableTrades,
            profit: priceBucket(tradeProfit, rates, unpriced),
            volume: priceBucket(tradeVolume, rates, unpriced),
            fees: priceBucket(tradeFees, rates, unpriced),
            currency: "USD",
        },
        revenue: {
            platformFees: priceBucket(platformFees, rates, unpriced),
            leaderPayouts: priceBucket(leaderPayouts, rates, unpriced),
            currency: "USD",
        },
        topLeaders: {
            rankedBy: "profit",
            limit: TOP_LEADERS_LIMIT,
            currency: "USDT",
            leaders: topLeaders,
        },
        dailyStats: {
            days: DAILY_SERIES_DAYS,
            currency: "USD",
            series,
        },
        unpriced: [...unpriced],
    };
    ctx === null || ctx === void 0 ? void 0 : ctx.success("Get Copy Trading Analytics retrieved successfully");
    return payload;
};
