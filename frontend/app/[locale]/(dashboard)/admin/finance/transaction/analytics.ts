"use client";
import { AnalyticsConfig } from "@/components/blocks/data-table/types/analytics";
import { useTranslations } from "next-intl";

/**
 * The master ledger.
 * ============================================================================
 *
 * This page has no `modelConfig`, so it is EVERY row of `transaction` — all 44
 * members of `type`, every flow on the platform. That makes it the only surface
 * that can report platform-wide fee revenue and net flow, and it reported
 * neither: "Total Volume", "Total Fees" and "Average Amount" were all a literal
 * 0 because the old engine dropped any aggregation without a `value`, and the
 * rest of the page was four hand-picked members of a 44-member enum plus two
 * donuts that covered 4-of-44 and 5-of-10.
 *
 * Deleted: all twelve. What replaces them is revenue, throughput, direction of
 * flow, and the money that is stuck.
 *
 * Second pass — the `type` dimension, which is the whole reason this page is
 * different from the deposit and withdraw desks. Forty-four members cannot be
 * hard-coded as cards, so they arrive as two ranked breakdowns: where the
 * settled money is, and where the fee revenue comes from. That is the question
 * the ledger exists to answer and it has never been on the screen.
 *
 * Notes for the next author:
 *  - `inflowValue` stays DEPOSIT and `outflowValue` stays WITHDRAW, and this is
 *    now a CHOICE rather than a limitation. The IN-list exists, but the obvious
 *    additions are not external money: `FOREX_DEPOSIT` debits the user's own
 *    wallet to fund a forex account (`forex/account/[id]/deposit.post.ts`) and
 *    `GATEWAY_PAYMENT` debits it to pay a merchant
 *    (`gateway/checkout/.../confirm.post.ts`). Both are internal movements, and
 *    counting them as platform inflow would double-count money that never
 *    crossed the boundary. The IN-list is used where it IS honest — the
 *    at-risk figure below.
 *  - `transaction` has no currency column — it is on `wallet` — so every SUM on
 *    this page used to add naira to bitcoin to tether and print the answer with
 *    a dollar sign on it. On the one screen that covers all 44 flows that is the
 *    worst place for it: "Net Platform Flow" was the difference between two
 *    heaps of mixed units. The KPIs now carry `inUSD: "wallet.currency"`, the
 *    single BelongsTo hop the engine allows, so each denomination is priced at
 *    its own rate and whatever has no rate is named on the card rather than
 *    counted as zero. The two ranked bars in sections 3 and 4 are still
 *    magnitude: a top-N breakdown is its own GROUP BY and cannot also group by
 *    currency, so read them as "which lines are big", not as dollar amounts.
 *  - "Fee revenue by type OVER TIME" is still not expressible: a ranked
 *    breakdown is a separate GROUP BY and cannot also carry the time axis.
 */
