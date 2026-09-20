import { AnalyticsConfig } from "@/components/blocks/data-table/types/analytics";

/**
 * Creators — supply-side health.
 *
 * Profile privacy had three separate representations on this page (two KPI
 * groups and a pie) for a user preference no admin acts on, and all six of
 * those tiles compared a tinyint to the string 'true', so every one of them
 * counted the complement. Nine consecutive money tiles rendered 0.
 *
 * DENOMINATION CAVEAT. `totalVolume` is a denormalised lifetime counter with
 * NO currency column beside it, so a sum across creators mixes ETH with USDT
 * at the data-model level, not merely at the query level. It is surfaced
 * anyway — labelled as mixed — because reading 0 hid the gap entirely.
 *
 * `total` in the derived cards resolves to the snapshot COUNT(*) rather than
 * the window count, because this page declares snapshot aggregates. That is
 * the denominator both shares want: a share of ALL creators.
 *
 * SECOND WAVE. The blueprint's "Top 10 Creators by Volume" is a ranked
 * breakdown now, grouped by `displayName` — the creator's own label, and the
 * name the desk already searches on. Creators who never
 * set a display name collect into one "Unspecified" bar, which is itself worth
 * seeing on the supply side. The tail rolls into "Other", so the concentration
 * question the blueprint asked ("what share is the top 10?") is readable
 * straight off the chart — as a KPI it is still not expressible, because a
 * derived cannot reference a ranked breakdown's output.
 *
 * "Rollups Refreshed" is the blueprint's freshness check with its sign
 * flipped. Written as the blueprint had it — `updatedAt < NOW() - 7 DAY` — the
 * count is dominated by creators who are simply dormant and can only grow, so
 * it alarms on nothing. Counting the rows the sale path DID touch this week is
 * bounded, moves, and answers the same question: are the denormalised counters
 * under every card on this page being maintained at all?
 */
