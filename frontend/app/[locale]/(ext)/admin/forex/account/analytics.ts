"use client";
import { AnalyticsConfig } from "@/components/blocks/data-table/types/analytics";
import { useTranslations } from "next-intl";

/**
 * Forex accounts — the book, not the headcount.
 *
 * This page used to render `type` four times (two KPIs, a two-slice pie and two
 * of three line series) and `status` three times, while the only three cards
 * that touched money — Total Balance, Average Balance, Total Leverage — carried
 * no `aggregation` at all and painted a hard 0 forever. The two boolean cards
 * compared a tinyint(1) against the STRING 'true', which MySQL coerces to 0, so
 * "Active", "Active" and "Inactive" printed the same number.
 *
 * What a forex desk actually manages is: how much customer money is under
 * management, how much of it is frozen in disabled accounts, and who is jammed
 * against a withdrawal cap right now. Those are STOCKS, so they use
 * `valueMode: "current"` — folding per-bucket sums would answer a different
 * question. The account-creation line is gone; the balance opened per cohort
 * replaced it, because 100 new $0 demo accounts and one $2M deposit looked
 * identical on the old chart.
 *
 * STILL NOT EXPRESSIBLE: "accounts at a withdrawal cap" as ONE card. That is
 * `dailyWithdrawn >= dailyWithdrawLimit OR monthlyWithdrawn >=
 * monthlyWithdrawLimit` — an OR across two DIFFERENT columns. `values: [...]`
 * is an IN-list over one column's values, not a disjunction of predicates, so
 * the two caps stay two cards.
 */
