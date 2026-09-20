"use client";
import { AnalyticsConfig } from "@/components/blocks/data-table/types/analytics";
import { useTranslations } from "next-intl";

/**
 * Custody — a balance sheet, not a time series.
 * ============================================================================
 *
 * `wallet` is a STOCK table. `balance`, `inOrder`, `status` and custodial
 * liability are point-in-time quantities, so bucketing them on `createdAt`
 * answers a question nobody asked ("the balance of wallets created this
 * month"). Almost every card here therefore runs in `valueMode: "current"`,
 * which drops the date window entirely and reports as-of now.
 *
 * What was here before, and why none of it survived:
 *  - EIGHT tiles labelled "FIAT/SPOT/ECO/FUTURES Balance / In Order" all
 *    declared the SQL alias `balance` or `inOrder`, so mysql2 kept the last
 *    duplicate column and all eight printed the same number — which was the row
 *    COUNT of FUTURES wallets, not a balance.
 *  - "Active Wallets" and "Inactive Wallets" both compiled to `status = 0`
 *    (tinyint(1) compared against the string 'true'), so they showed the
 *    identical figure and it was the inactive one. The status donut split that
 *    one population 50/50 under two labels.
 *  - "Total Balance" and "In Order" had no aggregation at all and rendered 0.
 *  - Five per-type row counters restated donut segments of a table whose rows
 *    are auto-created on first use, so the count is dominated by empty shells.
 *
 * Second pass — a balance sheet needs a BREAKDOWN, and the grammar now has one.
 * "How much do we hold" is only actionable once you know in which currency and
 * on which rail, so the two ranked bars below replace the wallet-type donut
 * that could only count rows created in the window. Both run `scope: "all"`,
 * which drops the date filter: a custody figure is as-of now or it is nothing.
 *
 * Limits recorded for the next author:
 *  - a ranked breakdown carries ONE aggregate, so the bars measure `balance`
 *    and exclude the `inOrder` leg. `custodyTotal` above them is the full
 *    figure; read a bar as "free balance", not as total liability.
 *  - "Top 10 wallets by balance" ships as top 10 HOLDERS instead: grouping on
 *    the primary key would draw ten bare UUIDs (there is no association to
 *    follow from `id`), while `userId` resolves to a name and sums a person's
 *    several wallets rather than letting them compete for the ranking.
 *  - guards cannot be ORed with a comparison, so "funded" is `balance > 0` and
 *    does not also catch a wallet whose whole balance is locked in `inOrder`.
 */