export const nftCreatorAnalytics: AnalyticsConfig = [
  // ─────────────────────────────────────────────────────────────
  // Row 1 — Compliance queue first, then whether the creator base works.
  // ─────────────────────────────────────────────────────────────
  [
    {
      type: "kpi",
      responsive: {
        mobile: { cols: 1, span: 1 },
        tablet: { cols: 2, span: 2 },
        desktop: { cols: 3, span: 2 },
      },
      items: [
        {
          id: "verification_backlog",
          title: "Earning but Unverified",
          metric: "verificationBacklog",
          model: "nftCreator",
          // Creators taking money without having been verified. That is the
          // KYC/AML exposure on this page and the queue the desk should work.
          aggregation: {
            op: "count",
            field: "id",
            where: [
              { field: "isVerified", value: "false" },
              { field: "totalSales", op: ">", value: "0" },
            ],
          },
          valueMode: "current",
          format: "number",
          invert: true,
          icon: "mdi:shield-alert-outline",
        },
        {
          id: "listed_but_never_sold",
          title: "Have Items, No Sales",
          metric: "listedNoSales",
          model: "nftCreator",
          // The onboarding-failure population that actually shipped something.
          // Different problem from a creator who never uploaded anything.
          aggregation: {
            op: "count",
            field: "id",
            where: [
              { field: "totalItems", op: ">", value: "0" },
              { field: "totalSales", value: "0" },
            ],
          },
          valueMode: "current",
          format: "number",
          invert: true,
          icon: "mdi:package-variant-closed-remove",
        },
        {
          id: "zero_sale_creators",
          title: "Creators With Zero Sales",
          metric: "zeroSaleCreators",
          model: "nftCreator",
          aggregation: {
            op: "count",
            field: "id",
            where: [{ field: "totalSales", value: "0" }],
          },
          valueMode: "current",
          format: "number",
          invert: true,
          icon: "mdi:cash-remove",
        },
        {
          id: "zero_sale_share",
          title: "Zero-Sale Share",
          metric: "zeroSaleShare",
          model: "nftCreator",
          // If 90% of registered creators have never sold, the funnel problem
          // is downstream of signup and the growth plan is aimed wrong.
          derived: { op: "percent", of: ["zeroSaleCreators", "creatorRoster"] },
          format: "percent",
          invert: true,
          icon: "mdi:chart-donut",
        },
        {
          id: "verified_creators",
          title: "Verified Creators",
          metric: "verifiedCreators",
          model: "nftCreator",
          aggregation: { field: "isVerified", value: "true" },
          valueMode: "current",
          format: "number",
          icon: "mdi:shield-check",
        },
        {
          id: "verified_share",
          title: "Verified Share",
          metric: "verifiedShare",
          model: "nftCreator",
          derived: { op: "percent", of: ["verifiedCreators", "creatorRoster"] },
          format: "percent",
          icon: "mdi:shield-star",
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
          id: "newCreatorsTrend",
          title: "New Creators",
          type: "bar",
          model: "nftCreator",
          metrics: ["total"],
          timeframes: ["24h", "7d", "30d", "3m", "6m", "y"],
          labels: { total: "New Creators" },
        },
      ],
    },
  ],

  // ─────────────────────────────────────────────────────────────
  // Row 2 — The denormalised counters, read as a snapshot rather than as a
  // window of rows that happened to be created recently, plus the ranking
  // those counters exist to support.
  // ─────────────────────────────────────────────────────────────
  [
    {
      type: "kpi",
      responsive: {
        mobile: { cols: 1, span: 1 },
        tablet: { cols: 2, span: 2 },
        desktop: { cols: 3, span: 2 },
      },
      items: [
        {
          // The all-time denominator both shares in row 1 divide by, declared as
          // its own snapshot alias. It must NOT be the free `total`, which is the
          // WINDOW row count: an all-time numerator over it produces a share that
          // swings with the timeframe picker while the roster it describes does
          // not move. Aliases are page-scoped, so row 1 resolves it from here.
          id: "creator_roster",
          title: "Registered Creators",
          metric: "creatorRoster",
          model: "nftCreator",
          aggregation: { op: "count", field: "id" },
          valueMode: "current",
          format: "number",
          icon: "mdi:account-group",
        },
        {
          id: "lifetime_volume",
          title: "Lifetime Volume (Mixed Currencies)",
          metric: "lifetimeVolume",
          model: "nftCreator",
          aggregation: { field: "totalVolume", op: "sum" },
          valueMode: "current",
          format: "compact",
          icon: "mdi:chart-line",
        },
        {
          id: "avg_volume_per_creator",
          title: "Avg Volume per Creator",
          metric: "avgVolume",
          model: "nftCreator",
          aggregation: { field: "totalVolume", op: "avg" },
          valueMode: "current",
          format: "compact",
          icon: "mdi:calculator-variant-outline",
        },
        {
          id: "highest_floor_price",
          title: "Highest Floor Price",
          metric: "topFloorPrice",
          model: "nftCreator",
          aggregation: { field: "floorPrice", op: "max" },
          valueMode: "current",
          format: "compact",
          icon: "mdi:arrow-up-bold-box-outline",
        },
        {
          id: "untiered_creators",
          title: "Untiered Creators",
          metric: "untieredCreators",
          model: "nftCreator",
          // verificationTier is NULL for most rows. The old tier pie dropped
          // them silently, so its four slices never summed to the creator count.
          aggregation: {
            op: "count",
            field: "id",
            where: [{ field: "verificationTier", value: null }],
          },
          valueMode: "current",
          format: "number",
          invert: true,
          icon: "mdi:medal-outline",
        },
        {
          id: "rollups_refreshed",
          title: "Rollups Refreshed (7d)",
          metric: "rollupsFresh",
          model: "nftCreator",
          // `updatedAt >= NOW() - INTERVAL 7 DAY`. Every money card in this
          // group reads a denormalised counter that only the sale path writes,
          // so if this number collapses toward zero the counters have stopped
          // being maintained and the whole group is stale rather than flat.
          // Read it against Registered Creators, two cards to the left.
          aggregation: {
            op: "count",
            field: "id",
            where: [{ field: "updatedAt", op: ">=", value: { ago: "7d" } }],
          },
          valueMode: "current",
          format: "number",
          icon: "mdi:sync",
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
          // Denominations are mixed because `totalVolume` is a denormalised
          // counter with no currency column beside it. "Other" is everyone
          // below the top ten, so the concentration question reads straight
          // off the chart.
          id: "topCreatorsByVolume",
          title: "Top Creators by Lifetime Volume",
          description: "Lifetime volume per creator, in mixed denominations",
          type: "bar",
          model: "nftCreator",
          metrics: [],
          config: {
            groupBy: "displayName",
            limit: 10,
            measure: { field: "totalVolume", op: "sum" },
            // A stock: lifetime counters, not rows created in the window.
            scope: "all",
          },
        },
      ],
    },
  ],
] satisfies AnalyticsConfig;
