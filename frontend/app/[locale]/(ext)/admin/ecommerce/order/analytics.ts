"use client";
import { AnalyticsConfig } from "@/components/blocks/data-table/types/analytics";

import { useTranslations } from "next-intl";
export function useAnalytics() {
  const tCommon = useTranslations("common");
  const tExt = useTranslations("ext");
  return [
    // ─────────────────────────────────────────────────────────────
    // Group 1: Order Status Overview - KPI Grid & Pie Chart
    // ─────────────────────────────────────────────────────────────
    [
      {
        type: "kpi",
        layout: { cols: 3, rows: 2 },
        responsive: {
          mobile: { cols: 1, rows: 5, span: 1 },
          tablet: { cols: 2, rows: 3, span: 2 },
          desktop: { cols: 3, rows: 2, span: 2 },
        },
        items: [
          {
            id: "total_orders",
            title: tCommon("total_orders"),
            metric: "total",
            model: "ecommerceOrder",
            icon: "mdi:shopping",
          },
          {
            id: "pending_orders",
            title: tCommon("pending_orders"),
            metric: "PENDING",
            model: "ecommerceOrder",
            aggregation: { field: "status", value: "PENDING" },
            icon: "mdi:clock-outline",
          },
          {
            id: "completed_orders",
            title: tExt("completed_orders"),
            metric: "COMPLETED",
            model: "ecommerceOrder",
            aggregation: { field: "status", value: "COMPLETED" },
            icon: "mdi:check-circle",
          },
          {
            id: "cancelled_orders",
            title: tCommon("cancelled_orders"),
            metric: "CANCELLED",
            model: "ecommerceOrder",
            aggregation: { field: "status", value: "CANCELLED" },
            icon: "mdi:cancel",
          },
          {
            id: "rejected_orders",
            title: tCommon("rejected_orders"),
            metric: "REJECTED",
            model: "ecommerceOrder",
            aggregation: { field: "status", value: "REJECTED" },
            icon: "mdi:close-circle",
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
            id: "orderStatusDistribution",
            title: tCommon("order_status_distribution"),
            type: "pie",
            model: "ecommerceOrder",
            metrics: ["PENDING", "COMPLETED", "CANCELLED", "REJECTED"],
            config: {
              field: "status",
              status: [
                {
                  value: "PENDING",
                  label: tCommon("pending"),
                  color: "orange",
                  icon: "mdi:clock-outline",
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
                  color: "red",
                  icon: "mdi:cancel",
                },
                {
                  value: "REJECTED",
                  label: tCommon("rejected"),
                  color: "purple",
                  icon: "mdi:close-circle",
                },
              ],
            },
          },
        ],
      },
    ],

    // ─────────────────────────────────────────────────────────────
    // Group 2: Order Trends Over Time - Full-Width Line Chart
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
          id: "ordersOverTime",
          title: tCommon("orders_over_time"),
          type: "line",
          model: "ecommerceOrder",
          metrics: ["total", "PENDING", "COMPLETED", "CANCELLED", "REJECTED"],
          timeframes: ["24h", "7d", "30d", "3m", "6m", "y"],
          labels: {
            total: "Total Orders",
            PENDING: "Pending",
            COMPLETED: "Completed",
            CANCELLED: "Cancelled",
            REJECTED: "Rejected",
          },
        },
      ],
    },
  ] as AnalyticsConfig;
}
