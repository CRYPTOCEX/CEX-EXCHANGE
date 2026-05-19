"use client";
import { AnalyticsConfig } from "@/components/blocks/data-table/types/analytics";

import { useTranslations } from "next-intl";
export function useAnalytics() {
  const t = useTranslations("dashboard_admin");
  const tCommon = useTranslations("common");
  return [
  // Row 1: Status KPIs + Pie
  [
    {
      type: "kpi" as const,
      layout: { cols: 2, rows: 2 },
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
          cols: 2,
          rows: 2
        }
      },
      items: [
        {
          id: "total_orders",
          title: t("total_futures_orders"),
          metric: "total",
          model: "orders",
          icon: "mdi:finance",
        },
        {
          id: "open_orders",
          title: tCommon("open_orders"),
          metric: "OPEN",
          model: "orders",
          aggregation: { field: "status", value: "OPEN" },
          icon: "mdi:door-open",
        },
        {
          id: "closed_orders",
          title: t("closed_orders"),
          metric: "CLOSED",
          model: "orders",
          aggregation: { field: "status", value: "CLOSED" },
          icon: "mdi:door-closed",
        },
        {
          id: "cancelled_orders",
          title: tCommon("cancelled_orders"),
          metric: "CANCELLED",
          model: "orders",
          aggregation: { field: "status", value: "CANCELLED" },
          icon: "mdi:cancel",
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
          id: "futuresOrderStatusDistribution",
          title: t("futures_status_distribution"),
          type: "pie" as const,
          model: "orders",
          metrics: ["OPEN", "CLOSED", "CANCELLED"],
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
                value: "CANCELLED",
                label: tCommon("cancelled"),
                color: "amber",
                icon: "mdi:cancel",
              },
            ],
          },
        },
      ],
    },
  ],

  // Row 2: Side KPIs + Pie
  [
    {
      type: "kpi" as const,
      layout: { cols: 1, rows: 2 },
      responsive: {
        mobile: {
          cols: 1,
          rows: 2
        },
        tablet: {
          cols: 2,
          rows: 1
        },
        desktop: {
          cols: 1,
          rows: 2
        }
      },
      items: [
        {
          id: "buy_orders",
          title: tCommon("buy_orders"),
          metric: "BUY",
          model: "orders",
          aggregation: { field: "side", value: "BUY" },
          icon: "mdi:cart-arrow-down",
        },
        {
          id: "sell_orders",
          title: tCommon("sell_orders"),
          metric: "SELL",
          model: "orders",
          aggregation: { field: "side", value: "SELL" },
          icon: "mdi:cart-arrow-up",
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
          id: "futuresOrderSideDistribution",
          title: tCommon("side_distribution"),
          type: "pie" as const,
          model: "orders",
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

  // Row 3: Type KPIs + Pie
  [
    {
      type: "kpi" as const,
      layout: { cols: 1, rows: 2 },
      responsive: {
        mobile: {
          cols: 1,
          rows: 2
        },
        tablet: {
          cols: 2,
          rows: 1
        },
        desktop: {
          cols: 1,
          rows: 2
        }
      },
      items: [
        {
          id: "market_orders",
          title: t("market_orders"),
          metric: "MARKET",
          model: "orders",
          aggregation: { field: "type", value: "MARKET" },
          icon: "mdi:chart-line",
        },
        {
          id: "limit_orders",
          title: t("limit_orders"),
          metric: "LIMIT",
          model: "orders",
          aggregation: { field: "type", value: "LIMIT" },
          icon: "mdi:chart-bell-curve",
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
          id: "futuresOrderTypeDistribution",
          title: t("order_type_distribution"),
          type: "pie" as const,
          model: "orders",
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

  // Row 4: Time-In-Force KPIs + Pie
  [
    {
      type: "kpi" as const,
      layout: { cols: 1, rows: 2 },
      responsive: {
        mobile: {
          cols: 1,
          rows: 2
        },
        tablet: {
          cols: 2,
          rows: 1
        },
        desktop: {
          cols: 1,
          rows: 2
        }
      },
      items: [
        {
          id: "gtc_orders",
          title: t("gtc_orders"),
          metric: "GTC",
          model: "orders",
          aggregation: { field: "timeInForce", value: "GTC" },
          icon: "mdi:timer-sand",
        },
        {
          id: "ioc_orders",
          title: t("ioc_orders"),
          metric: "IOC",
          model: "orders",
          aggregation: { field: "timeInForce", value: "IOC" },
          icon: "mdi:timer-sand-full",
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
          id: "futuresOrderTimeInForceDistribution",
          title: t("time_in_force_distribution"),
          type: "pie" as const,
          model: "orders",
          metrics: ["GTC", "IOC"],
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
            ],
          },
        },
      ],
    },
  ],

  // Row 5: Financial Metrics
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
        id: "total_volume",
        title: "Total Volume",
        metric: "amount",
        model: "orders",
        icon: "mdi:cash-multiple",
      },
      {
        id: "total_fees",
        title: "Total Fees",
        metric: "fee",
        model: "orders",
        icon: "mdi:cash",
      },
      {
        id: "average_order_size",
        title: "Average Order Size",
        metric: "average",
        model: "orders",
        icon: "mdi:calculator",
      },
    ],
  },

  // Row 6: Orders Over Time
  {
    type: "chart" as const,
    responsive: {
      mobile: { cols: 1 },
      tablet: { cols: 1 },
      desktop: { cols: 1 }
    },
    items: [
      {
        id: "futuresOrdersOverTime",
        title: t("futures_orders_over_time"),
        type: "line" as const,
        model: "orders",
        metrics: ["total", "OPEN", "CLOSED", "CANCELLED"],
        timeframes: ["24h", "7d", "30d", "3m", "6m", "y"],
        labels: {
          total: "Total",
          OPEN: "Open",
          CLOSED: "Closed",
          CANCELLED: "Cancelled",
        },
      },
    ],
  },
] as AnalyticsConfig;
}
