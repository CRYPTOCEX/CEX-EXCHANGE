import { AnalyticsConfig } from "@/components/blocks/data-table/types/analytics";

/**
 * Listings — settlement desk.
 *
 * The six-tile "Financial Metrics" group this replaces rendered 0 on every
 * load, and three of its cards were competing for the alias `avg`. Meanwhile
 * `settlementBlockedAt` — the column the settlement cron writes when an
 * auction ended with a winning bid but has no escrow contract holding the
 * money — appeared on no screen in the product.
 *
 * MONEY IS SPLIT BY CURRENCY, DELIBERATELY. `price` sits beside a free-text
 * `currency` of ETH|USDC|USDT|BNB|MATIC, so one SUM(price) adds 3 ETH to 5000
 * USDT and reports a number that is not a quantity of anything. Each money
 * card is therefore a filtered sum in ONE denomination, and the chart carries
 * one band per currency rather than a single fictional total.
 *
 * SECOND WAVE. That split used to cost one hand-written KPI per denomination,
 * which is why only ETH and USDT had cards and USDC, BNB and MATIC were
 * invisible. "Open Book by Currency" is a ranked breakdown over the `currency`
 * column itself: every denomination gets a bar, the tail rolls into "Other",
 * and adding a sixth currency to the marketplace needs no config change. It
 * took the slot of the sell-through line, whose single series the KPI beside it
 * already carries as a sparkline.
 *
 * Two more things the old engine could not say and this page needed most:
 * listings that are past their own `endTime` and still ACTIVE (nothing sweeps
 * them — expiry runs off the market socket, not a cron, so there is no tick to
 * wait for), and how long a listing takes to clear.
 *
 * Bucketing is on `createdAt`; `soldAt` is the honest axis for GMV and the
 * engine exposes only one date field per request.
 */
