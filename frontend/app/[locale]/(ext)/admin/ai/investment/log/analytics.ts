"use client";
import { AnalyticsConfig } from "@/components/blocks/data-table/types/analytics";

import { useTranslations } from "next-intl";

/**
 * Analytics for `aiInvestment`.
 *
 * The original page had eighteen items, fifteen of which counted one of three
 * enums (`status`, `type`, `result`) — each rendered as a KPI row AND a donut
 * AND a time series. The section literally titled "Financial Metrics" held three
 * cards, `amount`, `profit` and `average`, none of which carried an
 * `aggregation` block, so all three were permanent zeros on a product whose
 * whole job is holding customer principal.
 *
 * ON THE MONEY COLUMNS. `roiPercentage` is a percentage, so the payout only
 * exists as `amount * roiPercentage / 100`. The engine can multiply two columns
 * but cannot divide, so that product would report a figure a hundred times too
 * large under a currency heading. `profit` is used instead: the settlement paths
 * (`admin/ai/investment/utils/settle.ts` and `ai/investment/utils/cron.ts`)
 * write `profit: roi` — the ABSOLUTE ROI amount — alongside `roiPercentage` on
 * every completed row, so it is the exact money figure and needs no arithmetic.
 * That remains the only workable route; `multiplyBy` still has no divisor.
 *
 * A WIN is ROI the platform paid out; a LOSS is principal it kept. The
 * difference is the product's P&L, and nothing on the platform showed it.
 *
 * ON THE UNIT, AND WHY NONE OF THESE SAY "$". `amount` and `profit` are in the
 * QUOTE half of `symbol`: `investment/log/index.post.ts` writes
 * `symbol: currency/pair` and debits the wallet whose currency is `pair`.
 * Nothing on the row records that asset — `symbol` is free text, and neither
 * `aiInvestmentPlan` nor `aiInvestmentDuration` carries a currency column, so
 * the one BelongsTo hop `inUSD` allows leads nowhere. These totals therefore
 * drop `format: "currency"` rather than keep claiming dollars: a book holding
 * 5,000 USDT and 0.2 BTC of principal was rendering "$5,000.20" through a
 * formatter that defaults to USD, for something worth about $24,000. A unitless
 * total is a mixed-denomination figure that admits it.
 *
 * ON THE TWO RANKED BARS. `activeCapital` is one number for a book that is
 * actually spread across symbols and plans, and a single concentrated exposure
 * is the risk this product carries. The stacked "capital by wallet type" chart
 * was dropped for them: it plotted the same two figures the Spot/Eco cards
 * beneath it already state exactly, which was the weakest use of a chart slot
 * on the page.
 */
