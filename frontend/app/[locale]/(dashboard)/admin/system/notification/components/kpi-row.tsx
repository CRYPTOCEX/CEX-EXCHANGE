"use client";

import { Bell, CheckCircle2, Eye, XCircle, type LucideIcon } from "lucide-react";

import { StatsCard, statsCardColors } from "@/components/ui/card/stats-card";
import type { ChartTimeframe } from "@/components/ui/chart/chart-axis";

/**
 * The four KPIs from `/api/admin/system/notification/analytics`, rendered once.
 * ============================================================================
 *
 * The Metrics tab and the Health tab call the SAME endpoint with the same
 * timeframe and show the same four numbers — and they had drifted into two
 * different cards. Metrics used the shared `StatsCard`, whose trend is a layer
 * that bleeds to the card's edge; Health hand-rolled a card with the sparkline
 * boxed in an `h-12 mt-2` well below the text, so the same metric appeared in
 * two visual languages one tab apart. One component, so they cannot diverge
 * again.
 */
export interface NotificationKpi {
  id: string;
  title: string;
  value: number | string;
  change: number;
  trend: Array<{ date: string; value: number }>;
  icon: string;
}

/** The analytics endpoint sends an icon NAME, not a component. */
const KPI_ICONS: Record<string, LucideIcon> = {
  Bell,
  CheckCircle2,
  XCircle,
  Eye,
};

/**
 * Tile tints, keyed by KPI id rather than by position.
 *
 * Both tabs previously painted by ORDER — Metrics gave all four the primary
 * tint, Health gave none — so the tile said "this is the third card" or nothing
 * at all. Keyed by id it says which metric you are looking at, and the two tabs
 * agree even though Health renders them inside a section card.
 *
 * FAILED IS THE ONE THAT CANNOT TAKE A RAMP SLOT. The hue-named slots resolve to
 * the categorical chart ramp, which an owner can repaint from /admin/design —
 * and on an install that has, `--chart-5` ("red") resolves to `156 78% 50%`,
 * i.e. `statsCardColors.red` renders a GREEN tile beside the word "Failed".
 * A ramp slot is identity and survives any palette; only a status token carries
 * state, so the failure count takes `warning`.
 */
const KPI_TINT: Record<string, { color: string; bgColor: string }> = {
  totalNotifications: statsCardColors.blue,
  successRate: statsCardColors.green,
  totalFailed: statsCardColors.warning,
  readRate: statsCardColors.purple,
};

/**
 * The four KPIs, with their VALUES not yet known.
 *
 * Both tabs used to gate the whole row on `analyticsData`, so ~192px of cards
 * appeared above everything else the moment the analytics call returned — the
 * grid was absent, not pending. It could not be otherwise, because this
 * component took `kpis` and nothing else, and a caller with no data had
 * nothing to pass.
 *
 * The four ids, titles and icons are FIXED by
 * `backend/src/api/admin/system/notification/analytics.get.ts` — it always
 * returns exactly these four, in this order — so the row's labels, tints and
 * icon tiles are knowable before the request is made. Only the figures and the
 * deltas are not, and `StatsCard` already renders those as measured
 * placeholders when it is given `loading`.
 *
 * `trend: []` rather than omitted: `StatsCard` reserves its `min-h-44` trend
 * space on `sparklineData !== undefined`, so leaving it out would make the
 * pending cards 50px shorter than the real ones.
 */
const PENDING_KPIS: NotificationKpi[] = [
  { id: "totalNotifications", title: "Total Notifications", value: 0, change: 0, trend: [], icon: "Bell" },
  { id: "successRate", title: "Success Rate", value: "0%", change: 0, trend: [], icon: "CheckCircle2" },
  { id: "totalFailed", title: "Failed", value: 0, change: 0, trend: [], icon: "XCircle" },
  { id: "readRate", title: "Read Rate", value: "0%", change: 0, trend: [], icon: "Eye" },
];

export function NotificationKpiRow({
  kpis,
  timeframe,
  loading = false,
}: {
  kpis?: NotificationKpi[];
  timeframe: string;
  /**
   * The analytics call has not returned yet.
   *
   * `kpis` is optional so a caller in that state has something legal to render
   * — passing `undefined` and `loading` is the shape both tabs now use.
   */
  loading?: boolean;
}) {
  const rows = loading || !kpis?.length ? PENDING_KPIS : kpis;

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {rows.map((kpi, index) => (
        <StatsCard
          key={kpi.id}
          label={kpi.title}
          value={typeof kpi.value === "number" ? kpi.value.toLocaleString() : kpi.value}
          icon={KPI_ICONS[kpi.icon] ?? Bell}
          /* A change of exactly 0 is what the endpoint sends for the two rate
             KPIs, which it never computes a delta for. That is "unknown", not
             "flat", so it gets no chip rather than a grey 0%. */
          change={!loading && kpi.change !== 0 ? Number(kpi.change.toFixed(1)) : undefined}
          /* `changeLabel` while pending is how `StatsCard` knows a chip is
             coming and reserves its box — see its `loading && changeLabel`
             arm. Only the two counters get a delta from the endpoint; the two
             rate KPIs never do, so they must not reserve one. */
          changeLabel={
            loading
              ? kpi.id === "totalNotifications" || kpi.id === "totalFailed"
                ? "vs prev"
                : undefined
              : kpi.change !== 0
                ? "vs prev"
                : undefined
          }
          isPercent
          /* More failures is not good news — see `invertChange`. */
          invertChange={kpi.id === "totalFailed"}
          sparklineData={kpi.trend}
          sparklineLabel={kpi.title}
          timeframe={timeframe as ChartTimeframe}
          index={index}
          loading={loading}
          {...(KPI_TINT[kpi.id] ?? statsCardColors.neutral)}
        />
      ))}
    </div>
  );
}
