"use client";
import { AnalyticsConfig } from "@/components/blocks/data-table/types/analytics";
import { useTranslations } from "next-intl";

export function useAnalytics() {
  const t = useTranslations("ext_admin");
  const tCommon = useTranslations("common");
  const tExt = useTranslations("ext");

  return [
    // ─────────────────────────────────────────────────────────────
    // Group 1: Subscription Status Overview – KPI Grid & Pie Chart
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
            id: "total_subscriptions",
            title: t("total_subscriptions"),
            metric: "total",
            model: "copyTradingFollower",
            icon: "mdi:account-multiple",
          },
          {
            id: "active_subscriptions",
            title: t("active_subscriptions"),
            metric: "ACTIVE",
            model: "copyTradingFollower",
            aggregation: { field: "status", value: "ACTIVE" },
            icon: "mdi:account-check",
          },
          {
            id: "paused_subscriptions",
            title: t("paused_subscriptions"),
            metric: "PAUSED",
            model: "copyTradingFollower",
            aggregation: { field: "status", value: "PAUSED" },
            icon: "mdi:account-pause",
          },
          {
            id: "stopped_subscriptions",
            title: t("stopped_subscriptions"),
            metric: "STOPPED",
            model: "copyTradingFollower",
            aggregation: { field: "status", value: "STOPPED" },
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
            id: "subscriptionStatusDistribution",
            title: tCommon("status_distribution"),
            type: "pie",
            model: "copyTradingFollower",
            metrics: ["ACTIVE", "PAUSED", "STOPPED"],
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
                  value: "PAUSED",
                  label: tCommon("paused"),
                  color: "yellow",
                  icon: "mdi:account-pause",
                },
                {
                  value: "STOPPED",
                  label: tCommon("stopped"),
                  color: "red",
                  icon: "mdi:account-cancel",
                },
              ],
            },
          },
        ],
      },
    ],

    // ─────────────────────────────────────────────────────────────
    // Group 2: Financial Metrics – KPI Grid
    // ─────────────────────────────────────────────────────────────
    {
      type: "kpi",
      layout: { cols: 4, rows: 1 },
      responsive: {
        mobile: { cols: 1, rows: 4, span: 1 },
        tablet: { cols: 2, rows: 2, span: 2 },
        desktop: { cols: 4, rows: 1, span: 2 },
      },
      items: [
        {
          id: "total_followers",
          title: t("total_followers"),
          metric: "totalFollowers",
          model: "copyTradingFollower",
          aggregation: { type: "count", field: "id" },
          icon: "mdi:account-multiple",
        },
        {
          id: "total_current_value",
          title: t("total_current_value"),
          metric: "totalCurrentValue",
          model: "copyTradingFollower",
          aggregation: { type: "sum", field: "currentValue" },
          icon: "mdi:wallet",
        },
        {
          id: "total_pnl",
          title: t("total_pnl"),
          metric: "totalPnl",
          model: "copyTradingFollower",
          aggregation: { type: "sum", field: "totalPnl" },
          icon: "mdi:trending-up",
        },
        {
          id: "average_roi",
          title: tExt("average_roi"),
          metric: "averageRoi",
          model: "copyTradingFollower",
          aggregation: { type: "avg", field: "totalPnlPercent" },
          icon: "mdi:percent",
        },
      ],
    },

    // ─────────────────────────────────────────────────────────────
    // Group 3: Subscriptions Over Time – Full-Width Line Chart
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
          id: "subscriptionsOverTime",
          title: t("subscriptions_over_time"),
          type: "line",
          model: "copyTradingFollower",
          metrics: ["total", "ACTIVE", "PAUSED", "STOPPED"],
          timeframes: ["24h", "7d", "30d", "3m", "6m", "y"],
          labels: {
            total: tCommon("total"),
            ACTIVE: tCommon("active"),
            PAUSED: tCommon("paused"),
            STOPPED: tCommon("stopped"),
          },
        },
      ],
    },

    // ─────────────────────────────────────────────────────────────
    // Group 4: Volume Over Time – Area Chart
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
          id: "followersOverTime",
          title: t("followers_over_time"),
          type: "stackedArea",
          model: "copyTradingFollower",
          metrics: ["count"],
          timeframes: ["7d", "30d", "3m", "6m", "y"],
          labels: {
            count: t("total_followers"),
          },
        },
      ],
    },
  ] as AnalyticsConfig;
}
