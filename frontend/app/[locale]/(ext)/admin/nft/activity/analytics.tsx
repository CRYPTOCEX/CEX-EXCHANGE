import { AnalyticsConfig, KpiItem, ChartItem } from "@/components/blocks/data-table/types/analytics";

export const nftActivityAnalytics: AnalyticsConfig = [
  // ─────────────────────────────────────────────────────────────
  // Group 1: Primary Activity Types – KPI Grid + Pie Chart
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
          id: "total_activities",
          title: "Total Activities",
          metric: "total",
          model: "nftActivity",
          icon: "mdi:chart-line",
        },
        {
          id: "mint_activities",
          title: "Mints",
          metric: "MINT",
          model: "nftActivity",
          aggregation: { field: "type", value: "MINT" },
          icon: "mdi:hammer",
        },
        {
          id: "transfer_activities",
          title: "Transfers",
          metric: "TRANSFER",
          model: "nftActivity",
          aggregation: { field: "type", value: "TRANSFER" },
          icon: "mdi:swap-horizontal",
        },
        {
          id: "sale_activities",
          title: "Sales",
          metric: "SALE",
          model: "nftActivity",
          aggregation: { field: "type", value: "SALE" },
          icon: "mdi:currency-usd",
        },
        {
          id: "list_activities",
          title: "Listings",
          metric: "LIST",
          model: "nftActivity",
          aggregation: { field: "type", value: "LIST" },
          icon: "mdi:format-list-bulleted",
        },
        {
          id: "delist_activities",
          title: "Delistings",
          metric: "DELIST",
          model: "nftActivity",
          aggregation: { field: "type", value: "DELIST" },
          icon: "mdi:format-list-bulleted-square",
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
          id: "primaryActivityDistribution",
          title: "Primary Activity Distribution",
          type: "pie",
          model: "nftActivity",
          metrics: ["MINT", "TRANSFER", "SALE", "LIST", "DELIST", "BURN"],
          config: {
            field: "type",
            status: [
              {
                value: "MINT",
                label: "Mint",
                color: "green",
                icon: "mdi:hammer",
              },
              {
                value: "TRANSFER",
                label: "Transfer",
                color: "blue",
                icon: "mdi:swap-horizontal",
              },
              {
                value: "SALE",
                label: "Sale",
                color: "purple",
                icon: "mdi:currency-usd",
              },
              {
                value: "LIST",
                label: "List",
                color: "orange",
                icon: "mdi:format-list-bulleted",
              },
              {
                value: "DELIST",
                label: "Delist",
                color: "amber",
                icon: "mdi:format-list-bulleted-square",
              },
              {
                value: "BURN",
                label: "Burn",
                color: "red",
                icon: "mdi:fire",
              },
            ],
          },
        },
      ],
    },
  ],

  // ─────────────────────────────────────────────────────────────
  // Group 2: Trading Activity Types – KPI Grid + Pie Chart
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
          id: "bid_activities",
          title: "Bids",
          metric: "BID",
          model: "nftActivity",
          aggregation: { field: "type", value: "BID" },
          icon: "mdi:gavel",
        },
        {
          id: "offer_activities",
          title: "Offers",
          metric: "OFFER",
          model: "nftActivity",
          aggregation: { field: "type", value: "OFFER" },
          icon: "mdi:handshake",
        },
        {
          id: "burn_activities",
          title: "Burns",
          metric: "BURN",
          model: "nftActivity",
          aggregation: { field: "type", value: "BURN" },
          icon: "mdi:fire",
        },
        {
          id: "auction_ended_activities",
          title: "Auction Ended",
          metric: "AUCTION_ENDED",
          model: "nftActivity",
          aggregation: { field: "type", value: "AUCTION_ENDED" },
          icon: "mdi:gavel-sound",
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
          id: "tradingActivityDistribution",
          title: "Trading Activity Distribution",
          type: "pie",
          model: "nftActivity",
          metrics: ["BID", "OFFER", "BURN", "AUCTION_ENDED"],
          config: {
            field: "type",
            status: [
              {
                value: "BID",
                label: "Bid",
                color: "yellow",
                icon: "mdi:gavel",
              },
              {
                value: "OFFER",
                label: "Offer",
                color: "cyan",
                icon: "mdi:handshake",
              },
              {
                value: "BURN",
                label: "Burn",
                color: "red",
                icon: "mdi:fire",
              },
              {
                value: "AUCTION_ENDED",
                label: "Auction Ended",
                color: "indigo",
                icon: "mdi:gavel-sound",
              },
            ],
          },
        },
      ],
    },
  ],

  // ─────────────────────────────────────────────────────────────
  // Group 3: Collection Activity Types – KPI Grid + Pie Chart
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
          id: "collection_created_activities",
          title: "Collections Created",
          metric: "COLLECTION_CREATED",
          model: "nftActivity",
          aggregation: { field: "type", value: "COLLECTION_CREATED" },
          icon: "mdi:folder-plus",
        },
        {
          id: "collection_deployed_activities",
          title: "Collections Deployed",
          metric: "COLLECTION_DEPLOYED",
          model: "nftActivity",
          aggregation: { field: "type", value: "COLLECTION_DEPLOYED" },
          icon: "mdi:rocket-launch",
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
          id: "collectionActivityDistribution",
          title: "Collection Activity Distribution",
          type: "pie",
          model: "nftActivity",
          metrics: ["COLLECTION_CREATED", "COLLECTION_DEPLOYED"],
          config: {
            field: "type",
            status: [
              {
                value: "COLLECTION_CREATED",
                label: "Created",
                color: "teal",
                icon: "mdi:folder-plus",
              },
              {
                value: "COLLECTION_DEPLOYED",
                label: "Deployed",
                color: "emerald",
                icon: "mdi:rocket-launch",
              },
            ],
          },
        },
      ],
    },
  ],

  // ─────────────────────────────────────────────────────────────
  // Group 4: Financial Metrics – KPI Grid
  // ─────────────────────────────────────────────────────────────
  {
    type: "kpi",
    layout: { cols: 3, rows: 1 },
    responsive: {
      mobile: { cols: 1, rows: 3, span: 1 },
          tablet: { cols: 3, rows: 1, span: 2 },
          desktop: { cols: 3, rows: 1, span: 2 },
    },
    items: [
      {
        id: "total_activity_volume",
        title: "Total Volume",
        metric: "sum",
        model: "nftActivity",
        aggregation: { field: "price", operation: "sum" },
        icon: "mdi:currency-usd",
      },
      {
        id: "avg_activity_price",
        title: "Avg Price",
        metric: "avg",
        model: "nftActivity",
        aggregation: { field: "price", operation: "avg" },
        icon: "mdi:calculator",
      },
      {
        id: "max_activity_price",
        title: "Highest Price",
        metric: "max",
        model: "nftActivity",
        aggregation: { field: "price", operation: "max" },
        icon: "mdi:trending-up",
      },
    ],
  },

  // ─────────────────────────────────────────────────────────────
  // Group 5: Activities Over Time – Full-Width Line Chart
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
        id: "activitiesOverTime",
        title: "Activities Over Time",
        type: "line",
        model: "nftActivity",
        metrics: ["total", "MINT", "TRANSFER", "SALE"],
        timeframes: ["24h", "7d", "30d", "3m", "6m", "y"],
        labels: {
          total: "Total Activities",
          MINT: "Mints",
          TRANSFER: "Transfers",
          SALE: "Sales",
        },
      },
    ],
  },

  // ─────────────────────────────────────────────────────────────
  // Group 6: Volume Over Time – Full-Width Line Chart
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
        id: "volumeOverTime",
        title: "Activity Volume Over Time",
        type: "line",
        model: "nftActivity",
        metrics: ["total_volume", "avg_price"],
        timeframes: ["24h", "7d", "30d", "3m", "6m", "y"],
        labels: {
          total_volume: "Total Volume",
          avg_price: "Average Price",
        },
      },
    ],
  },
] satisfies AnalyticsConfig;