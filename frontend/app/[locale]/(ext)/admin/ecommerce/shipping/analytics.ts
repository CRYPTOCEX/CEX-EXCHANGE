"use client";
import { AnalyticsConfig } from "@/components/blocks/data-table/types/analytics";

import { useTranslations } from "next-intl";
export function useAnalytics() {
  const t = useTranslations("ext_admin");
  const tCommon = useTranslations("common");
  const tExt = useTranslations("ext");
  return [
    // ─────────────────────────────────────────────────────────────
    // Group 1: Shipping Status Overview - KPI Grid & Pie Chart
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
            id: "total_shipments",
            title: t("total_shipments"),
            metric: "total",
            model: "ecommerceShipping",
            icon: "mdi:truck-fast",
          },
          {
            id: "pending_shipments",
            title: tCommon("pending"),
            metric: "PENDING",
            model: "ecommerceShipping",
            aggregation: { field: "loadStatus", value: "PENDING" },
            icon: "mdi:clock-outline",
          },
          {
            id: "transit_shipments",
            title: t("in_transit"),
            metric: "TRANSIT",
            model: "ecommerceShipping",
            aggregation: { field: "loadStatus", value: "TRANSIT" },
            icon: "mdi:truck-delivery",
          },
          {
            id: "delivered_shipments",
            title: tExt("delivered"),
            metric: "DELIVERED",
            model: "ecommerceShipping",
            aggregation: { field: "loadStatus", value: "DELIVERED" },
            icon: "mdi:check-circle",
          },
          {
            id: "cancelled_shipments",
            title: tCommon("cancelled"),
            metric: "CANCELLED",
            model: "ecommerceShipping",
            aggregation: { field: "loadStatus", value: "CANCELLED" },
            icon: "mdi:cancel",
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
            id: "shippingStatusDistribution",
            title: t("shipment_status_distribution"),
            type: "pie",
            model: "ecommerceShipping",
            metrics: ["PENDING", "TRANSIT", "DELIVERED", "CANCELLED"],
            config: {
              field: "loadStatus",
              status: [
                {
                  value: "PENDING",
                  label: tCommon("pending"),
                  color: "orange",
                  icon: "mdi:clock-outline",
                },
                {
                  value: "TRANSIT",
                  label: t("transit"),
                  color: "blue",
                  icon: "mdi:truck-delivery",
                },
                {
                  value: "DELIVERED",
                  label: tExt("delivered"),
                  color: "green",
                  icon: "mdi:check-circle",
                },
                {
                  value: "CANCELLED",
                  label: tCommon("cancelled"),
                  color: "red",
                  icon: "mdi:cancel",
                },
              ],
            },
          },
        ],
      },
    ],

    // ─────────────────────────────────────────────────────────────
    // Group 2: Shipping Financial Metrics - KPI Grid
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
          id: "total_shipping_cost",
          title: "Total Shipping Cost",
          metric: "cost",
          model: "ecommerceShipping",
          icon: "mdi:cash-multiple",
        },
        {
          id: "total_shipping_tax",
          title: "Total Shipping Tax",
          metric: "tax",
          model: "ecommerceShipping",
          icon: "mdi:cash",
        },
        {
          id: "average_shipping_cost",
          title: "Average Shipping Cost",
          metric: "average",
          model: "ecommerceShipping",
          icon: "mdi:calculator",
        },
      ],
    },

    // ─────────────────────────────────────────────────────────────
    // Group 3: Shipping Metrics - KPI Grid
    // ─────────────────────────────────────────────────────────────
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
          id: "total_weight",
          title: "Total Weight",
          metric: "weight",
          model: "ecommerceShipping",
          icon: "mdi:weight",
        },
        {
          id: "total_volume",
          title: "Total Volume",
          metric: "volume",
          model: "ecommerceShipping",
          icon: "mdi:cube-outline",
        },
      ],
    },

    // ─────────────────────────────────────────────────────────────
    // Group 4: Shipping Trends Over Time - Full-Width Line Chart
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
          id: "shipmentsOverTime",
          title: t("shipments_over_time"),
          type: "line",
          model: "ecommerceShipping",
          metrics: ["total", "PENDING", "TRANSIT", "DELIVERED", "CANCELLED"],
          timeframes: ["24h", "7d", "30d", "3m", "6m", "y"],
          labels: {
            total: "Total Shipments",
            PENDING: "Pending",
            TRANSIT: "In Transit",
            DELIVERED: "Delivered",
            CANCELLED: "Cancelled",
          },
        },
      ],
    },
  ] as AnalyticsConfig;
}
