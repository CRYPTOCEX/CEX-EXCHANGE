"use client";
import { AnalyticsConfig } from "@/components/blocks/data-table/types/analytics";

import { useTranslations } from "next-intl";
export function useAnalytics() {
  const t = useTranslations("ext_admin");
  const tCommon = useTranslations("common");
  return [
    // ─────────────────────────────────────────────────────────────
    // Group 1: Review Overview - KPI Grid & Status Pie Chart
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
            id: "total_reviews",
            title: t("total_reviews"),
            metric: "total",
            model: "ecommerceReview",
            icon: "mdi:comment-text-multiple",
          },
          {
            id: "active_reviews",
            title: tCommon("active"),
            metric: "active",
            model: "ecommerceReview",
            aggregation: { field: "status", value: "true" },
            icon: "mdi:check-circle",
          },
          {
            id: "inactive_reviews",
            title: tCommon("inactive"),
            metric: "inactive",
            model: "ecommerceReview",
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
            id: "reviewStatusDistribution",
            title: tCommon("status_distribution"),
            type: "pie",
            model: "ecommerceReview",
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
    // Group 2: Rating Distribution - KPI Grid & Pie Chart
    // ─────────────────────────────────────────────────────────────
    [
      {
        type: "kpi",
        layout: { cols: 5, rows: 1 },
        responsive: {
          mobile: { cols: 1, rows: 5, span: 1 },
          tablet: { cols: 2, rows: 3, span: 2 },
          desktop: { cols: 5, rows: 1, span: 2 },
        },
        items: [
          {
            id: "rating_1_reviews",
            title: `1 ${tCommon("star")}`,
            metric: "1",
            model: "ecommerceReview",
            aggregation: { field: "rating", value: "1" },
            icon: "mdi:star-outline",
          },
          {
            id: "rating_2_reviews",
            title: `2 ${tCommon("stars")}`,
            metric: "2",
            model: "ecommerceReview",
            aggregation: { field: "rating", value: "2" },
            icon: "mdi:star-outline",
          },
          {
            id: "rating_3_reviews",
            title: `3 ${tCommon("stars")}`,
            metric: "3",
            model: "ecommerceReview",
            aggregation: { field: "rating", value: "3" },
            icon: "mdi:star-half-full",
          },
          {
            id: "rating_4_reviews",
            title: `4 ${tCommon("stars")}`,
            metric: "4",
            model: "ecommerceReview",
            aggregation: { field: "rating", value: "4" },
            icon: "mdi:star",
          },
          {
            id: "rating_5_reviews",
            title: `5 ${tCommon("stars")}`,
            metric: "5",
            model: "ecommerceReview",
            aggregation: { field: "rating", value: "5" },
            icon: "mdi:star",
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
            id: "reviewRatingDistribution",
            title: t("rating_distribution"),
            type: "pie",
            model: "ecommerceReview",
            metrics: ["1", "2", "3", "4", "5"],
            config: {
              field: "rating",
              status: [
                {
                  value: "1",
                  label: `1 ${tCommon("star")}`,
                  color: "red",
                  icon: "mdi:star-outline",
                },
                {
                  value: "2",
                  label: `2 ${tCommon("stars")}`,
                  color: "orange",
                  icon: "mdi:star-outline",
                },
                {
                  value: "3",
                  label: `3 ${tCommon("stars")}`,
                  color: "yellow",
                  icon: "mdi:star-half-full",
                },
                {
                  value: "4",
                  label: `4 ${tCommon("stars")}`,
                  color: "lime",
                  icon: "mdi:star",
                },
                {
                  value: "5",
                  label: `5 ${tCommon("stars")}`,
                  color: "green",
                  icon: "mdi:star",
                },
              ],
            },
          },
        ],
      },
    ],

    // ─────────────────────────────────────────────────────────────
    // Group 3: Average Rating Metric - KPI Grid
    // ─────────────────────────────────────────────────────────────
    {
      type: "kpi",
      layout: { cols: 1, rows: 1 },
      responsive: {
        mobile: { cols: 1, rows: 1, span: 1 },
        tablet: { cols: 1, rows: 1, span: 1 },
        desktop: { cols: 1, rows: 1, span: 1 },
      },
      items: [
        {
          id: "average_rating",
          title: "Average Rating",
          metric: "average",
          model: "ecommerceReview",
          icon: "mdi:star-circle",
        },
      ],
    },

    // ─────────────────────────────────────────────────────────────
    // Group 4: Review Trends Over Time - Full-Width Line Chart
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
          id: "reviewsOverTime",
          title: t("reviews_over_time"),
          type: "line",
          model: "ecommerceReview",
          metrics: ["total", "1", "2", "3", "4", "5"],
          timeframes: ["24h", "7d", "30d", "3m", "6m", "y"],
          labels: {
            total: "Total Reviews",
            "1": "1 Star",
            "2": "2 Stars",
            "3": "3 Stars",
            "4": "4 Stars",
            "5": "5 Stars",
          },
        },
      ],
    },
  ] as AnalyticsConfig;
}
