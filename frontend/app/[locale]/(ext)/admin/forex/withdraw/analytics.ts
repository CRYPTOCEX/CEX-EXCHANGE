"use client";
import { AnalyticsConfig } from "@/components/blocks/data-table/types/analytics";
import { useTranslations } from "next-intl";

/**
 * Forex withdrawals — an approval queue, not a mirror of the deposit page.
 *
 * This file used to be a byte-for-byte clone of the deposit config with the id
 * prefixes changed. A withdrawal is an outbound payment with an approval gate,
 * a fraud surface and a compliance hold; none of that asymmetry was reflected,
 * and the pie declared four of the status enum's ten members — omitting FROZEN
 * and PROCESSING, which are exactly the rows a withdrawal desk exists to work.
 *
 * The page is pinned to `type: "FOREX_WITHDRAW"` by `modelConfig` in page.tsx,
 * forwarded as the `where` on every aggregate below.
 *
 * The queue leads because a withdrawal desk IS a queue, and it leads in money:
 * three requests worth $400k is a different morning from 300 worth $40, and
 * both used to render as the same count. It now leads in TIME as well — a
 * queue's size and a queue's age are different complaints, and only the second
 * one gets the platform written about.
 *
 * TIME TO PAYOUT IS MEASURED AGAINST `updatedAt`, NOT AN APPROVAL TIMESTAMP.
 * `transaction` carries only `createdAt` and `updatedAt`; there is no
 * `approvedAt` or `paidAt` to difference against. For a COMPLETED row the last
 * write is normally the settlement write, so `updatedAt` is a usable proxy —
 * but any later edit inflates it, which is why the card is titled as an
 * observed time rather than an SLA.
 *
 * EVERY MONEY SUM BELOW CARRIES `inUSD: "wallet.currency"`. `transaction.amount`
 * is stored in the wallet's currency, so a bare SUM added naira to tether to
 * bitcoin and `format: "currency"` rendered the total through a formatter that
 * defaults to USD — a 50,000 NGN payout request sat in "Awaiting Approval" as
 * "$50,000" when it is about $36, which is the difference between a routine
 * approval and a four-eyes review. The engine reaches the denomination in one
 * BelongsTo hop (`transaction.belongsTo(wallet, { as: "wallet" })`) and names
 * anything it cannot price rather than folding it in as zero.
 *
 * STILL NOT EXPRESSIBLE: payout value by CURRENCY as a ranked BREAKDOWN (that
 * groups on a column of THIS table and cannot cross the association, which is a
 * different mechanism from `inUSD`), and net forex flow (this page's
 * `modelConfig` pins `type: "FOREX_WITHDRAW"`, so deposits are outside its
 * population; the user transaction page carries it).
 */
