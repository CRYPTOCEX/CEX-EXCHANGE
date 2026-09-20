"use client";
import { AnalyticsConfig } from "@/components/blocks/data-table/types/analytics";
import { useTranslations } from "next-intl";

/**
 * The withdrawal desk.
 * ============================================================================
 *
 * This file used to be a byte-for-byte copy of `deposit/log/analytics.ts` with
 * two titles changed, which is the wrong dashboard: money leaves here, and a
 * PENDING withdrawal has ALREADY been debited from the customer's wallet
 * (`finance/withdraw/fiat/index.post.ts` debits, then downgrades the row to
 * PENDING). Unsettled withdrawals are therefore an outstanding payout
 * LIABILITY — money taken and not yet sent — not a to-do count.
 *
 * So the two pages now share a skeleton and nothing else. The deposit desk
 * leads with revenue landed; this one leads with what has to be covered today
 * and what is stuck.
 *
 * The page mounts `model="transaction"` with `modelConfig={{ type: "WITHDRAW" }}`,
 * which `analysis.post.ts` applies as the SQL `where` on both the windowed and
 * the snapshot pass, so no card repeats the type guard.
 *
 * Second pass — the clock. A payout desk is measured in elapsed time: how long
 * the oldest unapproved request has waited, how many are wedged mid-flight, and
 * how long a payout takes end to end. None of the three was expressible before
 * duration aggregates and NOW()-relative predicates existed, so the page could
 * only report that money was stuck, never for how long.
 *
 * Limits that still shape this file:
 *  - liability stays two snapshot sums plus a `derived` addition rather than
 *    one `status IN (...)` sum, because the two legs are individually useful
 *    (awaiting a human vs handed to the connector) and the total is free.
 *  - there is no `paidAt`/`approvedAt` column, so "Time to Payout" differences
 *    `createdAt` against `updatedAt`. That is the moment the row last changed,
 *    which for a settled payout is the settlement write — right for a payout
 *    decided once, an OVERSTATE for one touched again later.
 *  - "Payout Value by Method" is still out, for a schema reason rather than an
 *    engine one: the method lives inside the `metadata` JSON blob and a JSON
 *    path is not an aggregatable column. The ranked breakdown that IS here
 *    groups on `userId`, which the engine resolves to an email through the
 *    model's `belongsTo(user)` association.
 *  - `transaction` has no currency column — it hangs off the wallet — so every
 *    SUM below used to add naira to bitcoin to tether and render the total with
 *    a dollar sign in front of it. A liability of 50,000 NGN read as "$50,000"
 *    on a desk that had to cover about $36. The value cards now carry
 *    `inUSD: "wallet.currency"`, the one BelongsTo hop the engine allows, so
 *    each denomination is priced at its own rate and anything it has no rate for
 *    is named on the card instead of counted as zero. The ranked bar in section
 *    2 stays raw magnitude: a top-N breakdown is its own GROUP BY and cannot
 *    also group by currency.
 */
