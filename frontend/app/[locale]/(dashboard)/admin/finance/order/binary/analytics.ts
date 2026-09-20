"use client";
import { AnalyticsConfig } from "@/components/blocks/data-table/types/analytics";
import { useTranslations } from "next-intl";

export function useAnalytics() {
  const t = useTranslations("dashboard_admin");
  const tCommon = useTranslations("common");

  return [
    // ─────────────────────────────────────────────────────────────
    // Section 1 — The book: did we make money, and what do we owe?
    // Every P&L figure is live money only (isDemo = 0); practice
    // contracts never enter a P&L line. Demo volume is carried as its
    // own card beside the live one so the two are comparable without
    // ever being added together.
    //
    // NONE OF THESE WEAR A CURRENCY, AND THAT IS THE HONEST FORM. A binary
    // contract is staked in the QUOTE half of `symbol` — `BinaryOrderService`
    // debits the wallet whose currency is `pair` — and `binaryOrder` has no
    // column that says which asset that is: `symbol` is the free-text
    // "BTC/USDT", and the model's only association is `user`. `inUSD` needs an
    // own column or ONE BelongsTo hop, so there is nothing here for it to
    // reach. These sums were being rendered through a formatter that defaults
    // to USD, so a book carrying 500 USDT and 0.01 BTC of stakes printed
    // "$500.01". They are plain totals now: still one number over several
    // quote assets, but no longer one wearing a dollar sign it has not earned.
    // ─────────────────────────────────────────────────────────────
    [
      {
        type: "kpi",
        layout: { cols: 3, rows: 2 },
        responsive: {
          mobile: { cols: 1, span: 1 },
          tablet: { cols: 2, span: 2 },
          desktop: { cols: 3, span: 2 },
        },
        items: [
          {
            id: "net_house_pnl",
            title: t("net_house_p_l"),
            metric: "netHousePnl",
            model: "binaryOrder",
            derived: { op: "diff", of: ["stakesLost", "payoutsPaid"] },
            format: "number",
            icon: "mdi:scale-balance",
          },
          {
            id: "stakes_lost_by_users",
            title: t("stakes_won_by_house"),
            metric: "stakesLost",
            model: "binaryOrder",
            aggregation: {
              field: "amount",
              op: "sum",
              where: [
                { field: "status", value: "LOSS" },
                { field: "isDemo", value: false },
              ],
            },
            format: "number",
            icon: "mdi:cash-plus",
          },
          {
            id: "payouts_paid",
            title: t("payouts_paid"),
            metric: "payoutsPaid",
            model: "binaryOrder",
            aggregation: {
              field: "profit",
              op: "sum",
              where: [
                { field: "status", value: "WIN" },
                { field: "isDemo", value: false },
              ],
            },
            format: "number",
            invert: true,
            icon: "mdi:cash-minus",
          },
          {
            id: "live_staked_volume",
            title: t("live_staked_volume"),
            metric: "liveVolume",
            model: "binaryOrder",
            aggregation: {
              field: "amount",
              op: "sum",
              where: [{ field: "isDemo", value: false }],
            },
            format: "number",
            icon: "mdi:cash-multiple",
          },
          {
            /**
             * The other half of "Demo vs Live Volume". Written as a second
             * KPI rather than a breakdown grouped on `isDemo`, because the
             * label a `groupBy` renders is the RAW column value — a tinyint
             * chart legended "0" and "1". Two named cards say the same thing
             * and can be read without a key.
             */
            id: "demo_staked_volume",
            title: t("demo_staked_volume"),
            metric: "demoVolume",
            model: "binaryOrder",
            aggregation: {
              field: "amount",
              op: "sum",
              where: [{ field: "isDemo", value: true }],
            },
            format: "number",
            icon: "mdi:test-tube",
          },
          {
            id: "outstanding_payout_liability",
            title: tCommon("outstanding_payout_liability"),
            metric: "openLiability",
            model: "binaryOrder",
            aggregation: {
              field: "profit",
              op: "sum",
              where: [
                { field: "status", value: "PENDING" },
                { field: "isDemo", value: false },
              ],
            },
            valueMode: "current",
            format: "number",
            invert: true,
            icon: "mdi:bank-transfer-out",
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
            id: "houseTakeVsPayouts",
            title: t("house_take_vs_payouts"),
            type: "stackedBar",
            model: "binaryOrder",
            metrics: ["stakesLost", "payoutsPaid"],
            timeframes: ["24h", "7d", "30d", "3m", "6m", "y"],
            labels: {
              stakesLost: "Stakes won by house",
              payoutsPaid: "Payouts paid out",
            },
            description:
              t("live_contracts_only_the_gap_between"),
          },
        ],
      },
    ],

    // ─────────────────────────────────────────────────────────────
    // Section 2 — Is the settlement machinery working?
    // ERROR is commented on the model as "needs manual review", and a
    // PENDING contract whose `closedAt` has already passed is the same
    // failure the cron did not report: user money in a contract that
    // expired and was never settled.
    // ─────────────────────────────────────────────────────────────
    [
      {
        type: "kpi",
        layout: { cols: 3, rows: 2 },
        responsive: {
          mobile: { cols: 1, span: 1 },
          tablet: { cols: 2, span: 2 },
          desktop: { cols: 3, span: 2 },
        },
        items: [
          {
            id: "settlement_errors",
            title: t("settlement_errors_backlog"),
            metric: "errorBacklog",
            model: "binaryOrder",
            aggregation: {
              field: "id",
              op: "count",
              where: [{ field: "status", value: "ERROR" }],
            },
            valueMode: "current",
            format: "number",
            invert: true,
            icon: "mdi:alert-octagon",
          },
          {
            /**
             * The settlement watchdog. `closedAt` is the expiry instant, so
             * `closedAt < NOW() - 5min` AND still PENDING is a contract the
             * settlement pass should already have closed. The five-minute
             * grace keeps contracts that expired seconds ago — and are being
             * settled right now — out of the alarm.
             *
             * A STOCK, so `current`: the question is how many are stuck at
             * this moment, not how many were placed in the window.
             */
            id: "unsettled_past_expiry",
            title: t("unsettled_past_expiry"),
            metric: "unsettledPastExpiry",
            model: "binaryOrder",
            aggregation: {
              field: "id",
              op: "count",
              where: [
                { field: "status", value: "PENDING" },
                { field: "closedAt", op: "<", value: { ago: "5min" } },
              ],
            },
            valueMode: "current",
            format: "number",
            invert: true,
            icon: "mdi:clock-alert",
          },
          {
            /**
             * Settlement latency, measured as `closedAt -> updatedAt`.
             *
             * PROXY, AND IT IS NOTED ON PURPOSE: there is no `settledAt`
             * column on this model. `updatedAt` is the write that flipped the
             * row out of PENDING, so it is the settlement instant for every
             * row that has been touched exactly once since expiry — a later
             * admin edit would inflate that row's figure.
             *
             * `max`, NOT `avg`, and that is a constraint rather than a
             * preference: `buildAttributes` mirrors a duration's `multiplyBy`
             * into the hidden AVG numerator but NOT its `since`, so a windowed
             * `avg` folds `SUM(closedAt)` — a datetime coerced to the integer
             * 20260102138250 — over the bucket counts. `max` folds with
             * Math.max over per-bucket maxima, which is exact. The worst lag
             * in the window is also the figure that flags an incident; a mean
             * settlement time hides one contract that hung for a day.
             *
             * Minutes, not hours: `format: "duration"` reads its input as
             * HOURS, and TIMESTAMPDIFF returns whole units, so an engine that
             * settles in four minutes would render a flat "0h" and hide the
             * whole signal. A plain number with the unit in the title is the
             * honest form.
             */
            id: "settlement_latency",
            title: t("worst_settlement_lag_min"),
            metric: "settlementLag",
            model: "binaryOrder",
            aggregation: {
              field: "closedAt",
              op: "max",
              since: { unit: "min", until: "updatedAt" },
              where: [
                { field: "status", values: ["WIN", "LOSS", "DRAW"] },
                { field: "isDemo", value: false },
              ],
            },
            format: "number",
            invert: true,
            icon: "mdi:timer-sand",
          },
          {
            id: "contracts_won",
            title: tCommon("win"),
            metric: "wins",
            model: "binaryOrder",
            aggregation: {
              field: "id",
              op: "count",
              where: [
                { field: "status", value: "WIN" },
                { field: "isDemo", value: false },
              ],
            },
            format: "number",
            icon: "mdi:trophy",
          },
          {
            /**
             * The IN-list, rather than a chain of `!=` guards over every other
             * member of the enum. The chain was correct only until somebody
             * added a status; this says what it means — a contract that
             * reached an outcome.
             */
            id: "settled_contracts",
            title: t("settled_contracts"),
            metric: "settled",
            model: "binaryOrder",
            aggregation: {
              field: "id",
              op: "count",
              where: [
                { field: "isDemo", value: false },
                { field: "status", values: ["WIN", "LOSS", "DRAW"] },
              ],
            },
            format: "number",
            icon: "mdi:check-decagram",
          },
          {
            id: "user_win_rate",
            title: tCommon("win_rate"),
            metric: "winRate",
            model: "binaryOrder",
            derived: { op: "percent", of: ["wins", "settled"] },
            format: "percent",
            invert: true,
            icon: "mdi:percent-outline",
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
             * Replaces a wins-vs-losses stacked bar, which drew the same
             * judgement the win-rate card already states as a number.
             *
             * The blueprint asked for net house P&L per symbol. A ranked
             * breakdown takes ONE measure, and net P&L is a difference of two
             * (stakes kept minus payouts paid), so this ranks the side that
             * costs money: the symbols the book is paying out on. Read beside
             * "Payouts Paid", a symbol carrying most of the bar is where a
             * pricing or feed-latency problem is being monetised.
             */
            id: "topSymbolsByPayout",
            title: t("top_symbols_by_payouts_paid"),
            type: "bar",
            model: "binaryOrder",
            metrics: [],
            config: {
              groupBy: "symbol",
              limit: 5,
              measure: {
                field: "profit",
                op: "sum",
                where: [
                  { field: "status", value: "WIN" },
                  { field: "isDemo", value: false },
                ],
              },
            },
            description: t("live_settled_contracts_ranked_by_payouts"),
          },
        ],
      },
    ],
  ] as AnalyticsConfig;
}
