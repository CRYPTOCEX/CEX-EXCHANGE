import { Model, ModelStatic, Op, Sequelize } from "sequelize";
import {
  subDays,
  subMonths,
  startOfDay,
  endOfDay,
  startOfWeek,
  endOfWeek,
  addDays,
  addHours,
  addWeeks,
  startOfMonth,
  endOfMonth,
  format,
} from "date-fns";

/**
 * ---------------------------
 * Helper Functions
 * ---------------------------
 */

/**
 * Extract aggregation instructions from both KPIs and chart configs.
 */
function extractAggregations(
  charts: ChartConfig[],
  kpis: KpiConfig[]
): AggregationInstruction[] {
  const aggregations: AggregationInstruction[] = [];

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
    if (
      chart.type === "pie" &&
      chart.config &&
      chart.config.field &&
      chart.config.status
    ) {
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

  const unique = new Map<string, AggregationInstruction>();
  aggregations.forEach((agg) => {
    const key = `${agg.alias}:${agg.field}:${agg.value}`;
    unique.set(key, agg);
  });
  return Array.from(unique.values());
}

/**
 * Escape a value for SQL literal.
 */
function escapeValue(val: any): string {
  if (val === null || val === undefined) {
    return "''";
  }
  const str = String(val);
  return "'" + str.replace(/'/g, "''") + "'";
}

/**
 * Query the database for data points based on the date range and dynamic aggregation instructions.
 */
async function fetchRowsForInterval(
  model: ModelStatic<Model>,
  startDate: Date,
  endDate: Date,
  interval: "hour" | "day",
  aggregations: AggregationInstruction[],
  additionalWhere: Record<string, any> = {}
): Promise<DataPoint[]> {
  const whereClause = {
    createdAt: { [Op.between]: [startDate, endDate] },
    ...additionalWhere,
  };

  const dateFormat =
    interval === "hour" ? "%Y-%m-%d %H:00:00" : "%Y-%m-%d 00:00:00";

  const attributes: any[] = [
    [
      Sequelize.fn("DATE_FORMAT", Sequelize.col("createdAt"), dateFormat),
      "dateGroup",
    ],
    [Sequelize.fn("COUNT", "*"), "total"],
  ];

  aggregations.forEach((agg) => {
    const fieldStr = String(agg.field);
    const valueStr = String(agg.value);
    const escapedValue = escapeValue(valueStr);
    const sqlLiteral =
      "CASE WHEN " + fieldStr + " = " + escapedValue + " THEN 1 ELSE 0 END";
    attributes.push([
      Sequelize.fn("SUM", Sequelize.literal(sqlLiteral)),
      agg.alias,
    ]);
  });

  const rows = await model.findAll({
    where: whereClause,
    attributes,
    group: ["dateGroup"],
    raw: true,
  });

  const result: DataPoint[] = rows.map((r: any) => {
    const dp: DataPoint = {
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

/**
 * Helper to format a Date into a matching key.
 */
const formatKey = (date: Date, interval: "hour" | "day"): string => {
  if (interval === "hour") {
    return format(date, "yyyy-MM-dd HH:00:00");
  } else if (interval === "day") {
    return format(date, "yyyy-MM-dd");
  } else {
    return date.toISOString();
  }
};

/**
 * Generates a full time series with fixed intervals based on the timeframe.
 */
function generateTimeSeries(
  timeframe: string,
  startDate: Date,
  endDate: Date,
  interval: "hour" | "day",
  aggregations: AggregationInstruction[]
): DataPoint[] {
  const series: DataPoint[] = [];
  if (timeframe === "24h") {
    const dayStart = startOfDay(endDate);
    for (let i = 0; i < 24; i++) {
      const date = addHours(dayStart, i);
      const dp: DataPoint = { date, total: 0 };
      aggregations.forEach((agg) => {
        dp[agg.alias] = 0;
      });
      series.push(dp);
    }
  } else if (timeframe === "7d") {
    const weekStart = startOfWeek(endDate);
    for (let i = 0; i < 7; i++) {
      const date = addDays(weekStart, i);
      const dp: DataPoint = { date, total: 0 };
      aggregations.forEach((agg) => {
        dp[agg.alias] = 0;
      });
      series.push(dp);
    }
  } else if (timeframe === "30d") {
    const monthStart = startOfMonth(endDate);
    for (let i = 0; i < 30; i++) {
      const date = addDays(monthStart, i);
      const dp: DataPoint = { date, total: 0 };
      aggregations.forEach((agg) => {
        dp[agg.alias] = 0;
      });
      series.push(dp);
    }
  } else if (timeframe === "3m") {
    const periodStart = startOfMonth(subMonths(endDate, 2));
    let current = startOfWeek(periodStart);
    const periodEnd = endOfMonth(endDate);
    while (current <= periodEnd) {
      const dp: DataPoint = { date: current, total: 0 };
      aggregations.forEach((agg) => {
        dp[agg.alias] = 0;
      });
      series.push(dp);
      current = addWeeks(current, 1);
    }
  } else if (timeframe === "6m") {
    const year = endDate.getFullYear();
    if (endDate.getMonth() < 6) {
      for (let m = 0; m < 6; m++) {
        const date = new Date(year, m, 1);
        const dp: DataPoint = { date, total: 0 };
        aggregations.forEach((agg) => {
          dp[agg.alias] = 0;
        });
        series.push(dp);
      }
    } else {
      for (let m = 6; m < 12; m++) {
        const date = new Date(year, m, 1);
        const dp: DataPoint = { date, total: 0 };
        aggregations.forEach((agg) => {
          dp[agg.alias] = 0;
        });
        series.push(dp);
      }
    }
  } else if (timeframe === "y" || timeframe === "1y") {
    const year = endDate.getFullYear();
    for (let m = 0; m < 12; m++) {
      const date = new Date(year, m, 1);
      const dp: DataPoint = { date, total: 0 };
      aggregations.forEach((agg) => {
        dp[agg.alias] = 0;
      });
      series.push(dp);
    }
  }
  return series;
}

/**
 * Aggregates data by week (if needed).
 */
function aggregateDataByPeriod(
  data: DataPoint[],
  period: "hour" | "day" | "week"
): DataPoint[] {
  if (period === "hour" || period === "day") {
    return data;
  }
  const aggregated: DataPoint[] = [];
  if (!data.length) return aggregated;

  let currentWeekStart = startOfWeek(data[0].date);
  const lastDate = data[data.length - 1].date;

  while (currentWeekStart <= lastDate) {
    const weekEnd = endOfWeek(currentWeekStart);
    const slice = data.filter(
      (d) => d.date >= currentWeekStart && d.date <= weekEnd
    );
    if (slice.length) {
      const agg: any = { date: new Date(currentWeekStart), total: 0 };
      const keys = Object.keys(slice[0]).filter((key) => key !== "date");
      keys.forEach((key) => {
        agg[key] = slice.reduce((sum, row) => sum + (Number(row[key]) || 0), 0);
      });
      aggregated.push(agg);
    }
    currentWeekStart = addDays(currentWeekStart, 7);
  }
  return aggregated;
}

/**
 * ---------------------------
 * Main Function to Get Analytics/Chart Data
 * ---------------------------
 */
export async function getChartData({
  model,
  timeframe,
  charts,
  kpis,
  where = {},
}: GetChartDataParams): Promise<ChartData> {
  const now = new Date();
  let startDate: Date;
  let interval: "hour" | "day";
  let aggregationPeriod: "hour" | "day" | "week" | "month";

  switch (timeframe) {
    case "24h":
      startDate = startOfDay(now);
      interval = "hour";
      aggregationPeriod = "hour";
      break;
    case "7d":
      startDate = startOfWeek(now);
      interval = "day";
      aggregationPeriod = "day";
      break;
    case "30d":
      startDate = startOfMonth(now);
      interval = "day";
      aggregationPeriod = "day";
      break;
    case "3m":
      startDate = startOfMonth(subMonths(now, 2));
      interval = "day";
      aggregationPeriod = "week";
      break;
    case "6m":
      if (now.getMonth() < 6) {
        startDate = new Date(now.getFullYear(), 0, 1);
      } else {
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

  let endDate: Date;
  switch (timeframe) {
    case "24h":
      endDate = endOfDay(now);
      break;
    case "7d":
      endDate = endOfWeek(now);
      break;
    case "30d":
      endDate = endOfMonth(now);
      break;
    case "3m":
      endDate = endOfMonth(now);
      break;
    case "6m":
      if (now.getMonth() < 6) {
        endDate = new Date(now.getFullYear(), 6, 0);
      } else {
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

  const baseData = await fetchRowsForInterval(
    model,
    startDate,
    endDate,
    interval,
    aggregations,
    where
  );

  let aggregatedData: DataPoint[] = [];
  if (aggregationPeriod === "month") {
    const year = endDate.getFullYear();
    const monthlySeries: DataPoint[] = [];
    for (let m = 0; m < 12; m++) {
      const date = new Date(year, m, 1);
      const dp: DataPoint = { date, total: 0 };
      aggregations.forEach((agg) => {
        dp[agg.alias] = 0;
      });
      monthlySeries.push(dp);
    }
    baseData.forEach((row) => {
      const monthKey = format(new Date(row.date), "yyyy-MM");
      const target = monthlySeries.find(
        (dp) => format(dp.date, "yyyy-MM") === monthKey
      );
      if (target) {
        target.total += Number(row.total) || 0;
        aggregations.forEach((agg) => {
          target[agg.alias] += Number(row[agg.alias]) || 0;
        });
      }
    });
    aggregatedData = monthlySeries;
  } else {
    const fullSeries = generateTimeSeries(
      timeframe,
      startDate,
      endDate,
      interval,
      aggregations
    );
    const fullMap = new Map(
      fullSeries.map((dp) => [formatKey(dp.date, interval), dp])
    );
    baseData.forEach((row) => {
      const rowKey = formatKey(new Date(row.date), interval);
      if (fullMap.has(rowKey)) {
        const existing = fullMap.get(rowKey)!;
        existing.total = Number(row.total) || 0;
        aggregations.forEach((agg) => {
          existing[agg.alias] = Number(row[agg.alias]) || 0;
        });
      }
    });
    aggregatedData = Array.from(fullMap.values());
  }

  const result: ChartData = { kpis: [] };

  // For KPI calculation, choose the latest data point with non-zero total if available.
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
    const prevValue =
      aggregatedData.length > 1
        ? Number(aggregatedData[aggregatedData.length - 2][kpi.metric] || 0)
        : value;
    let rawChange = 0;
    if (prevValue === 0) {
      rawChange = value === 0 ? 0 : 100;
    } else {
      rawChange = ((value - prevValue) / prevValue) * 100;
    }
    let change = Math.round(rawChange * 100) / 100;
    if (!Number.isFinite(change)) {
      if (rawChange === Infinity) change = 100;
      else if (rawChange === -Infinity) change = -100;
      else change = 0;
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
    if (chart.type === "pie") {
      // Sum values for each status over the entire period.
      result[chart.id] =
        chart.config?.status?.map((st) => {
          const total = aggregatedData.reduce((sum, dp) => {
            return sum + (Number(dp[String(st.value)]) || 0);
          }, 0);
          return {
            id: String(st.value),
            name: st.label,
            value: total,
            color: st.color,
          };
        }) || [];
    } else {
      result[chart.id] = aggregatedData.map((row) => {
        const item: Record<string, any> = { date: row.date.toISOString() };
        chart.metrics.forEach((metric) => {
          item[metric] = row[metric] ?? 0;
        });
        return item;
      });
    }
  });

  return result;
}
