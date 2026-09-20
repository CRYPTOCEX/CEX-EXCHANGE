/**
 * DataTable analytics config types.
 * ============================================================================
 *
 * MIRRORS `backend/types/chart.d.ts`. Every field here is flattened into one
 * POST body by `store/analyticsSlice.ts` and read back by
 * `backend/src/utils/chart.ts`, so a field that exists on only one side is dead
 * config — and this file carried four such fields (`operation`, `status`,
 * `type`, `filter` on `aggregation`, plus an `aggregationType` no code read)
 * for long enough that 145 KPI cards across 40 pages were built on them and
 * rendered a confident `0`. If you add a field here, add it there.
 */

/** The aggregate a KPI asks the database for. */
export type AggOp =
  | "countWhere" // SUM(CASE WHEN col = v THEN 1 ELSE 0 END)
  | "count" // COUNT(col) — non-null count
  | "sum"
  | "avg"
  | "min"
  | "max"
  | "countDistinct";

/** One `col <op> literal` guard. Omit `value` entirely to test IS NULL. */
export interface AggFilter {
  field: string;
  /**
   * A literal, or `{ column: "other" }` to compare two columns — "bid below
   * reserve", "withdrawn past the limit", "delivered after the promised date".
   * The object form is required rather than inferred, because a bare string
   * would be escaped as a literal and silently coerced to 0 against a number.
   */
  value?:
    | string
    | number
    | boolean
    | null
    | { column: string }
    /**
     * `{ ago: "24h" }` — a moving offset from now. The shape behind every
     * stalled / overdue / aged / expiring card. "15min", "24h", "30d", "6mo".
     */
    | { ago: string };
  /**
   * An IN-list, and the ONLY way to express OR — guards are otherwise ANDed.
   * Without it, a rate whose denominator should be COMPLETED+FAILED+TIMEOUT
   * has to be written against one of them and quietly means something
   * narrower than its label.
   */
  values?: Array<string | number | boolean | null>;
  op?: "=" | "!=" | "<" | "<=" | ">" | ">=";
  negate?: boolean;
}

export interface KpiAggregation {
  /** Column the operator applies to. For `countWhere`, the column TESTED. */
  field?: string;
  /** `countWhere` only: the literal compared against `field`. */
  value?: string | number | boolean | null;
  /** Defaults to `"countWhere"` when `value` is present, else `"count"`. */
  op?: AggOp;
  /**
   * ANDed into the aggregate. This is how you say
   * `SUM(amount) WHERE status = 'COMPLETED'` — settled volume rather than
   * requested volume, which on a payouts table is the whole question.
   */
  where?: AggFilter[];
  /**
   * Aggregate `field * multiplyBy` rather than `field`.
   *
   * On several models the money is a PRODUCT, not a column: an ICO
   * contribution is `amount` tokens at `price` each, so summing `amount` puts
   * a token count under a currency heading. Both operands are resolved against
   * the model, so this is two real columns, never an expression.
   */
  multiplyBy?: string;
  /**
   * Aggregate ELAPSED TIME from `field` rather than its value.
   *
   * `{ field: "createdAt", op: "max", since: { unit: "d" } }` is "how many days
   * has the oldest one been waiting". Add `until: "resolvedAt"` and it becomes
   * "how long did these take" — an SLA rather than a queue age.
   */
  since?: { unit?: "min" | "h" | "d" | "w" | "mo" | "y"; until?: string };
  /**
   * DENOMINATE THE SUM. The name of the column holding each row's currency.
   *
   * `SUM(amount)` over a table whose rows carry their own currency adds naira
   * to bitcoin to tether. The result is not dollars and not any currency, and
   * because `format: "currency"` renders through a formatter that DEFAULTS to
   * USD, it reaches the user with a dollar sign on it — a 40,000 NGN deposit
   * shown as "$40,000" rather than "$29".
   *
   * With `inUSD` the engine groups the aggregate by that column, prices each
   * bucket at its own rate, and returns one real USD figure. Anything it could
   * not price is reported on the card as `unpriced` instead of being folded in
   * as zero, so the number is never quietly short.
   *
   * `op: "sum"` only — an average or a max across denominations has no meaning
   * even after conversion, and the engine rejects the config rather than
   * inventing one.
   */
  inUSD?: string;
  /** @deprecated alias for `op`; read only when `op` is absent. */
  aggregationType?: AggOp;
}

/** A KPI computed in JS from other aliases in the same request. */
export interface KpiDerived {
  op: "ratio" | "percent" | "diff" | "sum" | "product";
  /** Aliases (`metric` values) of OTHER kpis or pie statuses. One level only. */
  of: string[];
  /** Value when the denominator is 0. Default 0. */
  fallback?: number;
}

