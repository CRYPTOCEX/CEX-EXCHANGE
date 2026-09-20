"use client";
import { AnalyticsConfig } from "@/components/blocks/data-table/types/analytics";
import { useTranslations } from "next-intl";

/**
 * The deposit desk.
 * ============================================================================
 *
 * The page mounts `model="transaction"` with `modelConfig={{ type: "DEPOSIT" }}`,
 * and `analysis.post.ts` passes that straight through as the SQL `where`, so
 * every aggregate below is already scoped to deposits — in the windowed pass
 * AND in the `current` snapshot pass. No card needs its own `type` guard.
 *
 * What changed: this page used to be five row-counters and a five-of-ten status
 * donut, and could not display a single amount of money. It now leads with
 * settled VALUE, sizes the approval queue in money rather than rows, and states
 * the approval rate as a ratio instead of asking the reader to divide two
 * counters in their head.
 *
 * Second pass — the SLA half of the desk, which the old grammar could not ask
 * for at all. A deposit queue is judged on how LONG money waits, not only on
 * how much of it is waiting, so the page now carries the age of the oldest
 * unapproved deposit, the count that has breached 48 hours, and the mean time
 * from arrival to decision.
 *
 * Limits that still shape this file:
 *  - `transaction` has NO currency column — it lives on `wallet` — so every SUM
 *    here used to add naira to bitcoin to tether and then print the result with
 *    a dollar sign on it: a 50,000 NGN deposit was shown as "$50,000" when it is
 *    about $36. The value cards now carry `inUSD: "wallet.currency"`, which is
 *    the one BelongsTo hop the engine allows (`transaction.belongsTo(wallet, {
 *    as: "wallet" })`), so each denomination is priced at its own rate and
 *    anything with no rate is named on the card rather than folded in as zero.
 *    The ranked bar in section 2 is still raw magnitude — a top-N breakdown is
 *    its own GROUP BY and cannot also group by currency.
 *  - There is no `decidedAt`/`approvedAt` column. "Time to Decision" therefore
 *    differences `createdAt` against `updatedAt`, which is written by the
 *    approve/reject routes — correct for a row decided once, and an OVERSTATE
 *    for a row touched again afterwards (a later refund, a soft delete).
 *  - "Deposit Value by Method" is still unbuildable, and for a schema reason
 *    rather than an engine one: the method lives inside the `metadata` JSON
 *    blob, and a JSON path is not an aggregatable column. The ranked
 *    breakdown that IS here groups on `userId`, which the engine resolves to
 *    an email through the model's `belongsTo(user)` association.
 */
