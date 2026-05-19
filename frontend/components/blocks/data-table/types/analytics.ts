export interface KpiItem {
  id: string;
  title: string;
  metric: string;
  model: string;
  aggregation?: {
    field: string;
    value?: string | boolean | number;
    operation?: "=" | ">" | "<" | ">=" | "<=" | "!=" | "count" | "sum" | "avg" | "min" | "max" | string;
    status?: string;
    aggregationType?: "count" | "sum" | "avg" | "min" | "max" | string;
    type?: string;
    filter?: Record<string, any>;
  };
  icon?: string;
  format?: "currency" | "number" | "percent" | string;
}

export interface StatusConfig {
  value: string | boolean | number;
  label: string;
  color: string;
  icon?: string;
}

export interface ChartItem {
  id: string;
  title: string;
  type: "line" | "pie" | "bar" | "stackedArea" | "stackedBar" | "area";
  model: string;
  metrics: string[];
  timeframes?: string[];
  labels?: Record<string, string>;
  config?: {
    field?: string;
    status?: StatusConfig[];
    groupBy?: string;
    value?: string | boolean | number;
  };
}

/**
 * Responsive layout configuration for different screen sizes
 * Tailwind breakpoints: sm: 640px, md: 768px, lg: 1024px, xl: 1280px, 2xl: 1536px
 */
export interface ResponsiveLayout {
  /** Mobile devices (< 640px) - Default: 1 column */
  mobile?: {
    cols?: number; // Grid columns (default: 1)
    rows?: number; // Grid rows (auto if not specified)
    span?: number; // How many columns this item spans (default: 1)
    order?: number; // Order in grid (default: auto)
    hidden?: boolean; // Hide on mobile
  };
  /** Tablets (>= 640px) - Default: inherits from mobile or 2 columns */
  tablet?: {
    cols?: number; // Grid columns (default: 2)
    rows?: number; // Grid rows (auto if not specified)
    span?: number; // How many columns this item spans
    order?: number; // Order in grid
    hidden?: boolean; // Hide on tablet
  };
  /** Desktops (>= 1024px) - Default: inherits from tablet or full layout */
  desktop?: {
    cols?: number; // Grid columns (default: auto based on content)
    rows?: number; // Grid rows (auto if not specified)
    span?: number; // How many columns this item spans
    order?: number; // Order in grid
    hidden?: boolean; // Hide on desktop
  };
}

export interface AnalyticsGroup {
  type: "kpi" | "chart";
  /** Legacy layout - still supported for backward compatibility */
  layout?: {
    cols: number;
    rows: number;
  };
  /** New responsive layout system */
  responsive?: ResponsiveLayout;
  items: (KpiItem | ChartItem)[];
}

export type AnalyticsConfig = (AnalyticsGroup | AnalyticsGroup[])[];
