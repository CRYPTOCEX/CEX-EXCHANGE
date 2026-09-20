import { AnalyticsConfig } from "@/components/blocks/data-table/types/analytics";

/**
 * Sales — the revenue page.
 *
 * `marketplaceFee` is the business. Until now the card that carried it was one
 * of six in a group where every card rendered 0 and all six declared the alias
 * `sum`, so even once the engine could add numbers up they would have
 * overwritten each other. The "Revenue Over Time" chart named three real
 * COLUMNS in `metrics`, which are not aliases, so it drew three flat lines on
 * the axis.
 *
 * MONEY IS FILTERED AND SPLIT BY CURRENCY. A PENDING or FAILED sale is not
 * revenue, so every money figure carries `status = 'COMPLETED'`; and `price`
 * mixes ETH|USDC|USDT|BNB|MATIC, so each figure is one denomination. The
 * platform's hand-rolled `/api/admin/nft/analytics` endpoint converts to USD
 * before summing — the generic engine cannot, and a fake combined total is
 * worse than an honest split.
 *
 * SECOND WAVE. That split cost one hand-written card per denomination, so only
 * ETH had any. "Completed GMV by Currency" ranks the `currency` column itself:
 * every denomination gets a bar and a new one needs no config change. It took
 * the slot of the settlement-outcomes stack, whose composition the failure-rate
 * card and the two counts under it already carry with sparklines.
 *
 * "Pending Sales" also became honest. A snapshot of ALL pending sales counts
 * the ones that started ninety seconds ago alongside the ones that stranded a
 * buyer's money last Tuesday; only the second kind is work. The card is now
 * pending-and-older-than-an-hour.
 *
 * STILL NOT EXPRESSIBLE. The blueprint's on-chain-proof card is
 * `transactionHash IS NULL OR blockNumber IS NULL`: `values: [...]` is an OR
 * over one column's values, not across two columns, and guards are ANDed. The
 * card below tests `transactionHash`, which is the column carrying the unique
 * index and the one a dispute is actually settled with. Median sale price is
 * also still out — there is no percentile aggregate.
 */
