"use client";
import { AnalyticsConfig } from "@/components/blocks/data-table/types/analytics";
import { useTranslations } from "next-intl";

/**
 * Blog author-application analytics.
 * ============================================================================
 *
 * This is an APPROVAL QUEUE, and the old page could not describe one. Six of
 * its thirteen cards — `approvalRate`, `rejectionRate`, `pendingRate`,
 * `totalPosts`, `averagePosts`, `activeAuthors` — named aliases nothing
 * produced and rendered a confident `0`; the remaining seven were one
 * three-valued enum drawn five separate ways (four KPIs, a donut, a bar and a
 * four-series line).
 *
 * Two things fix it.
 *
 * 1. QUEUE DEPTH IS A STOCK. Every aggregate here is windowed by `createdAt`,
 *    so "pending" used to mean "applications submitted inside the window that
 *    are still pending" — an application filed last year and never reviewed was
 *    invisible. `valueMode: "current"` drops the window and answers "how many
 *    are open right now", which is the entire morning check.
 *
 * 2. THE RATE DENOMINATOR MUST BE *DECIDED*, NOT *TOTAL*. Approved/total falls
 *    when reviewers get SLOWER, because backlog inflates the denominator —
 *    exactly backwards as a measure of how strict the gate is. `decided` counts
 *    applications whose status is no longer PENDING, and the ratio is taken
 *    against that.
 *
 * The two things a queue is judged on — how long the oldest thing has waited,
 * and how long a verdict takes — are now on the page:
 *
 *  - `oldest_open_application` is EXACT. It is NOW() - createdAt over the
 *    PENDING rows, so it needs no second timestamp and no assumption.
 *  - `decision_latency` is a PROXY, and this is the caveat to read before
 *    trusting it. There is no `reviewedAt` column; the only evidence a decision
 *    happened is that `status` is no longer PENDING, so the card differences
 *    `updatedAt` against `createdAt` over decided rows. An application row
 *    carries nothing but a userId and a status, and the status change is the
 *    only write it ever receives — which is what makes the proxy defensible
 *    here and not on, say, `post`. Add an editable column to this table and the
 *    card silently starts measuring "time to last touch" instead.
 *
 * Both duration cards are `valueMode: "current"` deliberately: a `since`
 * aggregate under `periodTotal` gets folded across buckets, and the `avg` fold
 * re-reads the raw date column rather than the elapsed time. The snapshot pass
 * is the only mode that returns an elapsed-time average unmangled.
 *
 * Not buildable today (engine): per-series `dateField`, so the true in-vs-out
 * picture (received on `createdAt` against decided on `updatedAt`) is
 * approximated by plotting both series on the intake axis; and the cross-model
 * anti-join behind "approved authors who never published". There is no ranked
 * breakdown here either — the only non-enum column is `userId`, a UUID, which
 * would draw ten bars labelled with hex.
 *
 * `author` carries a UNIQUE index on `userId`, so `countDistinct` on it would
 * be identical to `count` — deliberately not used.
 */
export function useAnalytics() {
  const t = useTranslations("blog_admin");
  const tCommon = useTranslations("common");

  return [
    // ─────────────────────────────────────────────────────────────
    // The approval desk: how deep is the queue, and how is it being worked.
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
            // Unwindowed queue depth. The number that says whether anyone needs
            // to do anything today.
            id: "open_applications",
            title: t("open_applications"),
            metric: "openApplications",
            model: "author",
            aggregation: { field: "status", value: "PENDING" },
            valueMode: "current",
            format: "number",
            invert: true,
            icon: "mdi:inbox-arrow-down",
          },
          {
            // How long the worst-served applicant has been waiting. A queue of
            // 8 is fine; a queue of 8 whose oldest member filed in March is a
            // broken process, and only this card can tell them apart.
            // Measured in hours; the card promotes to days past 48.
            id: "oldest_open_application",
            title: t("oldest_open_application"),
            metric: "oldestOpenApplication",
            model: "author",
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
            // The roster itself — every approved author, not just those
            // approved inside the window.
            id: "approved_roster",
            title: t("approved_authors"),
            metric: "approvedRoster",
            model: "author",
            aggregation: { field: "status", value: "APPROVED" },
            valueMode: "current",
            format: "number",
            icon: "mdi:account-check",
          },
          {
            // Reviewer throughput: applications from this period that have
            // reached a verdict either way.
            id: "decisions_made",
            title: t("applications_decided"),
            metric: "decided",
            model: "author",
            aggregation: {
              op: "count",
              field: "id",
              where: [{ field: "status", value: "PENDING", negate: true }],
            },
            valueMode: "periodTotal",
            format: "number",
            icon: "mdi:gavel",
          },
          {
            // Time from application to verdict, over the applications that got
            // one. `values` is the IN-list — the only OR in the grammar — and
            // it states the denominator literally instead of leaning on
            // "not PENDING", which would silently absorb any status added
            // later. PROXY: `updatedAt`, see the note at the top of the file.
            id: "decision_latency",
            title: tCommon("average_time_to_process_applications"),
            metric: "decisionLatency",
            model: "author",
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
            // Strictness of the gate. Denominator is DECIDED, never total.
            id: "approval_rate",
            title: tCommon("approval_rate"),
            metric: "approvalRate",
            model: "author",
            derived: { op: "percent", of: ["APPROVED", "decided"] },
            format: "percent",
            icon: "mdi:percent",
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
            // Outcome mix per intake bucket. A tall PENDING band on an old
            // month is an abandoned cohort — visible here and nowhere else.
            // Replaces the donut, the status bar and the four-series line.
            id: "applicationOutcomes",
            title: t("author_status_breakdown"),
            type: "stackedBar",
            model: "author",
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
    // The intake cohort, and whether decisions are keeping pace with it.
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
            // so `total` is no longer clobbered by the four `current` cards on
            // this page, but naming the aggregate keeps the intake figure and
            // the rate denominator visibly the same number.
            id: "applications_received",
            title: tCommon("total_applications"),
            metric: "applicationsReceived",
            model: "author",
            aggregation: { field: "id", op: "count" },
            valueMode: "periodTotal",
            format: "number",
            icon: "mdi:file-document-multiple-outline",
          },
          {
            id: "approved_period",
            title: tCommon("approved"),
            metric: "APPROVED",
            model: "author",
            aggregation: { field: "status", value: "APPROVED" },
            valueMode: "periodTotal",
            format: "number",
            icon: "mdi:check-circle",
          },
          {
            id: "rejected_period",
            title: tCommon("rejected"),
            metric: "REJECTED",
            model: "author",
            aggregation: { field: "status", value: "REJECTED" },
            valueMode: "periodTotal",
            format: "number",
            invert: true,
            icon: "mdi:close-circle",
          },
          {
            // The unresolved slice of this period's intake. Distinct from
            // `open_applications` above, which ignores the window entirely.
            id: "pending_period",
            title: t("still_awaiting_review"),
            metric: "PENDING",
            model: "author",
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
            // In vs out. Both series sit on the intake axis because the engine
            // has one date column per request; where the decided line runs
            // under the received line, the backlog is growing.
            id: "authorsOverTime",
            title: t("author_applications_over_time"),
            type: "line",
            model: "author",
            metrics: ["total", "decided"],
            labels: {
              total: tCommon("total_applications"),
              decided: "Decided",
            },
          },
        ],
      },
    ],
  ] as AnalyticsConfig;
}
