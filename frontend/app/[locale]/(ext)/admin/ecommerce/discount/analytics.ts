"use client";
import { AnalyticsConfig } from "@/components/blocks/data-table/types/analytics";

import { useTranslations } from "next-intl";
export function useAnalytics() {
  const t = useTranslations("ext_admin");
  const tCommon = useTranslations("common");
  return [
    // ─────────────────────────────────────────────────────────────
    // Group 1: Discount Status Overview - KPI Grid & Pie Chart
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
            id: "total_discounts",
            title: t("total_discounts"),
            metric: "total",
            model: "ecommerceDiscount",
            icon: "mdi:tag-multiple",
          },
          {
            id: "active_discounts",
            title: tCommon("active"),
            metric: "active",
            model: "ecommerceDiscount",
            aggregation: { field: "status", value: "true" },
            icon: "mdi:check-circle",
          },
          {
            id: "inactive_discounts",
            title: tCommon("inactive"),
            metric: "inactive",
            model: "ecommerceDiscount",
            aggregation: { field: "status", value: "false" },
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
            id: "discountStatusDistribution",
            title: t("discount_status_distribution"),
            type: "pie",
            model: "ecommerceDiscount",
            metrics: ["active", "inactive"],
            config: {
              field: "status",
              status: [
                {
                  value: "true",
                  label: tCommon("active"),
                  color: "green",
                  icon: "mdi:check-circle",
                },
                {
                  value: "false",
                  label: tCommon("inactive"),
                  color: "red",
                  icon: "mdi:close-circle",
                },
              ],
            },
          },
        ],
      },
    ],

    // ─────────────────────────────────────────────────────────────
    // Group 2: Discount Percentage Distribution - KPI Grid & Pie Chart
    // ─────────────────────────────────────────────────────────────
    [
      {
        type: "kpi",
        layout: { cols: 5, rows: 2 },
        responsive: {
          mobile: { cols: 1, rows: 10, span: 1 },
          tablet: { cols: 2, rows: 5, span: 2 },
          desktop: { cols: 5, rows: 2, span: 2 },
        },
        items: [
          {
            id: "discount_5",
            title: `5% ${tCommon("discounts")}`,
            metric: "5",
            model: "ecommerceDiscount",
            aggregation: { field: "percentage", value: "5" },
            icon: "mdi:percent",
          },
          {
            id: "discount_10",
            title: `10% ${tCommon("discounts")}`,
            metric: "10",
            model: "ecommerceDiscount",
            aggregation: { field: "percentage", value: "10" },
            icon: "mdi:percent",
          },
          {
            id: "discount_15",
            title: `15% ${tCommon("discounts")}`,
            metric: "15",
            model: "ecommerceDiscount",
            aggregation: { field: "percentage", value: "15" },
            icon: "mdi:percent",
          },
          {
            id: "discount_20",
            title: `20% ${tCommon("discounts")}`,
            metric: "20",
            model: "ecommerceDiscount",
            aggregation: { field: "percentage", value: "20" },
            icon: "mdi:percent",
          },
          {
            id: "discount_25",
            title: `25% ${tCommon("discounts")}`,
            metric: "25",
            model: "ecommerceDiscount",
            aggregation: { field: "percentage", value: "25" },
            icon: "mdi:percent",
          },
          {
            id: "discount_30",
            title: `30% ${tCommon("discounts")}`,
            metric: "30",
            model: "ecommerceDiscount",
            aggregation: { field: "percentage", value: "30" },
            icon: "mdi:percent",
          },
          {
            id: "discount_40",
            title: `40% ${tCommon("discounts")}`,
            metric: "40",
            model: "ecommerceDiscount",
            aggregation: { field: "percentage", value: "40" },
            icon: "mdi:percent",
          },
          {
            id: "discount_50",
            title: `50% ${tCommon("discounts")}`,
            metric: "50",
            model: "ecommerceDiscount",
            aggregation: { field: "percentage", value: "50" },
            icon: "mdi:percent",
          },
          {
            id: "discount_75",
            title: `75% ${tCommon("discounts")}`,
            metric: "75",
            model: "ecommerceDiscount",
            aggregation: { field: "percentage", value: "75" },
            icon: "mdi:percent",
          },
          {
            id: "discount_100",
            title: `100% ${tCommon("discounts")}`,
            metric: "100",
            model: "ecommerceDiscount",
            aggregation: { field: "percentage", value: "100" },
            icon: "mdi:percent",
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
            id: "discountPercentageDistribution",
            title: t("discount_percentage_distribution"),
            type: "pie",
            model: "ecommerceDiscount",
            metrics: ["5", "10", "15", "20", "25", "30", "40", "50", "75", "100"],
            config: {
              field: "percentage",
              status: [
                { value: "5", label: "5%", color: "cyan", icon: "mdi:percent" },
                { value: "10", label: "10%", color: "blue", icon: "mdi:percent" },
                { value: "15", label: "15%", color: "indigo", icon: "mdi:percent" },
                { value: "20", label: "20%", color: "green", icon: "mdi:percent" },
                { value: "25", label: "25%", color: "emerald", icon: "mdi:percent" },
                { value: "30", label: "30%", color: "yellow", icon: "mdi:percent" },
                { value: "40", label: "40%", color: "orange", icon: "mdi:percent" },
                { value: "50", label: "50%", color: "red", icon: "mdi:percent" },
                { value: "75", label: "75%", color: "purple", icon: "mdi:percent" },
                { value: "100", label: "100%", color: "pink", icon: "mdi:percent" },
              ],
            },
          },
        ],
      },
    ],

    // ─────────────────────────────────────────────────────────────
    // Group 3: Discount Trends Over Time - Full-Width Line Chart
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
          id: "discountsOverTime",
          title: t("discounts_over_time"),
          type: "line",
          model: "ecommerceDiscount",
          metrics: ["total", "active", "inactive"],
          timeframes: ["24h", "7d", "30d", "3m", "6m", "y"],
          labels: {
            total: "Total Discounts",
            active: "Active",
            inactive: "Inactive",
          },
        },
      ],
    },
  ] as AnalyticsConfig;
}
