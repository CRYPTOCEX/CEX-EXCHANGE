"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getChartData = getChartData;
const sequelize_1 = require("sequelize");
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
            chart.config.status.forEach((statusMapping) => {
                aggregations.push({
                    alias: String(statusMapping.value),
                    field: field,
                    value: String(statusMapping.value),
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
function escapeValue(val) {
    if (val === null || val === undefined) {
        return "''";
    }
    const str = String(val);
    return "'" + str.replace(/'/g, "''") + "'";
}
async function fetchRowsForInterval(model, startDate, endDate, interval, aggregations, additionalWhere = {}) {
    const whereClause = {
        createdAt: { [sequelize_1.Op.between]: [startDate, endDate] },
        ...additionalWhere,
    };
    const dateFormat = interval === "hour" ? "%Y-%m-%d %H:00:00" : "%Y-%m-%d 00:00:00";
    const attributes = [
        [
            sequelize_1.Sequelize.fn("DATE_FORMAT", sequelize_1.Sequelize.col("createdAt"), dateFormat),
            "dateGroup",
        ],
        [sequelize_1.Sequelize.fn("COUNT", "*"), "total"],
    ];
    aggregations.forEach((agg) => {
        const fieldStr = String(agg.field);
        const valueStr = String(agg.value);
        const escapedValue = escapeValue(valueStr);
        const sqlLiteral = "CASE WHEN " + fieldStr + " = " + escapedValue + " THEN 1 ELSE 0 END";
        attributes.push([
            sequelize_1.Sequelize.fn("SUM", sequelize_1.Sequelize.literal(sqlLiteral)),
            agg.alias,
        ]);
    });
    const rows = await model.findAll({
        where: whereClause,
        attributes,
        group: ["dateGroup"],
        include: [],
        raw: true,
    });
    const result = rows.map((r) => {
        const dp = {
            date: new Date(r.dateGroup),
            total: Number(r.total) || 0,
        };
        aggregations.forEach((agg) => {
            dp[agg.alias] = Number(r[agg.alias]) || 0;
        });
        return dp;
    });
    return result.sort((a, b) => a.date.getTime() - b.date.getTime());
}
const formatKey = (date, interval) => {
    if (interval === "hour") {
        return (0, date_fns_1.format)(date, "yyyy-MM-dd HH:00:00");
    }
    else if (interval === "day") {
        return (0, date_fns_1.format)(date, "yyyy-MM-dd");
    }
    else {
        return date.toISOString();
    }
};
function generateTimeSeries(timeframe, startDate, endDate, interval, aggregations) {
    const series = [];
    if (timeframe === "24h") {
        const dayStart = (0, date_fns_1.startOfDay)(endDate);
        for (let i = 0; i < 24; i++) {
            const date = (0, date_fns_1.addHours)(dayStart, i);
            const dp = { date, total: 0 };
            aggregations.forEach((agg) => {
                dp[agg.alias] = 0;
            });
            series.push(dp);
        }
    }
    else if (timeframe === "7d") {
        const weekStart = (0, date_fns_1.startOfWeek)(endDate);
        for (let i = 0; i < 7; i++) {
            const date = (0, date_fns_1.addDays)(weekStart, i);
            const dp = { date, total: 0 };
            aggregations.forEach((agg) => {
                dp[agg.alias] = 0;
            });
            series.push(dp);
        }
    }
    else if (timeframe === "30d") {
        const monthStart = (0, date_fns_1.startOfMonth)(endDate);
        for (let i = 0; i < 30; i++) {
            const date = (0, date_fns_1.addDays)(monthStart, i);
            const dp = { date, total: 0 };
            aggregations.forEach((agg) => {
                dp[agg.alias] = 0;
            });
            series.push(dp);
        }
    }
    else if (timeframe === "3m") {
        const periodStart = (0, date_fns_1.startOfMonth)((0, date_fns_1.subMonths)(endDate, 2));
        let current = (0, date_fns_1.startOfWeek)(periodStart);
        const periodEnd = (0, date_fns_1.endOfMonth)(endDate);
        while (current <= periodEnd) {
            const dp = { date: current, total: 0 };
            aggregations.forEach((agg) => {
                dp[agg.alias] = 0;
            });
            series.push(dp);
            current = (0, date_fns_1.addWeeks)(current, 1);
        }
    }
    else if (timeframe === "6m") {
        const year = endDate.getFullYear();
        if (endDate.getMonth() < 6) {
            for (let m = 0; m < 6; m++) {
                const date = new Date(year, m, 1);
                const dp = { date, total: 0 };
                aggregations.forEach((agg) => {
                    dp[agg.alias] = 0;
                });
                series.push(dp);
            }
        }
        else {
            for (let m = 6; m < 12; m++) {
                const date = new Date(year, m, 1);
                const dp = { date, total: 0 };
                aggregations.forEach((agg) => {
                    dp[agg.alias] = 0;
                });
                series.push(dp);
            }
        }
    }
    else if (timeframe === "y" || timeframe === "1y") {
        const year = endDate.getFullYear();
        for (let m = 0; m < 12; m++) {
            const date = new Date(year, m, 1);
            const dp = { date, total: 0 };
            aggregations.forEach((agg) => {
                dp[agg.alias] = 0;
            });
            series.push(dp);
        }
    }
    return series;
}
function aggregateDataByPeriod(data, period) {
    if (period === "hour" || period === "day") {
        return data;
    }
    const aggregated = [];
    if (!data.length)
        return aggregated;
    let currentWeekStart = (0, date_fns_1.startOfWeek)(data[0].date);
    const lastDate = data[data.length - 1].date;
    while (currentWeekStart <= lastDate) {
        const weekEnd = (0, date_fns_1.endOfWeek)(currentWeekStart);
        const slice = data.filter((d) => d.date >= currentWeekStart && d.date <= weekEnd);
        if (slice.length) {
            const agg = { date: new Date(currentWeekStart), total: 0 };
            const keys = Object.keys(slice[0]).filter((key) => key !== "date");
            keys.forEach((key) => {
                agg[key] = slice.reduce((sum, row) => sum + (Number(row[key]) || 0), 0);
            });
            aggregated.push(agg);
        }
        currentWeekStart = (0, date_fns_1.addDays)(currentWeekStart, 7);
    }
    return aggregated;
}
async function getChartData({ model, timeframe, charts, kpis, where = {}, }) {
    const now = new Date();
    let startDate;
    let interval;
    let aggregationPeriod;
    switch (timeframe) {
        case "24h":
            startDate = (0, date_fns_1.startOfDay)(now);
            interval = "hour";
            aggregationPeriod = "hour";
            break;
        case "7d":
            startDate = (0, date_fns_1.startOfWeek)(now);
            interval = "day";
            aggregationPeriod = "day";
            break;
        case "30d":
            startDate = (0, date_fns_1.startOfMonth)(now);
            interval = "day";
            aggregationPeriod = "day";
            break;
        case "3m":
            startDate = (0, date_fns_1.startOfMonth)((0, date_fns_1.subMonths)(now, 2));
            interval = "day";
            aggregationPeriod = "week";
            break;
        case "6m":
            if (now.getMonth() < 6) {
                startDate = new Date(now.getFullYear(), 0, 1);
            }
            else {
                startDate = new Date(now.getFullYear(), 6, 1);
            }
            interval = "day";
            aggregationPeriod = "month";
            break;
        case "y":
        case "1y":
            startDate = new Date(now.getFullYear(), 0, 1);
            interval = "day";
            aggregationPeriod = "month";
            break;
        default:
            startDate = new Date(now.getFullYear(), 0, 1);
            interval = "day";
            aggregationPeriod = "month";
            break;
    }
    let endDate;
    switch (timeframe) {
        case "24h":
            endDate = (0, date_fns_1.endOfDay)(now);
            break;
        case "7d":
            endDate = (0, date_fns_1.endOfWeek)(now);
            break;
        case "30d":
            endDate = (0, date_fns_1.endOfMonth)(now);
            break;
        case "3m":
            endDate = (0, date_fns_1.endOfMonth)(now);
            break;
        case "6m":
            if (now.getMonth() < 6) {
                endDate = new Date(now.getFullYear(), 6, 0);
            }
            else {
                endDate = new Date(now.getFullYear(), 12, 0);
            }
            break;
        case "y":
        case "1y":
            endDate = new Date(now.getFullYear(), 12, 0);
            break;
        default:
            endDate = now;
            break;
    }
    const aggregations = extractAggregations(charts, kpis);
    const baseData = await fetchRowsForInterval(model, startDate, endDate, interval, aggregations, where);
    let aggregatedData = [];
    if (aggregationPeriod === "month") {
        const year = endDate.getFullYear();
        const monthlySeries = [];
        for (let m = 0; m < 12; m++) {
            const date = new Date(year, m, 1);
            const dp = { date, total: 0 };
            aggregations.forEach((agg) => {
                dp[agg.alias] = 0;
            });
            monthlySeries.push(dp);
        }
        baseData.forEach((row) => {
            const monthKey = (0, date_fns_1.format)(new Date(row.date), "yyyy-MM");
            const target = monthlySeries.find((dp) => (0, date_fns_1.format)(dp.date, "yyyy-MM") === monthKey);
            if (target) {
                target.total += Number(row.total) || 0;
                aggregations.forEach((agg) => {
                    target[agg.alias] += Number(row[agg.alias]) || 0;
                });
            }
        });
        aggregatedData = monthlySeries;
    }
    else {
        const fullSeries = generateTimeSeries(timeframe, startDate, endDate, interval, aggregations);
        const fullMap = new Map(fullSeries.map((dp) => [formatKey(dp.date, interval), dp]));
        baseData.forEach((row) => {
            const rowKey = formatKey(new Date(row.date), interval);
            if (fullMap.has(rowKey)) {
                const existing = fullMap.get(rowKey);
                existing.total = Number(row.total) || 0;
                aggregations.forEach((agg) => {
                    existing[agg.alias] = Number(row[agg.alias]) || 0;
                });
            }
        });
        aggregatedData = Array.from(fullMap.values());
    }
    const result = { kpis: [] };
    const nonZeroData = aggregatedData.filter((dp) => dp.total > 0);
    const latest = nonZeroData.length
        ? nonZeroData[nonZeroData.length - 1]
        : aggregatedData[aggregatedData.length - 1];
    kpis.forEach((kpi) => {
        if (!aggregatedData.length) {
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
        const value = Number(latest[kpi.metric] || 0);
        const prevValue = aggregatedData.length > 1
            ? Number(aggregatedData[aggregatedData.length - 2][kpi.metric] || 0)
            : value;
        let rawChange = 0;
        if (prevValue === 0) {
            rawChange = value === 0 ? 0 : 100;
        }
        else {
            rawChange = ((value - prevValue) / prevValue) * 100;
        }
        let change = Math.round(rawChange * 100) / 100;
        if (!Number.isFinite(change)) {
            if (rawChange === Infinity)
                change = 100;
            else if (rawChange === -Infinity)
                change = -100;
            else
                change = 0;
        }
        const trend = aggregatedData.map((row) => ({
            date: row.date.toISOString(),
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
                    const total = aggregatedData.reduce((sum, dp) => {
                        return sum + (Number(dp[String(st.value)]) || 0);
                    }, 0);
                    return {
                        id: String(st.value),
                        name: st.label,
                        value: total,
                        color: st.color,
                    };
                })) || [];
        }
        else {
            result[chart.id] = aggregatedData.map((row) => {
                const item = { date: row.date.toISOString() };
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
