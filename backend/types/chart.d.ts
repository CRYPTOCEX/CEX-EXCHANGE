// Configuration types for KPIs and charts.
// ============================================================================
// These mirror `frontend/components/blocks/data-table/types/analytics.ts`. The
// two files MUST stay in sync: the frontend flattens every KPI and chart on a
// page into one POST body and the backend reads it back with these names.
//
// Anything declared here and not read by `backend/src/utils/chart.ts` is dead
// config surface — the previous version of this file carried four such fields
// for long enough that 145 KPI cards were built on them and rendered 0.

/** The aggregate a KPI asks the database for. */
type AggOp =
  | "countWhere" // SUM(CASE WHEN col = v THEN 1 ELSE 0 END) — the historical only-shape
  | "count" // COUNT(col) — non-null count
  | "sum"
  | "avg"
  | "min"
  | "max"
  | "countDistinct";

/**
 * One `col <op> literal` guard. Omit `value` entirely to test IS NULL.
 * `op` defaults to `"="`.
 */
interface AggFilter {
  field: string;
  /**
   * A literal, `{ column }` to compare against another column, or
   * `{ ago: "24h" }` to compare a date column against an offset from now.
   */
  value?: string | number | boolean | null | { column: string } | { ago: string };
  /** An IN-list. Mutually exclusive with `value`; this is the only OR. */
  values?: Array<string | number | boolean | null>;
  op?: "=" | "!=" | "<" | "<=" | ">" | ">=";
  negate?: boolean;
}

interface KpiAggregation {
  /** Column the operator applies to. For `countWhere`, the column TESTED. */
  field?: string;
  /** `countWhere` only: the literal compared against `field`. */
  value?: string | number | boolean | null;
  /** Defaults to `"countWhere"` when `value` is present, else `"count"`. */
  op?: AggOp;
  /** ANDed into the aggregate, so you can say sum(amount) WHERE status='COMPLETED'. */
  where?: AggFilter[];
  /**
   * Aggregate `field * multiplyBy` instead of `field`. For models where the
   * money is a product: ICO `amount * price`, futures `cost * leverage`.
   */
  multiplyBy?: string;
  /**
   * Aggregate ELAPSED TIME from `field` rather than its value.
   * Omit `until` for "how long since" (queue age); set it for "how long did it
   * take" (an SLA).
   */
  since?: { unit?: "min" | "h" | "d" | "w" | "mo" | "y"; until?: string };
  /** @deprecated alias for `op`; read only when `op` is absent. */
  aggregationType?: AggOp;
}

/** A KPI computed in JS from other aliases in the same request. */
interface KpiDerived {
  op: "ratio" | "percent" | "diff" | "sum" | "product";
  /** Aliases of OTHER kpis/pie statuses in this request. One level only. */
  of: string[];
  /** Value when the denominator is 0. Default 0. */
  fallback?: number;
}

/**
 * How a KPI turns a bucketed series into the one headline number.
 *
 * - `periodTotal` (default) — fold every bucket in the window. What a card
 *   titled "Total X" has always claimed and never did.
 * - `latestBucket` — the most recent bucket that has a value. The historical
 *   behaviour, kept for genuinely per-period cards.
 * - `current` — a snapshot: one extra ungrouped query with the date window
 *   REMOVED. This is the only correct mode for a stock rather than a flow
 *   (total users, TVL, open backlog, custodial liability).
 */
type KpiValueMode = "periodTotal" | "latestBucket" | "current";

interface KpiConfig {
  id: string;
  title: string;
  metric: string;
  model: string;
  aggregation?: KpiAggregation;
  /** Mutually exclusive with `aggregation`. */
  derived?: KpiDerived;
  valueMode?: KpiValueMode;
  icon?: string;
  format?: "currency" | "number" | "percent" | "compact" | "duration";
  currency?: string;
  /** `true` when a rise in this metric is BAD (cancellations, disputes). */
  invert?: boolean;
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
    /** Column tested by a pie's `status` list. */
    field?: string;
    status?: Array<{
      value: string | number | boolean;
      label: string;
      color: string;
      icon?: string;
    }>;
    /** Top-N breakdown: group rows by this column instead of listing statuses. */
    groupBy?: string;
    /** Top-N only: how many groups before the rest roll into "Other". */
    limit?: number;
    /** Top-N only: what to rank groups by. Defaults to row count. */
    measure?: KpiAggregation;
    /** Top-N only: `all` ranks a stock and ignores the date window. */
    scope?: "window" | "all";
    /**
     * Top-N only: which column on the ASSOCIATED model carries the label.
     * Auto-detected from the belongsTo association when omitted.
     */
    labelField?: string;
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

/** Instruction on how to aggregate a field dynamically. */
interface AggregationInstruction {
  /** Key under which the aggregated value is stored on each DataPoint. */
  alias: string;
  field?: string;
  value?: string | number | boolean | null;
  op?: AggOp;
  where?: AggFilter[];
  multiplyBy?: string;
  since?: { unit?: string; until?: string };
  /**
   * Column holding each row's currency. Set => this aggregate is grouped by
   * that column, each group priced at its own rate, and folded into ONE USD
   * figure. See `KpiAggregation.inUSD` on the frontend for why.
   */
  inUSD?: string;
  /** `current` aggregations run in a separate, unwindowed pass. */
  scope?: "window" | "all";
}

interface DerivedInstruction {
  alias: string;
  op: "ratio" | "percent" | "diff" | "sum" | "product";
  of: string[];
  fallback: number;
}

/** A data point returned from the database query. */
interface DataPoint {
  date: Date;
  total: number;
  [key: string]: any;
}

/** Final chart data structure returned to the frontend. */
interface ChartData {
  kpis: any[];
  /** Per-card config errors. A bad card reports itself; the page still renders. */
  errors?: Array<{ id: string; message: string }>;
  meta?: Record<string, any>;
  [key: string]: any;
}

/** Parameters for building analytics data. */
interface GetChartDataParams {
  model: ModelStatic<Model>;
  /** "24h" | "7d" | "30d" | "3m" | "6m" | "y" | "1y" */
  timeframe: string;
  charts: ChartConfig[];
  kpis: KpiConfig[];
  where?: Record<string, any>;
  /**
   * Bucket and filter on a column other than `createdAt` — e.g. bucket
   * withdrawals by when they were APPROVED. Must be a DATE/DATETIME attribute.
   */
  dateField?: string;
  /**
   * `rolling` (default) — "7d" means the last 7 days ending now.
   * `calendar` — "7d" means the current calendar week. The historical
   * behaviour, kept because a few reports are read as calendar periods.
   */
  timeframeMode?: "rolling" | "calendar";
}
