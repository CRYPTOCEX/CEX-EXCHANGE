"use client";
import { AnalyticsConfig } from "@/components/blocks/data-table/types/analytics";

import { useTranslations } from "next-intl";
export function useAnalytics() {
  const t = useTranslations("dashboard_admin");
  const tCommon = useTranslations("common");
  return [
  // 1) Row of KPIs for statuses
  {
    type: "kpi" as const,
    layout: { cols: 4, rows: 1 },
    responsive: {
      mobile: {
        cols: 1,
        rows: 4
      },
      tablet: {
        cols: 2,
        rows: 2
      },
      desktop: {
        cols: 4,
        rows: 1
      }
    },
    items: [
      {
        id: "total_investments",
        title: tCommon("total_investments"),
        metric: "total",
        model: "investment",
        icon: "mdi:finance",
      },
      {
        id: "active_investments",
        title: tCommon("active"),
        metric: "ACTIVE",
        model: "investment",
        aggregation: { field: "status", value: "ACTIVE" },
        icon: "mdi:play-circle",
      },
      {
        id: "completed_investments",
        title: tCommon("completed"),
        metric: "COMPLETED",
        model: "investment",
        aggregation: { field: "status", value: "COMPLETED" },
        icon: "mdi:check-circle",
      },
      {
        id: "cancelled_investments",
        title: tCommon("cancelled"),
        metric: "CANCELLED",
        model: "investment",
        aggregation: { field: "status", value: "CANCELLED" },
        icon: "mdi:cancel",
      },
    ],
  },

  // 2) Row of KPIs for results (WIN, LOSS, DRAW)
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
        id: "winning_investments",
        title: tCommon("winning"),
        metric: "WIN",
        model: "investment",
        aggregation: { field: "result", value: "WIN" },
        icon: "mdi:trophy",
      },
      {
        id: "losing_investments",
        title: tCommon("losing"),
        metric: "LOSS",
        model: "investment",
        aggregation: { field: "result", value: "LOSS" },
        icon: "mdi:thumb-down",
      },
      {
        id: "draw_investments",
        title: tCommon("draw"),
        metric: "DRAW",
        model: "investment",
        aggregation: { field: "result", value: "DRAW" },
        icon: "mdi:gesture-tap",
      },
    ],
  },

  // 3) Pie chart for status distribution
  {
    type: "chart" as const,
    responsive: {
      mobile: { cols: 1 },
      tablet: { cols: 1 },
      desktop: { cols: 1 }
    },
    items: [
      {
        id: "investmentStatusDistribution",
        title: t("investment_status_distribution"),
        type: "pie" as const,
        model: "investment",
        metrics: ["ACTIVE", "COMPLETED", "CANCELLED", "REJECTED"],
        config: {
          field: "status",
          status: [
            {
              value: "ACTIVE",
              label: tCommon("active"),
              color: "blue",
              icon: "mdi:play-circle",
            },
            {
              value: "COMPLETED",
              label: tCommon("completed"),
              color: "green",
              icon: "mdi:check-circle",
            },
            {
              value: "CANCELLED",
              label: tCommon("cancelled"),
              color: "amber",
              icon: "mdi:cancel",
            },
            {
              value: "REJECTED",
              label: tCommon("rejected"),
              color: "red",
              icon: "mdi:close-circle",
            },
          ],
        },
      },
    ],
  },

  // 4) Result distribution pie chart
  {
    type: "chart" as const,
    responsive: {
      mobile: { cols: 1 },
      tablet: { cols: 1 },
      desktop: { cols: 1 }
    },
    items: [
      {
        id: "investmentResultDistribution",
        title: t("investment_result_distribution"),
        type: "pie" as const,
        model: "investment",
        metrics: ["WIN", "LOSS", "DRAW"],
        config: {
          field: "result",
          status: [
            { value: "WIN", label: tCommon("win"), color: "green", icon: "mdi:trophy" },
            {
              value: "LOSS",
              label: tCommon("loss"),
              color: "red",
              icon: "mdi:thumb-down",
            },
            {
              value: "DRAW",
              label: tCommon("draw"),
              color: "gray",
              icon: "mdi:gesture-tap",
            },
          ],
        },
      },
    ],
  },

  // 5) Financial Metrics – KPI Grid
  {
    type: "kpi" as const,
    layout: { cols: 3, rows: 1 },
    responsive: {
      mobile: { cols: 1, rows: 3 },
      tablet: { cols: 3, rows: 1 },
      desktop: { cols: 3, rows: 1 }
    },
    items: [
      {
        id: "total_invested_amount",
        title: "Total Invested",
        metric: "amount",
        model: "investment",
        icon: "mdi:cash-multiple",
      },
      {
        id: "total_profit_amount",
        title: "Total Profit",
        metric: "profit",
        model: "investment",
        icon: "mdi:trending-up",
      },
      {
        id: "average_investment_amount",
        title: "Average Investment",
        metric: "average",
        model: "investment",
        icon: "mdi:calculator",
      },
    ],
  },

  // 5) Line chart for time-series
  {
    type: "chart" as const,
    responsive: {
      mobile: { cols: 1 },
      tablet: { cols: 1 },
      desktop: { cols: 1 }
    },
    items: [
      {
        id: "investmentsOverTime",
        title: tCommon("investments_over_time"),
        type: "line" as const,
        model: "investment",
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