export const nftSaleAnalytics: AnalyticsConfig = [
  // ─────────────────────────────────────────────────────────────
  // Row 1 — What gets reported upward, and what breaks it.
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
          id: "completed_gmv_eth",
          title: "Completed GMV (ETH)",
          metric: "gmvEth",
          model: "nftSale",
          aggregation: {
            field: "price",
            op: "sum",
            where: [
              { field: "status", value: "COMPLETED" },
              { field: "currency", value: "ETH" },
            ],
          },
          format: "currency",
          currency: "ETH",
          icon: "mdi:ethereum",
        },
        {
          id: "marketplace_revenue_eth",
          title: "Marketplace Revenue (ETH)",
          metric: "feeEth",
          model: "nftSale",
          aggregation: {
            field: "marketplaceFee",
            op: "sum",
            where: [
              { field: "status", value: "COMPLETED" },
              { field: "currency", value: "ETH" },
            ],
          },
          format: "currency",
          currency: "ETH",
          icon: "mdi:cash-register",
        },
        {
          id: "creator_royalties_eth",
          title: "Creator Royalties (ETH)",
          metric: "royaltyEth",
          model: "nftSale",
          // A payout obligation that must reconcile against nftRoyalty rows.
          // A gap between royalty booked here and royalty actually PAID is
          // unpaid creator money.
          aggregation: {
            field: "royaltyFee",
            op: "sum",
            where: [
              { field: "status", value: "COMPLETED" },
              { field: "currency", value: "ETH" },
            ],
          },
          format: "currency",
          currency: "ETH",
          icon: "mdi:account-cash",
        },
        {
          id: "marketplace_take_rate",
          title: "Marketplace Take Rate",
          metric: "takeRate",
          model: "nftSale",
          // Σfee / Σprice, not the mean of per-sale rates. Drift means the fee
          // configuration or collection royalties moved under the model.
          derived: { op: "percent", of: ["feeEth", "gmvEth"] },
          format: "percent",
          icon: "mdi:percent",
        },
        {
          id: "sale_failure_rate",
          title: "Sale Failure Rate",
          metric: "failureRate",
          model: "nftSale",
          // Denominator excludes still-PENDING attempts, which is the
          // difference between a real settlement rate and a number that
          // drifts with volume.
          derived: { op: "percent", of: ["failedSales", "settledAttempts"] },
          format: "percent",
          invert: true,
          icon: "mdi:alert-circle-outline",
        },
        {
          id: "stale_pending_sales",
          title: "Pending Over 1 Hour",
          metric: "stalePending",
          model: "nftSale",
          // Money that left the buyer and never reached the seller. A
          // snapshot, because the ones that matter are stuck from BEFORE the
          // window — and older than an hour, because a settlement in flight
          // for ninety seconds is not a problem and drowns out the ones that
          // are. This is the queue, not the throughput.
          aggregation: {
            op: "count",
            field: "id",
            where: [
              { field: "status", value: "PENDING" },
              { field: "createdAt", op: "<", value: { ago: "1h" } },
            ],
          },
          valueMode: "current",
          format: "number",
          invert: true,
          icon: "mdi:timer-alert",
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
          id: "revenueTrend",
          title: "GMV and Revenue (ETH)",
          type: "line",
          model: "nftSale",
          metrics: ["gmvEth", "feeEth"],
          timeframes: ["24h", "7d", "30d", "3m", "6m", "y"],
          labels: { gmvEth: "Completed GMV", feeEth: "Marketplace Fee" },
        },
      ],
    },
  ],

  // ─────────────────────────────────────────────────────────────
  // Row 2 — Settlement pipeline and who is on the other side of it. Status
  // survives here as a rate's operands and one integrity alarm, not as four
  // counts plus a pie.
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
          id: "completed_sales",
          title: "Completed Sales",
          metric: "COMPLETED",
          model: "nftSale",
          aggregation: { field: "status", value: "COMPLETED" },
          format: "number",
          icon: "mdi:check-circle",
        },
        {
          id: "failed_or_cancelled_sales",
          title: "Failed or Cancelled",
          metric: "failedSales",
          model: "nftSale",
          // A real IN-list now, not two negations standing in for one. The
          // difference is not style: written as "not COMPLETED and not
          // PENDING", this card silently absorbs any status added to the enum
          // later and keeps its label. Named members cannot drift.
          aggregation: {
            op: "count",
            field: "id",
            where: [{ field: "status", values: ["FAILED", "CANCELLED"] }],
          },
          format: "number",
          invert: true,
          icon: "mdi:close-octagon-outline",
        },
        {
          id: "settled_attempts",
          title: "Settled Attempts",
          metric: "settledAttempts",
          model: "nftSale",
          // The denominator of the failure rate: everything that reached a
          // terminal state. Named explicitly for the same reason as the card
          // above — "not PENDING" would quietly grow a new member's rows.
          aggregation: {
            op: "count",
            field: "id",
            where: [
              { field: "status", values: ["COMPLETED", "FAILED", "CANCELLED"] },
            ],
          },
          format: "number",
          icon: "mdi:swap-horizontal-bold",
        },
        {
          id: "completed_without_proof",
          title: "Completed Without On-Chain Proof",
          metric: "unprovenSales",
          model: "nftSale",
          // There is a unique index on transactionHash precisely because it is
          // the settlement receipt. Rows without one were settled in the
          // database only and are unauditable in a dispute.
          aggregation: {
            op: "count",
            field: "id",
            where: [
              { field: "status", value: "COMPLETED" },
              { field: "transactionHash", value: null },
            ],
          },
          valueMode: "current",
          format: "number",
          invert: true,
          icon: "mdi:link-off",
        },
        {
          id: "unique_buyers",
          title: "Unique Buyers",
          metric: "distinctBuyers",
          model: "nftSale",
          // COUNT(DISTINCT buyerId) over completed sales. The engine runs this
          // ungrouped over the whole window rather than folding per-bucket
          // counts, so a buyer active on twelve days is one buyer.
          aggregation: {
            op: "countDistinct",
            field: "buyerId",
            where: [{ field: "status", value: "COMPLETED" }],
          },
          format: "number",
          icon: "mdi:account-multiple-check",
        },
        {
          id: "sales_per_unique_buyer",
          title: "Sales per Unique Buyer",
          metric: "salesPerBuyer",
          model: "nftSale",
          // Repeat-purchase in one number: 1.0 means nobody came back and
          // every sale cost a new acquisition. Both operands are window-scoped,
          // so the ratio moves with the timeframe picker as it should.
          derived: { op: "ratio", of: ["COMPLETED", "distinctBuyers"] },
          format: "number",
          icon: "mdi:cart-check",
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
          // Bars are never added together — each is its own denomination, and
          // a cross-currency GMV total would be meaningless.
          id: "gmvByCurrency",
          title: "Completed GMV by Currency",
          description: "Settled sale value this period, summed within each currency",
          type: "bar",
          model: "nftSale",
          metrics: [],
          config: {
            groupBy: "currency",
            limit: 5,
            measure: {
              field: "price",
              op: "sum",
              where: [{ field: "status", value: "COMPLETED" }],
            },
            // A flow: what cleared during the window, which is what the
            // treasury reconciles against.
          },
        },
      ],
    },
  ],
] satisfies AnalyticsConfig;
