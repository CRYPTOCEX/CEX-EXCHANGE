"use client";
import { AnalyticsConfig } from "@/components/blocks/data-table/types/analytics";
import { useTranslations } from "next-intl";

/**
 * Blog tag analytics.
 * ============================================================================
 *
 * This page used to ship 10 KPI cards and 5 charts. NINE of the KPIs had no
 * `aggregation` block at all and named metrics — `activeTags`, `unusedTags`,
 * `totalTagUsage`, `averagePostsPerTag`, `mostUsedTag`, `averageTagsPerPost`,
 * `topTagPosts`, `trendingTags`, `newTagsThisMonth` — that nothing produced, so
 * every one of them rendered a confident `0`. Two of the pies pointed at
 * columns (`usage`, `postCount`) that do not exist, and four chart series were
 * flat lines on the axis.
 *
 * The reason is worth writing down, because it is not carelessness. The whole
 * model is:
 *
 *     id  name  slug  createdAt  updatedAt  deletedAt
 *
 * Every interesting question about a tag — how many posts use it, which are
 * unused, what is trending — lives in the tag/post JOIN table, and the
 * aggregation engine runs against ONE model with `include: []`. So the page was
 * asking questions its own data source cannot answer, and the engine answered
 * every one of them with a zero rather than an error.
 *
 * What is left is what a tag table can honestly say. Three items instead of
 * fifteen. When cross-model rollups land, usage and unused-tag counts belong
 * here first — they are the two an editor actually wants.
 */
export function useAnalytics(): AnalyticsConfig {
  const t = useTranslations("blog_admin");
  const tCommon = useTranslations("common");

  return [
    {
      type: "kpi",
      // A section of its own is ONE column wide, so the span here is always 1.
      // Anything larger opens an empty track beside the cards.
      responsive: {
        mobile: { cols: 1, span: 1 },
        tablet: { cols: 2, span: 1 },
        desktop: { cols: 2, span: 1 },
      },
      items: [
        {
          id: "total_tags",
          title: tCommon("total_tags"),
          metric: "total",
          model: "tag",
          // A stock, not a flow: the vocabulary that exists right now, which is
          // not the same as the number of tags created inside the window.
          valueMode: "current",
          icon: "mdi:tag-multiple",
        },
        {
          id: "new_tags",
          title: t("new_tags_this_month"),
          metric: "total",
          model: "tag",
          valueMode: "periodTotal",
          icon: "mdi:new-box",
        },
      ],
    },

    {
      type: "chart",
      responsive: {
        mobile: { span: 1 },
        tablet: { span: 2 },
        desktop: { span: 1 },
      },
      items: [
        {
          id: "tagsOverTime",
          title: t("tag_growth_over_time"),
          type: "line",
          model: "tag",
          metrics: ["total"],
          labels: { total: tCommon("total_tags") },
        },
      ],
    },
  ];
}
