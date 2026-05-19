"use client";
import { AnalyticsConfig } from "@/components/blocks/data-table/types/analytics";
import { useTranslations } from "next-intl";

export function useAnalytics() {
  const t = useTranslations("dashboard_admin");
  const tCommon = useTranslations("common");

  return [
    // ─────────────────────────────────────────────────────────────
    // Group 1: Wallet Overview – Status & Financial KPIs
    // ─────────────────────────────────────────────────────────────
    [
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
            metric: "total",
            model: "wallet",
            icon: "mdi:wallet",
          },
          {
            id: "active_wallets",
            title: t("active_wallets"),
            metric: "active",
            model: "wallet",
            aggregation: { field: "status", value: "true" },
            icon: "mdi:checkbox-marked-circle",
          },
          {
            id: "inactive_wallets",
            title: t("inactive_wallets"),
            metric: "inactive",
            model: "wallet",
            aggregation: { field: "status", value: "false" },
            icon: "mdi:checkbox-blank-circle-outline",
          },
        ],
      },
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
            metric: "balance",
            model: "wallet",
            icon: "mdi:cash-multiple",
          },
          {
            id: "inOrder_amount",
            title: tCommon("in_order"),
            metric: "inOrder",
            model: "wallet",
            icon: "mdi:lock-outline",
          },
        ],
      },
    ],

    // ─────────────────────────────────────────────────────────────
    // Group 2: Wallet Type Distribution – KPI Grid & Pie Chart
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
            id: "fiat_wallets",
            title: t("fiat_wallets"),
            metric: "FIAT",
            model: "wallet",
            aggregation: { field: "type", value: "FIAT" },
            icon: "mdi:currency-usd",
          },
          {
            id: "spot_wallets",
            title: t("spot_wallets"),
            metric: "SPOT",
            model: "wallet",
            aggregation: { field: "type", value: "SPOT" },
            icon: "mdi:chart-line",
          },
          {
            id: "eco_wallets",
            title: t("eco_wallets"),
            metric: "ECO",
            model: "wallet",
            aggregation: { field: "type", value: "ECO" },
            icon: "mdi:leaf",
          },
          {
            id: "futures_wallets",
            title: t("futures_wallets"),
            metric: "FUTURES",
            model: "wallet",
            aggregation: { field: "type", value: "FUTURES" },
            icon: "mdi:clock-fast",
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
                {
                  value: "ECO",
                  label: tCommon("eco"),
                  color: "green",
                  icon: "mdi:leaf",
                },
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
    // Group 3: Financial Metrics by Wallet Type – KPI Grid
    // ─────────────────────────────────────────────────────────────
    {
      type: "kpi",
      layout: { cols: 4, rows: 2 },
      responsive: {
        mobile: { cols: 1, rows: 8, span: 1 },
        tablet: { cols: 2, rows: 4, span: 1 },
        desktop: { cols: 4, rows: 2, span: 1 },
      },
      items: [
        {
          id: "fiat_balance",
          title: "FIAT Balance",
          metric: "balance",
          model: "wallet",
          aggregation: { field: "type", value: "FIAT" },
          icon: "mdi:currency-usd",
        },
        {
          id: "spot_balance",
          title: "SPOT Balance",
          metric: "balance",
          model: "wallet",
          aggregation: { field: "type", value: "SPOT" },
          icon: "mdi:chart-line",
        },
        {
          id: "eco_balance",
          title: "ECO Balance",
          metric: "balance",
          model: "wallet",
          aggregation: { field: "type", value: "ECO" },
          icon: "mdi:leaf",
        },
        {
          id: "futures_balance",
          title: "FUTURES Balance",
          metric: "balance",
          model: "wallet",
          aggregation: { field: "type", value: "FUTURES" },
          icon: "mdi:clock-fast",
        },
        {
          id: "fiat_in_order",
          title: "FIAT In Order",
          metric: "inOrder",
          model: "wallet",
          aggregation: { field: "type", value: "FIAT" },
          icon: "mdi:lock",
        },
        {
          id: "spot_in_order",
          title: "SPOT In Order",
          metric: "inOrder",
          model: "wallet",
          aggregation: { field: "type", value: "SPOT" },
          icon: "mdi:lock",
        },
        {
          id: "eco_in_order",
          title: "ECO In Order",
          metric: "inOrder",
          model: "wallet",
          aggregation: { field: "type", value: "ECO" },
          icon: "mdi:lock",
        },
        {
          id: "futures_in_order",
          title: "FUTURES In Order",
          metric: "inOrder",
          model: "wallet",
          aggregation: { field: "type", value: "FUTURES" },
          icon: "mdi:lock",
        },
      ],
    },

    // ─────────────────────────────────────────────────────────────
    // Group 4: Status Distribution – Pie Chart
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
          id: "walletStatusDistribution",
          title: "Wallet Status Distribution",
          type: "pie",
          model: "wallet",
          metrics: ["active", "inactive"],
          config: {
            field: "status",
            status: [
              {
                value: "true",
                label: "Active",
                color: "green",
                icon: "mdi:checkbox-marked-circle",
              },
              {
                value: "false",
                label: "Inactive",
                color: "gray",
                icon: "mdi:checkbox-blank-circle-outline",
              },
            ],
          },
        },
      ],
    },

    // ─────────────────────────────────────────────────────────────
    // Group 5: Wallet Trends Over Time – Full-Width Line Chart
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
          metrics: ["total", "FIAT", "SPOT", "ECO", "FUTURES"],
          timeframes: ["24h", "7d", "30d", "3m", "6m", "y"],
          labels: {
            total: "Total Wallets",
            FIAT: "FIAT Wallets",
            SPOT: "SPOT Wallets",
            ECO: "ECO Wallets",
            FUTURES: "FUTURES Wallets",
          },
        },
      ],
    },
  ] as AnalyticsConfig;
}
