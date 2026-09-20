"use client";

import { AnalyticsConfig } from "@/components/blocks/data-table/types/analytics";

import { useTranslations } from "next-intl";
export function useAnalytics() {
  const t = useTranslations("finance_history");
  const tCommon = useTranslations("common");
  return [
    // ─────────────────────────────────────────────────────────────
    // Group 1: Funding position. A transaction history is a money document, and
    // the four cards that used to sit here counted rows by status — a number the
    // table underneath already shows, per row, with more detail.
    //
    // The type section that followed (four count KPIs + a four-slice donut over a
    // FORTY-THREE member enum) is deleted outright. The split a user cares about
    // is by value, and "am I net in or net out" is one number, not a donut that
    // silently omits thirty-nine members.
    // ─────────────────────────────────────────────────────────────
    [
      {
        type: "kpi",
        layout: { cols: 2, rows: 2 },
        responsive: {
          mobile: { cols: 1, span: 1 },
          tablet: { cols: 2, span: 2 },
          desktop: { cols: 2, span: 2 },
        },
        items: [
          {
            id: "total_deposited",
            title: tCommon("total_deposited"),
            metric: "depositValue",
            model: "transaction",
            aggregation: {
              field: "amount",
              op: "sum",
              inUSD: "wallet.currency",
              where: [
                { field: "type", value: "DEPOSIT" },
                { field: "status", value: "COMPLETED" },
              ],
            },
            format: "currency",
            icon: "mdi:bank-transfer-in",
          },
          {
            id: "total_withdrawn",
            title: tCommon("total_withdrawn"),
            metric: "withdrawValue",
            model: "transaction",
            aggregation: {
              field: "amount",
              op: "sum",
              inUSD: "wallet.currency",
              where: [
                { field: "type", value: "WITHDRAW" },
                { field: "status", value: "COMPLETED" },
              ],
            },
            format: "currency",
            icon: "mdi:bank-transfer-out",
          },
          {
            /**
             * The one number that summarises a funding history. Neither half of
             * it existed before, and the difference could not be expressed at all.
             */
            id: "net_flow",
            title: t("net_flow"),
            metric: "netFlow",
            model: "transaction",
            derived: { op: "diff", of: ["depositValue", "withdrawValue"] },
            format: "currency",
            icon: "mdi:swap-vertical",
          },
          {
            /**
             * Money committed that has not landed. Still built as two sums plus a
             * `derived` addition rather than one IN-list: the grammar now has an
             * IN-list (see "Failed or Rejected Value" below), but keeping the two
             * legs separate is what makes PROCESSING visible at all, and the
             * total is free either way.
             */
            id: "in_flight",
            title: tCommon("in_flight"),
            metric: "inFlight",
            model: "transaction",
            derived: { op: "sum", of: ["pendingValue", "processingValue"] },
            format: "currency",
            invert: true,
            icon: "mdi:progress-clock",
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
            /**
             * All TEN members of `transaction.status`, not four. The old donut
             * omitted EXPIRED, REJECTED, REFUNDED, FROZEN, PROCESSING and
             * TIMEOUT, so it did not sum to the row count and every visible slice
             * read as a larger share than it was — and a user whose withdrawal
             * was FROZEN saw it in the table and in no chart above it.
             *
             * These slices are also where the `COMPLETED` and `FAILED` aliases
             * used by the trend chart at the bottom of the page come from.
             */
            id: "transactionStatusDistribution",
            title: tCommon("status_distribution"),
            type: "pie",
            model: "transaction",
            metrics: [
              "COMPLETED",
              "PENDING",
              "PROCESSING",
              "FAILED",
              "CANCELLED",
              "EXPIRED",
              "REJECTED",
              "REFUNDED",
              "FROZEN",
              "TIMEOUT",
            ],
            config: {
              field: "status",
              status: [
                {
                  value: "COMPLETED",
                  label: tCommon("completed"),
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
                  value: "PROCESSING",
                  label: tCommon("processing"),
                  color: "blue",
                  icon: "mdi:progress-clock",
                },
                {
                  value: "FAILED",
                  label: tCommon("failed"),
                  color: "red",
                  icon: "mdi:alert-circle",
                },
                {
                  value: "CANCELLED",
                  label: tCommon("cancelled"),
                  color: "purple",
                  icon: "mdi:cancel",
                },
                {
                  value: "EXPIRED",
                  label: tCommon("expired"),
                  color: "gray",
                  icon: "mdi:timer-off",
                },
                {
                  value: "REJECTED",
                  label: tCommon("rejected"),
                  color: "red",
                  icon: "mdi:close-circle",
                },
                {
                  value: "REFUNDED",
                  label: tCommon("refunded"),
                  color: "cyan",
                  icon: "mdi:cash-refund",
                },
                {
                  value: "FROZEN",
                  label: tCommon("frozen"),
                  color: "blue",
                  icon: "mdi:snowflake",
                },
                {
                  value: "TIMEOUT",
                  label: tCommon("timeout"),
                  color: "amber",
                  icon: "mdi:timer-alert",
                },
              ],
            },
          },
        ],
      },
    ],

    // ─────────────────────────────────────────────────────────────
    // Group 2: What is stuck, in currency. These are the two states an admin can
    // still act on plus the one that cost the user money, and they are the
    // components of "In Flight" above.
    // ─────────────────────────────────────────────────────────────
    {
      type: "kpi",
      layout: { cols: 3, rows: 1 },
      responsive: {
        mobile: { cols: 1, span: 1 },
        tablet: { cols: 3, span: 1 },
        desktop: { cols: 3, span: 1 },
      },
      items: [
        {
          id: "pending_value",
          title: t("pending_value"),
          metric: "pendingValue",
          model: "transaction",
          aggregation: {
            field: "amount",
            op: "sum",
            inUSD: "wallet.currency",
            where: [{ field: "status", value: "PENDING" }],
          },
          format: "currency",
          invert: true,
          icon: "mdi:clock-outline",
        },
        {
          id: "processing_value",
          title: t("processing_value"),
          metric: "processingValue",
          model: "transaction",
          aggregation: {
            field: "amount",
            op: "sum",
            inUSD: "wallet.currency",
            where: [{ field: "status", value: "PROCESSING" }],
          },
          format: "currency",
          invert: true,
          icon: "mdi:progress-clock",
        },
        {
          /**
           * Every way money can fail to move, as ONE figure.
           *
           * This card used to test `status = 'FAILED'` alone, because guards are
           * ANDed and there was no OR — so a user whose withdrawal was REJECTED
           * by compliance, EXPIRED unpaid or TIMED OUT at the gateway saw a
           * reassuring 0 under a heading that claimed to cover failures. An
           * IN-list is the only OR in the grammar and this is what it is for.
           */
          id: "failed_value",
          title: t("failed_or_rejected_value"),
          metric: "failureValue",
          model: "transaction",
          aggregation: {
            field: "amount",
            op: "sum",
            inUSD: "wallet.currency",
            where: [
              {
                field: "status",
                values: ["FAILED", "REJECTED", "EXPIRED", "TIMEOUT"],
              },
            ],
          },
          format: "currency",
          invert: true,
          icon: "mdi:alert-circle",
        },
      ],
    },

    // ─────────────────────────────────────────────────────────────
    // Group 3: Financial Overview – KPI Grid
    // ─────────────────────────────────────────────────────────────
    {
      type: "kpi",
      layout: { cols: 3, rows: 1 },
      responsive: {
        // `span: 2` on a section that is NOT an array opens a phantom second
        // column and leaves the row half-empty; this group is three cards wide
        // on its own.
        mobile: { cols: 1, span: 1 },
        tablet: { cols: 3, span: 1 },
        desktop: { cols: 3, span: 1 },
      },
      /**
       * Two of these three carried a comment describing the SUM they wanted —
       * "SUM(amount); aggregator must perform a SUM operation" — and no
       * `aggregation` block, because there was no way to write one. They read 0
       * for as long as the page has existed, and they are now expressed and
       * scoped to SETTLED rows: a pending or failed transfer is not money that
       * moved, and totalling it overstates the figure exactly when something is
       * going wrong. The third, "Average Amount", is replaced outright — see
       * below.
       */
      items: [
        {
          id: "total_transaction_amount",
          title: tCommon("total_amount"),
          metric: "settledAmount",
          model: "transaction",
          aggregation: {
            field: "amount",
            op: "sum",
            inUSD: "wallet.currency",
            where: [{ field: "status", value: "COMPLETED" }],
          },
          format: "currency",
          icon: "mdi:cash-multiple",
        },
        {
          id: "total_fees",
          title: tCommon("total_fees"),
          metric: "settledFees",
          model: "transaction",
          aggregation: {
            field: "fee",
            op: "sum",
            inUSD: "wallet.currency",
            where: [{ field: "status", value: "COMPLETED" }],
          },
          format: "currency",
          invert: true,
          icon: "mdi:cash",
        },
        {
          /**
           * How long money actually takes to move, in hours.
           *
           * Replaces "Average Amount", which is a statistic about a user's own
           * table — visible per row, one column over — rather than something
           * they can act on. Time to settle is the question a funding history
           * is opened to answer, and it needs a duration aggregate.
           *
           * `transaction` has no `settledAt`, so this differences `createdAt`
           * against `updatedAt`, the write the settlement path makes. Correct
           * for a row settled once; an OVERSTATE for one touched again later
           * (a refund against the same row, a soft delete).
           *
           * `current` — the whole history, which is what this page is — and it
           * also has to be: `foldPeriod` divides an `avg` by the
           * `__alias__sum`/`__alias__cnt` companions, `buildAttributes` builds
           * those from the RAW column and does not mirror `since` into them, so
           * a windowed average of a TIMESTAMPDIFF divides a sum of datetimes by
           * a row count and prints ~2e13 hours. Snapshot mode reads the alias
           * off an ungrouped query and is exact.
           */
          id: "average_time_to_settle",
          title: t("average_time_to_settle"),
          metric: "settleHours",
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
      ],
    },

    // ─────────────────────────────────────────────────────────────
    // Group 4: Transaction Trends Over Time – Full-Width Line Chart
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
          id: "transactionsOverTime",
          title: tCommon("transactions_over_time"),
          type: "line",
          model: "transaction",
          /**
           * Was eleven series. Six of them — EXPIRED, REJECTED, REFUNDED,
           * FROZEN, PROCESSING, TIMEOUT — named statuses no card on this page
           * declared, so they resolved to `?? 0` and drew flat lines along the
           * axis WITH legend entries above them, which reads as "we measured
           * this and it is zero". The five that did resolve were unreadable
           * anyway: eleven lines on one 240px axis is not a chart.
           *
           * Three series, and they answer the question the page is for: how much
           * am I transacting, how much of it lands, how much of it does not.
           */
          metrics: ["total", "COMPLETED", "FAILED"],
          labels: {
            total: "Total",
            COMPLETED: "Completed",
            FAILED: "Failed",
          },
        },
      ],
    },
  ] as AnalyticsConfig;
}
