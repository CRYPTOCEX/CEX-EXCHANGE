"use client";
import { AnalyticsConfig } from "@/components/blocks/data-table/types/analytics";
import { useTranslations } from "next-intl";

export function useAnalytics() {
  const t = useTranslations("ext_admin");
  const tCommon = useTranslations("common");
  const tExt = useTranslations("ext");

  return [
    // ─────────────────────────────────────────────────────────────
    // Group 1: Leader Status Overview – KPI Grid & Pie Chart
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
            // The roster size is a STOCK, so it declares its own snapshot
            // alias. It must not ride the free `total`: `fetchSnapshot`
            // selects an un-windowed `total` of its own and
            // `Object.assign(periodTotals, snapshot)` runs after the window
            // fold, so on a page with any `current` card `total` silently
            // flips to all-time — the right number here, but by accident, and
            // read through `periodTotal` so it disagreed with its own
            // sparkline. Declared explicitly it is deterministic.
            id: "total_leaders",
            title: t("total_leaders"),
            metric: "leaderRoster",
            model: "copyTradingLeader",
            aggregation: { field: "id", op: "count" },
            valueMode: "current",
            icon: "mdi:account-star",
          },
          {
            id: "active_leaders",
            title: tExt("active_leaders"),
            metric: "ACTIVE",
            model: "copyTradingLeader",
            aggregation: { field: "status", value: "ACTIVE" },
            icon: "mdi:account-check",
          },
          {
            id: "pending_leaders",
            title: t("pending_leaders"),
            metric: "PENDING",
            model: "copyTradingLeader",
            aggregation: { field: "status", value: "PENDING" },
            icon: "mdi:account-clock",
          },
          {
            id: "suspended_leaders",
            title: t("suspended_leaders"),
            metric: "SUSPENDED",
            model: "copyTradingLeader",
            aggregation: { field: "status", value: "SUSPENDED" },
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
            id: "leaderStatusDistribution",
            title: tCommon("status_distribution"),
            type: "pie",
            model: "copyTradingLeader",
            metrics: ["ACTIVE", "PENDING", "SUSPENDED", "REJECTED"],
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
                  value: "PENDING",
                  label: tCommon("pending"),
                  color: "yellow",
                  icon: "mdi:account-clock",
                },
                {
                  value: "SUSPENDED",
                  label: tCommon("suspended"),
                  color: "red",
                  icon: "mdi:account-cancel",
                },
                {
                  value: "REJECTED",
                  label: tCommon("rejected"),
                  color: "gray",
                  icon: "mdi:account-remove",
                },
                {
                  // The fifth member of the `status` ENUM. Without it the ring
                  // did not sum to the roster and every other slice read as a
                  // bigger share of the desk than it is. Violet rather than
                  // gray: `gray` is already REJECTED, and two muted slices in
                  // one legend are indistinguishable.
                  value: "INACTIVE",
                  label: tCommon("inactive"),
                  color: "purple",
                  icon: "mdi:account-off",
                },
              ],
            },
          },
        ],
      },
    ],

    // ─────────────────────────────────────────────────────────────
    // Group 2: The desk's commercial terms – KPI Grid
    //
    // This group used to read `totalFollowers`, `totalVolume` and `winRate`
    // off `copyTradingLeader`. NONE of those columns exist — the model holds
    // the leader's APPLICATION and TERMS (profit share, follow limits,
    // status); performance is computed on demand from the trades table. The
    // three cards were invisible rather than wrong only because the old engine
    // dropped any aggregation without a `value` before it reached SQL, so they
    // rendered a confident 0. They are replaced here with the questions this
    // table can actually answer, and which an admin approving leaders needs.
    // ─────────────────────────────────────────────────────────────
    {
      type: "kpi",
      layout: { cols: 3, rows: 1 },
      // This group owns its whole section, and a section on its own is ONE
      // column: a span above 1 only opens an empty track beside the cards.
      responsive: {
        mobile: { cols: 1, rows: 3, span: 1 },
        tablet: { cols: 3, rows: 1, span: 1 },
        desktop: { cols: 3, rows: 1, span: 1 },
      },
      items: [
        {
          // What the platform earns on: the revenue share live leaders charge.
          id: "avg_profit_share",
          title: tCommon("average_profit_share"),
          metric: "avgProfitShare",
          model: "copyTradingLeader",
          aggregation: {
            op: "avg",
            field: "profitSharePercent",
            where: [{ field: "status", value: "ACTIVE" }],
          },
          valueMode: "current",
          format: "percent",
          icon: "mdi:percent",
        },
        {
          // Supply-side headroom: how many followers live leaders can absorb.
          id: "follower_capacity",
          title: tCommon("follower_capacity"),
          metric: "followerCapacity",
          model: "copyTradingLeader",
          aggregation: {
            op: "sum",
            field: "maxFollowers",
            where: [{ field: "status", value: "ACTIVE" }],
          },
          valueMode: "current",
          icon: "mdi:account-multiple",
        },
        {
          // Share of the roster that is publicly discoverable.
          id: "public_leaders",
          title: tCommon("public_leaders"),
          metric: "publicLeaders",
          model: "copyTradingLeader",
          aggregation: { field: "isPublic", value: "true" },
          valueMode: "current",
          icon: "mdi:eye",
        },
      ],
    },

    // ─────────────────────────────────────────────────────────────
    // Group 3: Leaders Over Time – Full-Width Line Chart
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
          id: "leadersOverTime",
          title: t("leaders_over_time"),
          type: "line",
          model: "copyTradingLeader",
          metrics: ["total", "ACTIVE", "PENDING", "SUSPENDED"],
          timeframes: ["24h", "7d", "30d", "3m", "6m", "y"],
          labels: {
            total: tCommon("total"),
            ACTIVE: tCommon("active"),
            PENDING: tCommon("pending"),
            SUSPENDED: tCommon("suspended"),
          },
        },
      ],
    },
  ] as AnalyticsConfig;
}
