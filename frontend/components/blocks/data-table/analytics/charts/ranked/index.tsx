"use client";

import React from "react";
import { BarChart3 } from "lucide-react";
import { useTranslations } from "next-intl";

import { ChartCard } from "@/components/ui/chart/chart-card";
import { SeriesChart } from "@/components/ui/chart/series-chart";
import { chartColor, formatExactNumber } from "@/components/ui/chart/tokens";

import { StatusDistribution } from "../donut";

/**
 * A ranked breakdown — "top 5 gateways by settled value", "busiest agents",
 * "most-blocked countries".
 * ============================================================================
 *
 * This is the shape the audit wanted most: 95 of the 247 blueprint items that
 * had to be skipped were a top-N. They are all concentration or work-list
 * questions, and none is answerable by counting rows against a fixed literal,
 * because the interesting values are DATA — gateway names, currencies, role
 * names — not enum members somebody knew about when the config was written.
 *
 * ## Why this picks its own chart type
 *
 * A ranking with ten rows must be a horizontal bar: sorted along an axis, one
 * full row per label. A ranking with ONE row must not be — it renders as a
 * single bar stranded in the middle of an otherwise empty card, which is how
 * "Busiest Agents" looked on a support desk where every ticket was unassigned.
 * The same data as a donut reads "100% Unassigned", which is the actual answer.
 *
 * The config author cannot make this call, because the number of categories is
 * a property of the DATA, not of the config: `groupBy: "agentName"` is one
 * slice on a quiet install and twelve on a busy one. So the decision is made
 * here, at render time, from what actually came back.
 *
 * A config can still force either form by asking for `type: "pie"` (always
 * donut) — the backend returns the same `{id, name, value}` envelope for both.
 */

/** At or below this many slices, part-of-whole beats a ranking. */
const DONUT_THRESHOLD = 5;

export interface RankedBarProps {
  chartKey: string;
  config: { title?: string; description?: string; [key: string]: any };
  data: Array<{ id: string; name: string; value: number; color?: string }>;
  className?: string;
  loading?: boolean;
}

function RankedBarImpl({ chartKey, config, data, className, loading }: RankedBarProps) {
  const tCommon = useTranslations("common");
  const rows = React.useMemo(
    () => (Array.isArray(data) ? data.filter((r) => Number(r.value) !== 0) : []),
    [data]
  );
  const hasData = rows.length > 0;

  const series = React.useMemo(
    () => [{ key: "value", label: tCommon("total"), stroke: chartColor("blue") }],
    [tCommon]
  );

  /**
   * Few enough categories to read as a whole — and that includes the degenerate
   * one-slice case, where a bar chart has nothing to compare against. The donut
   * already handles its own empty and all-zero states.
   */
  if (hasData && rows.length <= DONUT_THRESHOLD) {
    return (
      <StatusDistribution
        data={rows as any}
        config={config as any}
        className={className}
        loading={loading}
      />
    );
  }

  return (
    <ChartCard
      title={config?.title || ""}
      description={config?.description}
      icon={BarChart3}
      loading={loading}
      empty={!hasData}
      emptyMessage={tCommon("no_data_available")}
      /* Sized to the rows it actually has, so six categories do not sit in the
         height that twelve would need. */
      height={Math.max(180, Math.min(rows.length, 12) * 34 + 32)}
      className={className}
    >
      <SeriesChart
        key={chartKey}
        data={rows as any}
        series={series}
        type="bar"
        horizontal
        xKey="name"
        xIsDate={false}
        valueFormatter={formatExactNumber}
      />
    </ChartCard>
  );
}

RankedBarImpl.displayName = "RankedBar";

export const RankedBar = React.memo(RankedBarImpl);
export default RankedBar;
