"use client";

import { AnalyticsConfig } from "@/components/blocks/data-table/types/analytics";

import { useTranslations } from "next-intl";

/**
 * A user's own forex funding history.
 *
 * Mounted with `userAnalytics={true}` and `modelConfig { userId, type:
 * ["FOREX_DEPOSIT","FOREX_WITHDRAW"] }`, so every aggregate below is already
 * scoped to this user and these two transaction types.
 *
 * A funding history is a money document, and not one card on it was denominated
 * in currency: four status counts, a five-slice donut of a ten-member enum, a
 * two-slice donut counting deposits against withdrawals, and a single-series
 * count line. Both donuts also declared lowercase `metrics` against uppercase
 * `config.status` values — inert for a pie, a flat-zero trap on any other type.
 *
 * Deposits and withdrawals are FLOWS, so they fold the selected window; money
 * still in flight is a STOCK and ignores it.
 *
 * EVERY MONEY SUM BELOW CARRIES `inUSD: "wallet.currency"`. `transaction.amount`
 * is stored in the wallet's currency, so a user who deposited 50,000 NGN and
 * 100 USDT saw "Total Deposited: $50,100" — the two were added as if they were
 * the same unit and the formatter, which defaults to USD, put a dollar sign on
 * the result. The denomination is one BelongsTo hop away
 * (`transaction.belongsTo(wallet, { as: "wallet" })`), so each currency is now
 * priced on its own and anything with no rate is named on the card instead of
 * being counted as nothing.
 *
 * STILL NOT EXPRESSIBLE: a ranked BREAKDOWN by currency — that groups on a
 * column of THIS table and cannot cross the association, which is a different
 * mechanism from `inUSD`.
 */
export function useAnalytics() {
  const t = useTranslations("ext_forex");
  const tCommon = useTranslations("common");
  const tExt = useTranslations("ext");
  return [
    // ─────────────────────────────────────────────────────────────
    // Row 1 — in, out, net, and what has not landed yet.
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
            id: "total_deposited",
            title: tCommon("total_deposited"),
            metric: "depositedValue",
            model: "transaction",
            aggregation: {
              op: "sum",
              field: "amount",
              inUSD: "wallet.currency",
              where: [
                { field: "type", value: "FOREX_DEPOSIT" },
                { field: "status", value: "COMPLETED" },
              ],
            },
            format: "currency",
            icon: "mdi:arrow-down-bold-circle",
          },
          {
            id: "total_withdrawn",
            title: tCommon("total_withdrawn"),
            metric: "withdrawnValue",
            model: "transaction",
            aggregation: {
              op: "sum",
              field: "amount",
              inUSD: "wallet.currency",
              where: [
                { field: "type", value: "FOREX_WITHDRAW" },
                { field: "status", value: "COMPLETED" },
              ],
            },
            format: "currency",
            icon: "mdi:arrow-up-bold-circle",
          },
          {
            // The one number that summarises a funding history. Two filtered
            // sums and a difference — impossible to state before.
            id: "net_forex_flow",
            title: t("net_forex_flow"),
            metric: "netFlow",
            model: "transaction",
            derived: { op: "diff", of: ["depositedValue", "withdrawnValue"] },
            format: "currency",
            icon: "mdi:swap-vertical-bold",
          },
          {
            /**
             * Money committed that has not landed. The reason the page gets
             * opened, and it used to be a row count.
             *
             * PENDING and PROCESSING are one thing to the person whose money it
             * is — "not in my account yet" — but guards are ANDed, so saying
             * both in one card was impossible and the page shipped them as two.
             * `values: [...]` is the OR, and the second card became the age
             * card below, which is the question a user actually has.
             */
            id: "in_flight_value",
            title: tCommon("in_flight"),
            metric: "inFlightValue",
            model: "transaction",
            aggregation: {
              op: "sum",
              field: "amount",
              inUSD: "wallet.currency",
              where: [{ field: "status", values: ["PENDING", "PROCESSING"] }],
            },
            valueMode: "current",
            format: "currency",
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
            // The derived metric is evaluated per bucket, so this is a real
            // curve, not a repeated headline.
            id: "netForexFlowOverTime",
            title: t("net_flow_over_time"),
            type: "line",
            model: "transaction",
            metrics: ["netFlow"],
            timeframes: ["24h", "7d", "30d", "3m", "6m", "y"],
            labels: { netFlow: "Net flow" },
          },
        ],
      },
    ],

    // ─────────────────────────────────────────────────────────────
    // Row 2 — cost of the rail and anything that went wrong.
    // ─────────────────────────────────────────────────────────────
    {
      type: "kpi",
      responsive: {
        mobile: { cols: 1, span: 1 },
        tablet: { cols: 3, span: 1 },
        desktop: { cols: 3, span: 1 },
      },
      items: [
        {
          // A disclosure users ask support for constantly, computable from a
          // column that was already there.
          id: "fees_paid",
          title: tExt("fees_paid"),
          metric: "feesPaid",
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
          // Every terminal way a transfer can not happen, in one figure. A
          // rejected withdrawal and an expired deposit are the same event to
          // the user, and naming only FAILED left the other three invisible.
          id: "failed_value",
          title: t("failed_or_refused"),
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
        {
          /**
           * "How long has my money been in limbo" — the single question that
           * brings a user to this screen and then to support.
           *
           * MAX of TIMESTAMPDIFF(HOUR, createdAt, NOW()) over the unsettled
           * rows, i.e. the age of the oldest one. A snapshot, because a stuck
           * transfer does not age differently when the timeframe selector
           * moves. Hours: the renderer's duration formatter rolls up to days on
           * its own past 48.
           */
          id: "oldest_in_flight",
          title: t("oldest_in_flight"),
          metric: "oldestInFlightAge",
          model: "transaction",
          aggregation: {
            op: "max",
            field: "createdAt",
            since: { unit: "h" },
            where: [{ field: "status", values: ["PENDING", "PROCESSING"] }],
          },
          valueMode: "current",
          format: "duration",
          invert: true,
          icon: "mdi:timer-sand",
        },
      ],
    },

    // ─────────────────────────────────────────────────────────────
    // Row 3 — direction and magnitude together. Replaces the type donut and
    // the count line at once.
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
          id: "forexFlowByType",
          title: t("deposits_vs_withdrawals_by_value"),
          type: "stackedBar",
          model: "transaction",
          metrics: ["depositedValue", "withdrawnValue"],
          timeframes: ["24h", "7d", "30d", "3m", "6m", "y"],
          labels: {
            depositedValue: tCommon("deposits"),
            withdrawnValue: tCommon("withdrawals"),
          },
        },
      ],
    },
  ] as AnalyticsConfig;
}
