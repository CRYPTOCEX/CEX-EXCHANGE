"use client";
import { AnalyticsConfig } from "@/components/blocks/data-table/types/analytics";

import { useTranslations } from "next-intl";

/**
 * Analytics for `investment` — the platform's core investment book.
 *
 * What was here: four status counts, three result counts, TWO full-width rows
 * each holding a single donut of numbers the KPI grids already listed, a
 * five-series count line, and a "Financial Metrics" row whose three cards
 * (`amount`, `profit`, `average`) carried no `aggregation` block at all and so
 * rendered a hardcoded 0. On the platform's core finance page, "Total Invested"
 * was the number zero.
 *
 * ON THE MONEY COLUMNS. `roiPercentage` is a percentage, so the payout is
 * `amount * roiPercentage / 100`; the engine multiplies two columns but cannot
 * divide, which would put a figure a hundred times too large under a currency
 * heading. `profit` is used instead — `api/finance/investment/cron.ts` writes
 * `profit: roi`, the ABSOLUTE ROI amount, on every settled row ("Keep `profit`
 * for backward compat; now stores the absolute ROI amount"). A WIN is ROI the
 * platform paid out; a LOSS is principal it kept; the difference is the book's
 * P&L.
 *
 * ON CURRENCY. `investment` carries no currency column: the denomination is the
 * PLAN's (`investmentPlan.currency`), and an operator can run a USDT plan and an
 * NGN plan side by side. Every SUM here was therefore adding the two and handing
 * the result to a formatter that defaults to USD — 50,000 NGN of deployed
 * capital reached the admin as "$50,000" when it is about $36.
 * `inUSD: "plan.currency"` is the one BelongsTo hop the engine allows
 * (`investment.belongsTo(investmentPlan, { as: "plan" })`), so each plan's money
 * is priced at its own rate and anything with no rate is named on the card
 * rather than folded in as zero. One consequence to know: that join is
 * `required` and `investmentPlan` is paranoid, so positions on a soft-deleted
 * plan drop out of these totals. Retiring a plan shrinks the book on this page —
 * a much narrower error than adding naira to tether, but not nothing.
 *
 * ON OVERDUE. `endDate` is when the position was contracted to settle, and the
 * settlement cron flips the row to COMPLETED. A row still ACTIVE after its
 * `endDate` is therefore a settlement the cron did not perform — user money
 * held past its term. It is the only card on this page an admin has to act on
 * the same day, so it leads the section. The one-hour grace keeps positions
 * that matured minutes ago, and are being settled right now, out of the alarm.
 *
 * This config and `(ext)/admin/ai/investment/log/analytics.ts` target
 * near-identical models and are now deliberately the same page.
 */
