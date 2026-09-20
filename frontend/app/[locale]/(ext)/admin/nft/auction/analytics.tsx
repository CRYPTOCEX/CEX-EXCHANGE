import { AnalyticsConfig } from "@/components/blocks/data-table/types/analytics";

export const nftAuctionAnalytics: AnalyticsConfig = [
  // ─────────────────────────────────────────────────────────────
  // Group 1: Bid Status Overview – KPI Grid + Pie Chart
  // ─────────────────────────────────────────────────────────────
  [
    {
      type: "kpi",
      layout: { cols: 5, rows: 1 },
      // Five counts, five columns. At cols 3 the second row held two cards
      // and an empty cell, which reads as a card that failed to load.
      responsive: {
        mobile: { cols: 1, span: 1 },
        tablet: { cols: 2, span: 2 },
        desktop: { cols: 5, span: 2 },
      },
      items: [
        {
          /**
           * NOT `metric: "total"`. `fetchSnapshot` selects an un-windowed
           * `total` of its own and `Object.assign(periodTotals, snapshot)`
           * runs AFTER the window fold, so on this page — Group 3 is entirely
           * `valueMode: "current"` — the free `total` alias silently becomes
           * the all-time row count while the sparkline beside it stays
           * windowed. Declared explicitly as the stock it is.
           */
          id: "total_bids",
          title: "Auction Listings",
          metric: "listingCount",
          model: "nftListing",
          aggregation: { field: "id", op: "count" },
          valueMode: "current",
          icon: "mdi:gavel",
        },
        {
          id: "active_bids",
          title: "Active Bids",
          metric: "ACTIVE",
          model: "nftListing",
          aggregation: { field: "status", value: "ACTIVE" },
          icon: "mdi:clock-outline",
        },
        {
          /**
           * `nftListing.status` is ACTIVE|SOLD|CANCELLED|EXPIRED. The cards
           * that stood here tested "ACCEPTED" and "REJECTED" — bid statuses,
           * on a page that mounts LISTINGS — so both were structurally 0, and
           * SOLD, the only outcome an auction desk reads, appeared nowhere on
           * the page. Same correction applied to the donut and the trend.
           */
          id: "sold_listings",
          title: "Sold",
          metric: "SOLD",
          model: "nftListing",
          aggregation: { field: "status", value: "SOLD" },
          icon: "mdi:check-circle",
        },
        {
          id: "expired_bids",
          title: "Expired Bids",
          metric: "EXPIRED",
          model: "nftListing",
          aggregation: { field: "status", value: "EXPIRED" },
          icon: "mdi:timer-off",
        },
        {
          id: "cancelled_bids",
          title: "Cancelled Bids",
          metric: "CANCELLED",
          model: "nftListing",
          aggregation: { field: "status", value: "CANCELLED" },
          icon: "mdi:cancel",
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
          id: "bidStatusDistribution",
          title: "Listing Status Distribution",
          type: "pie",
          model: "nftListing",
          metrics: ["ACTIVE", "SOLD", "CANCELLED", "EXPIRED"],
          config: {
            field: "status",
            status: [
              {
                value: "ACTIVE",
                label: "Active",
                color: "blue",
                icon: "mdi:clock-outline",
              },
              {
                value: "SOLD",
                label: "Sold",
                color: "green",
                icon: "mdi:check-circle",
              },
              {
                value: "EXPIRED",
                label: "Expired",
                color: "orange",
                icon: "mdi:timer-off",
              },
              {
                value: "CANCELLED",
                label: "Cancelled",
                color: "gray",
                icon: "mdi:cancel",
              },
            ],
          },
        },
      ],
    },
  ],

  // ─────────────────────────────────────────────────────────────
  // Group 3: Financial Metrics – KPI Grid
  // ─────────────────────────────────────────────────────────────
  {
    type: "kpi",
    layout: { cols: 3, rows: 2 },
    responsive: {
      mobile: { cols: 1, rows: 6, span: 1 },
      tablet: { cols: 2, rows: 3, span: 1 },
      desktop: { cols: 3, rows: 2, span: 1 },
    },
    /**
     * Every item on this page declared `model: "nftListing"` and read `amount`.
     *
     * Two things were wrong with that. The per-item `model` is dead config —
     * `analyticsSlice` sends only the store-level model — so all 18 items ran
     * against `nftListing`, which has no `amount` column at all. Three of the
     * status literals they tested are not in the listing enum either, so those
     * cards were structurally 0; the three that ARE in it returned plausible
     * numbers about the wrong table.
     *
     * `nftListing` carries the whole auction economics itself — `currentBid`,
     * `startingBid`, `reservePrice`, `buyNowPrice` — so the questions are
     * answerable here, on the row the admin is already looking at. Live bid
     * TOTALS belong on a bid-scoped page; what an auction desk needs is where
     * the book stands against the reserve.
     */
    items: [
      {
        // Money genuinely committed across open auctions.
        id: "open_bid_value",
        title: "Open Bid Value",
        metric: "openBidValue",
        model: "nftListing",
        aggregation: {
          field: "currentBid",
          op: "sum",
          where: [{ field: "status", value: "ACTIVE" }],
        },
        valueMode: "current",
        format: "currency",
        icon: "mdi:currency-usd",
      },
      {
        id: "avg_current_bid",
        title: "Avg Current Bid",
        metric: "avgCurrentBid",
        model: "nftListing",
        aggregation: {
          field: "currentBid",
          op: "avg",
          where: [{ field: "status", value: "ACTIVE" }],
        },
        valueMode: "current",
        format: "currency",
        icon: "mdi:calculator",
      },
      {
        id: "highest_bid",
        title: "Highest Current Bid",
        metric: "highestBid",
        model: "nftListing",
        aggregation: { field: "currentBid", op: "max" },
        valueMode: "current",
        format: "currency",
        icon: "mdi:trending-up",
      },
      {
        // The number that decides whether an auction settles at all.
        id: "below_reserve",
        title: "Live, Below Reserve",
        metric: "belowReserve",
        model: "nftListing",
        aggregation: {
          op: "count",
          field: "id",
          where: [
            { field: "status", value: "ACTIVE" },
            { field: "currentBid", op: "<", value: { column: "reservePrice" } },
          ],
        },
        valueMode: "current",
        invert: true,
        icon: "mdi:alert-circle",
      },
      {
        // Settlement is stuck: money is owed and the transfer has not cleared.
        id: "settlement_blocked",
        title: "Blocked Settlements",
        metric: "settlementBlocked",
        model: "nftListing",
        aggregation: { field: "settlementBlockedAt", op: "count" },
        valueMode: "current",
        invert: true,
        icon: "mdi:lock",
      },
      {
        id: "avg_reserve_price",
        title: "Avg Reserve Price",
        metric: "avgReservePrice",
        model: "nftListing",
        aggregation: { field: "reservePrice", op: "avg" },
        valueMode: "current",
        format: "currency",
        icon: "mdi:gavel",
      },
    ],
  },

  // ─────────────────────────────────────────────────────────────
  // Group 4: Currency Distribution – KPI Grid + Pie Chart
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
          id: "eth_bids",
          title: "ETH Bids",
          metric: "ETH",
          model: "nftListing",
          aggregation: { field: "currency", value: "ETH" },
          icon: "mdi:ethereum",
        },
        {
          id: "bnb_listings",
          title: "BNB Listings",
          metric: "BNB",
          model: "nftListing",
          aggregation: { field: "currency", value: "BNB" },
          icon: "mdi:currency-btc",
        },
        {
          id: "usdt_bids",
          title: "USDT Bids",
          metric: "USDT",
          model: "nftListing",
          aggregation: { field: "currency", value: "USDT" },
          icon: "mdi:currency-usd",
        },
        {
          /**
           * `currency` is free text, so the literal "other" matched nothing —
           * a permanent 0 dressed as a catch-all, and "BTC" beside it is not
           * in the vocabulary either. What the platform writes is
           * ETH|USDC|USDT|BNB|MATIC; all five have a donut slice below and the
           * four the book is denominated in have a card here. Every listing on
           * the dev table is BNB, which the old ETH/BTC/USDT/other row could
           * not show at all.
           */
          id: "matic_listings",
          title: "MATIC Listings",
          metric: "MATIC",
          model: "nftListing",
          aggregation: { field: "currency", value: "MATIC" },
          icon: "mdi:cash-multiple",
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
          id: "currencyDistribution",
          title: "Currency Distribution",
          type: "pie",
          model: "nftListing",
          metrics: ["ETH", "USDC", "USDT", "BNB", "MATIC"],
          config: {
            field: "currency",
            status: [
              {
                value: "ETH",
                label: "Ethereum",
                color: "blue",
                icon: "mdi:ethereum",
              },
              {
                value: "USDC",
                label: "USD Coin",
                color: "cyan",
                icon: "mdi:currency-usd",
              },
              {
                value: "USDT",
                label: "Tether",
                color: "green",
                icon: "mdi:currency-usd",
              },
              {
                value: "BNB",
                label: "BNB",
                color: "orange",
                icon: "mdi:currency-btc",
              },
              {
                value: "MATIC",
                label: "Polygon",
                color: "purple",
                icon: "mdi:cash-multiple",
              },
            ],
          },
        },
      ],
    },
  ],

  // ─────────────────────────────────────────────────────────────
  // Group 5: Bids Over Time – Full-Width Line Chart
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
        id: "bidsOverTime",
        title: "Listings Over Time",
        type: "line",
        model: "nftListing",
        metrics: ["total", "ACTIVE", "SOLD", "EXPIRED"],
        timeframes: ["24h", "7d", "30d", "3m", "6m", "y"],
        labels: {
          total: "Listed",
          ACTIVE: "Still Live",
          SOLD: "Sold",
          EXPIRED: "Expired",
        },
      },
    ],
  },

  // `bidValueOverTime` stood here and plotted ["openBidValue",
  // "avgCurrentBid"]. Both belong to `valueMode: "current"` cards, i.e.
  // scope:"all" aggregations that run in the un-windowed snapshot pass and
  // are absent from every bucket row — so the chart drew two flat zero lines
  // on the axis with a legend above them. A stock has no time series; the
  // flow this page needs is the listing trend above.
] satisfies AnalyticsConfig;
