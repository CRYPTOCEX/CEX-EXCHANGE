"use client";
import { AnalyticsConfig } from "@/components/blocks/data-table/types/analytics";

import { useTranslations } from "next-intl";

/**
 * Forex investments — outstanding liability first.
 *
 * The old page rendered `status` three times (four KPIs, a four-slice pie, five
 * line series) and `result` three times (three KPIs, a pie, a stackedArea):
 * fourteen items over two columns, none of them money. Line 61 carried a
 * comment reading "you can add a sixth KPI (e.g. Total Profit) if aggregator
 * logic is updated" — the author knew the page had no money on it and knew the
 * engine was the blocker, while `amount` and `roiPercentage` sat unread.
 *
 * Both enums are now shown ONCE each, as complete pies, and every KPI beside
 * them is either currency or a rate. Capital Deployed is the liability line —
 * customer principal the platform owes back — so it is a snapshot, not a fold.
 *
 * THE CAPITAL SUMS ARE DENOMINATED BY THE PLAN, NOT BY THE INVESTMENT.
 * `forexInvestment` has no currency column of its own; `amount` is in the
 * plan's currency — `investment/index.post.ts` refuses to open an investment
 * whose plan currency does not match the forex account's, and debits and
 * credits it in `plan.currency` throughout. A plan denominated in NGN and one
 * in USDT were therefore being added together and printed with a dollar sign,
 * so a desk holding 5,000,000 NGN of principal read it as "$5,000,000" instead
 * of about $3,600. `belongsTo(forexPlan, { as: "plan" })` is exactly the one
 * BelongsTo hop `inUSD` allows, so it is `inUSD: "plan.currency"`. Investments
 * whose plan has been deleted are dropped rather than priced at 1:1.
 *
 * NOT expressible here: "ROI Paid Out" = SUM(amount * roiPercentage / 100).
 * `multiplyBy` gives the product of two columns but there is no division, and
 * `roiPercentage` stores 5 for 5%, so the product is 100x the money. Average
 * ROI carries the same information without printing a wrong currency figure.
 *
 * ALSO STILL NOT AVAILABLE: "Top 5 Plans by Capital". A ranked breakdown groups
 * by a column of THIS table and shows the raw value as the label, and the only
 * plan column here is `planId` — a UUID foreign key. The plan's NAME lives on
 * `forexPlan`, and resolving a label through an association is a join, which
 * the aggregator cannot do. Five 36-character UUIDs on a bar chart is not the
 * card the blueprint asked for, so it is left out rather than faked.
 */
