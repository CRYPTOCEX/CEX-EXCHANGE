"use client";

import { AnalyticsConfig } from "@/components/blocks/data-table/types/analytics";

import { useTranslations } from "next-intl";
export function useAnalytics() {
  const t = useTranslations("ext_forex");
  const tCommon = useTranslations("common");
  return [
  [
    {
      type: "kpi",
      layout: { cols: 2, rows: 2 },
      responsive: {
        mobile: { cols: 1, rows: 4, span: 1 },
          tablet: { cols: 2, rows: 2, span: 2 },
          desktop: { cols: 2, rows: 2, span: 2 },
      },
      items: [
        {
          id: "total_investments",
          title: tCommon("total_investments"),
          metric: "total",
          model: "forexInvestment",
          icon: "mdi:swap-horizontal-bold",
        },
        {
          id: "active_investments",
          title: tCommon("active"),
          metric: "ACTIVE",
          model: "forexInvestment",
          aggregation: { field: "status", value: "ACTIVE" },
          icon: "mdi:arrow-up-bold",
        },
        {
          id: "completed_investments",
          title: tCommon("completed"),
          metric: "COMPLETED",
          model: "forexInvestment",
          aggregation: { field: "status", value: "COMPLETED" },
          icon: "mdi:check-bold",
        },
        {
          id: "cancelled_investments",
          title: t("cancelled_rejected"),
          metric: "CANCELLED_REJECTED",
          model: "forexInvestment",
          aggregation: { field: "status", value: "CANCELLED" },
          icon: "mdi:close-thick",
        },
      ],
    },
    {
      type: "chart",
      responsive: {
        mobile: { cols: 1, rows: 1, span: 1 },
        tablet: { cols: 1, rows: 1, span: 1 },
        desktop: { cols: 1, rows: 1, span: 1 },
      },
      items: [
        {
          id: "investmentStatusPie",
          title: tCommon("status_distribution"),
          type: "pie",
          model: "forexInvestment",
          metrics: ["ACTIVE", "COMPLETED", "CANCELLED", "REJECTED"],
          config: {
            field: "status",
            status: [
              {
                value: "ACTIVE",
                label: tCommon("active"),
                color: "blue",
                icon: "mdi:arrow-up-bold",
              },
              {
                value: "COMPLETED",
                label: tCommon("completed"),
                color: "green",
                icon: "mdi:check-bold",
              },
              {
                value: "CANCELLED",
                label: tCommon("cancelled"),
                color: "red",
                icon: "mdi:close-thick",
              },
              {
                value: "REJECTED",
                label: tCommon("rejected"),
                color: "orange",
                icon: "mdi:close-thick",
              },
            ],
          },
        },
      ],
    },
  ],
  {
    type: "chart",
      responsive: {
        mobile: { cols: 1, rows: 1, span: 1 },
        tablet: { cols: 1, rows: 1, span: 1 },
        desktop: { cols: 1, rows: 1, span: 1 },
      },
      items: [
      {
        id: "investmentsOverTime",
        title: tCommon("investments_over_time"),
        type: "line",
        model: "forexInvestment",
        metrics: ["total", "ACTIVE", "COMPLETED", "CANCELLED", "REJECTED"],
        timeframes: ["24h", "7d", "30d", "3m", "6m", "y"],
        labels: {
          total: "Total",
          ACTIVE: "Active",
          COMPLETED: "Completed",
          CANCELLED: "Cancelled",
          REJECTED: "Rejected",
        },
      },
    ],
  },
] as AnalyticsConfig;
}
