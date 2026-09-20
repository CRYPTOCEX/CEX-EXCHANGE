"use client";

import React from "react";
import { AreaChart, BarChart3, LineChart, Layers } from "lucide-react";
import { useTranslations } from "next-intl";

import { ChartCard } from "@/components/ui/chart/chart-card";
import { ChartLegend } from "@/components/ui/chart/chart-legend";
import {
  SeriesChart,
  seriesLegendItems,
  type SeriesChartType,
} from "@/components/ui/chart/series-chart";

import { seriesFromConfig } from "./line/content";

/**
 * Deliberately NOT `ChartCardProps` from `./line/types`.
 *
 * That interface types `config` as the DataTable's full `ChartConfig`, which
 * requires `type` and `model` — fields this card never reads. The four index
 * files each used to declare their own local props with `config: any`, so the
 * strict type was never actually enforced at a call site, and two pages
 * (`admin/page.tsx`, `admin/faq`) pass a literal with only `title`, `metrics`
 * and `labels`. Asking for the three fields the frame uses keeps those working
 * and still rejects a config that has none of them.
 */
export interface SeriesCardProps {
  chartKey: string;
  config: {
    title?: string;
    /** Free text under the title. Beats a hardcoded key — see below. */
    description?: string;
    metrics?: string[];
    labels?: Record<string, string>;
    [key: string]: any;
  };
  data: Array<Record<string, any>>;
  formatXAxis?: (value: string) => string;
  width?: "full" | "half" | "third";
  className?: string;
  loading?: boolean;
  timeframe?: string;
}

/**
 * The frame shared by the line, area, bar and stacked-bar analytics cards.
 * ============================================================================
 *
 * These four files were 150 lines each and differed by a chart type and one
 * translation key. All four carried the same four framer-motion variant objects
 * (`cardVariants`, `headerVariants`, `chartAreaVariants`, `legendVariants`),
 * declared at module scope, one copy per file — sixteen objects animating the
 * same three elements, including a `scale: 0.95` entrance on the plot that no
 * `prefers-reduced-motion` rule can reach.
 *
 * The shell is now `ChartCard`, i.e. the same shell as `StatsCard`: hairline
 * border, `--card` fill, `rounded-lg`, no elevation. A KPI row above a chart row
 * is the most common page shape in this admin and the two now read as one
 * system rather than as two card languages stacked on top of each other.
 */
const CHART_ICON: Record<SeriesChartType, typeof LineChart> = {
  line: LineChart,
  area: AreaChart,
  stackedArea: Layers,
  bar: BarChart3,
  stackedBar: Layers,
};

/**
 * `descriptionKey` may be `null`.
 *
 * Each of these four cards hardcoded ONE translation key as the subtitle for
 * every chart that used it, platform-wide. That is fine while a card has one
 * caller and false as soon as it has 78: every `type: "line"` chart in the
 * admin — deposits, disputes, NFT sales, bot failures — was captioned "track
 * total and new user growth trends". A caption that is wrong on most of its
 * instances is worse than none, so a config can now supply its own and the
 * line card defaults to silence rather than to a claim about users.
 */
export function makeSeriesCard(
  type: SeriesChartType,
  descriptionKey: string | null,
  displayName: string
) {
  const Component: React.FC<SeriesCardProps> = ({
    chartKey,
    config,
    data,
    className,
    loading,
    timeframe,
  }) => {
    const tComponentsBlocks = useTranslations("components_blocks");
    const tCommon = useTranslations("common");
    const series = seriesFromConfig(config);
    const hasData = Array.isArray(data) && data.length > 0;

    return (
      <ChartCard
        title={config?.title || ""}
        description={
          config?.description ??
          (descriptionKey ? tComponentsBlocks(descriptionKey as any) : undefined)
        }
        icon={CHART_ICON[type]}
        loading={loading}
        empty={!hasData}
        emptyMessage={tCommon("no_data_available")}
        height={240}
        className={className}
        footer={
          hasData && series.length > 1 ? (
            <ChartLegend items={seriesLegendItems(series)} variant="inline" />
          ) : null
        }
      >
        <SeriesChart
          key={chartKey}
          data={data as any}
          series={series}
          type={type}
          xKey="date"
          timeframe={timeframe}
        />
      </ChartCard>
    );
  };
  Component.displayName = displayName;
  return React.memo(Component);
}