export function useAnalytics() {
  const t = useTranslations("dashboard_admin");
  const tCommon = useTranslations("common");

  return [
    // ─────────────────────────────────────────────────────────────
    // Section 1 — how much customer money we hold, who holds it, and
    // how much of it is stuck somewhere it should not be.
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
            // The single most important number in the business. Built as a
            // `derived` sum because the engine aggregates one column at a time
            // and custody is `balance + inOrder`.
            id: "total_custodial_liability",
            title: t("total_custodial_liability"),
            metric: "custodyTotal",
            model: "wallet",
            derived: { op: "sum", of: ["balanceTotal", "inOrderTotal"] },
            format: "currency",
            icon: "mdi:bank",
          },
          {
            id: "available_balance_held",
            title: tCommon("total_balance"),
            metric: "balanceTotal",
            model: "wallet",
            aggregation: { field: "balance", op: "sum", inUSD: "currency" },
            valueMode: "current",
            format: "currency",
            icon: "mdi:cash-multiple",
          },
          {
            id: "locked_in_open_orders",
            title: tCommon("in_order"),
            metric: "inOrderTotal",
            model: "wallet",
            aggregation: { field: "inOrder", op: "sum", inUSD: "currency" },
            valueMode: "current",
            format: "currency",
            icon: "mdi:lock-outline",
          },
          {
            // How much of custody the matching engine is holding. A spike means
            // funds are being locked and not released — the unfunded-ghost
            // order class of bug — and it is invisible in the two sums above.
            id: "locked_vs_available",
            title: t("locked_vs_available_balance"),
            metric: "lockRatio",
            model: "wallet",
            derived: { op: "percent", of: ["inOrderTotal", "balanceTotal"] },
            format: "percent",
            icon: "mdi:percent-outline",
          },
          {
            // The real denominator for every per-user metric. "Total Wallets"
            // counted auto-created empties and was a database statistic.
            id: "funded_wallets",
            title: t("funded_wallets"),
            metric: "fundedWallets",
            model: "wallet",
            aggregation: {
              field: "id",
              op: "count",
              where: [{ field: "balance", op: ">", value: 0 }],
            },
            valueMode: "current",
            format: "number",
            icon: "mdi:wallet-plus",
          },
          {
            id: "users_holding_funds",
            title: t("users_holding_funds"),
            metric: "holders",
            model: "wallet",
            aggregation: {
              field: "userId",
              op: "countDistinct",
              where: [{ field: "balance", op: ">", value: 0 }],
            },
            valueMode: "current",
            format: "number",
            icon: "mdi:account-cash",
          },
          {
            /**
             * Customer money nobody has touched in three months. Replaces the
             * "Currencies in Custody" scalar, which the by-currency ranking
             * below now answers with more detail.
             *
             * Dormant balances are an operational and, past a threshold, an
             * escheatment problem, and they were unaskable: `updatedAt` is not
             * the date axis and there was no NOW()-relative predicate.
             */
            id: "dormant_funded_wallets",
            title: t("dormant_funded_wallets_90d"),
            metric: "dormantWallets",
            model: "wallet",
            aggregation: {
              field: "id",
              op: "count",
              where: [
                { field: "balance", op: ">", value: 0 },
                { field: "updatedAt", op: "<", value: { ago: "90d" } },
              ],
            },
            valueMode: "current",
            format: "number",
            invert: true,
            icon: "mdi:sleep",
          },
          {
            // Customer money frozen inside a disabled wallet. Each one is a
            // support ticket and, past a threshold, a regulatory problem. This
            // needs the boolean compared as an INTEGER, which is the exact
            // defect that broke the two cards this page used to carry.
            id: "funds_in_disabled_wallets",
            title: t("funds_in_disabled_wallets"),
            metric: "disabledFundedValue",
            model: "wallet",
            aggregation: {
              field: "balance",
              op: "sum",
              where: [
                { field: "status", value: false },
                { field: "balance", op: ">", value: 0 },
              ],
            },
            valueMode: "current",
            format: "currency",
            invert: true,
            icon: "mdi:cash-lock",
          },
          {
            // The one legitimately `createdAt`-shaped metric on this model:
            // acquisition INTO custody, as opposed to shell creation.
            id: "new_funded_wallets",
            title: t("new_funded_wallets"),
            metric: "newFundedWallets",
            model: "wallet",
            aggregation: {
              field: "id",
              op: "count",
              where: [{ field: "balance", op: ">", value: 0 }],
            },
            valueMode: "periodTotal",
            format: "number",
            icon: "mdi:trending-up",
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
             * Replaces "New Wallets by Type", a donut of the five enum members
             * whose aggregates were necessarily windowed on `createdAt` — it
             * counted SHELLS created this month, on a table whose rows are
             * auto-created on first use. It was the least informative card on a
             * custody page.
             *
             * This is the same axis carrying money instead of rows, as of now:
             * which rail is holding customer funds. Five categories, so nothing
             * rolls into "Other".
             */
            id: "balance_by_wallet_type",
            title: t("balance_held_by_wallet_type"),
            type: "bar",
            model: "wallet",
            metrics: [],
            config: {
              groupBy: "type",
              limit: 5,
              measure: { field: "balance", op: "sum" },
              scope: "all",
            },
          },
        ],
      },
    ],

    // ─────────────────────────────────────────────────────────────
    // Section 2 — the two concentration questions. Which denominations
    // is the platform liable in, and how few people is that liability
    // owed to. `currency` is a real per-row column, so the first is the
    // honest version of every cross-currency SUM on this page.
    // ─────────────────────────────────────────────────────────────
    [
      {
        type: "chart",
        responsive: {
          mobile: { span: 1 },
          tablet: { span: 2 },
          desktop: { span: 2 },
        },
        items: [
          {
            id: "custodial_balance_by_currency",
            title: t("custodial_balance_by_currency"),
            type: "bar",
            model: "wallet",
            metrics: [],
            config: {
              groupBy: "currency",
              limit: 8,
              measure: { field: "balance", op: "sum" },
              scope: "all",
            },
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
             * Counterparty concentration: if three accounts hold most of
             * custody, the liability is theirs and so is the withdrawal risk.
             *
             * The blueprint asked for "top 10 WALLETS by balance", which would
             * have to group on the primary key and draw ten bare UUIDs — there
             * is no association to follow from `id`. Grouping on `userId`
             * answers the same question better: one row per person, resolved
             * through `belongsTo(user)` to an email, with a user's several
             * wallets summed instead of competing for the ranking.
             */
            id: "top_holders_by_balance",
            title: t("top_holders_by_balance"),
            type: "bar",
            model: "wallet",
            metrics: [],
            config: {
              groupBy: "userId",
              limit: 8,
              measure: { field: "balance", op: "sum" },
              scope: "all",
            },
          },
        ],
      },
    ],

    // ─────────────────────────────────────────────────────────────
    // Section 3 — the shell-creation check. Wallets are auto-created
    // on first use, so the gap between the two lines IS the bloat:
    // if "Created" runs away from "Funded", wallet creation is firing
    // for accounts that never deposit.
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
          id: "walletsOverTime",
          title: tCommon("wallets_over_time"),
          type: "line",
          model: "wallet",
          metrics: ["total", "newFundedWallets"],
          timeframes: ["24h", "7d", "30d", "3m", "6m", "y"],
          labels: {
            total: "Wallets Created",
            newFundedWallets: "Created and Currently Funded",
          },
        },
      ],
    },
  ] as AnalyticsConfig;
}
