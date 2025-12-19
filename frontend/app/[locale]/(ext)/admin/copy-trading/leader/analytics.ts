"use client";
import { AnalyticsConfig } from "@/components/blocks/data-table/types/analytics";
import { useTranslations } from "next-intl";

export function useAnalytics() {
  const t = useTranslations("ext_admin");
  const tCommon = useTranslations("common");
  const tExt = useTranslations("ext");

  return [
    // ─────────────────────────────────────────────────────────────
    // Group 1: Leader Status Overview – KPI Grid & Pie Chart
    // ─────────────────────────────────────────────────────────────
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
            id: "total_leaders",
            title: t("total_leaders"),
            metric: "total",
            model: "copyTradingLeader",
            icon: "mdi:account-star",
          },
          {
            id: "active_leaders",
            title: t("active_leaders"),
            metric: "ACTIVE",
            model: "copyTradingLeader",
            aggregation: { field: "status", value: "ACTIVE" },
            icon: "mdi:account-check",
          },
          {
            id: "pending_leaders",
            title: t("pending_leaders"),
            metric: "PENDING",
            model: "copyTradingLeader",
            aggregation: { field: "status", value: "PENDING" },
            icon: "mdi:account-clock",
          },
          {
            id: "suspended_leaders",
            title: t("suspended_leaders"),
            metric: "SUSPENDED",
            model: "copyTradingLeader",
            aggregation: { field: "status", value: "SUSPENDED" },
            icon: "mdi:account-cancel",
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
            id: "leaderStatusDistribution",
            title: tCommon("status_distribution"),
            type: "pie",
            model: "copyTradingLeader",
            metrics: ["ACTIVE", "PENDING", "SUSPENDED", "REJECTED"],
            config: {
              field: "status",
              status: [
                {
                  value: "ACTIVE",
                  label: tCommon("active"),
                  color: "green",
                  icon: "mdi:account-check",
                },
                {
                  value: "PENDING",
                  label: tCommon("pending"),
                  color: "yellow",
                  icon: "mdi:account-clock",
                },
                {
                  value: "SUSPENDED",
                  label: tCommon("suspended"),
                  color: "red",
                  icon: "mdi:account-cancel",
                },
                {
                  value: "REJECTED",
                  label: tCommon("rejected"),
                  color: "gray",
                  icon: "mdi:account-remove",
                },
              ],
            },
          },
        ],
      },
    ],

    // ─────────────────────────────────────────────────────────────
    // Group 2: Performance Metrics – KPI Grid
    // ─────────────────────────────────────────────────────────────
    {
      type: "kpi",
      layout: { cols: 3, rows: 1 },
      responsive: {
        mobile: { cols: 1, rows: 3, span: 1 },
        tablet: { cols: 3, rows: 1, span: 2 },
        desktop: { cols: 3, rows: 1, span: 2 },
      },
      items: [
        {
          id: "total_followers",
          title: t("total_followers"),
          metric: "totalFollowers",
          model: "copyTradingLeader",
          aggregation: { type: "sum", field: "totalFollowers" },
          icon: "mdi:account-multiple",
        },
        {
          id: "total_volume",
          title: tExt("total_volume"),
          metric: "totalVolume",
          model: "copyTradingLeader",
          aggregation: { type: "sum", field: "totalVolume" },
          icon: "mdi:cash-multiple",
        },
        {
          id: "average_win_rate",
          title: t("average_win_rate"),
          metric: "averageWinRate",
          model: "copyTradingLeader",
          aggregation: { type: "avg", field: "winRate" },
          icon: "mdi:percent",
        },
      ],
    },

    // ─────────────────────────────────────────────────────────────
    // Group 3: Leaders Over Time – Full-Width Line Chart
    // ─────────────────────────────────────────────────────────────
    {
      type: "chart",
      responsive: {
        mobile: { cols: 1, rows: 1, span: 1 },
        tablet: { cols: 1, rows: 1, span: 1 },
        desktop: { cols: 1, rows: 1, span: 1 },
      },
      items: [
        {
          id: "leadersOverTime",
          title: t("leaders_over_time"),
          type: "line",
          model: "copyTradingLeader",
          metrics: ["total", "ACTIVE", "PENDING", "SUSPENDED"],
          timeframes: ["24h", "7d", "30d", "3m", "6m", "y"],
          labels: {
            total: tCommon("total"),
            ACTIVE: tCommon("active"),
            PENDING: tCommon("pending"),
            SUSPENDED: tCommon("suspended"),
          },
        },
      ],
    },
  ] as AnalyticsConfig;
}
