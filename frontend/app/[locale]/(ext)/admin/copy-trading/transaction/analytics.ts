"use client";
import { AnalyticsConfig } from "@/components/blocks/data-table/types/analytics";
import { useTranslations } from "next-intl";

/**
 * The copy-trading money ledger.
 *
 * Every row here carries `amount`, `fee`, `balanceBefore` and `balanceAfter` as
 * real FLOAT columns, and the old page aggregated none of them. Its four type
 * cards were titled Allocations, Withdrawals, Profit Shares and Platform Fees —
 * and all four reported ROW COUNTS, so ten $1 fees and ten $10,000 fees
 * rendered identically. Its enums were the only complete ones in the domain and
 * every number on it was still the wrong kind of number.
 *
 * The "Withdrawals" title was also a mislabel: a DEALLOCATION returns capital
 * from a copy allocation to the user's wallet, which is not a platform
 * withdrawal, and an admin reconciling against the finance withdraw page would
 * never find these rows. It is named for what it is below.
 *
 * The single-denomination assumption is gone rather than merely visible. Every
 * total below now declares `inUSD: "currency"`, so the engine groups the sum by
 * the ledger's own per-row denomination, prices each group at its own rate and
 * folds them into one real USD figure. Before that, `copyProcessor` writing
 * `currency: spendCurrency` — the quote asset of whatever market was copied —
 * meant an ETH-quoted allocation was added to a USDT one and the total was
 * printed with a dollar sign in front of it. The ranked breakdown in row 1 stays
 * because the MIX is still worth seeing; it is no longer the only honest card.
 *
 * DROPPED to stay inside the item budget: "Pending Settlement", a snapshot of
 * PENDING value. `status` defaults to COMPLETED on this model, so the card was
 * anomaly-detection for a state that should not persist — and Failed Money
 * already covers the reconciliation break it was watching for.
 */
