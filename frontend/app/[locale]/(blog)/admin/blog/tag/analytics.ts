"use client";
import { AnalyticsConfig } from "@/components/blocks/data-table/types/analytics";
import { useTranslations } from "next-intl";

export function useAnalytics() {
  const t = useTranslations("blog_admin");
  const tCommon = useTranslations("common");

  return [
    // ─────────────────────────────────────────────────────────────
    // Group 1: Tag Overview – KPI Grid
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
          id: "total_tags",
          title: tCommon("total_tags"),
          metric: "total",
          model: "tag",
          icon: "mdi:tag-multiple",
        },
        {
          id: "active_tags",
          title: t("active_tags"),
          metric: "activeTags",
          model: "tag",
          icon: "mdi:tag-check",
        },
        {
          id: "unused_tags",
          title: t("unused_tags"),
          metric: "unusedTags",
          model: "tag",
          icon: "mdi:tag-off",
        },
        {
          id: "total_tag_usage",
          title: t("total_tag_usage"),
          metric: "totalTagUsage",
          model: "tag",
          icon: "mdi:counter",
        },
      ],
    },

    // ─────────────────────────────────────────────────────────────
    // Group 2: Tag Usage Metrics – KPI Grid
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
          id: "avg_posts_per_tag",
          title: t("average_posts_per_tag"),
          metric: "averagePostsPerTag",
          model: "tag",
          icon: "mdi:calculator",
        },
        {
          id: "most_used_tag",
          title: t("most_used_tag"),
          metric: "mostUsedTag",
          model: "tag",
          icon: "mdi:fire",
        },
        {
          id: "avg_tags_per_post",
          title: t("average_tags_per_post"),
          metric: "averageTagsPerPost",
          model: "tag",
          icon: "mdi:tag",
        },
      ],
    },

    // ─────────────────────────────────────────────────────────────
    // Group 3: Tag Popularity Metrics – KPI Grid & Pie Chart
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
            id: "top_tag_posts",
            title: t("top_tag_posts"),
            metric: "topTagPosts",
            model: "tag",
            icon: "mdi:trophy",
          },
          {
            id: "trending_tags",
            title: t("trending_tags"),
            metric: "trendingTags",
            model: "tag",
            icon: "mdi:trending-up",
          },
          {
            id: "new_tags_this_month",
            title: t("new_tags_this_month"),
            metric: "newTagsThisMonth",
            model: "tag",
            icon: "mdi:new-box",
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
            id: "tagUsageDistribution",
            title: t("tag_usage_distribution"),
            type: "pie",
            model: "tag",
            metrics: ["topTags"],
            config: {
              field: "usage",
              limit: 10,
            },
          },
        ],
      },
    ],

    // ─────────────────────────────────────────────────────────────
    // Group 4: Top Tags by Post Count – Full-Width Pie Chart
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
          id: "topTagsByPostCount",
          title: t("top_tags_by_post_count"),
          type: "pie",
          model: "tag",
          metrics: ["postCount"],
          config: {
            field: "postCount",
            limit: 15,
          },
        },
      ],
    },

    // ─────────────────────────────────────────────────────────────
    // Group 5: Tag Popularity Bar Chart
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
          id: "tagPopularityBar",
          title: t("tag_popularity_trends"),
          type: "bar",
          model: "tag",
          metrics: ["topTags"],
          timeframes: ["7d", "30d", "3m", "6m", "y"],
          labels: {
            topTags: t("top_tags"),
          },
        },
      ],
    },

    // ─────────────────────────────────────────────────────────────
    // Group 6: Tag Growth Trends Over Time – Full-Width Line Chart
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
          id: "tagsOverTime",
          title: t("tag_growth_over_time"),
          type: "line",
          model: "tag",
          metrics: ["total", "activeTags", "unusedTags"],
          timeframes: ["24h", "7d", "30d", "3m", "6m", "y"],
          labels: {
            total: tCommon("total_tags"),
            activeTags: t("active_tags"),
            unusedTags: t("unused_tags"),
          },
        },
      ],
    },

    // ─────────────────────────────────────────────────────────────
    // Group 7: Tag Usage Trends Over Time – Full-Width Line Chart
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
          id: "tagUsageOverTime",
          title: t("tag_usage_trends"),
          type: "line",
          model: "tag",
          metrics: ["totalUsage"],
          timeframes: ["24h", "7d", "30d", "3m", "6m", "y"],
          labels: {
            totalUsage: t("total_tag_applications"),
          },
        },
      ],
    },
  ] as AnalyticsConfig;
}
