"use client";
import { AnalyticsConfig } from "@/components/blocks/data-table/types/analytics";
import { useTranslations } from "next-intl";

/**
 * Blog comment moderation analytics.
 * ============================================================================
 *
 * Twenty cards, of which nine rendered a permanent `0` (`approvalRate`,
 * `rejectionRate`, `pendingRate`, `commentsPerPost`, `mostCommentedPost`,
 * `totalCommenters`, `activeCommenters`, `moderatedToday`,
 * `avgModerationTime`), two were empty donuts (pies on `userId` and `postId`
 * with no `config.status`), one was a byte-identical duplicate of another
 * ("Awaiting Moderation" and "Pending" were literally the same aggregation),
 * and one — "Comment Activity by Hour" — advertised hourly resolution while
 * drawing twelve monthly bars, because `ChartItem.timeframes` is decoration:
 * there is a single global timeframe selector for the page.
 *
 * A moderation screen has exactly two jobs, and neither was on it:
 *
 * 1. HOW DEEP IS THE QUEUE RIGHT NOW. Comments hidden from readers awaiting a
 *    human. Windowed by `createdAt` it becomes "pending among comments posted
 *    this month", which understates a queue the moment it ages, so this uses
 *    `valueMode: "current"`.
 *
 * 2. IS THIS A SPAM WAVE. The absolute rejected count cannot tell 40-of-50
 *    (emergency) from 40-of-5000 (a busy week). The rejection RATE can — over
 *    DECIDED comments, never over total, or a backlog silently depresses it.
 *    Its per-bucket sparkline is the alarm.
 *
 * A queue is also judged on TIME, and both time cards are now on the page:
 *
 *  - `oldest_unmoderated` is EXACT — NOW() - createdAt over the PENDING rows.
 *    It is the card that separates "a queue of 60" from "a queue of 60 with
 *    something in it from last Tuesday", and only the second one is an
 *    incident. A comment waiting is a reader hidden from the thread.
 *  - `moderation_latency` is a PROXY and must be read as an UPPER BOUND. There
 *    is no `moderatedAt`, so it differences `updatedAt` against `createdAt`
 *    over decided comments — and unlike the author queue, a comment row is
 *    genuinely editable after the fact: `PUT /api/blog/comment/[id]` lets the
 *    commenter rewrite their own text and re-stamps `updatedAt`. Every such
 *    edit pushes this figure UP, never down, so a low number is trustworthy
 *    and a high one may be edits rather than slow moderation. It earns its
 *    place anyway: a moderation desk with no latency measure at all was the
 *    worse failure.
 *
 * Both are `valueMode: "current"`: a `since` aggregate folded across buckets
 * re-reads the raw date column for `avg`, so the snapshot pass is the only mode
 * that returns an elapsed-time average intact.
 *
 * Not buildable today (engine): per-series `dateField` (inflow on `createdAt`
 * against moderation on `updatedAt` — both series here share the intake axis);
 * and every ranked breakdown this screen wants, because the only non-enum
 * columns on `comment` are `postId` and `userId`. Both are UUIDs and the engine
 * does not join, so "top posts by comment volume" and the top-commenters ban
 * list would each draw ten bars labelled with 36 characters of hex. The ban
 * list additionally needs a per-group ratio and a table renderer.
 */