export function useAnalytics() {
  const t = useTranslations("ext_admin");
  const tCommon = useTranslations("common");
  const tExt = useTranslations("ext");

  return [
    // ─────────────────────────────────────────────────────────────
    // Row 1 — is the product growing, and what does it earn?
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
            id: "allocation_value",
            title: tExt("allocations"),
            metric: "allocationValue",
            model: "copyTradingTransaction",
            aggregation: {
              op: "sum",
              field: "amount",
              inUSD: "currency",
              where: [
                { field: "type", value: "ALLOCATION" },
                { field: "status", value: "COMPLETED" },
              ],
            },
            format: "currency",
            icon: "mdi:cash-plus",
          },
          {
            // Capital returned from allocations to wallets. NOT a platform
            // withdrawal, whatever the old card title said.
            id: "deallocation_value",
            title: t("deallocated"),
            metric: "deallocationValue",
            model: "copyTradingTransaction",
            aggregation: {
              op: "sum",
              field: "amount",
              inUSD: "currency",
              where: [
                { field: "type", value: "DEALLOCATION" },
                { field: "status", value: "COMPLETED" },
              ],
            },
            format: "currency",
            invert: true,
            icon: "mdi:cash-minus",
          },
          {
            // Whether copy-trading AUM grew or shrank. The single number that
            // says if the product is winning.
            id: "net_allocation_flow",
            title: t("net_allocation_flow"),
            metric: "netAllocationFlow",
            model: "copyTradingTransaction",
            derived: {
              op: "diff",
              of: ["allocationValue", "deallocationValue"],
            },
            format: "currency",
            icon: "mdi:swap-vertical-bold",
          },
          {
            id: "platform_fee_revenue",
            title: tCommon("platform_fees"),
            metric: "feeRevenue",
            model: "copyTradingTransaction",
            aggregation: {
              op: "sum",
              field: "amount",
              inUSD: "currency",
              where: [
                { field: "type", value: "FEE" },
                { field: "status", value: "COMPLETED" },
              ],
            },
            format: "currency",
            icon: "mdi:cash-register",
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
            /**
             * The mix behind every total above.
             *
             * `currency` is a real per-row column defaulting to USDT, and it is
             * what the cards beside this one now convert through. This is the
             * pre-conversion view: one bar per denomination, the tail rolled
             * into "Other", so an operator can see WHICH units the ledger is
             * booking before they are folded into USD — and spot a currency the
             * rate table cannot price, which the KPIs report as excluded.
             *
             * It replaced the single-series net-flow line, which only redrew
             * the sparkline already on the Net Allocation Flow card.
             */
            id: "copyTradingValueByCurrency",
            title: t("settled_value_by_currency"),
            type: "bar",
            model: "copyTradingTransaction",
            metrics: [],
            config: {
              groupBy: "currency",
              limit: 5,
              measure: {
                op: "sum",
                field: "amount",
                where: [{ field: "status", value: "COMPLETED" }],
              },
            },
          },
        ],
      },
    ],

    // ─────────────────────────────────────────────────────────────
    // Row 2 — the cost side and the trading result the ledger booked.
    // `tradePnlBooked` should reconcile against SUM(profit) on
    // copyTradingTrade; a divergence between the two is a bookkeeping bug.
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
          // Paired with fee revenue above, this gives the product margin — a
          // figure no screen could compute.
          id: "profit_share_paid",
          title: t("profit_shares"),
          metric: "profitSharePaid",
          model: "copyTradingTransaction",
          aggregation: {
            op: "sum",
            field: "amount",
            inUSD: "currency",
            where: [
              { field: "type", value: "PROFIT_SHARE" },
              { field: "status", value: "COMPLETED" },
            ],
          },
          format: "currency",
          invert: true,
          icon: "mdi:cash-multiple",
        },
        {
          id: "trade_profit_booked",
          title: t("trade_profit_booked"),
          metric: "tradeProfitValue",
          model: "copyTradingTransaction",
          aggregation: {
            op: "sum",
            field: "amount",
            inUSD: "currency",
            where: [
              { field: "type", value: "TRADE_PROFIT" },
              { field: "status", value: "COMPLETED" },
            ],
          },
          format: "currency",
          icon: "mdi:trending-up",
        },
        {
          id: "trade_loss_booked",
          title: t("trade_loss_booked"),
          metric: "tradeLossValue",
          model: "copyTradingTransaction",
          aggregation: {
            op: "sum",
            field: "amount",
            inUSD: "currency",
            where: [
              { field: "type", value: "TRADE_LOSS" },
              { field: "status", value: "COMPLETED" },
            ],
          },
          format: "currency",
          invert: true,
          icon: "mdi:trending-down",
        },
        {
          id: "trade_pnl_booked",
          title: t("net_trade_p_l_booked"),
          metric: "tradePnlBooked",
          model: "copyTradingTransaction",
          derived: {
            op: "diff",
            of: ["tradeProfitValue", "tradeLossValue"],
          },
          format: "currency",
          icon: "mdi:scale-balance",
        },
      ],
    },

    // ─────────────────────────────────────────────────────────────
    // Row 3 — money that had to be given back, and money that never moved.
    // Both are reconciliation work, and neither had a card.
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
          // A REFUND is the ledger admitting an earlier entry was wrong. The
          // absolute figure is the size of the mistakes; the rate beside it is
          // whether they are getting more common.
          id: "refunds_issued",
          title: t("refunds_issued"),
          metric: "refundValue",
          model: "copyTradingTransaction",
          aggregation: {
            op: "sum",
            field: "amount",
            inUSD: "currency",
            where: [
              { field: "type", value: "REFUND" },
              { field: "status", value: "COMPLETED" },
            ],
          },
          format: "currency",
          invert: true,
          icon: "mdi:cash-refund",
        },
        {
          /**
           * The denominator: everything a refund can reverse.
           *
           * This is the card the IN-list bought. A refund undoes an allocation,
           * a profit share or a fee, so the honest base is those three types
           * together — and with guards ANDed there was no way to name three
           * values of one column, which is why the rate was dropped instead of
           * being written against a base that was a third of the truth.
           */
          id: "reversible_volume",
          title: t("reversible_volume"),
          metric: "reversibleValue",
          model: "copyTradingTransaction",
          aggregation: {
            op: "sum",
            field: "amount",
            inUSD: "currency",
            where: [
              {
                field: "type",
                values: ["ALLOCATION", "PROFIT_SHARE", "FEE"],
              },
              { field: "status", value: "COMPLETED" },
            ],
          },
          format: "currency",
          icon: "mdi:swap-horizontal-bold",
        },
        {
          id: "reversal_rate",
          title: t("reversal_rate"),
          metric: "reversalRate",
          model: "copyTradingTransaction",
          derived: { op: "percent", of: ["refundValue", "reversibleValue"] },
          format: "percent",
          invert: true,
          icon: "mdi:percent-outline",
        },
        {
          // Value that should have moved and did not. Every unit is a
          // reconciliation break against the wallet ledger.
          id: "failed_money",
          title: t("failed_money"),
          metric: "failedValue",
          model: "copyTradingTransaction",
          aggregation: {
            op: "sum",
            field: "amount",
            inUSD: "currency",
            where: [{ field: "status", value: "FAILED" }],
          },
          format: "currency",
          invert: true,
          icon: "mdi:alert-circle",
        },
      ],
    },

    // ─────────────────────────────────────────────────────────────
    // Row 4 — one chart that carries everything the four type counts, the
    // seven-slice type pie and the status line were reaching for, with
    // magnitude and direction attached.
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
          id: "moneyByTypeOverTime",
          title: t("money_by_type_over_time"),
          type: "stackedBar",
          model: "copyTradingTransaction",
          metrics: [
            "allocationValue",
            "deallocationValue",
            "profitSharePaid",
            "feeRevenue",
            "tradeProfitValue",
            "tradeLossValue",
          ],
          timeframes: ["24h", "7d", "30d", "3m", "6m", "y"],
          labels: {
            allocationValue: tExt("allocation"),
            deallocationValue: "Deallocation",
            profitSharePaid: tCommon("profit_share"),
            feeRevenue: tCommon("fee"),
            tradeProfitValue: tCommon("profit"),
            tradeLossValue: tCommon("loss"),
          },
        },
      ],
    },
  ] as AnalyticsConfig;
}
