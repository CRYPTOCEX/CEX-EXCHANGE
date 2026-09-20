"use client";

import { AnalyticsConfig } from "@/components/blocks/data-table/types/analytics";

import { useTranslations } from "next-intl";

/**
 * A user's own forex investment portfolio.
 *
 * Mounted by `forex/investment/client.tsx` with `userAnalytics={true}`, so
 * `/api/user/analysis` force-injects `where.userId` — every aggregate below is
 * already scoped to the signed-in user, snapshots included.
 *
 * The old page opened with four status counts, one of which promised
 * "Cancelled / Rejected" and aggregated `status = 'CANCELLED'` alone, so
 * REJECTED investments were silently missing from a card that named them. Then
 * came a four-slice donut of the same column and a five-series count line over
 * a portfolio that, for most users, holds fewer than a dozen rows.
 *
 * An investor opens this to see how much of their money is at work and what it
 * has earned. Those are the first two cards now; the status mix stays in the
 * table underneath, which already shows it per row.
 *
 * THE CAPITAL CARDS ARE DENOMINATED BY THE PLAN. `forexInvestment` carries no
 * currency of its own — `amount` is in `plan.currency`, which the creation route
 * pins to the forex account's own denomination and which every later debit and
 * credit uses. An investor holding one NGN plan and one USDT plan therefore saw
 * their principal added unit-for-unit and stamped with a dollar sign: 50,000
 * naira read as "$50,000" when it is about $36. `belongsTo(forexPlan, { as:
 * "plan" })` is the single BelongsTo hop `inUSD` permits, so each plan's
 * currency is priced on its own and folded into one real USD figure.
 *
 * STILL NOT EXPRESSIBLE: "Lifetime Returns" = SUM(amount * roiPercentage / 100).
 * `multiplyBy` multiplies two columns and there is no divisor, and
 * `roiPercentage` stores 5 for 5% — the product would be 100x the money. The
 * average ROI card carries the same fact without printing a wrong number in a
 * currency.
 */
