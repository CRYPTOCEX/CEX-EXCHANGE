import { AnalyticsConfig } from "@/components/blocks/data-table/types/analytics";

export const nftAuctionAnalytics: AnalyticsConfig = [
  // ─────────────────────────────────────────────────────────────
  // Group 1: Bid Status Overview – KPI Grid + Pie Chart
  // ─────────────────────────────────────────────────────────────
  [
    {
      type: "kpi",
      layout: { cols: 3, rows: 2 },
      responsive: {
        mobile: { cols: 1, rows: 6, span: 1 },
          tablet: { cols: 2, rows: 3, span: 2 },
          desktop: { cols: 3, rows: 2, span: 2 },
      },
      items: [
        {
          id: "total_bids",
          title: "Total Bids",
          metric: "total",
          model: "nftBid",
          icon: "mdi:gavel",
        },
        {
          id: "active_bids",
          title: "Active Bids",
          metric: "ACTIVE",
          model: "nftBid",
          aggregation: { field: "status", value: "ACTIVE" },
          icon: "mdi:clock-outline",
        },
        {
          id: "accepted_bids",
          title: "Accepted Bids",
          metric: "ACCEPTED",
          model: "nftBid",
          aggregation: { field: "status", value: "ACCEPTED" },
          icon: "mdi:check-circle",
        },
        {
          id: "rejected_bids",
          title: "Rejected Bids",
          metric: "REJECTED",
          model: "nftBid",
          aggregation: { field: "status", value: "REJECTED" },
          icon: "mdi:close-circle",
        },
        {
          id: "expired_bids",
          title: "Expired Bids",
          metric: "EXPIRED",
          model: "nftBid",
          aggregation: { field: "status", value: "EXPIRED" },
          icon: "mdi:timer-off",
        },
        {
          id: "cancelled_bids",
          title: "Cancelled Bids",
          metric: "CANCELLED",
          model: "nftBid",
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
          title: "Bid Status Distribution",
          type: "pie",
          model: "nftBid",
          metrics: ["ACTIVE", "ACCEPTED", "REJECTED", "EXPIRED", "CANCELLED", "OUTBID"],
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
                value: "ACCEPTED",
                label: "Accepted",
                color: "green",
                icon: "mdi:check-circle",
              },
              {
                value: "REJECTED",
                label: "Rejected",
                color: "red",
                icon: "mdi:close-circle",
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
              {
                value: "OUTBID",
                label: "Outbid",
                color: "purple",
                icon: "mdi:trending-down",
              },
            ],
          },
        },
      ],
    },
  ],

  // ─────────────────────────────────────────────────────────────
  // Group 2: Additional Bid Status – KPI Grid
  // ─────────────────────────────────────────────────────────────
  {
    type: "kpi",
    layout: { cols: 2, rows: 1 },
    responsive: {
      mobile: { cols: 1, rows: 2, span: 1 },
          tablet: { cols: 2, rows: 1, span: 2 },
          desktop: { cols: 2, rows: 1, span: 2 },
    },
    items: [
      {
        id: "outbid_bids",
        title: "Outbid Bids",
        metric: "OUTBID",
        model: "nftBid",
        aggregation: { field: "status", value: "OUTBID" },
        icon: "mdi:trending-down",
      },
      {
        id: "expiring_soon_bids",
        title: "Expiring Soon (24h)",
        metric: "expiring_soon",
        model: "nftBid",
        aggregation: { field: "expiresAt", value: "24h" },
        icon: "mdi:timer-alert",
      },
    ],
  },

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
    items: [
      {
        id: "total_bid_amount",
        title: "Total Bid Amount",
        metric: "sum",
        model: "nftBid",
        aggregation: { field: "amount", operation: "sum" },
        icon: "mdi:currency-usd",
      },
      {
        id: "avg_bid_amount",
        title: "Avg Bid Amount",
        metric: "avg",
        model: "nftBid",
        aggregation: { field: "amount", operation: "avg" },
        icon: "mdi:calculator",
      },
      {
        id: "highest_bid",
        title: "Highest Bid",
        metric: "max",
        model: "nftBid",
        aggregation: { field: "amount", operation: "max" },
        icon: "mdi:trending-up",
      },
      {
        id: "lowest_bid",
        title: "Lowest Bid",
        metric: "min",
        model: "nftBid",
        aggregation: { field: "amount", operation: "min" },
        icon: "mdi:trending-down",
      },
      {
        id: "total_accepted_bid_value",
        title: "Total Accepted Bid Value",
        metric: "sum",
        model: "nftBid",
        aggregation: { field: "amount", operation: "sum", status: "ACCEPTED" },
        icon: "mdi:cash-check",
      },
      {
        id: "avg_accepted_bid_value",
        title: "Avg Accepted Bid Value",
        metric: "avg",
        model: "nftBid",
        aggregation: { field: "amount", operation: "avg", status: "ACCEPTED" },
        icon: "mdi:cash",
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
          model: "nftBid",
          aggregation: { field: "currency", value: "ETH" },
          icon: "mdi:ethereum",
        },
        {
          id: "btc_bids",
          title: "BTC Bids",
          metric: "BTC",
          model: "nftBid",
          aggregation: { field: "currency", value: "BTC" },
          icon: "mdi:bitcoin",
        },
        {
          id: "usdt_bids",
          title: "USDT Bids",
          metric: "USDT",
          model: "nftBid",
          aggregation: { field: "currency", value: "USDT" },
          icon: "mdi:currency-usd",
        },
        {
          id: "other_currency_bids",
          title: "Other Currency Bids",
          metric: "other",
          model: "nftBid",
          aggregation: { field: "currency", value: "other" },
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
          model: "nftBid",
          metrics: ["ETH", "BTC", "USDT", "other"],
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
                value: "BTC",
                label: "Bitcoin",
                color: "orange",
                icon: "mdi:bitcoin",
              },
              {
                value: "USDT",
                label: "Tether",
                color: "green",
                icon: "mdi:currency-usd",
              },
              {
                value: "other",
                label: "Other",
                color: "gray",
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
        title: "Bids Over Time",
        type: "line",
        model: "nftBid",
        metrics: ["total", "ACTIVE", "ACCEPTED", "REJECTED"],
        timeframes: ["24h", "7d", "30d", "3m", "6m", "y"],
        labels: {
          total: "Total Bids",
          ACTIVE: "Active Bids",
          ACCEPTED: "Accepted Bids",
          REJECTED: "Rejected Bids",
        },
      },
    ],
  },

  // ─────────────────────────────────────────────────────────────
  // Group 6: Bid Value Over Time – Full-Width Line Chart
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
        id: "bidValueOverTime",
        title: "Bid Value Over Time",
        type: "line",
        model: "nftBid",
        metrics: ["total_amount", "avg_amount"],
        timeframes: ["24h", "7d", "30d", "3m", "6m", "y"],
        labels: {
          total_amount: "Total Bid Amount",
          avg_amount: "Average Bid Amount",
        },
      },
    ],
  },
] satisfies AnalyticsConfig;
