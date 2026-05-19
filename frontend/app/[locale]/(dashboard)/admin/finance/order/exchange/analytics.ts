"use client";
import { AnalyticsConfig } from "@/components/blocks/data-table/types/analytics";

import { useTranslations } from "next-intl";
export function useAnalytics() {
  const t = useTranslations("dashboard_admin");
  const tCommon = useTranslations("common");
  return [
  // ─────────────────────────────────────────────────────────────
  // Row #1: Status KPIs (2x2) on the left + Status Pie Chart on the right
  // ─────────────────────────────────────────────────────────────
  [
    {
      type: "kpi" as const,
      layout: { cols: 3, rows: 2 }, // 2 columns x 2 rows => 4 KPI cards
      responsive: {
        mobile: { cols: 1, rows: 6 },
        tablet: { cols: 2, rows: 3 },
        desktop: { cols: 3, rows: 2 }
      },
      items: [
        {
          id: "total_exchange_orders",
          title: tCommon("total_orders"),
          metric: "total",
          model: "exchangeOrder",
          icon: "mdi:finance",
        },
        {
          id: "open_orders",
          title: tCommon("open_orders"),
          metric: "OPEN",
          model: "exchangeOrder",
          aggregation: { field: "status", value: "OPEN" },
          icon: "mdi:door-open",
        },
        {
          id: "closed_orders",
          title: t("closed_orders"),
          metric: "CLOSED",
          model: "exchangeOrder",
          aggregation: { field: "status", value: "CLOSED" },
          icon: "mdi:door-closed",
        },
        {
          id: "canceled_orders",
          title: t("canceled_orders"),
          metric: "CANCELED",
          model: "exchangeOrder",
          aggregation: { field: "status", value: "CANCELED" },
          icon: "mdi:cancel",
        },
        {
          id: "expired_orders",
          title: t("expired_orders"),
          metric: "EXPIRED",
          model: "exchangeOrder",
          aggregation: { field: "status", value: "EXPIRED" },
          icon: "mdi:timer-off",
        },
        {
          id: "rejected_orders",
          title: tCommon("rejected_orders"),
          metric: "REJECTED",
          model: "exchangeOrder",
          aggregation: { field: "status", value: "REJECTED" },
          icon: "mdi:thumb-down",
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
          id: "exchangeOrderStatusDistribution",
          title: tCommon("status_distribution"),
          type: "pie",
          model: "exchangeOrder",
          metrics: ["OPEN", "CLOSED", "CANCELED", "EXPIRED", "REJECTED"],
          config: {
            field: "status",
            status: [
              {
                value: "OPEN",
                label: tCommon("open"),
                color: "blue",
                icon: "mdi:door-open",
              },
              {
                value: "CLOSED",
                label: tCommon("closed"),
                color: "green",
                icon: "mdi:door-closed",
              },
              {
                value: "CANCELED",
                label: t("canceled"),
                color: "amber",
                icon: "mdi:cancel",
              },
              {
                value: "EXPIRED",
                label: tCommon("expired"),
                color: "red",
                icon: "mdi:timer-off",
              },
              {
                value: "REJECTED",
                label: tCommon("rejected"),
                color: "purple",
                icon: "mdi:thumb-down",
              },
            ],
          },
        },
      ],
    },
  ],

  // ─────────────────────────────────────────────────────────────
  // Row #2: More KPIs (2x2) on the left + Side Pie Chart on the right
  // ─────────────────────────────────────────────────────────────
  [
    {
      type: "kpi",
      layout: { cols: 2, rows: 2 },
      responsive: {
        mobile: { cols: 1, rows: 2, span: 1 },
          tablet: { cols: 2, rows: 1, span: 2 },
          desktop: { cols: 2, rows: 1, span: 2 },
      },
      items: [
        {
          id: "buy_orders",
          title: tCommon("buy_orders"),
          metric: "buy",
          model: "exchangeOrder",
          aggregation: { field: "side", value: "BUY" },
          icon: "mdi:cart-arrow-down",
        },
        {
          id: "sell_orders",
          title: tCommon("sell_orders"),
          metric: "sell",
          model: "exchangeOrder",
          aggregation: { field: "side", value: "SELL" },
          icon: "mdi:cart-arrow-up",
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
          id: "exchangeOrderSideDistribution",
          title: tCommon("side_distribution"),
          type: "pie",
          model: "exchangeOrder",
          metrics: ["BUY", "SELL"],
          config: {
            field: "side",
            status: [
              {
                value: "BUY",
                label: tCommon("buy"),
                color: "green",
                icon: "mdi:cart-arrow-down",
              },
              {
                value: "SELL",
                label: tCommon("sell"),
                color: "red",
                icon: "mdi:cart-arrow-up",
              },
            ],
          },
        },
      ],
    },
  ],

  // ─────────────────────────────────────────────────────────────
  // Row #3: Type & Time-In-Force KPIs (2x2) on the left + Type Pie Chart on the right
  // ─────────────────────────────────────────────────────────────
  [
    {
      type: "kpi",
      layout: { cols: 2, rows: 2 },
      responsive: {
        mobile: { cols: 1, rows: 2, span: 1 },
          tablet: { cols: 2, rows: 1, span: 2 },
          desktop: { cols: 2, rows: 1, span: 2 },
      },
      items: [
        {
          id: "market_orders",
          title: t("market_orders"),
          metric: "MARKET",
          model: "exchangeOrder",
          aggregation: { field: "type", value: "MARKET" },
          icon: "mdi:chart-line",
        },
        {
          id: "limit_orders",
          title: t("limit_orders"),
          metric: "LIMIT",
          model: "exchangeOrder",
          aggregation: { field: "type", value: "LIMIT" },
          icon: "mdi:chart-bell-curve",
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
          id: "exchangeOrderTypeDistribution",
          title: tCommon("type_distribution"),
          type: "pie",
          model: "exchangeOrder",
          metrics: ["MARKET", "LIMIT"],
          config: {
            field: "type",
            status: [
              {
                value: "MARKET",
                label: tCommon("market"),
                color: "blue",
                icon: "mdi:chart-line",
              },
              {
                value: "LIMIT",
                label: tCommon("limit"),
                color: "green",
                icon: "mdi:chart-bell-curve",
              },
            ],
          },
        },
      ],
    },
  ],

  // ─────────────────────────────────────────────────────────────
  // Row #4: Additional Time-In-Force KPIs (2x2) on the left + TIF Pie Chart on the right
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
          id: "gtc_orders",
          title: t("gtc_orders"),
          metric: "GTC",
          model: "exchangeOrder",
          aggregation: { field: "timeInForce", value: "GTC" },
          icon: "mdi:timer-sand",
        },
        {
          id: "ioc_orders",
          title: t("ioc_orders"),
          metric: "IOC",
          model: "exchangeOrder",
          aggregation: { field: "timeInForce", value: "IOC" },
          icon: "mdi:timer-sand-full",
        },
        {
          id: "fok_orders",
          title: t("fok_orders"),
          metric: "FOK",
          model: "exchangeOrder",
          aggregation: { field: "timeInForce", value: "FOK" },
          icon: "mdi:timer-alert",
        },
        {
          id: "po_orders",
          title: t("po_orders"),
          metric: "PO",
          model: "exchangeOrder",
          aggregation: { field: "timeInForce", value: "PO" },
          icon: "mdi:timer-cog",
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
          id: "exchangeOrderTimeInForceDistribution",
          title: t("time_in_force_distribution"),
          type: "pie",
          model: "exchangeOrder",
          metrics: ["GTC", "IOC", "FOK", "PO"],
          config: {
            field: "timeInForce",
            status: [
              {
                value: "GTC",
                label: t("gtc"),
                color: "blue",
                icon: "mdi:timer-sand",
              },
              {
                value: "IOC",
                label: t("ioc"),
                color: "green",
                icon: "mdi:timer-sand-full",
              },
              {
                value: "FOK",
                label: t("fok"),
                color: "amber",
                icon: "mdi:timer-alert",
              },
              { value: "PO", label: t("po"), color: "red", icon: "mdi:timer-cog" },
            ],
          },
        },
      ],
    },
  ],

  // ─────────────────────────────────────────────────────────────
  // Row #5: Financial Metrics – KPI Grid
  // ─────────────────────────────────────────────────────────────
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
        id: "total_order_amount",
        title: "Total Order Amount",
        metric: "amount",
        model: "exchangeOrder",
        icon: "mdi:cash-multiple",
      },
      {
        id: "total_order_cost",
        title: "Total Order Cost",
        metric: "cost",
        model: "exchangeOrder",
        icon: "mdi:currency-usd",
      },
      {
        id: "total_fees_collected",
        title: "Total Fees Collected",
        metric: "fee",
        model: "exchangeOrder",
        icon: "mdi:cash",
      },
      {
        id: "average_order_price",
        title: "Average Order Price",
        metric: "average",
        model: "exchangeOrder",
        icon: "mdi:calculator",
      },
    ],
  },

  // ─────────────────────────────────────────────────────────────
  // Row #6: Full-width line chart
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
        id: "exchangeOrdersOverTime",
        title: tCommon("orders_over_time"),
        type: "line",
        model: "exchangeOrder",
        metrics: ["total", "OPEN", "CLOSED", "CANCELED", "EXPIRED", "REJECTED"],
        timeframes: ["24h", "7d", "30d", "3m", "6m", "y"],
        labels: {
          total: "Total",
          OPEN: "Open",
          CLOSED: "Closed",
          CANCELED: "Canceled",
          EXPIRED: "Expired",
          REJECTED: "Rejected",
        },
      },
    ],
  },

  // ─────────────────────────────────────────────────────────────
  // Row #6: Full-width stacked area chart
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
        id: "buyVsSellOverTime",
        title: t("buy_vs_sell_over_time"),
        type: "stackedArea",
        model: "exchangeOrder",
        metrics: ["buy", "sell"],
        timeframes: ["24h", "7d", "30d", "3m", "6m", "y"],
        labels: {
          buy: "Buy",
          sell: "Sell",
        },
      },
    ],
  },
] as AnalyticsConfig;
}