/**
 * How a KPI turns a bucketed series into one headline number.
 *
 * - `periodTotal` (default) — fold every bucket in the window.
 * - `latestBucket` — the most recent bucket that has a value. This was the old
 *   hardcoded behaviour, which is why a card titled "Total Deposits" on the 1y
 *   view showed one month's count.
 * - `current` — a snapshot with the date window REMOVED. The only correct mode
 *   for a STOCK rather than a flow: total users, TVL, open backlog, custodial
 *   liability. Summing per-bucket counts answers a different question.
 */
export type KpiValueMode = "periodTotal" | "latestBucket" | "current";

export interface KpiItem {
  id: string;
  title: string;
  /** The SQL alias. Must be unique within a page — a clash is reported. */
  metric: string;
  model: string;
  aggregation?: KpiAggregation;
  /** Mutually exclusive with `aggregation`. */
  derived?: KpiDerived;
  valueMode?: KpiValueMode;
  icon?: string;
  format?: "currency" | "number" | "percent" | "compact" | "duration";
  currency?: string;
  /** `true` when a RISE in this metric is bad — cancellations, disputes. */
  invert?: boolean;
}

export interface StatusConfig {
  value: string | number | boolean;
  label: string;
  color: string;
  icon?: string;
}

export interface ChartItem {
  id: string;
  title: string;
  /**
   * Caption under the title.
   *
   * `charts/series-card.tsx` has rendered this since the line/area/bar cards
   * were unified, but it was never declared here — so it typechecked as an
   * unknown property and three separate config authors concluded the
   * capability did not exist and wrote no captions. Declaring it is the whole
   * fix. Use it to say what the series actually measures; the alternative is
   * the shared hardcoded key, which is wrong on most of its instances.
   */
  description?: string;
  /**
   * Must stay in sync with the `charts[].type` enum in the backend analysis
   * routes (`api/admin/analysis.post.ts`, `api/user/analysis.post.ts`). A value
   * outside that enum fails request validation, which 400s the whole payload —
   * every KPI and chart on the page goes down, not just the offending card.
   */
  type: "line" | "pie" | "bar" | "stackedArea" | "stackedBar";
  model: string;
  /**
   * Series to plot. Each must name an alias some KPI or pie on the SAME page
   * declares, or `"total"` — otherwise the series is a flat zero line, which is
   * how 32 of them shipped.
   */
  metrics: string[];
  timeframes?: string[];
  labels?: Record<string, string>;
  config?: {
    field?: string;
    status?: StatusConfig[];
    /** Top-N breakdown: group by this column instead of listing statuses. */
    groupBy?: string;
    /** Top-N only: how many groups before the rest roll into "Other". */
    limit?: number;
    /** Top-N only: what to rank by. Defaults to row count. */
    measure?: KpiAggregation;
    /**
     * Top-N only. `all` ranks a STOCK ("biggest balances right now") and
     * ignores the date window; the default ranks a FLOW ("top depositors this
     * month").
     */
    scope?: "window" | "all";
    /**
     * Top-N only: which column on the ASSOCIATED model carries the label.
     *
     * Grouping by a foreign key is fine — the engine follows the `belongsTo`
     * association and swaps the raw keys for names, so `groupBy: "roleId"`
     * renders "Super Admin", not "2". Set this only when the target has several
     * name-ish columns and the auto-pick pattern (name, title, displayName,
     * symbol, label, slug, email) chooses the wrong one.
     */
    labelField?: string;
    value?: string | number | boolean;
  };
}

/**
 * Responsive layout configuration for different screen sizes.
 * Tailwind breakpoints: sm 640 / md 768 / lg 1024 / xl 1280 / 2xl 1536.
 *
 * NOTE: `rows` is IGNORED by `analytics/utils/responsive-layout.ts`. It used to
 * emit `grid-rows-N`, i.e. fractional tracks, which stretched 176px KPI cards
 * to the height of the donut beside them. It is kept in the type only because
 * ~40 configs still pass it.
 */
export interface ResponsiveLayout {
  /** Mobile (< 640px). Default: 1 column. */
  mobile?: {
    cols?: number;
    rows?: number;
    span?: number;
    order?: number;
    hidden?: boolean;
  };
  /** Tablet (>= 640px). */
  tablet?: {
    cols?: number;
    rows?: number;
    span?: number;
    order?: number;
    hidden?: boolean;
  };
  /** Desktop (>= 1024px). */
  desktop?: {
    cols?: number;
    rows?: number;
    span?: number;
    order?: number;
    hidden?: boolean;
  };
}

export interface AnalyticsGroup {
  type: "kpi" | "chart";
  /** Legacy layout — still supported for backward compatibility. */
  layout?: {
    cols: number;
    rows: number;
  };
  responsive?: ResponsiveLayout;
  items: (KpiItem | ChartItem)[];
}

export type AnalyticsConfig = (AnalyticsGroup | AnalyticsGroup[])[];