export function useAnalytics(): AnalyticsConfig {
  const t = useTranslations("common");

  return [
    // ─────────────────────────────────────────────────────────────
    // Section 1 — the 9am read, in the order the desk asks for it:
    // money landed / money owed a decision / how big is the queue /
    // is something breaking / what did we earn.
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
            id: "settled_deposit_value",
            title: t("settled_deposit_value"),
            metric: "settledValue",
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
            // A STOCK: every deposit still unapproved, whenever it arrived. The
            // old card windowed this on `createdAt`, so a deposit stuck since
            // March was invisible in August — precisely the row that matters.
            id: "pending_deposit_value",
            title: t("pending_deposit_value"),
            metric: "pendingValue",
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
            id: "deposits_awaiting_approval",
            title: t("awaiting_approval"),
            metric: "pendingCount",
            model: "transaction",
            aggregation: {
              field: "id",
              op: "count",
              where: [{ field: "status", value: "PENDING" }],
            },
            valueMode: "current",
            format: "number",
            invert: true,
            icon: "mdi:tray-full",
          },
          {
            /**
             * How long the oldest unapproved deposit has been sitting, in
             * hours. This is THE service-level number on a queue desk and the
             * page could not express it: `MAX(TIMESTAMPDIFF(HOUR, createdAt,
             * NOW()))` needs a duration aggregate.
             *
             * `current`, so the window cannot hide the row that matters — a
             * deposit stuck since March is invisible in an August window, and
             * that is exactly the one to look at.
             */
            id: "oldest_pending_deposit",
            title: t("oldest_pending_deposit"),
            metric: "oldestPendingAge",
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
            // The worklist behind the number above: how many have breached two
            // days. One old deposit is an outlier; forty is a broken desk.
            id: "deposits_breaching_sla",
            title: t("pending_over_48h"),
            metric: "agedPending",
            model: "transaction",
            aggregation: {
              field: "id",
              op: "count",
              where: [
                { field: "status", value: "PENDING" },
                { field: "createdAt", op: "<", value: { ago: "48h" } },
              ],
            },
            valueMode: "current",
            format: "number",
            invert: true,
            icon: "mdi:calendar-alert",
          },
          {
            /**
             * Mean hours from arrival to a decision. Measured against
             * `updatedAt` because the schema has no decision timestamp — see
             * the file header.
             *
             * `current`, i.e. ALL TIME, and the title says so. That is not a
             * preference: an AVERAGED DURATION CANNOT BE WINDOWED CORRECTLY BY
             * THIS ENGINE. `buildAttributes` emits the `__alias__sum` /
             * `__alias__cnt` companions that `foldPeriod` divides for an `avg`,
             * and it mirrors `multiplyBy` into them but NOT `since` — so the
             * period fold divides a SUM OF DATETIMES by a row count and the
             * card reads 2.0e13 hours. Verified against this database:
             * periodTotal gives 20253028644227.6, `current` gives 84.4, and
             * `SELECT AVG(TIMESTAMPDIFF(HOUR, createdAt, updatedAt))` gives
             * 84.381. Snapshot mode reads the alias straight off an ungrouped
             * query, so it is exact. Do not "fix" this by switching the mode
             * back.
             */
            id: "average_time_to_decision",
            title: t("avg_time_to_decision_all_time"),
            metric: "decisionHours",
            model: "transaction",
            aggregation: {
              field: "createdAt",
              op: "avg",
              since: { unit: "h", until: "updatedAt" },
              where: [
                { field: "status", values: ["COMPLETED", "REJECTED"] },
              ],
            },
            valueMode: "current",
            format: "duration",
            invert: true,
            icon: "mdi:timer-check",
          },
          {
            // Settled / decided, not settled / everything: a deposit that is
            // still pending has not failed, and counting it in the denominator
            // makes the rate sag every time volume rises.
            id: "deposit_approval_rate",
            title: t("approval_rate"),
            metric: "approvalRate",
            model: "transaction",
            derived: { op: "percent", of: ["COMPLETED", "decided"] },
            format: "percent",
            icon: "mdi:percent-outline",
          },
          {
            id: "deposit_fees_earned",
            title: t("deposit_fees_earned"),
            metric: "depositFees",
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
          {
            /**
             * NOT a currency figure, and the "$" has been taken off it.
             *
             * An average cannot be denominated: the engine rejects `inUSD` on
             * anything but a sum, because converting each row and then averaging
             * the results answers a question nobody asked, and averaging BEFORE
             * conversion divides a mixture of naira and bitcoin by a row count.
             * Either way the old card put a dollar sign on a number that was
             * dominated by whichever denomination has the largest unit count —
             * a desk taking naira read an "average deposit" in the tens of
             * thousands. As a bare number it still does the one job it is here
             * for: showing ticket size moving.
             */
            id: "average_settled_deposit",
            title: t("average_settled_deposit"),
            metric: "avgSettledDeposit",
            model: "transaction",
            aggregation: {
              field: "amount",
              op: "avg",
              where: [{ field: "status", value: "COMPLETED" }],
            },
            valueMode: "periodTotal",
            format: "number",
            icon: "mdi:calculator",
          },
          {
            id: "rejected_deposit_value",
            title: t("rejected_deposit_value"),
            metric: "rejectedValue",
            model: "transaction",
            aggregation: {
              field: "amount",
              op: "sum",
              inUSD: "wallet.currency",
              where: [{ field: "status", value: "REJECTED" }],
            },
            valueMode: "periodTotal",
            format: "currency",
            invert: true,
            icon: "mdi:cash-remove",
          },
          {
            // Desk throughput, and the denominator of the approval rate above.
            // One negated IN-list rather than a chain of negated guards: the
            // chain was only correct until somebody added a status.
            id: "deposit_decisions_made",
            title: t("decisions_made"),
            metric: "decided",
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
            /**
             * Money the gateway lost, as opposed to money the desk refused.
             * FAILED, TIMEOUT and EXPIRED are one operational bucket — a
             * connector problem — and separating them from REJECTED is the
             * difference between "tighten compliance" and "call the provider".
             * Needs an IN-list; guards are otherwise ANDed.
             */
            id: "gateway_failure_value",
            title: t("failed_or_timed_out_value"),
            metric: "gatewayFailureValue",
            model: "transaction",
            aggregation: {
              field: "amount",
              op: "sum",
              inUSD: "wallet.currency",
              where: [
                { field: "status", values: ["FAILED", "TIMEOUT", "EXPIRED"] },
              ],
            },
            valueMode: "periodTotal",
            format: "currency",
            invert: true,
            icon: "mdi:cloud-alert",
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
             * The WHOLE enum, all ten members. The previous donut listed five,
             * and the omitted ones were the consequential ones: REJECTED is
             * what the admin's own reject route writes, and TIMEOUT is what
             * every gateway verify route writes. Their segments could not be
             * drawn at all, so the donut provably disagreed with the counts
             * beside it.
             *
             * Ten segments against seven distinguishable hues, so three pairs
             * share deliberately and each pair is a pair a reader would look up
             * together: FAILED/REJECTED (refused), TIMEOUT/FROZEN (stuck, needs
             * a human), CANCELLED/EXPIRED (lapsed without a decision).
             */
            id: "deposit_outcome_mix",
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
    // Section 2 — trend, once the current state is known, and beside it
    // the concentration question. Value, not count: a bad day is either
    // a volume dip or a settlement failure, and on a count chart the two
    // look identical.
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
            id: "deposit_value_by_outcome",
            title: t("deposit_value_by_outcome_over_time"),
            type: "stackedBar",
            model: "transaction",
            metrics: ["settledValue", "rejectedValue", "gatewayFailureValue"],
            labels: {
              settledValue: "Settled",
              rejectedValue: "Rejected",
              gatewayFailureValue: "Failed / Timed Out",
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
             * Who the money comes from. Deposit concentration is an AML
             * question before it is a commercial one — one account supplying a
             * quarter of the period's funding is a review, not a milestone —
             * and it was unaskable: the categories are DATA, not enum members.
             *
             * Grouped on `userId`, which the engine resolves through the
             * `belongsTo(user)` association to an email; if that lookup finds
             * nothing the raw id shows and the ranking is still correct.
             * Windowed on purpose — "top depositors THIS period".
             */
            id: "top_depositors",
            title: t("top_depositors_by_settled_value"),
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
