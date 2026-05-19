"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getChartData = getChartData;
const client_1 = __importDefault(require("./client"));
const date_fns_1 = require("date-fns");
function extractAggregations(charts, kpis) {
    const aggregations = [];
    kpis.forEach((kpi) => {
        if (kpi.aggregation && kpi.aggregation.field && kpi.aggregation.value) {
            aggregations.push({
                alias: kpi.metric,
                field: String(kpi.aggregation.field),
                value: String(kpi.aggregation.value),
            });
        }
    });
    charts.forEach((chart) => {
        if (chart.type === "pie" &&
            chart.config &&
            chart.config.field &&
            chart.config.status) {
            const field = String(chart.config.field);
            chart.config.status.forEach((st) => {
                aggregations.push({
                    alias: String(st.value),
                    field: field,
                    value: String(st.value),
                });
            });
        }
    });
    const unique = new Map();
    aggregations.forEach((agg) => {
        const key = `${agg.alias}:${agg.field}:${agg.value}`;
        unique.set(key, agg);
    });
    return Array.from(unique.values());
}
async function fetchRowsForInterval(model, keyspace, startDate, endDate, additionalWhere = {}) {
    const fullModelName = keyspace ? `${keyspace}.${model}` : model;
    let cql = `SELECT * FROM ${fullModelName} WHERE "createdAt" >= ? AND "createdAt" <= ?`;
    const queryParams = [startDate, endDate];
    for (const [key, value] of Object.entries(additionalWhere)) {
        cql += ` AND "${key}" = ?`;
        queryParams.push(value);
    }
    cql += " ALLOW FILTERING";
    const result = await client_1.default.execute(cql, queryParams, { prepare: true });
    return result.rows.map((row) => {
        const dp = {
            createdAt: new Date(row.createdAt),
            total: row.total !== undefined ? Number(row.total) : 1,
        };
        Object.keys(row).forEach((key) => {
            if (key !== "createdAt" && key !== "total") {
                dp[key] = row[key];
            }
        });
        return dp;
    });
}
function aggregateDataByPeriod(data, period, aggregations) {
    if (period === "hour" || period === "day")
        return data;
    const aggregated = [];
    if (!data.length)
        return aggregated;
    let currentWeekStart = (0, date_fns_1.startOfWeek)(data[0].createdAt);
    const lastDate = data[data.length - 1].createdAt;
    while (currentWeekStart <= lastDate) {
        const weekEnd = (0, date_fns_1.endOfWeek)(currentWeekStart);
        const slice = data.filter((d) => d.createdAt >= currentWeekStart && d.createdAt <= weekEnd);
        if (slice.length) {
            const agg = { createdAt: currentWeekStart, total: slice.length };
            aggregations.forEach((inst) => {
                agg[inst.alias] = slice.filter((row) => {
                    const rowValue = String(row[inst.field]).toLowerCase();
                    const expected = inst.value.toLowerCase();
                    if (expected === "cancelled") {
                        return rowValue === "cancelled" || rowValue === "canceled";
                    }
                    return rowValue === expected;
                }).length;
            });
            aggregated.push(agg);
        }
        currentWeekStart = (0, date_fns_1.addDays)(currentWeekStart, 7);
    }
    return aggregated;
}
function generateCompleteTimeline(startDate, endDate, period, aggregatedData, aggregations) {
    let timePoints;
    if (period === "hour") {
        timePoints = (0, date_fns_1.eachHourOfInterval)({ start: startDate, end: endDate });
    }
    else if (period === "day") {
        timePoints = (0, date_fns_1.eachDayOfInterval)({ start: startDate, end: endDate });
    }
    else {
        timePoints = (0, date_fns_1.eachWeekOfInterval)({ start: startDate, end: endDate });
    }
    const dataMap = new Map();
    aggregatedData.forEach((dp) => {
        let key;
        if (period === "week") {
            key = (0, date_fns_1.startOfWeek)(dp.createdAt).getTime();
        }
        else if (period === "hour") {
            key = new Date(dp.createdAt.getFullYear(), dp.createdAt.getMonth(), dp.createdAt.getDate(), dp.createdAt.getHours()).getTime();
        }
        else {
            key = new Date(dp.createdAt.getFullYear(), dp.createdAt.getMonth(), dp.createdAt.getDate()).getTime();
        }
        const existing = dataMap.get(key);
        if (existing) {
            existing.total += dp.total;
            aggregations.forEach((agg) => {
                existing[agg.alias] = (existing[agg.alias] || 0) + (dp[agg.alias] || 0);
            });
        }
        else {
            dataMap.set(key, { ...dp, createdAt: new Date(key) });
        }
    });
    return timePoints.map((date) => {
        const timestamp = date.getTime();
        const existingData = dataMap.get(timestamp);
        if (existingData) {
            return existingData;
        }
        const zeroPoint = {
            createdAt: date,
            total: 0,
        };
        aggregations.forEach((agg) => {
            zeroPoint[agg.alias] = 0;
        });
        return zeroPoint;
    });
}
async function getChartData({ model, keyspace, timeframe, charts, kpis, where = {}, }) {
    const fullModelName = keyspace ? `${keyspace}.${model}` : model;
    let effectiveNow = new Date();
    try {
        const maxQuery = `SELECT max("createdAt") as maxCreatedAt FROM ${fullModelName}`;
        const maxResult = await client_1.default.execute(maxQuery, [], { prepare: true });
        if (maxResult.rows.length && maxResult.rows[0].maxCreatedAt) {
            effectiveNow = new Date(maxResult.rows[0].maxCreatedAt);
        }
    }
    catch (error) {
        console.error("Failed to fetch max createdAt, using current date", error);
    }
    let startDate;
    let interval;
    let aggregationPeriod;
    switch (timeframe) {
        case "24h":
            startDate = (0, date_fns_1.subDays)(effectiveNow, 1);
            interval = "hour";
            aggregationPeriod = "hour";
            break;
        case "7d":
            startDate = (0, date_fns_1.subDays)(effectiveNow, 7);
            interval = "day";
            aggregationPeriod = "day";
            break;
        case "30d":
            startDate = (0, date_fns_1.subDays)(effectiveNow, 30);
            interval = "day";
            aggregationPeriod = "day";
            break;
        case "3m":
            startDate = (0, date_fns_1.subMonths)(effectiveNow, 3);
            interval = "day";
            aggregationPeriod = "week";
            break;
        case "6m":
            startDate = (0, date_fns_1.subMonths)(effectiveNow, 6);
            interval = "day";
            aggregationPeriod = "week";
            break;
        case "y":
        default:
            startDate = (0, date_fns_1.subMonths)(effectiveNow, 12);
            interval = "day";
            aggregationPeriod = "week";
            break;
    }
    const aggregations = extractAggregations(charts, kpis);
    const rows = await fetchRowsForInterval(model, keyspace || "", startDate, effectiveNow, where);
    rows.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
    const aggregatedData = aggregateDataByPeriod(rows, aggregationPeriod, aggregations);
    const completeTimeline = generateCompleteTimeline(startDate, effectiveNow, aggregationPeriod, aggregatedData, aggregations);
    const result = { kpis: [] };
    kpis.forEach((kpi) => {
        if (!completeTimeline.length) {
            result.kpis.push({
                id: kpi.id,
                title: kpi.title,
                value: 0,
                change: 0,
                trend: [],
                icon: kpi.icon,
            });
            return;
        }
        const value = completeTimeline.reduce((sum, row) => {
            return sum + Number(row[kpi.metric] || 0);
        }, 0);
        const midpoint = Math.floor(completeTimeline.length / 2);
        const firstHalf = completeTimeline.slice(0, midpoint);
        const secondHalf = completeTimeline.slice(midpoint);
        const prevValue = firstHalf.reduce((sum, row) => {
            return sum + Number(row[kpi.metric] || 0);
        }, 0);
        const currentValue = secondHalf.reduce((sum, row) => {
            return sum + Number(row[kpi.metric] || 0);
        }, 0);
        let rawChange = 0;
        if (prevValue === 0) {
            rawChange = currentValue === 0 ? 0 : 100;
        }
        else {
            rawChange = ((currentValue - prevValue) / prevValue) * 100;
        }
        const change = Math.round(rawChange * 100) / 100;
        const trend = completeTimeline.map((row) => ({
            date: row.createdAt.toISOString(),
            value: Number(row[kpi.metric] || 0),
        }));
        result.kpis.push({
            id: kpi.id,
            title: kpi.title,
            value,
            change,
            trend,
            icon: kpi.icon,
        });
    });
    charts.forEach((chart) => {
        var _a, _b;
        if (chart.type === "pie") {
            result[chart.id] =
                ((_b = (_a = chart.config) === null || _a === void 0 ? void 0 : _a.status) === null || _b === void 0 ? void 0 : _b.map((st) => {
                    const totalValue = completeTimeline.reduce((sum, row) => {
                        return sum + (Number(row[String(st.value)]) || 0);
                    }, 0);
                    return {
                        id: String(st.value),
                        name: st.label,
                        value: totalValue,
                        color: st.color,
                    };
                })) || [];
        }
        else {
            result[chart.id] = completeTimeline.map((row) => {
                const item = { date: row.createdAt.toISOString() };
                chart.metrics.forEach((metric) => {
                    var _a;
                    item[metric] = (_a = row[metric]) !== null && _a !== void 0 ? _a : 0;
                });
                return item;
            });
        }
    });
    return result;
}
