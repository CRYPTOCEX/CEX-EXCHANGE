import { AnalyticsConfig } from "@/components/blocks/data-table/types/analytics";

/**
 * Collections — moderation desk.
 *
 * What this page used to be: 27 tiles, of which six compared a tinyint(1) to
 * the STRING 'true' (so "Verified" and "Unverified" printed the same number,
 * and it was the unverified one), three were dropped before they reached SQL,
 * and `erc721_collections` appeared twice under two titles. The headline read
 * "Total Collections" but showed the last non-zero bucket.
 *
 * What it is now: the approval queue first, because that is the only thing on
 * this screen a human has to act on today.
 *
 * NOTE ON `"total"` IN A DERIVED. This page declares snapshot aggregates
 * (`valueMode: "current"`), so the engine runs the second, window-less pass and
 * `total` resolves to COUNT(*) over the whole table rather than over the
 * window. That is exactly the denominator "Verified Share" wants — the share of
 * ALL collections that are verified, not of the ones created this month.
 *
 * SECOND WAVE. `chain` is free text (STRING(255), its own index) with no fixed
 * member list, so no pie could ever describe it and the blueprint's "Chain Mix"
 * was dropped. It is now a ranked breakdown with an "Other" rollup, ranked as a
 * STOCK (`scope: "all"`) because the question is where the catalogue lives, not
 * which chains people happened to submit to this month. Each chain on that
 * chart is an RPC endpoint, a gas budget and an indexer somebody maintains.
 *
 * It replaced the avg-royalty pair — a KPI plus a line chart plotting that one
 * KPI, which the card already draws as a sparkline. Royalty still has a card:
 * "Royalty Above 10%", the outliers, which is the half an admin can act on.
 * That also puts the top group back at exactly six, so it tiles 3x2 instead of
 * leaving a hole in the third column of the second row.
 */
export const nftCollectionAnalytics: AnalyticsConfig = [
  // ─────────────────────────────────────────────────────────────
  // Row 1 — The queue. Everything here is a snapshot: a collection
  // submitted last month and still unapproved is the whole problem, and a
  // `createdAt BETWEEN` filter is precisely what hides it.
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
          id: "pending_approval_queue",
          title: "Pending Approval Queue",
          metric: "pendingQueue",
          model: "nftCollection",
          aggregation: { field: "status", value: "PENDING" },
          valueMode: "current",
          format: "number",
          invert: true,
          icon: "mdi:clock-alert-outline",
        },
        {
          id: "active_undeployed",
          title: "Live Without a Contract",
          metric: "activeUndeployed",
          model: "nftCollection",
          // An ACTIVE collection with no on-chain contract is a storefront
          // that cannot mint or settle. The list already badges it
          // "Not Deployed"; nothing counted them.
          aggregation: {
            op: "count",
            field: "id",
            where: [
              { field: "status", value: "ACTIVE" },
              { field: "contractAddress", value: null },
            ],
          },
          valueMode: "current",
          format: "number",
          invert: true,
          icon: "mdi:link-variant-off",
        },
        {
          id: "high_royalty_collections",
          title: "Royalty Above 10%",
          metric: "highRoyalty",
          model: "nftCollection",
          // The model permits up to 50%. Outlier royalties are the classic
          // wash-trading and buyer-complaint vector — these are the rows to
          // review by hand.
          aggregation: {
            op: "count",
            field: "id",
            where: [{ field: "royaltyPercentage", op: ">", value: "10" }],
          },
          valueMode: "current",
          format: "number",
          invert: true,
          icon: "mdi:percent-box-outline",
        },
        {
          id: "verified_collections",
          title: "Verified Collections",
          metric: "verifiedCount",
          model: "nftCollection",
          aggregation: { field: "isVerified", value: "true" },
          valueMode: "current",
          format: "number",
          icon: "mdi:shield-check",
        },
        {
          // The all-time denominator for `verified_share`, declared as its own
          // snapshot alias. It must NOT be the free `total`, which is the
          // WINDOW row count: an all-time numerator over it produces a share
          // that swings with the timeframe picker while the population it
          // describes does not move.
          id: "collections_total",
          title: "Collections",
          metric: "collectionsTotal",
          model: "nftCollection",
          aggregation: { op: "count", field: "id" },
          valueMode: "current",
          format: "number",
          icon: "mdi:folder-multiple",
        },
        {
          id: "verified_share",
          title: "Verified Share",
          metric: "verifiedShare",
          model: "nftCollection",
          derived: { op: "percent", of: ["verifiedCount", "collectionsTotal"] },
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
          // Every chain on this axis is an RPC endpoint, a gas budget and an
          // indexer somebody has to keep alive. The tail is the maintenance
          // bill nobody costed.
          id: "chainMix",
          title: "Collections by Chain (Top 6)",
          description: "Collections per chain, ignoring the date window",
          type: "bar",
          model: "nftCollection",
          metrics: [],
          config: {
            groupBy: "chain",
            limit: 6,
            // A stock, not a flow: the catalogue as it stands, not this
            // month's submissions.
            scope: "all",
          },
        },
      ],
    },
  ],

  // ─────────────────────────────────────────────────────────────
  // Row 2 — Intake pipeline. One stacked bar replaces the five status KPIs
  // and the status pie that used to contradict them (the pie summed the
  // period, the KPIs showed one bucket).
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
          id: "new_pending_collections",
          title: "Submitted, Awaiting Review",
          metric: "PENDING",
          model: "nftCollection",
          aggregation: { field: "status", value: "PENDING" },
          format: "number",
          invert: true,
          icon: "mdi:inbox-arrow-down",
        },
        {
          id: "new_active_collections",
          title: "Approved and Live",
          metric: "ACTIVE",
          model: "nftCollection",
          aggregation: { field: "status", value: "ACTIVE" },
          format: "number",
          icon: "mdi:storefront-check",
        },
        {
          id: "suspended_collections",
          title: "Suspended",
          metric: "SUSPENDED",
          model: "nftCollection",
          aggregation: { field: "status", value: "SUSPENDED" },
          format: "number",
          invert: true,
          icon: "mdi:pause-octagon",
        },
        {
          id: "distinct_creators",
          title: "Creators With Collections",
          metric: "distinctCreators",
          model: "nftCollection",
          // Concentration and spam in one number: a catalogue of 400
          // collections held by 3 creatorIds is an abuse pattern, not growth.
          aggregation: { op: "countDistinct", field: "creatorId" },
          valueMode: "current",
          format: "number",
          icon: "mdi:account-group",
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
          id: "collectionPipelineOverTime",
          title: "New Collections by Outcome",
          type: "stackedBar",
          model: "nftCollection",
          metrics: ["PENDING", "ACTIVE", "SUSPENDED"],
          timeframes: ["24h", "7d", "30d", "3m", "6m", "y"],
          labels: {
            PENDING: "Awaiting Review",
            ACTIVE: "Approved",
            SUSPENDED: "Suspended",
          },
        },
      ],
    },
  ],
] satisfies AnalyticsConfig;