export function useAnalytics() {
  const t = useTranslations("ext_admin");
  const tCommon = useTranslations("common");

  return [
    // ─────────────────────────────────────────────────────────────
    // Row 1 — money and blocked customers. The two things that make
    // somebody open this screen.
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
            /**
             * The number reported upward: customer money this desk is
             * responsible for. DEMO balances are play money and are excluded.
             *
             * `inUSD` because `balance` is denominated by the account's own
             * `currency` column, bound on first funding — a bare SUM added a
             * 50,000 NGN account to a 0.4 BTC one and the card printed the
             * total with a dollar sign in front of it. Grouped by `currency`
             * and priced per group; anything with no rate is named on the card
             * rather than counted as zero.
             */
            id: "live_balance_under_management",
            title: t("live_balance_under_management"),
            metric: "liveBalance",
            model: "forexAccount",
            aggregation: {
              op: "sum",
              field: "balance",
              inUSD: "currency",
              where: [
                { field: "type", value: "LIVE" },
                { field: "status", value: "true" },
              ],
            },
            valueMode: "current",
            format: "currency",
            icon: "mdi:cash-multiple",
          },
          {
            // Money the platform holds in accounts it has switched off. Every
            // unit is a dispute waiting to be raised.
            id: "frozen_liability",
            title: t("frozen_liability"),
            metric: "frozenBalance",
            model: "forexAccount",
            aggregation: {
              op: "sum",
              field: "balance",
              inUSD: "currency",
              where: [
                { field: "type", value: "LIVE" },
                { field: "status", value: "false" },
              ],
            },
            valueMode: "current",
            format: "currency",
            invert: true,
            icon: "mdi:cash-lock",
          },
          {
            // Column-vs-column: withdrawn today has reached the daily cap.
            // These users cannot withdraw and will open a ticket today.
            id: "accounts_at_daily_cap",
            title: t("at_daily_withdraw_cap"),
            metric: "atDailyCap",
            model: "forexAccount",
            aggregation: {
              op: "count",
              field: "id",
              where: [
                { field: "type", value: "LIVE" },
                {
                  field: "dailyWithdrawn",
                  op: ">=",
                  value: { column: "dailyWithdrawLimit" },
                },
              ],
            },
            valueMode: "current",
            invert: true,
            icon: "mdi:cash-remove",
          },
          {
            // The model documents an outage where the monthly counter never
            // reset and accounts became permanently unable to withdraw.
            // Nothing on this page would have surfaced it.
            id: "accounts_at_monthly_cap",
            title: t("at_monthly_withdraw_cap"),
            metric: "atMonthlyCap",
            model: "forexAccount",
            aggregation: {
              op: "count",
              field: "id",
              where: [
                { field: "type", value: "LIVE" },
                {
                  field: "monthlyWithdrawn",
                  op: ">=",
                  value: { column: "monthlyWithdrawLimit" },
                },
              ],
            },
            valueMode: "current",
            invert: true,
            icon: "mdi:calendar-remove",
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
            // `type` is shown ONCE, and it covers both members of the enum.
            id: "forexAccountTypeDistribution",
            title: t("account_type_distribution"),
            type: "pie",
            model: "forexAccount",
            metrics: ["LIVE", "DEMO"],
            config: {
              field: "type",
              status: [
                {
                  value: "LIVE",
                  label: tCommon("live"),
                  color: "green",
                  icon: "mdi:account-check",
                },
                {
                  value: "DEMO",
                  label: tCommon("demo"),
                  color: "blue",
                  icon: "mdi:account-tie",
                },
              ],
            },
          },
        ],
      },
    ],

    // ─────────────────────────────────────────────────────────────
    // Row 2 — onboarding conversion and risk appetite.
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
          // Approved but never funded. Same window as the LIVE pie slice below
          // it, so the two divide honestly.
          id: "unfunded_new_live_accounts",
          title: t("unfunded_new_live_accounts"),
          metric: "unfundedLive",
          model: "forexAccount",
          aggregation: {
            op: "count",
            field: "id",
            where: [
              { field: "type", value: "LIVE" },
              { field: "status", value: "true" },
              { field: "balance", op: "=", value: "0" },
            ],
          },
          invert: true,
          icon: "mdi:account-question",
        },
        {
          // Numerator and denominator are both window-scoped counts of LIVE
          // accounts opened in the period — acquisition vs deposit-flow health.
          id: "unfunded_rate",
          title: t("unfunded_rate"),
          metric: "unfundedRate",
          model: "forexAccount",
          derived: { op: "percent", of: ["unfundedLive", "LIVE"] },
          format: "percent",
          invert: true,
          icon: "mdi:percent-outline",
        },
        {
          // Aggregate risk appetite. SUM(leverage) is meaningless — adding
          // 1:100 to 1:500 gives 600 — so this is the mean over live accounts.
          id: "average_leverage_live",
          title: t("average_leverage_live"),
          metric: "avgLeverage",
          model: "forexAccount",
          aggregation: {
            op: "avg",
            field: "leverage",
            where: [
              { field: "type", value: "LIVE" },
              { field: "status", value: "true" },
            ],
          },
          valueMode: "current",
          format: "number",
          icon: "mdi:chart-timeline-variant",
        },
        {
          // A FLOW, unlike the cards above: balance sitting on the LIVE
          // accounts opened inside the window. Feeds the chart below.
          id: "new_live_balance",
          title: t("balance_on_new_live_accounts"),
          metric: "newLiveBalance",
          model: "forexAccount",
          aggregation: {
            op: "sum",
            field: "balance",
            inUSD: "currency",
            where: [{ field: "type", value: "LIVE" }],
          },
          format: "currency",
          icon: "mdi:cash-plus",
        },
      ],
    },

    // ─────────────────────────────────────────────────────────────
    // Row 3 — the balance axis, which the old account-count line could not
    // show, beside the denomination split that decides which treasury float
    // has to cover it.
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
            id: "forexBalanceByCohort",
            title: t("live_balance_by_account_cohort"),
            type: "bar",
            model: "forexAccount",
            metrics: ["newLiveBalance"],
            timeframes: ["24h", "7d", "30d", "3m", "6m", "y"],
            labels: {
              newLiveBalance: "LIVE balance",
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
             * The money cards above are now folded into USD by `inUSD`, so they
             * are one comparable figure. This is the card that shows what that
             * figure is made of — and the bars are in their NATIVE units, one
             * per denomination, so they rank the book, not the dollar value.
             *
             * `currency` is a real per-row column (STRING), bound on first
             * funding and fixed thereafter, so the labels are legible without a
             * join. Accounts that have never been funded carry NULL and land in
             * the "Unspecified" row — their balance is 0 by construction, so a
             * visible bar there is itself a defect worth chasing.
             *
             * `scope: "all"` because a book is a STOCK: "which currencies hold
             * the money right now", not "which currencies were opened this
             * month".
             */
            id: "forexBalanceByCurrency",
            title: t("live_balance_by_currency"),
            type: "bar",
            model: "forexAccount",
            metrics: [],
            config: {
              groupBy: "currency",
              limit: 5,
              measure: {
                op: "sum",
                field: "balance",
                where: [{ field: "type", value: "LIVE" }],
              },
              scope: "all",
            },
          },
        ],
      },
    ],
  ] as AnalyticsConfig;
}
