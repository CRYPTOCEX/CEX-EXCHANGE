import client from "./client";
import { subDays, subMonths, startOfWeek, endOfWeek, addDays } from "date-fns";
import { types } from "cassandra-driver";

// ----- Type Definitions -----
interface DataPoint {
  createdAt: Date;
  total: number;
  [key: string]: any;
}

interface AggregationInstruction {
  alias: string;
  field: string;
  value: string;
}

interface KpiConfig {
  id: string;
  title: string;
  metric: string;
  model: string;
  aggregation?: {
    field: string;
    value: string;
  };
  icon?: string;
}

interface ChartStatus {
  value: string;
  label: string;
  color: string;
  icon: string;
}

interface ChartConfig {
  id: string;
  title: string;
  type: "line" | "bar" | "pie" | "stackedBar" | "stackedArea";
  model: string;
  metrics: string[];
  timeframes?: string[];
  labels?: Record<string, string>;
  config?: {
    field?: string;
    status?: ChartStatus[];
  };
}

interface ChartData {
  kpis: any[];
  [chartId: string]: any;
}

interface GetChartDataParams {
  model: string; // model name in Scylla
  keyspace?: string;
  timeframe: string;
  charts: ChartConfig[];
  kpis: KpiConfig[];
  where?: Record<string, any>;
}

// ----- Helper Functions -----

/**
 * Extract aggregation instructions from KPIs and charts.
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
      chart.config.status.forEach((st) => {
        aggregations.push({
          alias: String(st.value),
          field: field,
          value: String(st.value),
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
 * Fetch rows from Scylla for the given time interval.
 */
async function fetchRowsForInterval(
  model: string,
  keyspace: string,
  startDate: Date,
  endDate: Date,
  additionalWhere: Record<string, any> = {}
): Promise<DataPoint[]> {
  const fullModelName = keyspace ? `${keyspace}.${model}` : model;
  // Start with the base createdAt filter
  let cql = `SELECT * FROM ${fullModelName} WHERE "createdAt" >= ? AND "createdAt" <= ?`;
  const queryParams: any[] = [startDate, endDate];

  // Append additional where conditions based on the additionalWhere object
  for (const [key, value] of Object.entries(additionalWhere)) {
    cql += ` AND "${key}" = ?`;
    queryParams.push(value);
  }
  cql += " ALLOW FILTERING";

  const result = await client.execute(cql, queryParams, { prepare: true });
  return result.rows.map((row: any) => {
    const dp: DataPoint = {
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

/**
 * Aggregate data by period.
 * For "hour" or "day", returns data unchanged.
 * For "week", groups rows by week and, for each aggregation instruction,
 * counts the number of rows where the row's [field] equals the instruction's value.
 */
function aggregateDataByPeriod(
  data: DataPoint[],
  period: "hour" | "day" | "week",
  aggregations: AggregationInstruction[]
): DataPoint[] {
  if (period === "hour" || period === "day") return data;
  const aggregated: DataPoint[] = [];
  if (!data.length) return aggregated;
  let currentWeekStart = startOfWeek(data[0].createdAt);
  const lastDate = data[data.length - 1].createdAt;
  while (currentWeekStart <= lastDate) {
    const weekEnd = endOfWeek(currentWeekStart);
    const slice = data.filter(
      (d) => d.createdAt >= currentWeekStart && d.createdAt <= weekEnd
    );
    if (slice.length) {
      const agg: any = { createdAt: currentWeekStart, total: slice.length };
      aggregations.forEach((inst) => {
        agg[inst.alias] = slice.filter((row) => {
          const rowValue = String(row[inst.field]).toLowerCase();
          const expected = inst.value.toLowerCase();
          // Treat "cancelled" and "canceled" as equivalent.
          if (expected === "cancelled") {
            return rowValue === "cancelled" || rowValue === "canceled";
          }
          return rowValue === expected;
        }).length;
      });
      aggregated.push(agg);
    }
    currentWeekStart = addDays(currentWeekStart, 7);
  }
  return aggregated;
}

/**
 * Main function to get chart data for Scylla analytics.
 */
export async function getChartData({
  model,
  keyspace,
  timeframe,
  charts,
  kpis,
  where = {},
}: GetChartDataParams): Promise<ChartData> {
  const fullModelName = keyspace ? `${keyspace}.${model}` : model;

  let effectiveNow = new Date();
  try {
    const maxQuery = `SELECT max("createdAt") as maxCreatedAt FROM ${fullModelName}`;
    const maxResult = await client.execute(maxQuery, [], { prepare: true });
    if (maxResult.rows.length && maxResult.rows[0].maxCreatedAt) {
      effectiveNow = new Date(maxResult.rows[0].maxCreatedAt);
    }
  } catch (error) {
    console.error("Failed to fetch max createdAt, using current date", error);
  }

  let startDate: Date;
  let interval: "hour" | "day";
  let aggregationPeriod: "hour" | "day" | "week";

  switch (timeframe) {
    case "24h":
      startDate = subDays(effectiveNow, 1);
      interval = "hour";
      aggregationPeriod = "hour";
      break;
    case "7d":
      startDate = subDays(effectiveNow, 7);
      interval = "day";
      aggregationPeriod = "day";
      break;
    case "30d":
      startDate = subDays(effectiveNow, 30);
      interval = "day";
      aggregationPeriod = "day";
      break;
    case "3m":
      startDate = subMonths(effectiveNow, 3);
      interval = "day";
      aggregationPeriod = "week";
      break;
    case "6m":
      startDate = subMonths(effectiveNow, 6);
      interval = "day";
      aggregationPeriod = "week";
      break;
    case "y":
    default:
      startDate = subMonths(effectiveNow, 12);
      interval = "day";
      aggregationPeriod = "week";
      break;
  }

  // Get the aggregation instructions from the charts and kpis.
  const aggregations = extractAggregations(charts, kpis);

  // Fetch rows from Scylla using the new startDate and effectiveNow.
  const rows = await fetchRowsForInterval(
    model,
    keyspace || "",
    startDate,
    effectiveNow,
    where
  );
  rows.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

  const aggregatedData = aggregateDataByPeriod(
    rows,
    aggregationPeriod,
    aggregations
  );

  const result: ChartData = { kpis: [] };

  // Build KPI data.
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
    const latest = aggregatedData[aggregatedData.length - 1];
    const previous = aggregatedData[aggregatedData.length - 2] || latest;
    const value = Number(latest[kpi.metric] || 0);
    const prevValue = Number(previous[kpi.metric] || 0);
    let rawChange = 0;
    if (prevValue === 0) {
      rawChange = value === 0 ? 0 : 100;
    } else {
      rawChange = ((value - prevValue) / prevValue) * 100;
    }
    const change = Math.round(rawChange * 100) / 100;
    const trend = aggregatedData.map((row) => ({
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

  // Build chart data.
  charts.forEach((chart) => {
    if (chart.type === "pie") {
      const latest = aggregatedData[aggregatedData.length - 1] || {};
      result[chart.id] =
        chart.config?.status?.map((st) => ({
          id: String(st.value),
          name: st.label,
          value: latest[String(st.value)] ?? 0,
          color: st.color,
        })) || [];
    } else {
      result[chart.id] = aggregatedData.map((row) => {
        const item: Record<string, any> = { date: row.createdAt.toISOString() };
        chart.metrics.forEach((metric) => {
          item[metric] = row[metric] ?? 0;
        });
        return item;
      });
    }
  });

  return result;
}