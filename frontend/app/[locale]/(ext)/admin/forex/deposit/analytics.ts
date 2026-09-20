"use client";
import { AnalyticsConfig } from "@/components/blocks/data-table/types/analytics";
import { useTranslations } from "next-intl";

/**
 * Forex deposits — a money screen that finally shows money.
 *
 * `transaction.amount` is DECIMAL(36,18) and `fee` sits beside it, and the old
 * config aggregated neither: five counts of `status` and a pie that declared
 * four of the enum's ten members. PROCESSING was not hypothetical — the page's
 * own editCondition is `["PENDING","PROCESSING"].includes(item.status)`, so the
 * admin edited rows in a state no card counted.
 *
 * The page is pinned to `type: "FOREX_DEPOSIT"` by `modelConfig` in page.tsx,
 * which is forwarded as the `where` on every aggregate, so nothing here needs
 * to repeat the type filter.
 *
 * Liability cards are STOCKS (`valueMode: "current"`): "money sitting in the
 * queue right now", not "money that passed through the queue this month".
 *
 * TIME-TO-SETTLE IS MEASURED AGAINST `updatedAt`, NOT A SETTLEMENT TIMESTAMP.
 * `transaction` has exactly two dates — `createdAt` and `updatedAt` — and no
 * `settledAt`/`approvedAt`. For a row that reached COMPLETED, `updatedAt` is
 * the last write, which is the settlement write in the normal path; a later
 * edit (a description fix, a metadata backfill) inflates it. It is a proxy and
 * the card is titled as a settlement time, not an SLA.
 *
 * EVERY MONEY SUM BELOW CARRIES `inUSD: "wallet.currency"`. `transaction.amount`
 * is stored "in the wallet's currency" — the model says so on the column — so a
 * bare SUM added naira to tether to bitcoin, and `format: "currency"` printed
 * the result through a formatter that defaults to USD. A 50,000 NGN deposit
 * reached the desk as "$50,000" when it is about $36. The engine reaches the
 * denomination in one BelongsTo hop (`transaction.belongsTo(wallet, { as:
 * "wallet" })`), prices each currency group at its own rate, and names anything
 * it has no rate for on the card instead of folding it in as zero.
 *
 * STILL NOT EXPRESSIBLE: deposit value by CURRENCY as a ranked BREAKDOWN. That
 * is a different mechanism from `inUSD` — a breakdown groups on a column of
 * THIS table and cannot cross the association to `wallet`.
 */