export const nftListingAnalytics: AnalyticsConfig = [
  // ─────────────────────────────────────────────────────────────
  // Row 1 — Settlement risk, in descending money-at-risk order.
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
          id: "blocked_settlements",
          title: "Blocked Settlements",
          metric: "blockedSettlements",
          model: "nftListing",
          // Ended with a winning bid, no on-chain escrow: nobody holds the
          // money and the NFT cannot move. Every row is a manual settlement.
          aggregation: {
            op: "count",
            field: "id",
            where: [{ field: "settlementBlockedAt", value: null, negate: true }],
          },
          valueMode: "current",
          format: "number",
          invert: true,
          icon: "mdi:alert-octagram",
        },
        {
          id: "auctions_missing_escrow",
          title: "Live Auctions Without Escrow",
          metric: "auctionsNoEscrow",
          model: "nftListing",
          // The leading indicator for the card to its left: every one of these
          // becomes unsettleable the moment it ends. Catching them while they
          // are still live means deploying a contract, not unwinding a sale.
          aggregation: {
            op: "count",
            field: "id",
            where: [
              { field: "type", value: "AUCTION" },
              { field: "status", value: "ACTIVE" },
              { field: "auctionContractAddress", value: null },
            ],
          },
          valueMode: "current",
          format: "number",
          invert: true,
          icon: "mdi:file-lock-open-outline",
        },
        {
          id: "overdue_active_listings",
          title: "Past End Time, Still Active",
          metric: "overdueActive",
          model: "nftListing",
          // `endTime < NOW()` while the row still says ACTIVE. Expiry is
          // driven from the market websocket rather than a scheduled job, so
          // there is no cron tick to grant a grace period for: every one of
          // these is a listing the sweep never reached, still buyable at a
          // price the seller believes has lapsed.
          aggregation: {
            op: "count",
            field: "id",
            where: [
              { field: "status", value: "ACTIVE" },
              { field: "endTime", op: "<", value: { ago: "0min" } },
            ],
          },
          valueMode: "current",
          format: "number",
          invert: true,
          icon: "mdi:calendar-end",
        },
        {
          id: "open_book_value_eth",
          title: "Open Book Value (ETH)",
          metric: "openBookEth",
          model: "nftListing",
          // The size of the live order book in ETH — how much value is exposed
          // to a pricing bug, a mass-cancel or a chain outage right now.
          aggregation: {
            field: "price",
            op: "sum",
            where: [
              { field: "status", value: "ACTIVE" },
              { field: "currency", value: "ETH" },
            ],
          },
          valueMode: "current",
          format: "currency",
          currency: "ETH",
          icon: "mdi:book-open-variant",
        },
        {
          id: "sell_through_rate",
          title: "Sell-Through Rate",
          metric: "sellThroughRate",
          model: "nftListing",
          derived: { op: "percent", of: ["SOLD", "closedListings"] },
          format: "percent",
          icon: "mdi:cart-check",
        },
        {
          id: "expiry_leakage_rate",
          title: "Expiry Leakage Rate",
          metric: "expiryLeakage",
          model: "nftListing",
          // Distinguishes "nobody is buying" from "sellers are cancelling" —
          // two different problems with different fixes.
          derived: { op: "percent", of: ["EXPIRED", "closedListings"] },
          format: "percent",
          invert: true,
          // `timer-sand-empty` is not in the icon map and fell back to the
          // generic Activity glyph; `timer-off` is, and means the same thing.
          icon: "mdi:timer-off",
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
          // Bars are never added together: 3 ETH and 5000 USDT are different
          // quantities, so this is a ranking within each denomination.
          id: "openBookByCurrency",
          title: "Open Book by Currency",
          description: "Value of live listings, summed within each currency",
          type: "bar",
          model: "nftListing",
          metrics: [],
          config: {
            groupBy: "currency",
            limit: 5,
            measure: {
              field: "price",
              op: "sum",
              where: [{ field: "status", value: "ACTIVE" }],
            },
            // A stock: what the book is worth right now, not what was listed
            // during the selected window.
            scope: "all",
          },
        },
      ],
    },
  ],

  // ─────────────────────────────────────────────────────────────
  // Row 2 — Cleared volume. This is the number reported upward and it did
  // not exist in any form: the page's only money group was six zeros.
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
          id: "gmv_eth",
          title: "GMV (ETH)",
          metric: "gmvEth",
          model: "nftListing",
          aggregation: {
            field: "price",
            op: "sum",
            where: [
              { field: "status", value: "SOLD" },
              { field: "currency", value: "ETH" },
            ],
          },
          format: "currency",
          currency: "ETH",
          icon: "mdi:ethereum",
        },
        {
          id: "gmv_usdt",
          title: "GMV (USDT)",
          metric: "gmvUsdt",
          model: "nftListing",
          aggregation: {
            field: "price",
            op: "sum",
            where: [
              { field: "status", value: "SOLD" },
              { field: "currency", value: "USDT" },
            ],
          },
          format: "currency",
          currency: "USDT",
          icon: "mdi:currency-usd",
        },
        {
          id: "sold_listings",
          title: "Listings Sold",
          metric: "SOLD",
          model: "nftListing",
          aggregation: { field: "status", value: "SOLD" },
          format: "number",
          icon: "mdi:tag-check",
        },
        {
          id: "expired_listings",
          title: "Expired Unsold",
          metric: "EXPIRED",
          model: "nftListing",
          aggregation: { field: "status", value: "EXPIRED" },
          format: "number",
          invert: true,
          icon: "mdi:clock-alert",
        },
        {
          id: "closed_listings",
          title: "Listings Closed",
          metric: "closedListings",
          model: "nftListing",
          // The denominator both rates in row 1 divide by. It lives down here
          // with the other flow counts; aliases are page-scoped, so a derived
          // card in row 1 resolves it perfectly well from row 2.
          //
          // An IN-list of the three terminal states rather than "not ACTIVE":
          // the negation would absorb any status added to the enum later and
          // quietly change what both rates above are a share OF.
          aggregation: {
            op: "count",
            field: "id",
            where: [
              { field: "status", values: ["SOLD", "CANCELLED", "EXPIRED"] },
            ],
          },
          format: "number",
          icon: "mdi:archive-check-outline",
        },
        {
          id: "avg_time_to_sale",
          title: "Avg Time to Sale",
          metric: "avgTimeToSale",
          model: "nftListing",
          // TIMESTAMPDIFF(HOUR, createdAt, soldAt), averaged — hours because
          // `format: "duration"` reads hours and promotes to days past 48.
          // Listings that never sold have a NULL `soldAt` and are skipped, so
          // this is time-to-clear for the ones that DID: liquidity, not
          // survival. It rises before sell-through falls.
          //
          // `current`, AND IT HAS TO BE. `buildAttributes` mirrors an `avg`
          // into `SUM(col)`/`COUNT(col)` companion columns so the period fold
          // can weight by bucket, and that mirror predates `since` — it wraps
          // the RAW column, not the TIMESTAMPDIFF. Folded, this card divides
          // SUM(createdAt) by a row count and prints ~2.03e13, the numeric
          // form of a datetime. The snapshot pass reads the real expression,
          // so the all-time mean is correct. Fix the mirror in
          // `backend/src/utils/chart.ts` and this can go back to a windowed
          // average with a sparkline.
          aggregation: {
            field: "createdAt",
            op: "avg",
            since: { unit: "h", until: "soldAt" },
          },
          valueMode: "current",
          format: "duration",
          invert: true,
          icon: "mdi:timer-sand",
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
          id: "gmvByCurrencyOverTime",
          title: "Cleared Value by Currency",
          type: "stackedBar",
          model: "nftListing",
          metrics: ["gmvEth", "gmvUsdt"],
          timeframes: ["24h", "7d", "30d", "3m", "6m", "y"],
          labels: { gmvEth: "ETH", gmvUsdt: "USDT" },
        },
      ],
    },
  ],
] satisfies AnalyticsConfig;