export function useAnalytics(): AnalyticsConfig {
  const t = useTranslations("common");

  return [
    // ─────────────────────────────────────────────────────────────
    // Section 1 — revenue, throughput, direction, exposure.
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
            id: "platform_fee_revenue",
            title: t("platform_fee_revenue"),
            metric: "feeRevenue",
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
            id: "settled_ledger_volume",
            title: t("settled_ledger_volume"),
            metric: "settledVolume",
            model: "transaction",
            aggregation: {
              field: "amount",
              op: "sum",
              inUSD: "wallet.currency",
              where: [{ field: "status", value: "COMPLETED" }],
            },
            valueMode: "periodTotal",
            format: "currency",
            icon: "mdi:cash-multiple",
          },
          {
            // Is money entering or leaving the platform this period? The one
            // number that decides treasury action, and it was uncomputable.
            id: "net_platform_flow",
            title: t("net_platform_flow"),
            metric: "netFlow",
            model: "transaction",
            derived: { op: "diff", of: ["inflowValue", "outflowValue"] },
            format: "currency",
            icon: "mdi:swap-vertical",
          },
          {
            id: "settled_deposits_in",
            title: t("settled_deposits_in"),
            metric: "inflowValue",
            model: "transaction",
            aggregation: {
              field: "amount",
              op: "sum",
              inUSD: "wallet.currency",
              where: [
                { field: "status", value: "COMPLETED" },
                { field: "type", value: "DEPOSIT" },
              ],
            },
            valueMode: "periodTotal",
            format: "currency",
            icon: "mdi:bank-transfer-in",
          },
          {
            id: "settled_withdrawals_out",
            title: t("settled_withdrawals_out"),
            metric: "outflowValue",
            model: "transaction",
            aggregation: {
              field: "amount",
              op: "sum",
              inUSD: "wallet.currency",
              where: [
                { field: "status", value: "COMPLETED" },
                { field: "type", value: "WITHDRAW" },
              ],
            },
            valueMode: "periodTotal",
            format: "currency",
            invert: true,
            icon: "mdi:bank-transfer-out",
          },
          {
            /**
             * A STOCK — every unresolved row on the platform, in money.
             *
             * PENDING, PROCESSING and FROZEN are one question ("what has not
             * landed") and three separate cards answered it three times, each
             * understating it. An IN-list is the only OR in the grammar, so
             * before it existed this figure could not be written at all.
             */
            id: "value_at_risk",
            title: t("unsettled_value_at_risk"),
            metric: "atRiskValue",
            model: "transaction",
            aggregation: {
              field: "amount",
              op: "sum",
              inUSD: "wallet.currency",
              where: [
                { field: "status", values: ["PENDING", "PROCESSING", "FROZEN"] },
              ],
            },
            valueMode: "current",
            format: "currency",
            invert: true,
            icon: "mdi:cash-clock",
          },
          {
            // A SUBSET of the figure above, broken out because it is the only
            // one of the three a human has to clear by hand. FROZEN is a
            // compliance hold, and it was not representable anywhere on the
            // platform before this card.
            id: "value_under_compliance_hold",
            title: t("value_under_compliance_hold"),
            metric: "frozenValue",
            model: "transaction",
            aggregation: {
              field: "amount",
              op: "sum",
              inUSD: "wallet.currency",
              where: [{ field: "status", value: "FROZEN" }],
            },
            valueMode: "current",
            format: "currency",
            invert: true,
            icon: "mdi:snowflake",
          },
          {
            /**
             * A data-integrity alarm, not a money figure.
             *
             * `transaction.ts` documents ADJUSTMENT_ANCHOR rows as short-lived:
             * an admin balance adjustment creates one purely to mint a stable
             * idempotency key and soft-deletes it as soon as the real credit
             * lands. A surviving PENDING one means a crashed admin request.
             *
             * The "older than an hour" guard is what makes this a real alarm
             * rather than a number that flickers: without it every in-flight
             * adjustment counted, so the tile was never zero and nobody could
             * tell a transient row from a wedged one.
             */
            id: "orphaned_adjustment_anchors",
            title: t("orphaned_adjustment_anchors"),
            metric: "orphanAnchors",
            model: "transaction",
            aggregation: {
              field: "id",
              op: "count",
              where: [
                { field: "type", value: "ADJUSTMENT_ANCHOR" },
                { field: "status", value: "PENDING" },
                { field: "createdAt", op: "<", value: { ago: "1h" } },
              ],
            },
            valueMode: "current",
            format: "number",
            invert: true,
            icon: "mdi:link-off",
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
            // All ten status members. The old donut had five, so a FROZEN
            // compliance hold or a TIMEOUT payout could not be drawn at all and
            // the segments never summed to the count beside them.
            id: "transaction_outcome_mix",
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
    // Section 2 — the treasury chart. Two comparable money series;
    // the gap between them IS the net flow KPI above, drawn.
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
          id: "platform_flow_over_time",
          title: t("money_in_vs_money_out"),
          type: "bar",
          model: "transaction",
          metrics: ["inflowValue", "outflowValue"],
          labels: {
            inflowValue: "Deposits In",
            outflowValue: "Withdrawals Out",
          },
        },
      ],
    },

    // ─────────────────────────────────────────────────────────────
    // Section 3 — WHERE the money is. `type` has forty-four members, so
    // it can only be read as a ranking; the page used to hard-code four
    // of them as counters and a donut that covered 4-of-44, which is a
    // sample, not a distribution. The outcome stackedBar that stood here
    // is gone: it restated the status donut above with a time axis, and
    // the deposit and withdraw desks already own status-over-time for
    // the two flows where it drives a decision.
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
          // Settled rows only, this period, cross-currency magnitude.
          id: "top_types_by_settled_value",
          title: t("top_transaction_types_by_settled_value"),
          type: "bar",
          model: "transaction",
          metrics: [],
          config: {
            groupBy: "type",
            limit: 10,
            measure: {
              field: "amount",
              op: "sum",
              where: [{ field: "status", value: "COMPLETED" }],
            },
          },
        },
      ],
    },

    // ─────────────────────────────────────────────────────────────
    // Section 4 — where the REVENUE comes from, which is a different
    // ranking from where the volume is: a high-volume internal transfer
    // line earns nothing, and a small gateway line can carry the desk.
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
          // Fees booked on settled rows, this period.
          id: "fee_revenue_by_type",
          title: t("fee_revenue_by_transaction_type"),
          type: "bar",
          model: "transaction",
          metrics: [],
          config: {
            groupBy: "type",
            limit: 10,
            measure: {
              field: "fee",
              op: "sum",
              where: [{ field: "status", value: "COMPLETED" }],
            },
          },
        },
      ],
    },
  ];
}