export function useAnalytics() {
  const t = useTranslations("dashboard_admin");
  const tCommon = useTranslations("common");
  return [
    // 1) Liability first, and the overdue slice of it. Everything an admin is
    //    asked for about this product is a currency figure, and none of them
    //    existed.
    [
      {
        type: "kpi" as const,
        layout: { cols: 3, rows: 2 },
        responsive: {
          mobile: { cols: 1, span: 1 },
          tablet: { cols: 2, span: 2 },
          desktop: { cols: 3, span: 2 },
        },
        items: [
          {
            /**
             * Outstanding principal across every plan — a STOCK, so `current`
             * runs it with the date window removed. Summing per-bucket
             * principal answers "opened in March", which is not what finance
             * asks for.
             */
            id: "capital_deployed",
            title: tCommon("capital_deployed"),
            metric: "activeCapital",
            model: "investment",
            aggregation: {
              field: "amount",
              op: "sum",
              inUSD: "plan.currency",
              where: [{ field: "status", value: "ACTIVE" }],
            },
            valueMode: "current",
            format: "currency",
            icon: "mdi:cash-lock",
          },
          {
            id: "overdue_capital",
            title: t("overdue_capital"),
            metric: "overdueCapital",
            model: "investment",
            aggregation: {
              field: "amount",
              op: "sum",
              inUSD: "plan.currency",
              where: [
                { field: "status", value: "ACTIVE" },
                { field: "endDate", op: "<", value: { ago: "1h" } },
              ],
            },
            valueMode: "current",
            format: "currency",
            invert: true,
            icon: "mdi:cash-clock",
          },
          {
            id: "overdue_settlements",
            title: tCommon("overdue_settlements"),
            metric: "overdueCount",
            model: "investment",
            aggregation: {
              field: "id",
              op: "count",
              where: [
                { field: "status", value: "ACTIVE" },
                { field: "endDate", op: "<", value: { ago: "1h" } },
              ],
            },
            valueMode: "current",
            format: "number",
            invert: true,
            icon: "mdi:calendar-alert",
          },
          {
            id: "roi_paid_out",
            title: tCommon("roi_paid_out"),
            metric: "roiPaid",
            model: "investment",
            aggregation: {
              field: "profit",
              op: "sum",
              inUSD: "plan.currency",
              where: [
                { field: "status", value: "COMPLETED" },
                { field: "result", value: "WIN" },
              ],
            },
            valueMode: "current",
            format: "currency",
            invert: true,
            icon: "mdi:cash-minus",
          },
          {
            id: "principal_retained",
            title: tCommon("principal_retained"),
            metric: "roiKept",
            model: "investment",
            aggregation: {
              field: "profit",
              op: "sum",
              inUSD: "plan.currency",
              where: [
                { field: "status", value: "COMPLETED" },
                { field: "result", value: "LOSS" },
              ],
            },
            valueMode: "current",
            format: "currency",
            icon: "mdi:cash-plus",
          },
          {
            id: "house_result",
            title: tCommon("house_result"),
            metric: "houseResult",
            model: "investment",
            derived: { op: "diff", of: ["roiKept", "roiPaid"] },
            format: "currency",
            icon: "mdi:scale-balance",
          },
        ],
      },
      {
        type: "chart" as const,
        responsive: {
          mobile: { cols: 1, span: 1 },
          tablet: { cols: 1, span: 1 },
          desktop: { cols: 1, span: 1 },
        },
        items: [
          {
            // Value over time, not row frequency: the line this replaced drew
            // five series of COUNTS next to three money cards that were all
            // reporting zero, so the page had no currency trend at all.
            id: "capitalInvestedOverTime",
            title: tCommon("investments_over_time"),
            type: "bar" as const,
            model: "investment",
            metrics: ["newCapital"],
            timeframes: ["24h", "7d", "30d", "3m", "6m", "y"],
            labels: { newCapital: "Principal invested" },
            description: t("principal_invested_per_bucket_in_value"),
          },
        ],
      },
    ],

    // 2) Outcome quality and flow. One rate plus the two counts it is built
    //    from, in place of three result KPIs and a full-width result donut.
    [
      {
        type: "kpi" as const,
        layout: { cols: 5, rows: 1 },
        responsive: {
          mobile: { cols: 1, span: 1 },
          tablet: { cols: 2, span: 2 },
          desktop: { cols: 5, span: 2 },
        },
        items: [
          {
            id: "win_rate",
            title: tCommon("win_rate"),
            metric: "winRate",
            model: "investment",
            derived: { op: "percent", of: ["WIN", "COMPLETED"] },
            format: "percent",
            icon: "mdi:trophy",
          },
          {
            id: "winning_investments",
            title: tCommon("winning"),
            metric: "WIN",
            model: "investment",
            aggregation: { field: "result", value: "WIN" },
            icon: "mdi:trophy-variant",
          },
          {
            id: "completed_investments",
            title: tCommon("completed"),
            metric: "COMPLETED",
            model: "investment",
            aggregation: { field: "status", value: "COMPLETED" },
            icon: "mdi:check-circle",
          },
          {
            /**
             * The working version of "Average Investment", which named no
             * column. Cancelled and rejected rows never became a position, so
             * the IN-list keeps the figure to money that was actually placed —
             * previously a pair of `!=` guards that any new status would have
             * quietly joined.
             */
            id: "average_ticket",
            title: tCommon("average_ticket"),
            metric: "avgTicket",
            model: "investment",
            aggregation: {
              field: "amount",
              op: "avg",
              where: [{ field: "status", values: ["ACTIVE", "COMPLETED"] }],
            },
            // Unitless, because an average cannot be denominated: the engine
            // takes `inUSD` on a sum only, and the mean of an NGN ticket and a
            // USDT ticket is not a figure in either currency. It was being
            // printed with a dollar sign and read as whichever plan currency has
            // the largest unit count. See ON CURRENCY at the top.
            format: "number",
            icon: "mdi:calculator",
          },
          {
            // The honest version of the old "Total Investments" card, which
            // reported the last non-empty bucket under the word "total".
            id: "capital_invested_period",
            title: t("capital_invested_period"),
            metric: "newCapital",
            model: "investment",
            aggregation: { field: "amount", op: "sum", inUSD: "plan.currency" },
            format: "currency",
            icon: "mdi:cash-fast",
          },
        ],
      },
      {
        type: "chart" as const,
        responsive: {
          mobile: { cols: 1, span: 1 },
          tablet: { cols: 1, span: 1 },
          desktop: { cols: 1, span: 1 },
        },
        items: [
          {
            // The judgement the three result KPIs and the result donut were
            // all circling without ever stating: is the book getting better or
            // worse over time.
            id: "winRateTrend",
            title: tCommon("win_rate_over_time"),
            type: "line" as const,
            model: "investment",
            metrics: ["winRate"],
            labels: { winRate: tCommon("win_rate") },
            description: t("wins_as_a_share_of_settled_investments"),
          },
        ],
      },
    ],

    // 3) Where the book is concentrated. Full width because plan names are
    //    long. `groupBy: "planId"` is resolved through the plan association,
    //    so the bars carry plan NAMES rather than the stored key.
    {
      type: "chart" as const,
      responsive: {
        mobile: { cols: 1, span: 1 },
        tablet: { cols: 1, span: 1 },
        desktop: { cols: 1, span: 1 },
      },
      items: [
        {
          id: "plansByCapital",
          title: t("top_plans_by_capital_deployed"),
          type: "bar" as const,
          model: "investment",
          metrics: [],
          config: {
            groupBy: "planId",
            limit: 5,
            measure: {
              field: "amount",
              op: "sum",
              where: [{ field: "status", value: "ACTIVE" }],
            },
            scope: "all",
          },
          // A live liability, not a flow, hence `scope: "all"`. Everything
          // past the top five rolls into "Other".
          description: t("outstanding_principal_per_plan_ignoring_the"),
        },
      ],
    },
  ] as AnalyticsConfig;
}
