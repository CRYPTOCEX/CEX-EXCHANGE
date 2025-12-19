"use client";
import { AnalyticsConfig } from "@/components/blocks/data-table/types/analytics";
import { useTranslations } from "next-intl";

export function useAnalytics() {
  const t = useTranslations("blog_admin");
  const tCommon = useTranslations("common");

  return [
    // ─────────────────────────────────────────────────────────────
    // Group 1: Post Status Overview – KPI Grid & Pie Chart
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
            id: "total_posts",
            title: tCommon("total_posts"),
            metric: "total",
            model: "post",
            icon: "mdi:post-outline",
          },
          {
            id: "published_posts",
            title: tCommon("published"),
            metric: "PUBLISHED",
            model: "post",
            aggregation: { field: "status", value: "PUBLISHED" },
            icon: "mdi:check-circle",
          },
          {
            id: "draft_posts",
            title: tCommon("draft"),
            metric: "DRAFT",
            model: "post",
            aggregation: { field: "status", value: "DRAFT" },
            icon: "mdi:file-document-edit-outline",
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
            id: "postStatusDistribution",
            title: tCommon("status_distribution"),
            type: "pie",
            model: "post",
            metrics: ["PUBLISHED", "DRAFT"],
            config: {
              field: "status",
              status: [
                {
                  value: "PUBLISHED",
                  label: tCommon("published"),
                  color: "green",
                  icon: "mdi:check-circle",
                },
                {
                  value: "DRAFT",
                  label: tCommon("draft"),
                  color: "gray",
                  icon: "mdi:file-document-edit-outline",
                },
              ],
            },
          },
        ],
      },
    ],

    // ─────────────────────────────────────────────────────────────
    // Group 2: Post Engagement Metrics – KPI Grid
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
          id: "total_views",
          title: t("total_views"),
          metric: "views",
          model: "post",
          icon: "mdi:eye",
        },
        {
          id: "average_views",
          title: t("average_views_per_post"),
          metric: "averageViews",
          model: "post",
          icon: "mdi:chart-line",
        },
        {
          id: "total_comments",
          title: tCommon("total_comments"),
          metric: "totalComments",
          model: "post",
          icon: "mdi:comment-multiple",
        },
        {
          id: "average_comments",
          title: t("average_comments_per_post"),
          metric: "averageComments",
          model: "post",
          icon: "mdi:calculator",
        },
      ],
    },

    // ─────────────────────────────────────────────────────────────
    // Group 3: Top Performing Posts – KPI Grid
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
          id: "most_viewed_post",
          title: t("most_viewed_post"),
          metric: "mostViewedPost",
          model: "post",
          icon: "mdi:fire",
        },
        {
          id: "most_commented_post",
          title: t("most_commented_post"),
          metric: "mostCommentedPost",
          model: "post",
          icon: "mdi:chat",
        },
        {
          id: "engagement_rate",
          title: t("engagement_rate"),
          metric: "engagementRate",
          model: "post",
          icon: "mdi:heart",
        },
      ],
    },

    // ─────────────────────────────────────────────────────────────
    // Group 4: Publishing Metrics – KPI Grid & Bar Chart
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
            id: "publish_rate",
            title: t("publish_rate"),
            metric: "publishRate",
            model: "post",
            icon: "mdi:percent",
          },
          {
            id: "draft_rate",
            title: t("draft_rate"),
            metric: "draftRate",
            model: "post",
            icon: "mdi:file-percent",
          },
          {
            id: "posts_with_images",
            title: t("posts_with_images"),
            metric: "postsWithImages",
            model: "post",
            icon: "mdi:image",
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
            id: "postStatusBar",
            title: t("post_status_breakdown"),
            type: "bar",
            model: "post",
            metrics: ["PUBLISHED", "DRAFT"],
            timeframes: ["7d", "30d", "3m", "6m", "y"],
            labels: {
              PUBLISHED: tCommon("published"),
              DRAFT: tCommon("draft"),
            },
          },
        ],
      },
    ],

    // ─────────────────────────────────────────────────────────────
    // Group 5: Post Views Distribution – Full-Width Pie Chart
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
          id: "topPostsByViews",
          title: t("top_posts_by_views"),
          type: "pie",
          model: "post",
          metrics: ["topPosts"],
          config: {
            field: "views",
            limit: 10,
          },
        },
      ],
    },

    // ─────────────────────────────────────────────────────────────
    // Group 6: Post Publishing Trends Over Time – Full-Width Line Chart
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
          id: "postsOverTime",
          title: t("post_publishing_trends"),
          type: "line",
          model: "post",
          metrics: ["total", "PUBLISHED", "DRAFT"],
          timeframes: ["24h", "7d", "30d", "3m", "6m", "y"],
          labels: {
            total: tCommon("total_posts"),
            PUBLISHED: tCommon("published"),
            DRAFT: tCommon("draft"),
          },
        },
      ],
    },

    // ─────────────────────────────────────────────────────────────
    // Group 7: Post Views Trends Over Time – Full-Width Line Chart
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
          id: "viewsOverTime",
          title: t("post_views_trends"),
          type: "line",
          model: "post",
          metrics: ["views"],
          timeframes: ["24h", "7d", "30d", "3m", "6m", "y"],
          labels: {
            views: t("total_views"),
          },
        },
      ],
    },
  ] as AnalyticsConfig;
}
