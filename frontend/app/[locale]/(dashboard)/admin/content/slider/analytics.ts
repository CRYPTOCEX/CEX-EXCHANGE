"use client";
import { AnalyticsConfig } from "@/components/blocks/data-table/types/analytics";

import { useTranslations } from "next-intl";
export function useAnalytics() {
  const t = useTranslations("dashboard_admin");
  const tCommon = useTranslations("common");
  return [
  // Group 1: Slider Overview – KPI Grid on Left, Pie Chart on Right
  [
    {
      type: "kpi" as const,
      layout: { cols: 3, rows: 1 },
      responsive: {
        mobile: {
          cols: 1,
          rows: 3
        },
        tablet: {
          cols: 3,
          rows: 1
        },
        desktop: {
          cols: 3,
          rows: 1
        }
      },
      items: [
        {
          id: "total_sliders",
          title: t("total_sliders"),
          metric: "total", // COUNT(*) of all slider records
          model: "slider",
          icon: "mdi:image-multiple",
        },
        {
          id: "active_sliders",
          title: t("active_sliders"),
          metric: "active",
          model: "slider",
          aggregation: { field: "status", value: "true" },
          icon: "mdi:check-circle",
        },
        {
          id: "inactive_sliders",
          title: t("inactive_sliders"),
          metric: "inactive",
          model: "slider",
          aggregation: { field: "status", value: "false" },
          icon: "mdi:close-circle",
        },
      ],
    },
    {
      type: "chart" as const,
      responsive: {
        mobile: { cols: 1 },
        tablet: { cols: 1 },
        desktop: { cols: 1 }
      },
      items: [
        {
          id: "sliderStatusDistribution",
          title: tCommon("status_distribution"),
          type: "pie" as const,
          model: "slider",
          metrics: ["active", "inactive"],
          config: {
            field: "status",
            status: [
              {
                value: "true",
                label: tCommon("active"),
                color: "green",
                icon: "mdi:check-circle",
              },
              {
                value: "false",
                label: tCommon("inactive"),
                color: "red",
                icon: "mdi:close-circle",
              },
            ],
          },
        },
      ],
    },
  ],

  // Group 2: Sliders Over Time – Full-Width Line Chart
  {
    type: "chart" as const,
    responsive: {
      mobile: { cols: 1 },
      tablet: { cols: 1 },
      desktop: { cols: 1 }
    },
    items: [
      {
        id: "slidersOverTime",
        title: t("sliders_over_time"),
        type: "line" as const,
        model: "slider",
        metrics: ["total"],
        timeframes: ["24h", "7d", "30d", "3m", "6m", "y"],
        labels: {
          total: "Total Sliders",
        },
      },
    ],
  },
] as AnalyticsConfig;
}
