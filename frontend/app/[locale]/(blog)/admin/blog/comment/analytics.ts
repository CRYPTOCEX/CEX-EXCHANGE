"use client";
import { AnalyticsConfig } from "@/components/blocks/data-table/types/analytics";
import { useTranslations } from "next-intl";

export function useAnalytics() {
  const t = useTranslations("blog_admin");
  const tCommon = useTranslations("common");

  return [
    // ─────────────────────────────────────────────────────────────
    // Group 1: Comment Status Overview – KPI Grid & Pie Chart
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
            id: "total_comments",
            title: tCommon("total_comments"),
            metric: "total",
            model: "comment",
            icon: "mdi:comment-multiple",
          },
          {
            id: "approved_comments",
            title: tCommon("approved"),
            metric: "APPROVED",
            model: "comment",
            aggregation: { field: "status", value: "APPROVED" },
            icon: "mdi:check-circle",
          },
          {
            id: "pending_comments",
            title: tCommon("pending"),
            metric: "PENDING",
            model: "comment",
            aggregation: { field: "status", value: "PENDING" },
            icon: "mdi:clock-outline",
          },
          {
            id: "rejected_comments",
            title: tCommon("rejected"),
            metric: "REJECTED",
            model: "comment",
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
            id: "commentStatusDistribution",
            title: tCommon("status_distribution"),
            type: "pie",
            model: "comment",
            metrics: ["APPROVED", "PENDING", "REJECTED"],
            config: {
              field: "status",
              status: [
                {
                  value: "APPROVED",
                  label: tCommon("approved"),
                  color: "green",
                  icon: "mdi:check-circle",
                },
                {
                  value: "PENDING",
                  label: tCommon("pending"),
                  color: "orange",
                  icon: "mdi:clock-outline",
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
    // Group 2: Comment Moderation Metrics – KPI Grid
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
          model: "comment",
          icon: "mdi:percent",
        },
        {
          id: "rejection_rate",
          title: t("rejection_rate"),
          metric: "rejectionRate",
          model: "comment",
          icon: "mdi:cancel",
        },
        {
          id: "pending_rate",
          title: t("pending_rate"),
          metric: "pendingRate",
          model: "comment",
          icon: "mdi:clock-fast",
        },
      ],
    },

    // ─────────────────────────────────────────────────────────────
    // Group 3: Comment Engagement Metrics – KPI Grid
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
          id: "comments_per_post",
          title: t("average_comments_per_post"),
          metric: "commentsPerPost",
          model: "comment",
          icon: "mdi:calculator",
        },
        {
          id: "most_commented_post",
          title: t("most_commented_post"),
          metric: "mostCommentedPost",
          model: "comment",
          icon: "mdi:fire",
        },
        {
          id: "total_commenters",
          title: t("total_commenters"),
          metric: "totalCommenters",
          model: "comment",
          icon: "mdi:account-group",
        },
        {
          id: "active_commenters",
          title: t("active_commenters"),
          metric: "activeCommenters",
          model: "comment",
          icon: "mdi:account-star",
        },
      ],
    },

    // ─────────────────────────────────────────────────────────────
    // Group 4: Comment Moderation Queue – KPI Grid & Bar Chart
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
            id: "awaiting_moderation",
            title: t("awaiting_moderation"),
            metric: "PENDING",
            model: "comment",
            aggregation: { field: "status", value: "PENDING" },
            icon: "mdi:message-alert",
          },
          {
            id: "moderated_today",
            title: t("moderated_today"),
            metric: "moderatedToday",
            model: "comment",
            icon: "mdi:check-all",
          },
          {
            id: "avg_moderation_time",
            title: t("avg_moderation_time"),
            metric: "avgModerationTime",
            model: "comment",
            icon: "mdi:timer",
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
            id: "commentStatusBar",
            title: t("comment_status_breakdown"),
            type: "bar",
            model: "comment",
            metrics: ["APPROVED", "PENDING", "REJECTED"],
            timeframes: ["7d", "30d", "3m", "6m", "y"],
            labels: {
              APPROVED: tCommon("approved"),
              PENDING: tCommon("pending"),
              REJECTED: tCommon("rejected"),
            },
          },
        ],
      },
    ],

    // ─────────────────────────────────────────────────────────────
    // Group 5: Top Commenters Distribution – Full-Width Pie Chart
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
          id: "topCommenters",
          title: t("top_commenters"),
          type: "pie",
          model: "comment",
          metrics: ["topCommenters"],
          config: {
            field: "userId",
            limit: 10,
          },
        },
      ],
    },

    // ─────────────────────────────────────────────────────────────
    // Group 6: Comments Per Post Distribution – Full-Width Pie Chart
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
          id: "commentsPerPostDistribution",
          title: t("comments_per_post_distribution"),
          type: "pie",
          model: "comment",
          metrics: ["commentsPerPost"],
          config: {
            field: "postId",
            limit: 10,
          },
        },
      ],
    },

    // ─────────────────────────────────────────────────────────────
    // Group 7: Comment Trends Over Time – Full-Width Line Chart
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
          id: "commentsOverTime",
          title: t("comment_trends_over_time"),
          type: "line",
          model: "comment",
          metrics: ["total", "APPROVED", "PENDING", "REJECTED"],
          timeframes: ["24h", "7d", "30d", "3m", "6m", "y"],
          labels: {
            total: tCommon("total_comments"),
            APPROVED: tCommon("approved"),
            PENDING: tCommon("pending"),
            REJECTED: tCommon("rejected"),
          },
        },
      ],
    },

    // ─────────────────────────────────────────────────────────────
    // Group 8: Comment Activity by Hour – Full-Width Bar Chart
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
          id: "commentsByHour",
          title: t("comments_by_hour"),
          type: "bar",
          model: "comment",
          metrics: ["total"],
          timeframes: ["24h"],
          labels: {
            total: tCommon("comments"),
          },
        },
      ],
    },
  ] as AnalyticsConfig;
}