export function useAnalytics() {
  const t = useTranslations("ext_forex");
  const tCommon = useTranslations("common");
  const tExt = useTranslations("ext");
  return [
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
            // The first question anyone opens a portfolio to answer. A stock,
            // so the timeframe buttons must not change it.
            id: "capital_at_work",
            title: tCommon("capital_at_work"),
            metric: "capitalAtWork",
            model: "forexInvestment",
            aggregation: {
              op: "sum",
              field: "amount",
              inUSD: "plan.currency",
              where: [{ field: "status", value: "ACTIVE" }],
            },
            valueMode: "current",
            format: "currency",
            icon: "mdi:briefcase-clock",
          },
          {
            id: "returned_capital",
            title: tExt("capital_returned"),
            metric: "returnedCapital",
            model: "forexInvestment",
            aggregation: {
              op: "sum",
              field: "amount",
              inUSD: "plan.currency",
              where: [{ field: "status", value: "COMPLETED" }],
            },
            valueMode: "current",
            format: "currency",
            icon: "mdi:cash-refund",
          },
          {
            /*
              `roiPercentage` is the live column; `profit` is DEPRECATED on the
              model and is not read anywhere here.

              KNOWN LIMIT ON HISTORICAL ROWS. Settlement used to store this
              column as an UNSIGNED magnitude, so a completed LOSS written
              before that fix holds `+25` where it should hold `-25`, and this
              average is pulled upward by every one of them. New rows are
              signed (`forex/utils/cron.ts`), and the table reader signs from
              `result` — but an SQL AVG cannot, because the sign lives in a
              different column.

              The real repair is a one-line backfill
              (`UPDATE forexInvestment SET roiPercentage = -ABS(roiPercentage)
              WHERE result = 'LOSS' AND status = 'COMPLETED'`), deliberately NOT
              done here: it rewrites settled money history and belongs in a
              reviewed migration, not in a dashboard config.
            */
            id: "average_roi",
            title: tExt("average_roi"),
            metric: "avgRoi",
            model: "forexInvestment",
            aggregation: {
              op: "avg",
              field: "roiPercentage",
              where: [{ field: "status", value: "COMPLETED" }],
            },
            valueMode: "current",
            format: "percent",
            icon: "mdi:trending-up",
          },
          {
            // Has the product worked for THIS user? Numerator comes from the
            // result pie beside it, denominator from COUNT(result) below — both
            // window-scoped, so they divide honestly.
            id: "personal_win_rate",
            title: tCommon("win_rate"),
            metric: "winRate",
            model: "forexInvestment",
            derived: { op: "percent", of: ["WIN", "resolvedResults"] },
            format: "percent",
            icon: "mdi:trophy",
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
            // The judgement the status donut could not carry, over the whole
            // three-member enum.
            id: "investmentResultPie",
            title: t("outcomes"),
            type: "pie",
            model: "forexInvestment",
            metrics: ["WIN", "LOSS", "DRAW"],
            config: {
              field: "result",
              status: [
                {
                  value: "WIN",
                  label: tCommon("win"),
                  color: "green",
                  icon: "mdi:trophy",
                },
                {
                  value: "LOSS",
                  label: tCommon("loss"),
                  color: "red",
                  icon: "mdi:thumb-down",
                },
                {
                  value: "DRAW",
                  label: tCommon("draw"),
                  color: "gray",
                  icon: "mdi:gesture-tap",
                },
              ],
            },
          },
        ],
      },
    ],

    {
      type: "kpi",
      responsive: {
        mobile: { cols: 1, span: 1 },
        tablet: { cols: 2, span: 1 },
        desktop: { cols: 4, span: 1 },
      },
      items: [
        {
          // A flow, and the series behind the chart below.
          id: "invested_this_period",
          title: t("invested_this_period"),
          metric: "newInvested",
          model: "forexInvestment",
          aggregation: { op: "sum", field: "amount", inUSD: "plan.currency" },
          format: "currency",
          icon: "mdi:cash-plus",
        },
        {
          // COUNT(result) skips NULLs, i.e. investments that have not resolved.
          id: "resolved_results",
          title: tExt("outcomes_settled"),
          metric: "resolvedResults",
          model: "forexInvestment",
          aggregation: { op: "count", field: "result" },
          icon: "mdi:gavel",
        },
        {
          id: "active_investments",
          title: tCommon("active"),
          metric: "activeCount",
          model: "forexInvestment",
          aggregation: { field: "status", value: "ACTIVE" },
          valueMode: "current",
          icon: "mdi:play-circle",
        },
        {
          /**
           * The card that was deleted rather than half-fixed.
           *
           * It used to be titled "Cancelled / Rejected" and aggregated
           * `status = 'CANCELLED'` alone, so a rejected investment was missing
           * from the one card that named it — and guards being ANDed, there was
           * no way to write the OR the title promised. `values: [...]` is that
           * OR, so the card comes back saying what it counts.
           *
           * A snapshot: how many of this portfolio's applications never became
           * an investment, over its whole life, not over the selected window.
           */
          id: "cancelled_or_rejected",
          title: t("cancelled_or_rejected"),
          metric: "cancelledOrRejected",
          model: "forexInvestment",
          aggregation: {
            op: "count",
            field: "id",
            where: [{ field: "status", values: ["CANCELLED", "REJECTED"] }],
          },
          valueMode: "current",
          format: "number",
          invert: true,
          icon: "mdi:close-circle-outline",
        },
      ],
    },

    {
      type: "chart",
      responsive: {
        mobile: { span: 1 },
        tablet: { span: 1 },
        desktop: { span: 1 },
      },
      items: [
        {
          // Value, not row frequency: the only time series a retail investor
          // reads.
          id: "investedValueOverTime",
          title: t("invested_value_over_time"),
          type: "bar",
          model: "forexInvestment",
          metrics: ["newInvested"],
          timeframes: ["24h", "7d", "30d", "3m", "6m", "y"],
          labels: {
            newInvested: "Invested",
          },
        },
      ],
    },
  ] as AnalyticsConfig;
}
