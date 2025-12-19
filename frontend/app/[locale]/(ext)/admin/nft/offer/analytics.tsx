import { AnalyticsConfig } from "@/components/blocks/data-table/types/analytics";

export const nftOfferAnalytics: AnalyticsConfig = [
  // ─────────────────────────────────────────────────────────────
  // Group 1: Offer Status Overview – KPI Grid + Pie Chart
  // ─────────────────────────────────────────────────────────────
  [
    {
      type: "kpi",
      layout: { cols: 3, rows: 2 },
      responsive: {
        mobile: { cols: 1, rows: 5, span: 1 },
          tablet: { cols: 2, rows: 3, span: 2 },
          desktop: { cols: 3, rows: 2, span: 2 },
      },
      items: [
        {
          id: "total_offers",
          title: "Total Offers",
          metric: "total",
          model: "nftOffer",
          icon: "mdi:handshake",
        },
        {
          id: "active_offers",
          title: "Active Offers",
          metric: "ACTIVE",
          model: "nftOffer",
          aggregation: { field: "status", value: "ACTIVE" },
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
          icon: "mdi:close-circle",
        },
        {
          id: "expired_offers",
          title: "Expired Offers",
          metric: "EXPIRED",
          model: "nftOffer",
          aggregation: { field: "status", value: "EXPIRED" },
          icon: "mdi:timer-off",
        },
        {
          id: "cancelled_offers",
          title: "Cancelled Offers",
          metric: "CANCELLED",
          model: "nftOffer",
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
          id: "offerStatusDistribution",
          title: "Offer Status Distribution",
          type: "pie",
          model: "nftOffer",
          metrics: ["ACTIVE", "ACCEPTED", "REJECTED", "EXPIRED", "CANCELLED"],
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
            ],
          },
        },
      ],
    },
  ],

  // ─────────────────────────────────────────────────────────────
  // Group 2: Offer Type Distribution – KPI Grid + Pie Chart
  // ─────────────────────────────────────────────────────────────
  [
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
          id: "token_offers",
          title: "Token Offers",
          metric: "TOKEN",
          model: "nftOffer",
          aggregation: { field: "type", value: "TOKEN" },
          icon: "mdi:image",
        },
        {
          id: "collection_offers",
          title: "Collection Offers",
          metric: "COLLECTION",
          model: "nftOffer",
          aggregation: { field: "type", value: "COLLECTION" },
          icon: "mdi:view-grid",
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
          id: "offerTypeDistribution",
          title: "Offer Type Distribution",
          type: "pie",
          model: "nftOffer",
          metrics: ["TOKEN", "COLLECTION"],
          config: {
            field: "type",
            status: [
              {
                value: "TOKEN",
                label: "Token Offer",
                color: "blue",
                icon: "mdi:image",
              },
              {
                value: "COLLECTION",
                label: "Collection Offer",
                color: "purple",
                icon: "mdi:view-grid",
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
    items: [
      {
        id: "total_offer_amount",
        title: "Total Offer Amount",
        metric: "sum",
        model: "nftOffer",
        aggregation: { field: "amount", operation: "sum" },
        icon: "mdi:currency-usd",
      },
      {
        id: "avg_offer_amount",
        title: "Avg Offer Amount",
        metric: "avg",
        model: "nftOffer",
        aggregation: { field: "amount", operation: "avg" },
        icon: "mdi:calculator",
      },
      {
        id: "highest_offer",
        title: "Highest Offer",
        metric: "max",
        model: "nftOffer",
        aggregation: { field: "amount", operation: "max" },
        icon: "mdi:trending-up",
      },
      {
        id: "lowest_offer",
        title: "Lowest Offer",
        metric: "min",
        model: "nftOffer",
        aggregation: { field: "amount", operation: "min" },
        icon: "mdi:trending-down",
      },
      {
        id: "total_accepted_value",
        title: "Total Accepted Value",
        metric: "sum",
        model: "nftOffer",
        aggregation: { field: "amount", operation: "sum", status: "ACCEPTED" },
        icon: "mdi:cash-check",
      },
      {
        id: "avg_accepted_value",
        title: "Avg Accepted Value",
        metric: "avg",
        model: "nftOffer",
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
          id: "eth_offers",
          title: "ETH Offers",
          metric: "ETH",
          model: "nftOffer",
          aggregation: { field: "currency", value: "ETH" },
          icon: "mdi:ethereum",
        },
        {
          id: "btc_offers",
          title: "BTC Offers",
          metric: "BTC",
          model: "nftOffer",
          aggregation: { field: "currency", value: "BTC" },
          icon: "mdi:bitcoin",
        },
        {
          id: "usdt_offers",
          title: "USDT Offers",
          metric: "USDT",
          model: "nftOffer",
          aggregation: { field: "currency", value: "USDT" },
          icon: "mdi:currency-usd",
        },
        {
          id: "other_currency_offers",
          title: "Other Currency Offers",
          metric: "other",
          model: "nftOffer",
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
          model: "nftOffer",
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
  // Group 5: Offers Over Time – Full-Width Line Chart
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
        id: "offersOverTime",
        title: "Offers Over Time",
        type: "line",
        model: "nftOffer",
        metrics: ["total", "ACTIVE", "ACCEPTED", "REJECTED"],
        timeframes: ["24h", "7d", "30d", "3m", "6m", "y"],
        labels: {
          total: "Total Offers",
          ACTIVE: "Active Offers",
          ACCEPTED: "Accepted Offers",
          REJECTED: "Rejected Offers",
        },
      },
    ],
  },

  // ─────────────────────────────────────────────────────────────
  // Group 6: Offer Value Over Time – Full-Width Line Chart
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
        id: "offerValueOverTime",
        title: "Offer Value Over Time",
        type: "line",
        model: "nftOffer",
        metrics: ["total_amount", "avg_amount"],
        timeframes: ["24h", "7d", "30d", "3m", "6m", "y"],
        labels: {
          total_amount: "Total Offer Amount",
          avg_amount: "Average Offer Amount",
        },
      },
    ],
  },
] satisfies AnalyticsConfig;