export function useAnalytics(): AnalyticsConfig {
  const t = useTranslations("common");

  return [
    // ─────────────────────────────────────────────────────────────
    // Row 1 — settled money, queue liability, and what failed.
    // ─────────────────────────────────────────────────────────────
    [
      {
        type: "kpi",
        responsive: {
          mobile: { cols: 1 },
          tablet: { cols: 2, span: 2 },
          desktop: { cols: 2, span: 2 },
        },
        items: [
          {
            // The headline for the desk and for finance: money that landed.
            id: "settled_deposit_value",
            title: t("deposit_value_settled"),
            metric: "settledValue",
            model: "transaction",
            aggregation: {
              op: "sum",
              field: "amount",
              inUSD: "wallet.currency",
              where: [{ field: "status", value: "COMPLETED" }],
            },
            format: "currency",
            icon: "mdi:cash-check",
          },
          {
            /**
             * What customers believe they have sent and have not been credited.
             * PENDING and PROCESSING are the same liability wearing two labels
             * — and they are exactly the two states this page's own
             * `editCondition` lets an admin act on — so they are one number.
             *
             * They used to be two cards because guards are ANDed and there was
             * no way to say OR; `values: [...]` is that OR.
             */
            id: "unsettled_deposit_liability",
            title: t("unsettled_deposit_liability"),
            metric: "unsettledLiability",
            model: "transaction",
            aggregation: {
              op: "sum",
              field: "amount",
              inUSD: "wallet.currency",
              where: [{ field: "status", values: ["PENDING", "PROCESSING"] }],
            },
            valueMode: "current",
            format: "currency",
            invert: true,
            icon: "mdi:clock-outline",
          },
          {
            /**
             * The work-list card. A deposit that has sat unsettled for a day is
             * a support ticket that has not been raised yet, and no aggregate of
             * the queue's SIZE distinguishes 300 fresh rows from 3 stale ones.
             *
             * A snapshot, and deliberately a COUNT: the money is already on the
             * card beside it; this one answers "how many customers are angry".
             */
            id: "stuck_deposits",
            title: t("unsettled_over_24h"),
            metric: "stuckDeposits",
            model: "transaction",
            aggregation: {
              op: "count",
              field: "id",
              where: [
                { field: "status", values: ["PENDING", "PROCESSING"] },
                { field: "createdAt", op: "<", value: { ago: "24h" } },
              ],
            },
            valueMode: "current",
            format: "number",
            invert: true,
            icon: "mdi:timer-alert-outline",
          },
          {
            /**
             * Revenue that did not land — sizes the cost of the failure rate.
             *
             * All four terminal failure states, not just FAILED. A gateway that
             * times out and a compliance rule that rejects both cost the
             * platform the same deposit, and counting one of them made the rate
             * below quietly narrower than its label.
             */
            id: "failed_deposit_value",
            title: t("failed_or_refused_value"),
            metric: "failedValue",
            model: "transaction",
            aggregation: {
              op: "sum",
              field: "amount",
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
      {
        type: "chart",
        responsive: {
          mobile: { span: 1 },
          tablet: { span: 2 },
          desktop: { span: 1 },
        },
        items: [
          {
            // A rising line here means a gateway or a network is broken. Four
            // raw counts could not show a trend; one ratio can, and the engine
            // evaluates the derived metric per bucket, so the line is real.
            id: "depositFailureRateOverTime",
            title: t("deposit_failure_rate"),
            type: "line",
            model: "transaction",
            metrics: ["failureRate"],
            timeframes: ["24h", "7d", "30d", "3m", "6m", "y"],
            labels: { failureRate: "Failure rate %" },
          },
        ],
      },
    ],

    // ─────────────────────────────────────────────────────────────
    // Row 2 — throughput, rate and revenue.
    // ─────────────────────────────────────────────────────────────
    {
      type: "kpi",
      responsive: {
        mobile: { cols: 1, span: 1 },
        tablet: { cols: 2, span: 1 },
        desktop: { cols: 4, span: 1 },
      },
      items: [
        {
          id: "requested_deposit_value",
          title: t("deposit_value_requested"),
          metric: "requestedValue",
          model: "transaction",
          aggregation: { op: "sum", field: "amount", inUSD: "wallet.currency" },
          format: "currency",
          icon: "mdi:cash-fast",
        },
        {
          // Failure measured in money, not in rows: ten $1 failures and ten
          // $10,000 failures used to render identically.
          id: "deposit_failure_rate",
          title: t("failure_rate_by_value"),
          metric: "failureRate",
          model: "transaction",
          derived: { op: "percent", of: ["failedValue", "requestedValue"] },
          format: "percent",
          invert: true,
          icon: "mdi:percent-outline",
        },
        {
          id: "deposit_fees_collected",
          title: t("fees_collected"),
          metric: "feesCollected",
          model: "transaction",
          aggregation: {
            op: "sum",
            field: "fee",
            inUSD: "wallet.currency",
            where: [{ field: "status", value: "COMPLETED" }],
          },
          format: "currency",
          icon: "mdi:cash-register",
        },
        {
          /**
           * How long a deposit takes to be credited, in hours.
           *
           * `since: { until }` is a TIMESTAMPDIFF, so this is the mean elapsed
           * time of the rows that actually settled — not an average of a
           * column. See the file header on why the second date is `updatedAt`:
           * the model has no settlement timestamp, so this is a proxy that runs
           * long whenever a settled row is edited again.
           *
           * Replaced Average Ticket, which nobody has ever acted on.
           *
           * `valueMode: "current"` and "(All Time)" in the title, matching the
           * platform's other duration cards. A window-scoped settlement average
           * only sees rows CREATED in the window that have ALSO already
           * settled, so on the 24h view it is usually the empty set — and an
           * empty AVG comes back NULL, which `toNumber` renders as a confident
           * "0h" under a heading that reads as instant settlement. The snapshot
           * pass answers "how long does a deposit take", which is the question.
           */
          id: "average_time_to_settle",
          title: t("avg_time_to_settle_all_time"),
          metric: "avgSettleHours",
          model: "transaction",
          aggregation: {
            op: "avg",
            field: "createdAt",
            since: { unit: "h", until: "updatedAt" },
            where: [{ field: "status", value: "COMPLETED" }],
          },
          valueMode: "current",
          format: "duration",
          invert: true,
          icon: "mdi:timer-sand",
        },
      ],
    },

    // ─────────────────────────────────────────────────────────────
    // Row 3 — volume AND health on one axis, which is what the status pie was
    // reaching for. Settled and failed are disjoint, so the stack is honest.
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
          id: "depositValueByOutcome",
          title: t("deposit_value_by_outcome"),
          type: "stackedBar",
          model: "transaction",
          metrics: ["settledValue", "failedValue"],
          timeframes: ["24h", "7d", "30d", "3m", "6m", "y"],
          labels: {
            settledValue: t("completed"),
            failedValue: "Failed / refused",
          },
        },
      ],
    },
  ];
}
