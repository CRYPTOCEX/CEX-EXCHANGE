export const nftAuctionAnalytics = [
  // ─────────────────────────────────────────────────────────────
  // Group 1: Auction Overview – KPI Grid on Left, Pie Chart on Right
  // ─────────────────────────────────────────────────────────────
  [
    {
      type: "kpi",
      layout: { cols: 3, rows: 2 },
      items: [
        {
          id: "total_auctions",
          title: "Total Auctions",
          metric: "total",
          model: "nftListing",
          aggregation: { field: "type", value: "AUCTION" },
          icon: "mdi:gavel",
        },
        {
          id: "active_auctions",
          title: "Active Auctions",
          metric: "ACTIVE",
          model: "nftListing",
          aggregation: { field: "status", value: "ACTIVE", type: "AUCTION" },
          icon: "mdi:clock-outline",
        },
        {
          id: "ended_auctions",
          title: "Ended Auctions",
          metric: "SOLD",
          model: "nftListing",
          aggregation: { field: "status", value: "SOLD", type: "AUCTION" },
          icon: "mdi:check-circle",
        },
        {
          id: "cancelled_auctions",
          title: "Cancelled Auctions",
          metric: "CANCELLED",
          model: "nftListing",
          aggregation: { field: "status", value: "CANCELLED", type: "AUCTION" },
          icon: "mdi:cancel",
        },
        {
          id: "expired_auctions",
          title: "Expired Auctions",
          metric: "EXPIRED",
          model: "nftListing",
          aggregation: { field: "status", value: "EXPIRED", type: "AUCTION" },
          icon: "mdi:timer-sand",
        },
        {
          id: "avg_starting_price",
          title: "Avg Starting Price",
          metric: "avgPrice",
          model: "nftListing",
          aggregation: { field: "price", operation: "avg", type: "AUCTION" },
          icon: "mdi:calculator",
        },
      ],
    },
    {
      type: "chart",
      items: [
        {
          id: "auctionStatusDistribution",
          title: "Auction Status Distribution",
          type: "pie",
          model: "nftListing",
          metrics: ["ACTIVE", "SOLD", "CANCELLED", "EXPIRED"],
          config: {
            field: "status",
            type: "AUCTION",
            status: [
              {
                value: "ACTIVE",
                label: "Active",
                color: "green",
                icon: "mdi:clock-outline",
              },
              {
                value: "SOLD",
                label: "Sold",
                color: "blue",
                icon: "mdi:check-circle",
              },
              {
                value: "CANCELLED",
                label: "Cancelled",
                color: "red",
                icon: "mdi:cancel",
              },
              {
                value: "EXPIRED",
                label: "Expired",
                color: "gray",
                icon: "mdi:timer-sand",
              },
            ],
          },
        },
      ],
    },
  ],

  // ─────────────────────────────────────────────────────────────
  // Group 2: Auction Performance – KPI Grid on Left, Bar Chart on Right
  // ─────────────────────────────────────────────────────────────
  [
    {
      type: "kpi",
      layout: { cols: 3, rows: 1 },
      items: [
        {
          id: "avg_reserve_price",
          title: "Avg Reserve Price",
          metric: "avgReservePrice",
          model: "nftListing",
          aggregation: { field: "reservePrice", operation: "avg", type: "AUCTION" },
          icon: "mdi:calculator",
        },
        {
          id: "avg_buy_now_price",
          title: "Avg Buy Now Price",
          metric: "avgBuyNowPrice",
          model: "nftListing",
          aggregation: { field: "buyNowPrice", operation: "avg", type: "AUCTION" },
          icon: "mdi:trending-up",
        },
        {
          id: "total_auction_value",
          title: "Total Auction Value",
          metric: "totalValue",
          model: "nftListing",
          aggregation: { field: "price", operation: "sum", type: "AUCTION" },
          icon: "mdi:currency-usd",
        },
      ],
    },
    {
      type: "chart",
      items: [
        {
          id: "auctionPerformance",
          title: "Auction Performance",
          type: "bar",
          model: "nftListing",
          metrics: ["activeAuctions", "soldAuctions"],
          config: {
            field: "status",
            type: "AUCTION",
            status: [
              {
                value: "ACTIVE",
                label: "Active Auctions",
                color: "green",
                icon: "mdi:trending-up",
              },
              {
                value: "SOLD",
                label: "Sold Auctions",
                color: "blue",
                icon: "mdi:check-circle",
              },
            ],
          },
        },
      ],
    },
  ],

  // ─────────────────────────────────────────────────────────────
  // Group 3: Auctions Over Time – Full-Width Line Chart
  // ─────────────────────────────────────────────────────────────
  {
    type: "chart",
    items: [
      {
        id: "auctionsOverTime",
        title: "Auctions Over Time",
        type: "line",
        model: "nftListing",
        metrics: ["total", "ACTIVE", "SOLD", "EXPIRED"],
        timeframes: ["24h", "7d", "30d", "3m", "6m", "y"],
        config: {
          type: "AUCTION",
        },
        labels: {
          total: "Total Auctions",
          ACTIVE: "Active Auctions",
          SOLD: "Sold Auctions",
          EXPIRED: "Expired Auctions",
        },
      },
    ],
  },
];