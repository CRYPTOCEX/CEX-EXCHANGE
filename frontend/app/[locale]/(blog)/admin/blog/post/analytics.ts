"use client";
import { AnalyticsConfig } from "@/components/blocks/data-table/types/analytics";
import { useTranslations } from "next-intl";

/**
 * Blog post analytics.
 * ============================================================================
 *
 * The old page shipped 18 cards and 13 of them were incapable of ever showing a
 * number: `totalComments`, `averageComments`, `mostViewedPost`,
 * `mostCommentedPost`, `engagementRate`, `publishRate`, `draftRate` and
 * `postsWithImages` all named aliases nothing produced, and the two "top posts"
 * cards were pies with no `config.status`, i.e. permanently empty donuts. What
 * survived was one two-valued enum (`status`) rendered SIX ways — KPI, KPI,
 * donut, bar, and two line series — none of which was the number an editor
 * opens this screen to see.
 *
 * That number is the DRAFT BACKLOG: unshipped work sitting in the queue right
 * now. It is a stock, not a flow, so it needs `valueMode: "current"` — summing
 * per-bucket counts of "drafts created in March" answers a different question
 * and trends to zero as the backlog ages.
 *
 * `post.views` is the only outcome measure in the entire blog schema and, until
 * the engine learned `sum`/`avg`, nothing on the platform could read it. It now
 * carries three cards: the library total, the average on published work, and
 * the count of published posts nobody has ever opened (unlinked or unindexed —
 * a concrete fix-list).
 *
 * SCHEMA GAP worth recording: there is no `publishedAt` column, so every series
 * here is bucketed on `createdAt`. A post drafted in January and published in
 * June counts in January. "Time to publish" is unbuildable until that column
 * exists — `updatedAt` is not a safe proxy, since any later edit overwrites it.
 *
 * SECOND WAVE. Two of the three dropped items are now expressible:
 *
 *  - THE LEADERBOARD. `topPostsByViews` groups by `title`, the label column
 *    itself, and ranks by lifetime views on published work. `scope: "all"`
 *    because views are a stock; ranking them inside the date window would
 *    answer "best of the posts CREATED this month", which is not the question.
 *    Two posts sharing a title would merge into one bar; the slug is unique but
 *    meaningless to a reader, so the title is the right trade.
 *  - STALE DRAFTS. `updatedAt < NOW() - 30d` on a DRAFT is the abandoned-work
 *    list, and it is a subset of the backlog beside it — the pair says how much
 *    of the queue is actually moving.
 *
 * NOT YET ADDED, but buildable: "views by category" and "output per author".
 * Both were once ruled out on the belief that a foreign key could only be shown
 * as a raw UUID. That is no longer true — the engine follows the `belongsTo`
 * association and labels the bars with the category and author names — so both
 * are now ordinary grouped bars whenever the card budget allows one.
 * "Missing description OR cover image" is still unbuildable: it is an OR across
 * TWO columns, `values: [null, ""]` covers one column only, and a single-column
 * variant lost the card-budget contest to `zero_view_posts`, the sharper list.
 */
