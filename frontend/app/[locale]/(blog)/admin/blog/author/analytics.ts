"use client";
import { AnalyticsConfig } from "@/components/blocks/data-table/types/analytics";
import { useTranslations } from "next-intl";

export function useAnalytics() {
  const t = useTranslations("blog_admin");
  const tCommon = useTranslations("common");

  return [
    // ─────────────────────────────────────────────────────────────
    // Group 1: Author Status Overview – KPI Grid & Pie Chart
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
            id: "total_authors",
            title: tCommon("total_authors"),
            metric: "total",
            model: "author",
            icon: "mdi:account-multiple",
          },
          {
            id: "pending_authors",
            title: tCommon("pending"),
            metric: "PENDING",
            model: "author",
            aggregation: { field: "status", value: "PENDING" },
            icon: "mdi:clock-outline",
          },
          {
            id: "approved_authors",
            title: tCommon("approved"),
            metric: "APPROVED",
            model: "author",
            aggregation: { field: "status", value: "APPROVED" },
            icon: "mdi:check-circle",
          },
          {
            id: "rejected_authors",
            title: tCommon("rejected"),
            metric: "REJECTED",
            model: "author",
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
            id: "authorStatusDistribution",
            title: tCommon("status_distribution"),
            type: "pie",
            model: "author",
            metrics: ["PENDING", "APPROVED", "REJECTED"],
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
                  value: "APPROVED",
                  label: tCommon("approved"),
                  color: "green",
                  icon: "mdi:check-circle",
                },
                {
                  value: "REJECTED",
                  label: tCommon("rejected"),
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
    // Group 2: Author Approval Metrics – KPI Grid
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
          id: "approval_rate",
          title: tCommon("approval_rate"),
          metric: "approvalRate",
          model: "author",
          icon: "mdi:percent",
        },
        {
          id: "rejection_rate",
          title: t("rejection_rate"),
          metric: "rejectionRate",
          model: "author",
          icon: "mdi:cancel",
        },
        {
          id: "pending_rate",
          title: t("pending_rate"),
          metric: "pendingRate",
          model: "author",
          icon: "mdi:clock-fast",
        },
      ],
    },

    // ─────────────────────────────────────────────────────────────
    // Group 3: Author Productivity Metrics – KPI Grid
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
          id: "total_posts_by_authors",
          title: t("total_posts_by_authors"),
          metric: "totalPosts",
          model: "author",
          icon: "mdi:post",
        },
        {
          id: "avg_posts_per_author",
          title: t("average_posts_per_author"),
          metric: "averagePosts",
          model: "author",
          icon: "mdi:calculator",
        },
        {
          id: "active_authors",
          title: t("active_authors"),
          metric: "activeAuthors",
          model: "author",
          icon: "mdi:account-check",
        },
      ],
    },

    // ─────────────────────────────────────────────────────────────
    // Group 4: Author Application Trends Over Time – Full-Width Line Chart
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
          id: "authorsOverTime",
          title: t("author_applications_over_time"),
          type: "line",
          model: "author",
          metrics: ["total", "PENDING", "APPROVED", "REJECTED"],
          timeframes: ["24h", "7d", "30d", "3m", "6m", "y"],
          labels: {
            total: tCommon("total_applications"),
            PENDING: tCommon("pending"),
            APPROVED: tCommon("approved"),
            REJECTED: tCommon("rejected"),
          },
        },
      ],
    },

    // ─────────────────────────────────────────────────────────────
    // Group 5: Author Status Distribution Bar Chart
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
          id: "authorStatusBar",
          title: t("author_status_breakdown"),
          type: "bar",
          model: "author",
          metrics: ["PENDING", "APPROVED", "REJECTED"],
          timeframes: ["7d", "30d", "3m", "6m", "y"],
          labels: {
            PENDING: tCommon("pending"),
            APPROVED: tCommon("approved"),
            REJECTED: tCommon("rejected"),
          },
        },
      ],
    },
  ] as AnalyticsConfig;
}