export function useAnalytics(): AnalyticsConfig {
  const t = useTranslations("common");

  return [
    // ─────────────────────────────────────────────────────────────
    // Row 1 — the queue, the holds, and cash out the door.
    // ─────────────────────────────────────────────────────────────
    [
      {
        type: "kpi",
        responsive: {
          mobile: { cols: 1 },
          tablet: { cols: 2, span: 2 },
          desktop: { cols: 3, span: 2 },
        },
        items: [
          {
            // The approval queue in dollars, right now — a stock, not a flow.
            id: "awaiting_approval_value",
            title: t("awaiting_approval"),
            metric: "awaitingValue",
            model: "transaction",
            aggregation: {
              op: "sum",
              field: "amount",
              inUSD: "wallet.currency",
              where: [{ field: "status", value: "PENDING" }],
            },
            valueMode: "current",
            format: "currency",
            invert: true,
            icon: "mdi:clock-alert-outline",
          },
          {
            /**
             * The age of the worst row in the queue, in hours.
             *
             * `since: { unit: "h" }` with no `until` differences the column
             * against NOW(), and MAX of that is the OLDEST request — the single
             * figure a withdrawal desk is judged on and the one thing neither
             * the queue's value nor its count can tell you. A snapshot: a
             * backlog does not belong to the selected window.
             *
             * Hours, not days, because the renderer's duration formatter is
             * given hours and rolls up to days on its own past 48.
             */
            id: "oldest_pending_withdrawal",
            title: t("oldest_pending_request"),
            metric: "oldestPendingAge",
            model: "transaction",
            aggregation: {
              op: "max",
              field: "createdAt",
              since: { unit: "h" },
              where: [{ field: "status", value: "PENDING" }],
            },
            valueMode: "current",
            format: "duration",
            invert: true,
            icon: "mdi:timer-alert-outline",
          },
          {
            // Approved and in flight to the rail. Stuck money looks the same as
            // moving money until someone measures it.
            id: "processing_withdrawal_value",
            title: t("in_processing"),
            metric: "processingValue",
            model: "transaction",
            aggregation: {
              op: "sum",
              field: "amount",
              inUSD: "wallet.currency",
              where: [{ field: "status", value: "PROCESSING" }],
            },
            valueMode: "current",
            format: "currency",
            invert: true,
            icon: "mdi:progress-clock",
          },
          {
            // Compliance holds. A legally sensitive bucket with a dedicated
            // enum member and, until now, zero visibility anywhere.
            id: "frozen_withdrawal_value",
            title: t("frozen_held"),
            metric: "frozenValue",
            model: "transaction",
            aggregation: {
              op: "sum",
              field: "amount",
              inUSD: "wallet.currency",
              where: [{ field: "status", value: "FROZEN" }],
            },
            valueMode: "current",
            format: "currency",
            invert: true,
            icon: "mdi:snowflake-alert",
          },
          {
            id: "withdrawal_value_paid",
            title: t("withdrawal_value_paid"),
            metric: "paidValue",
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
             * How long a payout actually takes, end to end, for the rows that
             * completed. Pairs with the oldest-pending card: one is the tail,
             * this is the body of the distribution.
             *
             * See the file header — the second date is `updatedAt`, a proxy,
             * because the model has no approval or payout timestamp.
             *
             * `valueMode: "current"` and "(All Time)" in the title, matching
             * the platform's other duration cards. A window-scoped payout
             * average only sees rows CREATED in the window that have ALSO
             * already paid out, so on short timeframes it is the empty set —
             * and an empty AVG is NULL, which renders as a confident "0h"
             * under a heading that reads as an instant payout desk.
             */
            id: "average_time_to_payout",
            title: t("avg_time_to_payout_all_time"),
            metric: "avgPayoutHours",
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
      {
        type: "chart",
        responsive: {
          mobile: { span: 1 },
          tablet: { span: 2 },
          desktop: { span: 1 },
        },
        items: [
          {
            // How often the desk says no, in money. A jump means either fraud
            // pressure or an over-tight rule, and both need a same-day call.
            id: "withdrawalRejectionRateOverTime",
            title: t("rejection_rate"),
            type: "line",
            model: "transaction",
            metrics: ["rejectionRate"],
            timeframes: ["24h", "7d", "30d", "3m", "6m", "y"],
            labels: { rejectionRate: "Rejection rate %" },
          },
        ],
      },
    ],

    // ─────────────────────────────────────────────────────────────
    // Row 2 — demand, refusals and rail revenue.
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
          id: "requested_withdrawal_value",
          title: t("withdrawal_value_requested"),
          metric: "requestedValue",
          model: "transaction",
          aggregation: { op: "sum", field: "amount", inUSD: "wallet.currency" },
          format: "currency",
          icon: "mdi:cash-fast",
        },
        {
          id: "rejected_withdrawal_value",
          title: t("rejected_value"),
          metric: "rejectedValue",
          model: "transaction",
          aggregation: {
            op: "sum",
            field: "amount",
            inUSD: "wallet.currency",
            where: [{ field: "status", value: "REJECTED" }],
          },
          format: "currency",
          invert: true,
          icon: "mdi:hand-back-left-off",
        },
        {
          id: "withdrawal_rejection_rate",
          title: t("rejection_rate_by_value"),
          metric: "rejectionRate",
          model: "transaction",
          derived: { op: "percent", of: ["rejectedValue", "requestedValue"] },
          format: "percent",
          invert: true,
          icon: "mdi:percent-outline",
        },
        {
          id: "withdrawal_fees_collected",
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
      ],
    },

    // ─────────────────────────────────────────────────────────────
    // Row 3 — paid vs refused on one axis. Replaces the status pie: same mix,
    // plus magnitude and direction.
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
          id: "withdrawalValueByOutcome",
          title: t("withdrawal_value_by_outcome"),
          type: "stackedBar",
          model: "transaction",
          metrics: ["paidValue", "rejectedValue"],
          timeframes: ["24h", "7d", "30d", "3m", "6m", "y"],
          labels: {
            paidValue: t("completed"),
            rejectedValue: t("rejected"),
          },
        },
      ],
    },
  ];
}