export function useAnalytics() {
  const t = useTranslations("blog_admin");
  const tCommon = useTranslations("common");

  return [
    // ─────────────────────────────────────────────────────────────
    // The editorial desk: what is waiting, what shipped, how it did.
    // ─────────────────────────────────────────────────────────────
    [
      {
        type: "kpi",
        responsive: {
          mobile: { cols: 1, span: 1 },
          tablet: { cols: 2, span: 2 },
          desktop: { cols: 2, span: 2 },
        },
        items: [
          {
            // Queue depth, unwindowed. The one card that says there is work to
            // do right now.
            id: "draft_backlog",
            title: t("draft_backlog"),
            metric: "draftBacklog",
            model: "post",
            aggregation: { field: "status", value: "DRAFT" },
            valueMode: "current",
            format: "number",
            invert: true,
            icon: "mdi:file-document-edit-outline",
          },
          {
            // The abandoned slice of that backlog: a draft nobody has TOUCHED
            // in a month. `updatedAt` is the right column here — it is exactly
            // "last edit" — and the guard is relative to NOW(), so the card
            // ages with the calendar instead of with the selected window.
            id: "stale_drafts",
            title: "Stale Drafts (30d+)",
            metric: "staleDrafts",
            model: "post",
            aggregation: {
              op: "count",
              field: "id",
              where: [
                { field: "status", value: "DRAFT" },
                { field: "updatedAt", op: "<", value: { ago: "30d" } },
              ],
            },
            valueMode: "current",
            format: "number",
            invert: true,
            icon: "mdi:clock-alert-outline",
          },
          {
            // Output, folded over the WHOLE window. The old card reported one
            // bucket, so a 1y view understated annual output ~12x.
            id: "published_period",
            title: tCommon("published"),
            metric: "PUBLISHED",
            model: "post",
            aggregation: { field: "status", value: "PUBLISHED" },
            valueMode: "periodTotal",
            format: "number",
            icon: "mdi:check-circle",
          },
          {
            // The window denominator for `publish_rate`, declared explicitly.
            // It CANNOT be the free `total` alias: `fetchSnapshot` returns its
            // own un-windowed `total` and `Object.assign(periodTotals,
            // snapshot)` runs after the window fold, so on this page — which
            // carries four `valueMode: "current"` cards — `total` is the
            // ALL-TIME post count. Dividing a windowed numerator by it makes
            // the rate shrink forever as the library grows.
            id: "posts_created",
            title: t("posts_created"),
            metric: "postsCreated",
            model: "post",
            aggregation: { field: "id", op: "count" },
            valueMode: "periodTotal",
            format: "number",
            icon: "mdi:file-plus-outline",
          },
          {
            // Share of the period's writing that actually shipped. `status` has
            // two values, so this retires the old draft_rate card as well.
            id: "publish_rate",
            title: t("publish_rate"),
            metric: "publishRate",
            model: "post",
            derived: { op: "percent", of: ["PUBLISHED", "postsCreated"] },
            format: "percent",
            icon: "mdi:percent",
          },
          {
            // Lifetime views across the library — a stock, so no date window.
            id: "library_views",
            title: tCommon("total_views"),
            metric: "libraryViews",
            model: "post",
            aggregation: { field: "views", op: "sum" },
            valueMode: "current",
            format: "compact",
            icon: "mdi:eye",
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
            // One stacked bar replaces the status donut, the status bar and the
            // three-series trend line: magnitude AND mix AND movement.
            id: "publishingThroughput",
            title: t("post_publishing_trends"),
            type: "stackedBar",
            model: "post",
            metrics: ["PUBLISHED", "DRAFT"],
            labels: {
              PUBLISHED: tCommon("published"),
              DRAFT: tCommon("draft"),
            },
          },
        ],
      },
    ],

    // ─────────────────────────────────────────────────────────────
    // Did the content work? Views are the only outcome the schema has.
    // ─────────────────────────────────────────────────────────────
    [
      {
        type: "kpi",
        responsive: {
          mobile: { cols: 1, span: 1 },
          tablet: { cols: 2, span: 2 },
          desktop: { cols: 2, span: 2 },
        },
        items: [
          {
            // Inflow. Paired with `published_period` above it says whether the
            // pipeline is filling faster than it drains.
            id: "drafts_started",
            title: t("draft_posts"),
            metric: "DRAFT",
            model: "post",
            aggregation: { field: "status", value: "DRAFT" },
            valueMode: "periodTotal",
            format: "number",
            icon: "mdi:pencil-plus-outline",
          },
          {
            // Cohort performance, NOT traffic: a post's lifetime views are
            // attributed to the month it was created. Labelled to say so.
            id: "cohort_views",
            title: t("views_on_posts_created"),
            metric: "cohortViews",
            model: "post",
            aggregation: { field: "views", op: "sum" },
            valueMode: "periodTotal",
            format: "compact",
            icon: "mdi:chart-timeline-variant",
          },
          {
            // Distinguishes "we published more" from "we published better".
            // Filtered to PUBLISHED, or every unread draft drags it down.
            id: "avg_views_published",
            title: t("average_views_per_post"),
            metric: "avgViewsPublished",
            model: "post",
            aggregation: {
              field: "views",
              op: "avg",
              where: [{ field: "status", value: "PUBLISHED" }],
            },
            valueMode: "current",
            format: "number",
            icon: "mdi:chart-line",
          },
          {
            // Shipped and then invisible — unlinked, unindexed, or never
            // promoted. A fix-list, not a statistic.
            id: "zero_view_posts",
            title: t("published_with_no_views"),
            metric: "zeroViewPosts",
            model: "post",
            aggregation: {
              op: "count",
              field: "id",
              where: [
                { field: "status", value: "PUBLISHED" },
                { field: "views", op: "<=", value: 0 },
              ],
            },
            valueMode: "current",
            format: "number",
            invert: true,
            icon: "mdi:eye-off-outline",
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
            id: "viewsOverTime",
            title: t("post_views_trends"),
            type: "line",
            model: "post",
            metrics: ["cohortViews"],
            labels: { cohortViews: tCommon("total_views") },
          },
        ],
      },
    ],

    // ─────────────────────────────────────────────────────────────
    // Concentration. Full width, because a ranked bar needs the row.
    // ─────────────────────────────────────────────────────────────
    {
      type: "chart",
      responsive: {
        mobile: { span: 1 },
        tablet: { span: 1 },
        desktop: { span: 1 },
      },
      items: [
        {
          // The one card that names WHICH posts worked. Grouped on `title`,
          // the label column itself; everything past the top ten rolls into
          // "Other", which is the honest denominator — if ten posts out-draw
          // "Other" the library is carried by a handful of pieces.
          id: "topPostsByViews",
          title: t("top_posts_by_views"),
          type: "bar",
          model: "post",
          metrics: [],
          description: t("lifetime_views_on_published_posts_the"),
          config: {
            groupBy: "title",
            limit: 10,
            measure: {
              field: "views",
              op: "sum",
              where: [{ field: "status", value: "PUBLISHED" }],
            },
            // Views accumulate for the life of a post, so this ranks the
            // library as it stands rather than the window's intake.
            scope: "all",
          },
        },
      ],
    },
  ] as AnalyticsConfig;
}
