"use client";
import { AnalyticsConfig } from "@/components/blocks/data-table/types/analytics";
import { useTranslations } from "next-intl";

export function useAnalytics() {
  const t = useTranslations("dashboard_admin");
  const tCommon = useTranslations("common");

  return [
    // Row 1: Order Status KPIs + Pie Chart
    [
      {
        type: "kpi" as const,
        // Legacy layout (fallback)
        layout: { cols: 2, rows: 2 },
        // New responsive layout
        responsive: {
          mobile: {
            cols: 1, // Single column on mobile
            rows: 4, // 4 rows for 4 KPIs
          },
          tablet: {
            cols: 2, // 2 columns on tablet
            rows: 2, // 2 rows for 4 KPIs
          },
          desktop: {
            cols: 2, // 2 columns on desktop
            rows: 2, // 2 rows for 4 KPIs
          },
        },
        items: [
          {
            id: "total_orders",
            title: tCommon("total_orders"),
            metric: "total",
            model: "orders",
            icon: "mdi:format-list-bulleted",
          },
          {
            id: "open_orders",
            title: tCommon("open"),
            metric: "OPEN",
            model: "orders",
            aggregation: { field: "status", value: "OPEN" },
            icon: "mdi:clock-outline",
          },
          {
            id: "closed_orders",
            title: tCommon("closed"),
            metric: "CLOSED",
            model: "orders",
            aggregation: { field: "status", value: "CLOSED" },
            icon: "mdi:check-circle",
          },
          {
            id: "cancelled_orders",
            title: tCommon("cancelled"),
            metric: "CANCELLED",
            model: "orders",
            aggregation: { field: "status", value: "CANCELLED" },
            icon: "mdi:close-circle",
          },
        ],
      },
      {
        type: "chart" as const,
        responsive: {
          mobile: {
            cols: 1, // Full width on mobile
            order: 2, // Show after KPIs on mobile
          },
          tablet: {
            cols: 1, // Full width on tablet
          },
          desktop: {
            cols: 1, // Takes up 1 column in the 2-column grid
          },
        },
        items: [
          {
            id: "orderStatusDistribution",
            title: tCommon("order_status_distribution"),
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
                  color: "red",
                  icon: "mdi:close-circle",
                },
              ],
            },
          },
        ],
      },
    ],
    // Row 2: Order Side KPIs + Pie Chart
    [
      {
        type: "kpi" as const,
        layout: { cols: 2, rows: 1 },
        responsive: {
          mobile: {
            cols: 1, // Single column on mobile
            rows: 2, // 2 rows for 2 KPIs
          },
          tablet: {
            cols: 2, // 2 columns on tablet
            rows: 1, // 1 row for 2 KPIs
          },
          desktop: {
            cols: 2, // 2 columns on desktop
            rows: 1,
          },
        },
        items: [
          {
            id: "buy_orders",
            title: tCommon("buy"),
            metric: "BUY",
            model: "orders",
            aggregation: { field: "side", value: "BUY" },
            icon: "mdi:trending-up",
          },
          {
            id: "sell_orders",
            title: tCommon("sell"),
            metric: "SELL",
            model: "orders",
            aggregation: { field: "side", value: "SELL" },
            icon: "mdi:trending-down",
          },
        ],
      },
      {
        type: "chart" as const,
        responsive: {
          mobile: {
            cols: 1,
            order: 2,
          },
          tablet: {
            cols: 1,
          },
          desktop: {
            cols: 1,
          },
        },
        items: [
          {
            id: "orderSideDistribution",
            title: t("order_side_distribution"),
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
                  icon: "mdi:trending-up",
                },
                {
                  value: "SELL",
                  label: tCommon("sell"),
                  color: "red",
                  icon: "mdi:trending-down",
                },
              ],
            },
          },
        ],
      },
    ],
    // Row 3: Financial Metrics – KPI Grid
    {
      type: "kpi" as const,
      layout: { cols: 3, rows: 1 },
      responsive: {
        mobile: { cols: 1, rows: 3 },
        tablet: { cols: 3, rows: 1 },
        desktop: { cols: 3, rows: 1 },
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

    // Row 4: Orders Over Time (Line Chart) - Full Width
    {
      type: "chart" as const,
      responsive: {
        mobile: {
          cols: 1, // Full width on all devices
        },
        tablet: {
          cols: 1,
        },
        desktop: {
          cols: 1,
        },
      },
      items: [
        {
          id: "ordersOverTime",
          title: tCommon("orders_over_time"),
          type: "line" as const,
          model: "orders",
          metrics: ["total", "OPEN", "CLOSED", "CANCELLED"],
          timeframes: ["24h", "7d", "30d", "3m", "6m", "y"],
          labels: {
            total: "Total",
            OPEN: tCommon("open"),
            CLOSED: tCommon("closed"),
            CANCELLED: tCommon("cancelled"),
          },
        },
      ],
    },
  ] as AnalyticsConfig;
}