export function useAnalytics() {
  const t = useTranslations("ext_admin");
  const tCommon = useTranslations("common");
  return [
    // ─────────────────────────────────────────────────────────────
    // Row 1: liability and the house's own P&L.
    // ─────────────────────────────────────────────────────────────
    [
      {
        type: "kpi",
        layout: { cols: 2 },
        responsive: {
          mobile: { cols: 1, span: 1 },
          tablet: { cols: 2, span: 2 },
          desktop: { cols: 2, span: 2 },
        },
        items: [
          {
            /**
             * Outstanding principal owed back to users — the liability line for
             * this product. `current` because it is a STOCK: folding it per
             * creation-bucket would answer "principal opened in March", not
             * "principal we are holding".
             */
            id: "capital_deployed",
            title: tCommon("capital_deployed"),
            metric: "activeCapital",
            model: "aiInvestment",
            aggregation: {
              field: "amount",
              op: "sum",
              where: [{ field: "status", value: "ACTIVE" }],
            },
            valueMode: "current",
            format: "number",
            icon: "mdi:cash-lock",
          },
          {
            id: "roi_paid_out",
            title: tCommon("roi_paid_out"),
            metric: "roiPaid",
            model: "aiInvestment",
            aggregation: {
              field: "profit",
              op: "sum",
              where: [
                { field: "status", value: "COMPLETED" },
                { field: "result", value: "WIN" },
              ],
            },
            valueMode: "current",
            format: "number",
            invert: true,
            icon: "mdi:cash-minus",
          },
          {
            id: "principal_retained",
            title: tCommon("principal_retained"),
            metric: "roiKept",
            model: "aiInvestment",
            aggregation: {
              field: "profit",
              op: "sum",
              where: [
                { field: "status", value: "COMPLETED" },
                { field: "result", value: "LOSS" },
              ],
            },
            valueMode: "current",
            format: "number",
            icon: "mdi:cash-plus",
          },
          {
            id: "house_result",
            title: tCommon("house_result"),
            metric: "houseResult",
            model: "aiInvestment",
            derived: { op: "diff", of: ["roiKept", "roiPaid"] },
            format: "number",
            icon: "mdi:scale-balance",
          },
        ],
      },
      {
        type: "chart",
        responsive: {
          mobile: { cols: 1, span: 1 },
          tablet: { cols: 1, span: 1 },
          desktop: { cols: 1, span: 1 },
        },
        items: [
          {
            // A drift in this line is a pricing error or an exploit; the
            // static result KPIs it replaced could not show movement at all.
            id: "winRateTrend",
            title: tCommon("win_rate_over_time"),
            type: "line",
            model: "aiInvestment",
            metrics: ["winRate"],
            labels: { winRate: tCommon("win_rate") },
            description: t("wins_as_a_share_of_settled_positions"),
          },
        ],
      },
    ],

    // ─────────────────────────────────────────────────────────────
    // Row 2: outcome quality. Replaces three result KPIs, a result donut and
    // four status KPIs with one rate and the two counts behind it.
    // ─────────────────────────────────────────────────────────────
    {
      type: "kpi",
      layout: { cols: 4 },
      responsive: {
        mobile: { cols: 1, span: 1 },
        tablet: { cols: 2, span: 1 },
        desktop: { cols: 4, span: 1 },
      },
      items: [
        {
          id: "win_rate",
          title: tCommon("win_rate"),
          metric: "winRate",
          model: "aiInvestment",
          derived: { op: "percent", of: ["WIN", "COMPLETED"] },
          format: "percent",
          icon: "mdi:trophy",
        },
        {
          id: "winning_investments",
          title: tCommon("winning"),
          metric: "WIN",
          model: "aiInvestment",
          aggregation: { field: "result", value: "WIN" },
          icon: "mdi:medal",
        },
        {
          id: "completed_investments",
          title: tCommon("completed"),
          metric: "COMPLETED",
          model: "aiInvestment",
          aggregation: { field: "status", value: "COMPLETED" },
          icon: "mdi:check-circle",
        },
        {
          /**
           * The working version of the old `average` card, which named neither a
           * column nor an alias. Cancelled and rejected rows are excluded — they
           * never became a position, and averaging them in drags the ticket
           * toward whatever the desk turned away.
           */
          id: "average_ticket",
          title: tCommon("average_ticket"),
          metric: "avgTicket",
          model: "aiInvestment",
          aggregation: {
            field: "amount",
            op: "avg",
            where: [
              { field: "status", op: "!=", value: "CANCELLED" },
              { field: "status", op: "!=", value: "REJECTED" },
            ],
          },
          format: "number",
          icon: "mdi:calculator",
        },
      ],
    },

    // ─────────────────────────────────────────────────────────────
    // Row 3: the wallet split by VALUE, and which markets the live book is
    // actually exposed to.
    // ─────────────────────────────────────────────────────────────
    [
      {
        type: "kpi",
        layout: { cols: 2 },
        responsive: {
          mobile: { cols: 1, span: 1 },
          tablet: { cols: 2, span: 2 },
          desktop: { cols: 2, span: 2 },
        },
        items: [
          {
            id: "spot_capital",
            title: t("spot_investments"),
            metric: "spotValue",
            model: "aiInvestment",
            aggregation: {
              field: "amount",
              op: "sum",
              where: [{ field: "type", value: "SPOT" }],
            },
            format: "number",
            icon: "mdi:chart-areaspline",
          },
          {
            id: "eco_capital",
            title: t("eco_investments"),
            metric: "ecoValue",
            model: "aiInvestment",
            aggregation: {
              field: "amount",
              op: "sum",
              where: [{ field: "type", value: "ECO" }],
            },
            format: "number",
            icon: "mdi:leaf",
          },
        ],
      },
      {
        type: "chart",
        responsive: {
          mobile: { cols: 1, span: 1 },
          tablet: { cols: 1, span: 1 },
          desktop: { cols: 1, span: 1 },
        },
        items: [
          {
            /**
             * `symbol` is free text on the row and the categories are DATA, so
             * this could not be written as a status list — it needed a ranked
             * breakdown. It reconciles exactly with "Capital Deployed": same
             * ACTIVE filter, same column, split by market.
             *
             * `scope: "all"` because open principal is a stock. Ranked inside
             * the window it would rank the symbols of positions OPENED in the
             * window, which is a different and much less useful question.
             */
            id: "topSymbolsByCapital",
            title: t("top_symbols_by_deployed_capital"),
            type: "bar",
            model: "aiInvestment",
            metrics: [],
            description:
              t("open_principal_per_market_right_now"),
            config: {
              groupBy: "symbol",
              limit: 5,
              scope: "all",
              measure: {
                field: "amount",
                op: "sum",
                where: [{ field: "status", value: "ACTIVE" }],
              },
            },
          },
        ],
      },
    ],

    // ─────────────────────────────────────────────────────────────
    // Row 4: which plan the book is concentrated in.
    // ─────────────────────────────────────────────────────────────
    {
      type: "chart",
      responsive: {
        mobile: { cols: 1, span: 1 },
        tablet: { cols: 1, span: 1 },
        desktop: { cols: 1, span: 1 },
      },
      items: [
        {
          /**
           * Plans price their own ROI band, so "which plan holds the money" is
           * the same question as "what are we on the hook for". `planId` is
           * resolved through its `belongsTo` association, so the axis carries
           * plan NAMES. The shape is the finding: one plan carrying the whole
           * book means one mispriced ROI band can empty the float.
           */
          id: "topPlansByCapital",
          title: t("top_plans_by_deployed_capital"),
          type: "bar",
          model: "aiInvestment",
          metrics: [],
          description: t("open_principal_per_plan_right_now"),
          config: {
            groupBy: "planId",
            limit: 5,
            scope: "all",
            measure: {
              field: "amount",
              op: "sum",
              where: [{ field: "status", value: "ACTIVE" }],
            },
          },
        },
      ],
    },
  ] as AnalyticsConfig;
}
