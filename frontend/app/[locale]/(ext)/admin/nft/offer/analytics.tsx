export const nftOfferAnalytics = [
  // ─────────────────────────────────────────────────────────────
  // Group 1: Offer Overview – KPI Grid on Left, Pie Chart on Right
  // ─────────────────────────────────────────────────────────────
  [
    {
      type: "kpi",
      layout: { cols: 3, rows: 2 },
      items: [
        {
          id: "total_offers",
          title: "Total Offers",
          metric: "total",
          model: "nftOffer",
          icon: "mdi:handshake",
        },
        {
          id: "pending_offers",
          title: "Pending Offers",
          metric: "PENDING",
          model: "nftOffer",
          aggregation: { field: "status", value: "PENDING" },
          icon: "mdi:clock-outline",
        },
        {
          id: "accepted_offers",
          title: "Accepted Offers",
          metric: "ACCEPTED",
          model: "nftOffer",
          aggregation: { field: "status", value: "ACCEPTED" },
          icon: "mdi:check-circle",
        },
        {
          id: "rejected_offers",
          title: "Rejected Offers",
          metric: "REJECTED",
          model: "nftOffer",
          aggregation: { field: "status", value: "REJECTED" },
          icon: "mdi:cancel",
        },
        {
          id: "expired_offers",
          title: "Expired Offers",
          metric: "EXPIRED",
          model: "nftOffer",
          aggregation: { field: "status", value: "EXPIRED" },
          icon: "mdi:clock-alert",
        },
        {
          id: "cancelled_offers",
          title: "Cancelled Offers",
          metric: "CANCELLED",
          model: "nftOffer",
          aggregation: { field: "status", value: "CANCELLED" },
          icon: "mdi:close-circle",
        },
      ],
    },
    {
      type: "chart",
      items: [
        {
          id: "offerStatusDistribution",
          title: "Offer Status Distribution",
          type: "pie",
          model: "nftOffer",
          metrics: ["PENDING", "ACCEPTED", "REJECTED", "EXPIRED", "CANCELLED"],
          config: {
            field: "status",
            status: [
              {
                value: "PENDING",
                label: "Pending",
                color: "orange",
                icon: "mdi:clock-outline",
              },
              {
                value: "ACCEPTED",
                label: "Accepted",
                color: "green",
                icon: "mdi:check-circle",
              },
              {
                value: "REJECTED",
                label: "Rejected",
                color: "red",
                icon: "mdi:cancel",
              },
              {
                value: "EXPIRED",
                label: "Expired",
                color: "gray",
                icon: "mdi:clock-alert",
              },
              {
                value: "CANCELLED",
                label: "Cancelled",
                color: "gray",
                icon: "mdi:close-circle",
              },
            ],
          },
        },
      ],
    },
  ],

  // ─────────────────────────────────────────────────────────────
  // Group 2: Offer Type Distribution – KPI Grid on Left, Pie Chart on Right
  // ─────────────────────────────────────────────────────────────
  [
    {
      type: "kpi",
      layout: { cols: 3, rows: 1 },
      items: [
        {
          id: "direct_offers",
          title: "Direct Offers",
          metric: "OFFER",
          model: "nftOffer",
          aggregation: { field: "type", value: "OFFER" },
          icon: "mdi:tag",
        },
        {
          id: "auction_bids",
          title: "Auction Bids",
          metric: "BID",
          model: "nftOffer",
          aggregation: { field: "type", value: "BID" },
          icon: "mdi:gavel",
        },
        {
          id: "counter_offers",
          title: "Counter Offers",
          metric: "COUNTER_OFFER",
          model: "nftOffer",
          aggregation: { field: "type", value: "COUNTER_OFFER" },
          icon: "mdi:swap-horizontal",
        },
      ],
    },
    {
      type: "chart",
      items: [
        {
          id: "offerTypeDistribution",
          title: "Offer Type Distribution",
          type: "pie",
          model: "nftOffer",
          metrics: ["OFFER", "BID", "COUNTER_OFFER"],
          config: {
            field: "type",
            status: [
              {
                value: "OFFER",
                label: "Direct Offer",
                color: "blue",
                icon: "mdi:tag",
              },
              {
                value: "BID",
                label: "Auction Bid",
                color: "purple",
                icon: "mdi:gavel",
              },
              {
                value: "COUNTER_OFFER",
                label: "Counter Offer",
                color: "orange",
                icon: "mdi:swap-horizontal",
              },
            ],
          },
        },
      ],
    },
  ],

  // ─────────────────────────────────────────────────────────────
  // Group 3: Offers Over Time – Full-Width Line Chart
  // ─────────────────────────────────────────────────────────────
  {
    type: "chart",
    items: [
      {
        id: "offersOverTime",
        title: "Offers Over Time",
        type: "line",
        model: "nftOffer",
        metrics: ["total", "PENDING", "ACCEPTED", "REJECTED"],
        timeframes: ["24h", "7d", "30d", "3m", "6m", "y"],
        labels: {
          total: "Total Offers",
          PENDING: "Pending Offers",
          ACCEPTED: "Accepted Offers",
          REJECTED: "Rejected Offers",
        },
      },
    ],
  },
];