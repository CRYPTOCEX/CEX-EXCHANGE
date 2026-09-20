"use client";

import React from "react";
import { PieChart } from "lucide-react";
import { useTranslations } from "next-intl";

import { ChartCard } from "@/components/ui/chart/chart-card";
import { DonutChart } from "@/components/ui/chart/donut-chart";

import { ChartData } from "./types";

interface ChartConfig {
  id?: string;
  title: string;
  /** Caption under the title. Kept in step with the series cards, so a ranked
      breakdown that falls back to this donut does not silently lose it. */
  description?: string;
  type?: string;
  [key: string]: any;
}

interface StatusDistributionProps {
  data: ChartData[];
  config: ChartConfig;
  className?: string;
  loading?: boolean;
}

/**
 * Adapter onto the shared `DonutChart`.
 *
 * This file used to hold the ring, the centre readout, the legend, the empty
 * state and the all-zeros state — roughly 150 lines that fifteen other files in
 * `app/` then re-implemented worse, because it was buried inside the DataTable
 * and not importable as a chart. Moving the whole thing to
 * `@/components/ui/chart` is what makes the rest of the app able to look like
 * this one.
 */
function StatusDistributionImpl({
  data,
  config,
  className,
  loading,
}: StatusDistributionProps) {
  const tCommon = useTranslations("common");
  const hasData = Array.isArray(data) && data.length > 0;

  const segments = (data ?? []).map((d) => ({
    id: d.id,
    name: d.name,
    value: d.value,
    color: d.color,
  }));

  /*
    The legend stays INSIDE `DonutChart`, and `fitContent` is what makes that
    safe.

    It was briefly moved to the card footer to fix a real overflow: `ChartCard`
    normally pins its plot to a fixed box, and a legend of one row per status
    grew straight out through the bottom of the card. But the footer costs the
    thing that made this donut worth copying — the legend and the ring share one
    `activeId`, so pointing at "Failed" in the list dims the other arcs and puts
    that segment's own value in the middle. A legend that cannot do that is just
    a colour key.

    `fitContent` turns the card's height into a floor instead, so the ring keeps
    its 220px and the list is free to grow below it.
  */
  return (
    <ChartCard
      title={config.title}
      description={config.description}
      icon={PieChart}
      loading={loading}
      empty={!hasData}
      emptyMessage={tCommon("no_data_available")}
      height={220}
      fitContent
      className={className}
    >
      <DonutChart data={segments} height={220} centerLabel={tCommon("total")} />
    </ChartCard>
  );
}

StatusDistributionImpl.displayName = "StatusDistribution";

export const StatusDistribution = React.memo(StatusDistributionImpl);
export default StatusDistribution;
