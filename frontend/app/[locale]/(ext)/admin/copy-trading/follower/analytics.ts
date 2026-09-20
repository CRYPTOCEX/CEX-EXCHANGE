"use client";
import { AnalyticsConfig } from "@/components/blocks/data-table/types/analytics";
import { useTranslations } from "next-intl";

export function useAnalytics() {
  const t = useTranslations("ext_admin");
  const tCommon = useTranslations("common");
  const tExt = useTranslations("ext");

  return [
    // ─────────────────────────────────────────────────────────────
    // Group 1: Subscription Status Overview – KPI Grid & Pie Chart
    // ─────────────────────────────────────────────────────────────
    [
      {
        type: "kpi",
        layout: { cols: 2, rows: 2 },
        responsive: {
          mobile: { cols: 1, rows: 4, span: 1 },
          tablet: { cols: 2, rows: 2, span: 2 },
          desktop: { cols: 2, rows: 2, span: 2 },
        },
        items: [
          {
            // A STOCK, so it declares its own snapshot alias rather than
            // riding the free `total`, which `Object.assign(periodTotals,
            // snapshot)` silently turns into the all-time row count on any
            // page carrying a `current` card — the right number here, but by
            // accident, and read through `periodTotal` so it disagreed with
            // its own sparkline.
            id: "total_subscriptions",
            title: t("total_subscriptions"),
            metric: "subscriptionRoster",
            model: "copyTradingFollower",
            aggregation: { field: "id", op: "count" },
            valueMode: "current",
            icon: "mdi:account-multiple",
          },
          {
            id: "active_subscriptions",
            title: tExt("active_subscriptions"),
            metric: "ACTIVE",
            model: "copyTradingFollower",
            aggregation: { field: "status", value: "ACTIVE" },
            icon: "mdi:account-check",
          },
          {
            id: "paused_subscriptions",
            title: t("paused_subscriptions"),
            metric: "PAUSED",
            model: "copyTradingFollower",
            aggregation: { field: "status", value: "PAUSED" },
            icon: "mdi:account-pause",
          },
          {
            id: "stopped_subscriptions",
            title: t("stopped_subscriptions"),
            metric: "STOPPED",
            model: "copyTradingFollower",
            aggregation: { field: "status", value: "STOPPED" },
            icon: "mdi:account-cancel",
          },
        ],
      },
      {
        type: "chart",
        responsive: {
          mobile: { cols: 1, rows: 1, span: 1 },
          tablet: { cols: 1, rows: 1, span: 1 },
          desktop: { cols: 1, rows: 1, span: 1 },
        },
        items: [
          {
            id: "subscriptionStatusDistribution",
            title: tCommon("status_distribution"),
            type: "pie",
            model: "copyTradingFollower",
            metrics: ["ACTIVE", "PAUSED", "STOPPED"],
            config: {
              field: "status",
              status: [
                {
                  value: "ACTIVE",
                  label: tCommon("active"),
                  color: "green",
                  icon: "mdi:account-check",
                },
                {
                  value: "PAUSED",
                  label: tCommon("paused"),
                  color: "yellow",
                  icon: "mdi:account-pause",
                },
                {
                  value: "STOPPED",
                  label: tCommon("stopped"),
                  color: "red",
                  icon: "mdi:account-cancel",
                },
              ],
            },
          },
        ],
      },
    ],

    // ─────────────────────────────────────────────────────────────
    // Group 2: Financial Metrics – KPI Grid
    // ─────────────────────────────────────────────────────────────
    {
      type: "kpi",
      layout: { cols: 4, rows: 1 },
      // This group owns its whole section, and a section on its own is ONE
      // column: a span above 1 only opens an empty track beside the cards.
      responsive: {
        mobile: { cols: 1, rows: 4, span: 1 },
        tablet: { cols: 2, rows: 2, span: 1 },
        desktop: { cols: 4, rows: 1, span: 1 },
      },
      /**
       * `currentValue`, `totalPnl` and `totalPnlPercent` do not exist on
       * `copyTradingFollower`. The model holds a SUBSCRIPTION — who copies
       * whom, on what terms, with what risk limits — not a portfolio. Its
       * three money cards were therefore permanent zeros.
       *
       * What the model can answer is the thing an admin actually watches on a
       * copy desk: how much capital is committed to replication, and how many
       * subscriptions are running without a loss limit.
       */
      items: [
        {
          id: "total_followers",
          title: tExt("total_followers"),
          metric: "totalFollowers",
          model: "copyTradingFollower",
          aggregation: { op: "count", field: "id" },
          valueMode: "current",
          icon: "mdi:account-multiple",
        },
        {
          /**
           * Capital committed by fixed-amount subscriptions — the platform's
           * replication exposure, and the only size figure this table holds.
           *
           * IT IS NOT CURRENCY, and it cannot be converted into one either.
           * `fixedAmount` is spent as QUOTE units of whichever market the leader
           * happens to trade: `copyProcessor` divides it by a quote-denominated
           * price and `binary.ts` stakes it directly. One subscriber's 500 is
           * 500 USDT and the next one's is 500 ETH, and this card added them and
           * printed the total with a dollar sign on it — so a desk copying two
           * ETH-quoted leaders read its exposure as about a thousandth of what
           * it was.
           *
           * `inUSD` is not available here: `copyTradingFollower` has no currency
           * column, and neither BelongsTo target (`user`, `leader`) carries one,
           * so there is nothing to group the sum by. A bare number is the honest
           * form until the subscription itself records what it is denominated in.
           */
          id: "allocated_capital",
          title: tCommon("allocated_capital"),
          metric: "allocatedCapital",
          model: "copyTradingFollower",
          aggregation: {
            op: "sum",
            field: "fixedAmount",
            where: [{ field: "status", value: "ACTIVE" }],
          },
          valueMode: "current",
          format: "number",
          icon: "mdi:wallet",
        },
        {
          // Same unit problem as the card beside it, and an `avg` could not be
          // converted even if the denomination were reachable.
          id: "avg_allocation",
          title: tCommon("average_allocation"),
          metric: "avgAllocation",
          model: "copyTradingFollower",
          aggregation: {
            op: "avg",
            field: "fixedAmount",
            where: [{ field: "status", value: "ACTIVE" }],
          },
          valueMode: "current",
          format: "number",
          icon: "mdi:calculator",
        },
        {
          // A live subscription with no daily loss cap is an open-ended risk.
          id: "no_loss_limit",
          title: t("active_without_a_loss_limit"),
          metric: "noLossLimit",
          model: "copyTradingFollower",
          aggregation: {
            op: "count",
            field: "id",
            where: [
              { field: "status", value: "ACTIVE" },
              { field: "maxDailyLoss", value: null },
            ],
          },
          valueMode: "current",
          invert: true,
          icon: "mdi:shield-off",
        },
      ],
    },

    // ─────────────────────────────────────────────────────────────
    // Group 3: Subscriptions Over Time – Full-Width Line Chart
    // ─────────────────────────────────────────────────────────────
    {
      type: "chart",
      responsive: {
        mobile: { cols: 1, rows: 1, span: 1 },
        tablet: { cols: 1, rows: 1, span: 1 },
        desktop: { cols: 1, rows: 1, span: 1 },
      },
      items: [
        {
          id: "subscriptionsOverTime",
          title: t("subscriptions_over_time"),
          type: "line",
          model: "copyTradingFollower",
          metrics: ["total", "ACTIVE", "PAUSED", "STOPPED"],
          timeframes: ["24h", "7d", "30d", "3m", "6m", "y"],
          labels: {
            total: tCommon("total"),
            ACTIVE: tCommon("active"),
            PAUSED: tCommon("paused"),
            STOPPED: tCommon("stopped"),
          },
        },
      ],
    },

    // ─────────────────────────────────────────────────────────────
    // Group 4: Volume Over Time – Area Chart
    // ─────────────────────────────────────────────────────────────
    {
      type: "chart",
      responsive: {
        mobile: { cols: 1, rows: 1, span: 1 },
        tablet: { cols: 1, rows: 1, span: 1 },
        desktop: { cols: 1, rows: 1, span: 1 },
      },
      items: [
        {
          id: "followersOverTime",
          title: t("followers_over_time"),
          type: "stackedArea",
          model: "copyTradingFollower",
          metrics: ["total"],
          timeframes: ["7d", "30d", "3m", "6m", "y"],
          labels: {
            count: tExt("total_followers"),
          },
        },
      ],
    },
  ] as AnalyticsConfig;
}
