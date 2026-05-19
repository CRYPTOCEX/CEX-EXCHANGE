// Configuration types for KPIs and charts
interface KpiConfig {
  id: string;
  title: string;
  metric: string;
  model: string;
  // Optional dynamic aggregation instruction:
  aggregation?: {
    field: string; // The DB column to check (e.g., "type")
    value: string; // The value to count (e.g., "plugin")
  };
  icon?: string;
}

interface ChartConfig {
  id: string;
  title: string;
  type: "line" | "bar" | "pie" | "stackedBar" | "stackedArea";
  model: string;
  metrics: string[];
  timeframes?: string[];
  labels?: Record<string, string>;
  // For charts (like pie charts) that need dynamic grouping:
  config?: {
    field?: string; // The DB column to check (e.g., "type")
    status?: Array<{
      value: string; // e.g., "plugin"
      label: string;
      color: string;
      icon: string;
    }>;
  };
}

// Analytics JSON can be an array of items or arrays of items.
type AnalyticsConfig = (AnalyticsItem | AnalyticsItem[])[];
interface AnalyticsItem {
  type: "kpi" | "chart";
  layout?: {
    cols?: number;
    rows?: number;
  };
  items: (KpiConfig | ChartConfig)[];
}

// Instruction on how to aggregate a field dynamically
interface AggregationInstruction {
  alias: string; // key under which the aggregated value is stored
  field: string; // DB column name (e.g., "type")
  value: string; // value to compare against
}

// A data point returned from the database query
interface DataPoint {
  date: Date;
  total: number;
  [key: string]: any; // other dynamic aggregation keys (like "plugin", "user", etc.)
}

// Final chart data structure returned to the frontend
interface ChartData {
  kpis: any[];
  [key: string]: any;
}

// Parameters for building analytics data
interface GetChartDataParams {
  model: ModelStatic<Model>;
  timeframe: string; // e.g., "24h", "7d", "30d", "3m", "6m", "y"
  charts: ChartConfig[];
  kpis: KpiConfig[];
  where?: Record<string, any>;
}

/**
 * ---------------------------
 * Example Usage (for testing)
 * ---------------------------
 *
 * // Assume you have a Sequelize model (e.g., apiKey) already defined.
 * import apiKey from "./models/apiKey";
 *
 * // Define your KPIs and charts (this could come from your analytics JSON)
 * const kpis: KpiConfig[] = [
 *   {
 *     id: "total_api_keys",
 *     title: "Total API Keys",
 *     metric: "total",
 *     model: "apiKey",
 *     icon: "Key",
 *   },
 *   {
 *     id: "plugin_api_keys",
 *     title: "Plugin Keys",
 *     metric: "plugin",
 *     model: "apiKey",
 *     aggregation: { field: "type", value: "plugin" },
 *     icon: "Layers",
 *   },
 * ];
 *
 * const charts: ChartConfig[] = [
 *   {
 *     id: "apiKeyTypeDistribution",
 *     title: "API Key Type Distribution",
 *     type: "pie",
 *     model: "apiKey",
 *     metrics: ["plugin"],
 *     config: {
 *       field: "type",
 *       status: [
 *         {
 *           value: "plugin",
 *           label: "Plugin Keys",
 *           color: "info",
 *           icon: "mdi:layers",
 *         },
 *         {
 *           value: "user",
 *           label: "User Keys",
 *           color: "primary",
 *           icon: "mdi:user",
 *         },
 *       ],
 *     },
 *   },
 * ];
 *
 * // Call getChartData:
 * (async () => {
 *   try {
 *     const data = await getChartData({
 *       model: apiKey,
 *       timeframe: "7d",
 *       charts,
 *       kpis,
 *     });
 *     console.log("Analytics Data:", data);
 *   } catch (error) {
 *     console.error("Error fetching analytics data:", error);
 *   }
 * })();
 */