export function useAnalytics(): AnalyticsConfig {
  const t = useTranslations("common");

  return [
    // ─────────────────────────────────────────────────────────────
    // Section 1 — liability first (it has to be covered today), then
    // the two numbers that trigger an intervention this hour.
    // ─────────────────────────────────────────────────────────────
    [
      {
        type: "kpi",
        responsive: {
          mobile: { cols: 1 },
          tablet: { cols: 2, span: 2 },
          desktop: { cols: 4, span: 2 },
        },
        items: [
          {
            // PENDING + PROCESSING, as of now. Both legs are snapshots, so the
            // headline is right even though the per-bucket sparkline underneath
            // a snapshot card is necessarily flat.
            id: "outstanding_payout_liability",
            title: t("outstanding_payout_liability"),
            metric: "payoutLiability",
            model: "transaction",
            derived: {
              op: "sum",
              of: ["pendingPayoutValue", "inFlightPayoutValue"],
            },
            format: "currency",
            invert: true,
            icon: "mdi:scale-balance",
          },
          {
            id: "pending_payout_value",
            title: t("awaiting_approval_value"),
            metric: "pendingPayoutValue",
            model: "transaction",
            aggregation: {
              field: "amount",
              op: "sum",
              inUSD: "wallet.currency",
              where: [{ field: "status", value: "PENDING" }],
            },
            valueMode: "current",
            format: "currency",
            invert: true,
            icon: "mdi:cash-clock",
          },
          {
            // `approve.post.ts` moves the row to PROCESSING BEFORE the external
            // call, so a crash leaves it there forever. Unbounded by the
            // timeframe on purpose: an old one is the whole point.
            id: "in_flight_payout_value",
            title: t("in_flight_value"),
            metric: "inFlightPayoutValue",
            model: "transaction",
            aggregation: {
              field: "amount",
              op: "sum",
              inUSD: "wallet.currency",
              where: [{ field: "status", value: "PROCESSING" }],
            },
            valueMode: "current",
            format: "currency",
            invert: true,
            icon: "mdi:cash-sync",
          },
          {
            /**
             * `approve.post.ts` flips the row to PROCESSING BEFORE the external
             * call and writes `updatedAt` as it does, so "PROCESSING and
             * untouched for an hour" is a payout the connector swallowed. This
             * is the single highest-urgency tile on the desk and it needed a
             * NOW()-relative predicate, so the page previously had to settle
             * for the unbounded PROCESSING value beside it.
             */
            id: "payouts_wedged_in_processing",
            title: t("wedged_in_processing_1h"),
            metric: "wedgedPayouts",
            model: "transaction",
            aggregation: {
              field: "id",
              op: "count",
              where: [
                { field: "status", value: "PROCESSING" },
                { field: "updatedAt", op: "<", value: { ago: "1h" } },
              ],
            },
            valueMode: "current",
            format: "number",
            invert: true,
            icon: "mdi:progress-alert",
          },
          {
            /**
             * How long the oldest unapproved payout has waited, in hours. A
             * withdrawal desk is judged on this number and it was not
             * expressible: it needs MAX(TIMESTAMPDIFF(HOUR, createdAt, NOW())).
             * `current`, so an ancient request cannot fall outside the window.
             */
            id: "oldest_pending_payout",
            title: t("oldest_pending_payout"),
            metric: "oldestPayoutAge",
            model: "transaction",
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
            /**
             * Request to money-out-the-door. See the header on why this is
             * measured against `updatedAt`.
             *
             * `current` (all time), and the title says so, because an AVERAGED
             * DURATION CANNOT BE WINDOWED CORRECTLY: `foldPeriod` divides the
             * `__alias__sum` / `__alias__cnt` companions that `buildAttributes`
             * builds from the RAW column — it mirrors `multiplyBy` into them
             * but not `since` — so a periodTotal average of a TIMESTAMPDIFF
             * divides a sum of datetimes by a row count and reads ~2e13 hours.
             * Snapshot mode reads the alias off an ungrouped query and is
             * exact. Do not switch the mode back.
             */
            id: "average_time_to_payout",
            title: t("avg_time_to_payout_all_time"),
            metric: "payoutHours",
            model: "transaction",
            aggregation: {
              field: "createdAt",
              op: "avg",
              since: { unit: "h", until: "updatedAt" },
              where: [{ field: "status", value: "COMPLETED" }],
            },
            valueMode: "current",
            format: "duration",
            invert: true,
            icon: "mdi:timer-check",
          },
          {
            // A payout handed to the exchange that never confirmed. Highest
            // urgency number on the desk and it appeared nowhere before.
            id: "timed_out_payouts",
            title: t("timed_out_payouts"),
            metric: "stuckPayouts",
            model: "transaction",
            aggregation: {
              field: "id",
              op: "count",
              where: [{ field: "status", value: "TIMEOUT" }],
            },
            valueMode: "current",
            format: "number",
            invert: true,
            icon: "mdi:alert-octagon",
          },
          {
            id: "settled_payout_value",
            title: t("settled_payout_value"),
            metric: "settledPayoutValue",
            model: "transaction",
            aggregation: {
              field: "amount",
              op: "sum",
              inUSD: "wallet.currency",
              where: [{ field: "status", value: "COMPLETED" }],
            },
            valueMode: "periodTotal",
            format: "currency",
            icon: "mdi:cash-check",
          },
          {
            /**
             * Every way a payout can end badly, over every payout that ended.
             * The numerator was REJECTED alone — the only member a single guard
             * could name — so a desk whose connector was timing out every
             * transfer reported a flat 0% rejection rate. An IN-list is the
             * only OR in the grammar, and this card is why it matters.
             */
            id: "payout_failure_rate",
            title: t("payout_failure_rate"),
            metric: "failureRate",
            model: "transaction",
            derived: { op: "percent", of: ["failedPayouts", "decidedPayouts"] },
            format: "percent",
            invert: true,
            icon: "mdi:percent-outline",
          },
          {
            id: "failed_payouts",
            title: t("rejected_failed_or_timed_out"),
            metric: "failedPayouts",
            model: "transaction",
            aggregation: {
              field: "id",
              op: "count",
              where: [
                { field: "status", values: ["REJECTED", "FAILED", "TIMEOUT"] },
              ],
            },
            valueMode: "periodTotal",
            format: "number",
            invert: true,
            icon: "mdi:close-octagon",
          },
          {
            // The denominator above: everything that reached a terminal state.
            // One negated IN-list rather than a chain of negated guards, which
            // was only correct until somebody added a status.
            id: "payouts_decided",
            title: t("payouts_decided"),
            metric: "decidedPayouts",
            model: "transaction",
            aggregation: {
              field: "id",
              op: "count",
              where: [
                {
                  field: "status",
                  values: ["PENDING", "PROCESSING"],
                  negate: true,
                },
              ],
            },
            valueMode: "periodTotal",
            format: "number",
            icon: "mdi:gavel",
          },
          {
            id: "withdrawal_fees_earned",
            title: t("withdrawal_fees_earned"),
            metric: "payoutFees",
            model: "transaction",
            aggregation: {
              field: "fee",
              op: "sum",
              inUSD: "wallet.currency",
              where: [{ field: "status", value: "COMPLETED" }],
            },
            valueMode: "periodTotal",
            format: "currency",
            icon: "mdi:cash-plus",
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
            /**
             * All ten members. The previous donut omitted REJECTED and TIMEOUT
             * — the two outcomes the withdrawal flow writes most
             * consequentially — so a desk whose payouts were all failing read
             * as a clean bill of health.
             */
            id: "withdrawal_outcome_mix",
            title: t("status_distribution"),
            type: "pie",
            model: "transaction",
            metrics: [
              "COMPLETED",
              "PENDING",
              "PROCESSING",
              "REJECTED",
              "FAILED",
              "TIMEOUT",
              "FROZEN",
              "CANCELLED",
              "EXPIRED",
              "REFUNDED",
            ],
            config: {
              field: "status",
              status: [
                {
                  value: "COMPLETED",
                  label: t("completed"),
                  color: "green",
                  icon: "mdi:check-circle",
                },
                {
                  value: "PENDING",
                  label: t("pending"),
                  color: "amber",
                  icon: "mdi:clock-outline",
                },
                {
                  value: "PROCESSING",
                  label: t("processing"),
                  color: "blue",
                  icon: "mdi:sync",
                },
                {
                  value: "REJECTED",
                  label: t("rejected"),
                  color: "red",
                  icon: "mdi:close-octagon",
                },
                {
                  value: "FAILED",
                  label: t("failed"),
                  color: "red",
                  icon: "mdi:alert-circle",
                },
                {
                  value: "TIMEOUT",
                  label: t("timeout"),
                  color: "purple",
                  icon: "mdi:timer-alert",
                },
                {
                  value: "FROZEN",
                  label: t("frozen"),
                  color: "purple",
                  icon: "mdi:snowflake",
                },
                {
                  value: "CANCELLED",
                  label: t("cancelled"),
                  color: "gray",
                  icon: "mdi:cancel",
                },
                {
                  value: "EXPIRED",
                  label: t("expired"),
                  color: "gray",
                  icon: "mdi:calendar-remove",
                },
                {
                  value: "REFUNDED",
                  label: t("refunded"),
                  color: "cyan",
                  icon: "mdi:cash-refund",
                },
              ],
            },
          },
        ],
      },
    ],

    // ─────────────────────────────────────────────────────────────
    // Section 2 — the failure signature. A widening unsettled band
    // (PENDING + PROCESSING) against a shrinking settled one is a desk
    // falling behind, and it is only visible when the outcomes are
    // stacked in one bar rather than split across five counters.
    // ─────────────────────────────────────────────────────────────
    [
      {
        type: "chart",
        responsive: {
          mobile: { span: 1 },
          tablet: { span: 2 },
          desktop: { span: 2 },
        },
        items: [
          {
            id: "payout_outcome_over_time",
            title: t("payout_outcomes_and_backlog_over_time"),
            type: "stackedBar",
            model: "transaction",
            metrics: [
              "COMPLETED",
              "PROCESSING",
              "PENDING",
              "REJECTED",
              "TIMEOUT",
              "FAILED",
            ],
            labels: {
              COMPLETED: t("completed"),
              PROCESSING: t("processing"),
              PENDING: t("pending"),
              REJECTED: t("rejected"),
              TIMEOUT: t("timeout"),
              FAILED: t("failed"),
            },
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
            /**
             * Where the money is going. On a payouts desk this is the
             * fraud-and-AML card: a single account taking a large share of the
             * period's outflow is the row to look at before it settles, and it
             * could not be asked for — the categories are DATA.
             *
             * Grouped on `userId`; the engine resolves it through the
             * `belongsTo(user)` association to an email, and falls back to the
             * raw id rather than failing. SETTLED value, so an unapproved
             * request cannot inflate a rank.
             */
            id: "top_withdrawers",
            title: t("top_withdrawers_by_settled_value"),
            type: "bar",
            model: "transaction",
            metrics: [],
            config: {
              groupBy: "userId",
              limit: 8,
              measure: {
                field: "amount",
                op: "sum",
                where: [{ field: "status", value: "COMPLETED" }],
              },
            },
          },
        ],
      },
    ],
  ];
}
