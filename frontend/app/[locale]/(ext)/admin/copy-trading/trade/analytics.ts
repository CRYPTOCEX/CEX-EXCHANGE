"use client";
import { AnalyticsConfig } from "@/components/blocks/data-table/types/analytics";
import { useTranslations } from "next-intl";

export function useAnalytics() {
  const t = useTranslations("ext_admin");
  const tCommon = useTranslations("common");
  const tExt = useTranslations("ext");

  return [
    // ─────────────────────────────────────────────────────────────
    // Group 1: Trade Status Overview – KPI Grid & Pie Chart
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
            id: "total_trades",
            title: tExt("total_trades"),
            metric: "total",
            model: "copyTradingTrade",
            icon: "mdi:swap-horizontal",
          },
          {
            id: "open_trades",
            title: t("open_trades"),
            metric: "OPEN",
            model: "copyTradingTrade",
            aggregation: { field: "status", value: "OPEN" },
            icon: "mdi:clock-outline",
          },
          {
            id: "closed_trades",
            title: t("closed_trades"),
            metric: "CLOSED",
            model: "copyTradingTrade",
            aggregation: { field: "status", value: "CLOSED" },
            icon: "mdi:check-circle",
          },
          {
            id: "failed_trades",
            title: t("failed_trades"),
            metric: "FAILED",
            model: "copyTradingTrade",
            aggregation: { field: "status", value: "FAILED" },
            icon: "mdi:alert-circle",
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
            id: "tradeStatusDistribution",
            title: tCommon("status_distribution"),
            type: "pie",
            model: "copyTradingTrade",
            metrics: ["OPEN", "CLOSED", "CANCELLED", "FAILED"],
            config: {
              field: "status",
              status: [
                {
                  value: "OPEN",
                  label: tCommon("open"),
                  color: "blue",
                  icon: "mdi:clock-outline",
                },
                {
                  value: "CLOSED",
                  label: tCommon("closed"),
                  color: "green",
                  icon: "mdi:check-circle",
                },
                {
                  value: "CANCELLED",
                  label: tCommon("cancelled"),
                  color: "gray",
                  icon: "mdi:cancel",
                },
                {
                  value: "FAILED",
                  label: tCommon("failed"),
                  color: "red",
                  icon: "mdi:alert-circle",
                },
              ],
            },
          },
        ],
      },
    ],

    // ─────────────────────────────────────────────────────────────
    // Group 2: Trade Type Distribution – KPI Grid & Pie Chart
    // ─────────────────────────────────────────────────────────────
    [
      {
        type: "kpi",
        layout: { cols: 2, rows: 1 },
        responsive: {
          mobile: { cols: 1, rows: 2, span: 1 },
          tablet: { cols: 2, rows: 1, span: 2 },
          desktop: { cols: 2, rows: 1, span: 2 },
        },
        items: [
          {
            id: "leader_trades",
            title: t("leader_trades"),
            metric: "leaderTrades",
            model: "copyTradingTrade",
            aggregation: { field: "isLeaderTrade", value: true },
            icon: "mdi:account-star",
          },
          {
            id: "follower_trades",
            title: t("follower_trades"),
            metric: "followerTrades",
            model: "copyTradingTrade",
            aggregation: { field: "isLeaderTrade", value: false },
            icon: "mdi:account-multiple",
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
            id: "tradeSideDistribution",
            title: tCommon("side_distribution"),
            type: "pie",
            model: "copyTradingTrade",
            metrics: ["BUY", "SELL"],
            config: {
              field: "side",
              status: [
                {
                  value: "BUY",
                  label: tCommon("buy"),
                  color: "green",
                  icon: "mdi:arrow-up",
                },
                {
                  value: "SELL",
                  label: tCommon("sell"),
                  color: "red",
                  icon: "mdi:arrow-down",
                },
              ],
            },
          },
        ],
      },
    ],

    // ─────────────────────────────────────────────────────────────
    // Group 3: Trades Over Time – Full-Width Line Chart
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
          id: "tradesOverTime",
          title: t("trades_over_time"),
          type: "line",
          model: "copyTradingTrade",
          metrics: ["total", "OPEN", "CLOSED"],
          timeframes: ["24h", "7d", "30d", "3m", "6m", "y"],
          labels: {
            total: tCommon("total"),
            OPEN: tCommon("open"),
            CLOSED: tCommon("closed"),
          },
        },
      ],
    },
  ] as AnalyticsConfig;
}