export function useAnalytics() {
  const t = useTranslations("ext_admin");
  const tCommon = useTranslations("common");
  const tExt = useTranslations("ext");
  return [
    // ─────────────────────────────────────────────────────────────
    // Row 1 — the liability and the flows around it.
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
            // Outstanding customer principal. A stock: summing per-bucket sums
            // would report "capital that was ever deployed", not what is out.
            id: "capital_deployed",
            title: tCommon("capital_deployed"),
            metric: "capitalDeployed",
            model: "forexInvestment",
            aggregation: {
              op: "sum",
              field: "amount",
              inUSD: "plan.currency",
              where: [{ field: "status", value: "ACTIVE" }],
            },
            valueMode: "current",
            format: "currency",
            icon: "mdi:safe",
          },
          {
            /**
             * ACTIVE investments whose `endDate` is already behind us: matured
             * contracts the settlement job has not closed.
             *
             * Every one is customer money the platform is holding past the term
             * it agreed to, and it is the only card here that describes a
             * BROKEN state rather than a business volume. `{ ago: "0min" }` is
             * NOW() exactly — the relative-date form with a zero offset — so
             * this is `status = 'ACTIVE' AND endDate < NOW()`.
             *
             * A snapshot: an overdue settlement does not stop being overdue
             * because the timeframe selector moved.
             */
            id: "overdue_settlements",
            title: tCommon("overdue_settlements"),
            metric: "overdueSettlements",
            model: "forexInvestment",
            aggregation: {
              op: "count",
              field: "id",
              where: [
                { field: "status", value: "ACTIVE" },
                { field: "endDate", op: "<", value: { ago: "0min" } },
              ],
            },
            valueMode: "current",
            format: "number",
            invert: true,
            icon: "mdi:calendar-alert",
          },
          {
            id: "capital_requested",
            title: t("capital_requested"),
            metric: "newCapital",
            model: "forexInvestment",
            aggregation: { op: "sum", field: "amount", inUSD: "plan.currency" },
            format: "currency",
            icon: "mdi:cash-plus",
          },
          {
            id: "capital_returned",
            title: tExt("capital_returned"),
            metric: "settledCapital",
            model: "forexInvestment",
            aggregation: {
              op: "sum",
              field: "amount",
              inUSD: "plan.currency",
              where: [{ field: "status", value: "COMPLETED" }],
            },
            format: "currency",
            icon: "mdi:cash-refund",
          },
          {
            // The window denominator for the rejection rate, declared as its
            // own alias. `total` cannot be used: `fetchSnapshot` selects an
            // un-windowed `total` of its own and `Object.assign(periodTotals,
            // snapshot)` runs AFTER the window fold, so on this page —
            // `capital_deployed` is `current` — `total` is the ALL-TIME row
            // count, and the rate would divide a window numerator by it.
            id: "investments_requested",
            title: t("investments_requested"),
            metric: "investmentsRequested",
            model: "forexInvestment",
            aggregation: { op: "count", field: "id" },
            valueMode: "periodTotal",
            format: "number",
            icon: "mdi:file-document-plus-outline",
          },
          {
            // How much demand the desk turns away, and whether it is trending.
            // Both operands are window-scoped, so the ratio divides like with like.
            id: "investment_rejection_rate",
            title: tCommon("rejection_rate"),
            metric: "rejectionRate",
            model: "forexInvestment",
            derived: { op: "percent", of: ["REJECTED", "investmentsRequested"] },
            format: "percent",
            invert: true,
            icon: "mdi:percent-outline",
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
            // All four members of the enum — the four KPI cards that used to
            // duplicate this pie are gone.
            id: "forexInvestmentStatusDistribution",
            title: tCommon("status_distribution"),
            type: "pie",
            model: "forexInvestment",
            metrics: ["ACTIVE", "COMPLETED", "CANCELLED", "REJECTED"],
            config: {
              field: "status",
              status: [
                {
                  value: "ACTIVE",
                  label: tCommon("active"),
                  color: "blue",
                  icon: "mdi:play-circle",
                },
                {
                  value: "COMPLETED",
                  label: tCommon("completed"),
                  color: "green",
                  icon: "mdi:check-circle",
                },
                {
                  value: "CANCELLED",
                  label: tCommon("cancelled"),
                  color: "gray",
                  icon: "mdi:cancel",
                },
                {
                  value: "REJECTED",
                  label: tCommon("rejected"),
                  color: "red",
                  icon: "mdi:thumb-down",
                },
              ],
            },
          },
        ],
      },
    ],

    // ─────────────────────────────────────────────────────────────
    // Row 2 — is the product behaving as designed?
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
            // COUNT(result) is the NON-NULL count: investments that have
            // actually resolved. It is the only honest denominator for win rate.
            id: "resolved_results",
            title: tExt("outcomes_settled"),
            metric: "resolvedResults",
            model: "forexInvestment",
            aggregation: { op: "count", field: "result" },
            icon: "mdi:gavel",
          },
          {
            // One figure in place of the nine cards the `result` column used to
            // occupy.
            id: "investment_win_rate",
            title: tCommon("win_rate"),
            metric: "winRate",
            model: "forexInvestment",
            derived: { op: "percent", of: ["WIN", "resolvedResults"] },
            format: "percent",
            icon: "mdi:trophy",
          },
          {
            // The live column. `profit` is marked DEPRECATED on the model.
            id: "average_roi",
            title: tExt("average_roi"),
            metric: "avgRoi",
            model: "forexInvestment",
            aggregation: {
              op: "avg",
              field: "roiPercentage",
              where: [{ field: "status", value: "COMPLETED" }],
            },
            format: "percent",
            icon: "mdi:trending-up",
          },
          {
            /**
             * NOT A CURRENCY FIGURE, and it cannot be made into one.
             *
             * `inUSD` denominates a TOTAL and the engine only accepts it on
             * `op: "sum"` — converting each currency's members and then taking
             * the mean of the results answers nothing. So this is AVG over a
             * column whose rows are in different units: one 100 USDT ticket and
             * one 50,000 NGN ticket average to 25,050 of nothing at all, and
             * `format: "currency"` used to hand that to an admin as "$25,050".
             *
             * A number with no unit is honest about being a shape statistic —
             * are tickets getting bigger — which is all this card was ever read
             * for. The denominated totals above are where the money is.
             */
            id: "average_investment_ticket",
            title: tCommon("average_ticket"),
            metric: "avgTicket",
            model: "forexInvestment",
            aggregation: { op: "avg", field: "amount" },
            format: "number",
            icon: "mdi:calculator",
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
            id: "forexInvestmentResultDistribution",
            title: t("result_distribution"),
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

    // ─────────────────────────────────────────────────────────────
    // Row 3 — money in against money out, on the axis that matters.
    // Replaces the five-series status line and the three-series result area.
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
          id: "forexCapitalOverTime",
          title: t("capital_requested_vs_returned"),
          type: "line",
          model: "forexInvestment",
          metrics: ["newCapital", "settledCapital"],
          timeframes: ["24h", "7d", "30d", "3m", "6m", "y"],
          labels: {
            newCapital: "Requested",
            settledCapital: "Returned",
          },
        },
      ],
    },
  ] as AnalyticsConfig;
}
