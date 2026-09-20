"use client";
import { AnalyticsConfig } from "@/components/blocks/data-table/types/analytics";

import { useTranslations } from "next-intl";
export function useAnalytics() {
  const t = useTranslations("dashboard_admin");
  const tCommon = useTranslations("common");
  return [
    // ─────────────────────────────────────────────────────────────
    // Section 1 — What the venue integration earned.
    // `cost` is the only summable notional on this model: `amount` is a
    // base-asset quantity, so summing it adds BTC to DOGE.
    //
    // `cost` IS NOT DOLLARS EITHER. It is `price x filled`, so it is priced in
    // the QUOTE half of `symbol` — and `symbol` is free text. "BTC/USDT" is not
    // a currency code, there is no quote-asset column, and the only association
    // on `exchangeOrder` is `user`, so `inUSD` has nothing to reach in its one
    // permitted hop. The notional total therefore drops `format: "currency"`
    // rather than keep claiming a unit: a book that settled 50,000 USDT and 2
    // BTC of flow was printing "$50,002" for something worth about $190,000.
    //
    // `fee` is the exception on this model, and the only one. `feeCurrency` is
    // a real per-row column — base asset on a BUY, quote asset on a SELL, see
    // `exchange/order/utils.ts` — so fee revenue is grouped by it, priced per
    // asset and reported as one genuine USD figure.
    // ─────────────────────────────────────────────────────────────
    [
      {
        type: "kpi",
        layout: { cols: 4, rows: 1 },
        responsive: {
          mobile: { cols: 1, span: 1 },
          tablet: { cols: 2, span: 2 },
          desktop: { cols: 4, span: 2 },
        },
        items: [
          {
            id: "notional_traded",
            title: t("notional_traded"),
            metric: "notional",
            model: "exchangeOrder",
            aggregation: {
              field: "cost",
              op: "sum",
              where: [{ field: "status", value: "CLOSED" }],
            },
            format: "number",
            icon: "mdi:swap-horizontal-bold",
          },
          {
            id: "fee_revenue",
            title: tCommon("fee_revenue"),
            metric: "feeRevenue",
            model: "exchangeOrder",
            aggregation: {
              field: "fee",
              op: "sum",
              inUSD: "feeCurrency",
              where: [{ field: "status", value: "CLOSED" }],
            },
            format: "currency",
            icon: "mdi:cash-register",
          },
          {
            /**
             * A RATIO OF TWO DIFFERENT UNITS, deliberately kept. `feeRevenue`
             * is now real USD and `notional` is an un-priced sum over several
             * quote assets, so the absolute basis points here mean nothing —
             * read the line for movement, not for a rate to quote.
             *
             * It was no better before: both legs were mixed-denomination and
             * the ratio was just as meaningless with two wrong units instead of
             * one. The numerator is the leg that could be fixed, and fee
             * revenue is the figure an operator actually acts on.
             */
            id: "effective_take_rate",
            title: t("effective_take_rate"),
            metric: "takeRate",
            model: "exchangeOrder",
            derived: { op: "percent", of: ["feeRevenue", "notional"] },
            format: "percent",
            icon: "mdi:percent-outline",
          },
          {
            /**
             * `current`, and the title says lifetime, because a WINDOWED
             * countDistinct is not the window's distinct count: `foldPeriod`
             * folds it with Math.max over the buckets — chart.ts calls that
             * "a true lower bound rather than a confidently inflated total" —
             * so a 30d view titled "Active Traders" would report the busiest
             * single DAY. The snapshot pass runs one GROUP-less query, so this
             * figure is exact.
             */
            id: "active_traders",
            title: t("traders_lifetime"),
            metric: "traders",
            model: "exchangeOrder",
            aggregation: { field: "userId", op: "countDistinct" },
            valueMode: "current",
            format: "number",
            icon: "mdi:account-group",
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
            id: "notionalTradedOverTime",
            title: t("settled_notional"),
            type: "bar",
            model: "exchangeOrder",
            metrics: ["notional"],
            timeframes: ["24h", "7d", "30d", "3m", "6m", "y"],
            labels: { notional: tCommon("trading_volume") },
            description: t("settled_order_value_per_bucket_what"),
          },
        ],
      },
    ],

    // ─────────────────────────────────────────────────────────────
    // Section 2 — Is the connector healthy, and what is it holding?
    // REJECTED/EXPIRED is the upstream-venue alarm; a CLOSED order with
    // no `referenceId` cannot be reconciled against the venue statement;
    // and an order that has been OPEN for a day is one the venue never
    // filled and the platform never released.
    //
    // The per-status counts and the status stacked bar that used to sit
    // here are gone: `orders_placed` + `failedOrders` + the rate already
    // carry the judgement, and the two rankings answer the question a
    // status mix cannot — WHERE the flow is concentrated.
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
            // `remaining x price` lands in the same quote asset `cost` does,
            // so this carries the same un-nameable unit and drops the same
            // false dollar sign. See the note above Section 1.
            id: "resting_exposure",
            title: t("resting_exposure"),
            metric: "restingExposure",
            model: "exchangeOrder",
            aggregation: {
              field: "remaining",
              op: "sum",
              multiplyBy: "price",
              where: [{ field: "status", value: "OPEN" }],
            },
            valueMode: "current",
            format: "number",
            icon: "mdi:lock-clock",
          },
          {
            /**
             * An order still OPEN a day after it was placed is either a
             * limit the venue will never fill or a fill the connector
             * missed; either way the funds behind it are held. A STOCK, so
             * `current` — the window is irrelevant to "what is stuck now".
             */
            id: "stale_open_orders",
            title: t("stale_open_orders_24h"),
            metric: "staleOpen",
            model: "exchangeOrder",
            aggregation: {
              field: "id",
              op: "count",
              where: [
                { field: "status", value: "OPEN" },
                { field: "createdAt", op: "<", value: { ago: "24h" } },
              ],
            },
            valueMode: "current",
            format: "number",
            invert: true,
            icon: "mdi:clock-alert",
          },
          {
            // The window denominator for `reject_expire_rate`. It cannot be
            // the free `total` alias: `fetchSnapshot` selects its own
            // un-windowed `total` and `Object.assign(periodTotals, snapshot)`
            // runs AFTER the window fold, so on this page — `resting_exposure`
            // and `unreconciled_fills` are both `current` — `total` is the
            // ALL-TIME order count and the rate would divide a window
            // numerator by it.
            id: "orders_placed",
            title: tCommon("orders_placed"),
            metric: "ordersPlaced",
            model: "exchangeOrder",
            aggregation: { field: "id", op: "count" },
            valueMode: "periodTotal",
            format: "number",
            icon: "mdi:playlist-plus",
          },
          {
            /**
             * The IN-list, in place of a chain of `!=` guards over every
             * other member of the enum. The chain said "not OPEN and not
             * CLOSED and not CANCELED", which silently absorbs any status
             * added later into the failure count.
             */
            id: "failed_orders",
            title: t("rejected_expired"),
            metric: "failedOrders",
            model: "exchangeOrder",
            aggregation: {
              field: "id",
              op: "count",
              where: [{ field: "status", values: ["REJECTED", "EXPIRED"] }],
            },
            format: "number",
            invert: true,
            icon: "mdi:thumb-down",
          },
          {
            id: "reject_expire_rate",
            title: t("reject_expire_rate"),
            metric: "rejectRate",
            model: "exchangeOrder",
            derived: { op: "percent", of: ["failedOrders", "ordersPlaced"] },
            format: "percent",
            invert: true,
            icon: "mdi:alert-decagram",
          },
          {
            id: "unreconciled_fills",
            title: t("unreconciled_fills"),
            metric: "unreconciled",
            model: "exchangeOrder",
            aggregation: {
              field: "id",
              op: "count",
              where: [
                { field: "referenceId", value: null },
                { field: "status", value: "CLOSED" },
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
          mobile: { cols: 1, span: 1 },
          tablet: { cols: 1, span: 1 },
          desktop: { cols: 1, span: 1 },
        },
        items: [
          {
            /**
             * A RANKING, not a donut, even though there are usually only a
             * handful of fee currencies: a part-of-whole ring would imply the
             * slices sum to something, and these are amounts in DIFFERENT
             * assets. Read as a list it is the reconciliation work-list —
             * which fee wallet has accrued enough to be worth sweeping. Every
             * bar is in its own unit: they are ranked, never summed.
             */
            id: "feeRevenueByCurrency",
            title: t("fee_revenue_by_currency"),
            type: "bar",
            model: "exchangeOrder",
            metrics: [],
            config: {
              groupBy: "feeCurrency",
              limit: 5,
              measure: {
                field: "fee",
                op: "sum",
                where: [{ field: "status", value: "CLOSED" }],
              },
            },
            description: t("fees_accrued_on_settled_orders_per_fee_asset"),
          },
        ],
      },
    ],

    // ─────────────────────────────────────────────────────────────
    // Section 3 — Where the flow is concentrated.
    // Full width because a symbol ranking is read as a list, and the
    // rows need the horizontal room the 1/3 chart cell does not have.
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
          // Concentration here is venue-integration risk: if one symbol
          // carries the book, one upstream outage takes the whole flow.
          id: "topSymbolsByNotional",
          title: t("top_symbols_by_settled_notional"),
          type: "bar",
          model: "exchangeOrder",
          metrics: [],
          config: {
            groupBy: "symbol",
            limit: 8,
            measure: {
              field: "cost",
              op: "sum",
              where: [{ field: "status", value: "CLOSED" }],
            },
          },
          description: t("settled_order_value_by_market_top_eight"),
        },
      ],
    },
  ] as AnalyticsConfig;
}
