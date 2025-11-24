export interface KpiItem {
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

export interface StatusConfig {
  value: string;
  label: string;
  color: string;
  icon?: string;
}

export interface ChartItem {
  id: string;
  title: string;
  type: "line" | "pie" | "bar" | "stackedArea";
  model: string;
  metrics: string[];
  timeframes?: string[];
  labels?: Record<string, string>;
  config?: {
    field?: string;
    status?: StatusConfig[];
  };
}

export interface AnalyticsGroup {
  type: "kpi" | "chart";
  layout?: {
    cols: number;
    rows: number;
  };
  items: (KpiItem | ChartItem)[];
}

export type AnalyticsConfig = (AnalyticsGroup | AnalyticsGroup[])[];