"use client";

import { AnalyticsConfig } from "@/components/blocks/data-table/types/analytics";

import { useTranslations } from "next-intl";
export function useAnalytics() {
  const tCommon = useTranslations("common");
  return [
  // ─────────────────────────────────────────────────────────────
  // Group 1: Wallet Overview – Counts & Financial KPIs
  // ─────────────────────────────────────────────────────────────
  [
    // Left Column: Count KPIs
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
          id: "total_wallets",
          title: tCommon("total_wallets"),
          metric: "total", // COUNT(*)
          model: "wallet",
          icon: "mdi:wallet",
        },
        {
          id: "active_wallets",
          title: tCommon("status"),
          metric: "active",
          model: "wallet",
          aggregation: { field: "status", value: "true" },
          icon: "mdi:checkbox-marked-circle",
        },
        {
          id: "inactive_wallets",
          title: tCommon("inactive"),
          metric: "inactive",
          model: "wallet",
          aggregation: { field: "status", value: "false" },
          icon: "mdi:checkbox-blank-circle-outline",
        },
      ],
    },
    // Right Column: Financial KPIs
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
          id: "total_balance",
          title: tCommon("total_balance"),
          metric: "balance", // SUM(balance); aggregator must sum values
          model: "wallet",
          icon: "mdi:cash",
        },
        {
          id: "inOrder_amount",
          title: tCommon("in_order"),
          metric: "inOrder", // SUM(inOrder)
          model: "wallet",
          icon: "mdi:cart-outline",
        },
      ],
    },
  ],

  // ─────────────────────────────────────────────────────────────
  // Group 2: Wallet Type Distribution – KPI Grid and Pie Chart
  // ─────────────────────────────────────────────────────────────
  [
    // Left Column: Wallet Type KPI Grid (4 cards)
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
          id: "fiat_wallets",
          title: tCommon("fiat"),
          metric: "FIAT",
          model: "wallet",
          aggregation: { field: "type", value: "FIAT" },
          icon: "mdi:currency-usd",
        },
        {
          id: "spot_wallets",
          title: tCommon("spot"),
          metric: "SPOT",
          model: "wallet",
          aggregation: { field: "type", value: "SPOT" },
          icon: "mdi:chart-line",
        },
        {
          id: "eco_wallets",
          title: tCommon("eco"),
          metric: "ECO",
          model: "wallet",
          aggregation: { field: "type", value: "ECO" },
          icon: "mdi:leaf",
        },
        {
          id: "futures_wallets",
          title: tCommon("futures"),
          metric: "FUTURES",
          model: "wallet",
          aggregation: { field: "type", value: "FUTURES" },
          icon: "mdi:clock-fast",
        },
      ],
    },
    // Right Column: Pie Chart for Wallet Type Distribution
    {
      type: "chart",
      responsive: {
        mobile: { cols: 1, rows: 1, span: 1 },
        tablet: { cols: 1, rows: 1, span: 1 },
        desktop: { cols: 1, rows: 1, span: 1 },
      },
      items: [
        {
          id: "walletTypeDistribution",
          title: tCommon("wallet_type_distribution"),
          type: "pie",
          model: "wallet",
          metrics: ["FIAT", "SPOT", "ECO", "FUTURES"],
          config: {
            field: "type",
            status: [
              {
                value: "FIAT",
                label: tCommon("fiat"),
                color: "gold",
                icon: "mdi:currency-usd",
              },
              {
                value: "SPOT",
                label: tCommon("spot"),
                color: "blue",
                icon: "mdi:chart-line",
              },
              { value: "ECO", label: tCommon("eco"), color: "green", icon: "mdi:leaf" },
              {
                value: "FUTURES",
                label: tCommon("futures"),
                color: "purple",
                icon: "mdi:clock-fast",
              },
            ],
          },
        },
      ],
    },
  ],

  // ─────────────────────────────────────────────────────────────
  // Group 3: Wallet Trends Over Time – Full-Width Line Chart
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
        id: "walletsOverTime",
        title: tCommon("wallets_over_time"),
        type: "line",
        model: "wallet",
        metrics: ["total"],
        timeframes: ["24h", "7d", "30d", "3m", "6m", "y"],
        labels: {
          total: "Total Wallets",
        },
      },
    ],
  },
] as AnalyticsConfig;
}