export function useAnalytics() {
  const t = useTranslations("blog_admin");
  const tCommon = useTranslations("common");

  return [
    // ─────────────────────────────────────────────────────────────
    // The moderation desk: depth, pace, abuse signal, community size.
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
            // Unwindowed queue depth: comments hidden from readers right now.
            id: "moderation_queue",
            title: tCommon("awaiting_moderation"),
            metric: "moderationQueue",
            model: "comment",
            aggregation: { field: "status", value: "PENDING" },
            valueMode: "current",
            format: "number",
            invert: true,
            icon: "mdi:message-alert",
          },
          {
            // The age of the worst case in that queue. Exact: no second
            // timestamp is involved. Measured in hours because a moderation
            // SLA is an hours conversation; the card promotes to days past 48,
            // which is itself the alarm.
            id: "oldest_unmoderated",
            title: t("oldest_unmoderated_comment"),
            metric: "oldestUnmoderated",
            model: "comment",
            aggregation: {
              field: "createdAt",
              op: "max",
              since: { unit: "h" },
              where: [{ field: "status", value: "PENDING" }],
            },
            valueMode: "current",
            format: "duration",
            invert: true,
            icon: "mdi:timer-sand",
          },
          {
            // Moderator throughput over the window — comments from this period
            // that have reached a verdict either way.
            id: "moderated_period",
            title: t("comments_moderated"),
            metric: "decided",
            model: "comment",
            aggregation: {
              op: "count",
              field: "id",
              where: [{ field: "status", value: "PENDING", negate: true }],
            },
            valueMode: "periodTotal",
            format: "number",
            icon: "mdi:check-all",
          },
          {
            // Typical time from posting to a verdict. `values` is the IN-list,
            // the only OR the grammar has: it names the decided set literally
            // rather than inferring it from "not PENDING", so a status added
            // later cannot quietly join the denominator.
            // PROXY on `updatedAt` — upper bound. See the note at the top.
            id: "moderation_latency",
            title: t("avg_time_to_moderate"),
            metric: "moderationLatency",
            model: "comment",
            aggregation: {
              field: "createdAt",
              op: "avg",
              since: { unit: "h", until: "updatedAt" },
              where: [{ field: "status", values: ["APPROVED", "REJECTED"] }],
            },
            valueMode: "current",
            format: "duration",
            invert: true,
            icon: "mdi:timeline-clock-outline",
          },
          {
            // The spam-wave alarm. Denominator is DECIDED, not total.
            id: "rejection_rate",
            title: tCommon("rejection_rate"),
            metric: "rejectionRate",
            model: "comment",
            derived: { op: "percent", of: ["REJECTED", "decided"] },
            format: "percent",
            invert: true,
            icon: "mdi:cancel",
          },
          {
            // Community size. Against total comments it is the brigading
            // detector: 500 comments from 300 people is a healthy thread,
            // 500 from 4 is a fight.
            id: "unique_commenters",
            title: t("total_commenters"),
            metric: "uniqueCommenters",
            model: "comment",
            aggregation: { field: "userId", op: "countDistinct" },
            valueMode: "current",
            format: "number",
            icon: "mdi:account-group",
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
            // Volume and mix in one card; the PENDING band on old buckets is
            // visible rot. Replaces the donut, the status bar, the hour bar
            // and the four-series line.
            id: "moderationOutcomes",
            title: t("comment_status_breakdown"),
            type: "stackedBar",
            model: "comment",
            metrics: ["APPROVED", "REJECTED", "PENDING"],
            labels: {
              APPROVED: tCommon("approved"),
              REJECTED: tCommon("rejected"),
              PENDING: tCommon("pending"),
            },
          },
        ],
      },
    ],

    // ─────────────────────────────────────────────────────────────
    // The period's cohort, and whether moderation is keeping pace with it.
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
            // An explicit COUNT(id) rather than the free `total` alias. The
            // engine now namespaces the snapshot row count (`__snapshotTotal`)
            // so `total` survives the four `current` cards above, but naming
            // the aggregate keeps the intake figure and the rate denominator
            // visibly the same number.
            id: "comments_received",
            title: tCommon("total_comments"),
            metric: "commentsReceived",
            model: "comment",
            aggregation: { field: "id", op: "count" },
            valueMode: "periodTotal",
            format: "number",
            icon: "mdi:comment-multiple",
          },
          {
            id: "approved_period",
            title: tCommon("approved"),
            metric: "APPROVED",
            model: "comment",
            aggregation: { field: "status", value: "APPROVED" },
            valueMode: "periodTotal",
            format: "number",
            icon: "mdi:check-circle",
          },
          {
            id: "rejected_period",
            title: tCommon("rejected"),
            metric: "REJECTED",
            model: "comment",
            aggregation: { field: "status", value: "REJECTED" },
            valueMode: "periodTotal",
            format: "number",
            invert: true,
            icon: "mdi:close-circle",
          },
          {
            // The unresolved slice of this period's inflow. Distinct from
            // `moderation_queue` above, which ignores the window.
            id: "pending_period",
            title: t("still_unmoderated"),
            metric: "PENDING",
            model: "comment",
            aggregation: { field: "status", value: "PENDING" },
            valueMode: "periodTotal",
            format: "number",
            invert: true,
            icon: "mdi:clock-outline",
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
            // Inflow against moderated. Where the decided line runs under the
            // received line, the queue is growing; the crossover is when to
            // add a moderator.
            id: "commentsOverTime",
            title: t("comment_trends_over_time"),
            type: "line",
            model: "comment",
            metrics: ["total", "decided"],
            labels: {
              total: tCommon("total_comments"),
              decided: "Moderated",
            },
          },
        ],
      },
    ],
  ] as AnalyticsConfig;
}
