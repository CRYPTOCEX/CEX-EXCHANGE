import { AnalyticsConfig } from "@/components/blocks/data-table/types/analytics";

export const nftCollectionAnalytics: AnalyticsConfig = [
  // ─────────────────────────────────────────────────────────────
  // Group 1: Collection Overview – KPI Grid on Left, Pie Chart on Right
  // ─────────────────────────────────────────────────────────────
  [
    {
      type: "kpi",
      layout: { cols: 3, rows: 2 },
      items: [
        {
          id: "total_collections",
          title: "Total Collections",
          metric: "total",
          model: "nftCollection",
          icon: "mdi:view-grid",
        },
        {
          id: "active_collections",
          title: "Active Collections",
          metric: "ACTIVE",
          model: "nftCollection",
          aggregation: { field: "status", value: "ACTIVE" },
          icon: "mdi:check-circle",
        },
        {
          id: "verified_collections",
          title: "Verified Collections",
          metric: "verified",
          model: "nftCollection",
          aggregation: { field: "isVerified", value: "true" },
          icon: "mdi:shield-check",
        },
        {
          id: "draft_collections",
          title: "Draft Collections",
          metric: "DRAFT",
          model: "nftCollection",
          aggregation: { field: "status", value: "DRAFT" },
          icon: "mdi:file-document-outline",
        },
        {
          id: "pending_collections",
          title: "Pending Collections",
          metric: "PENDING",
          model: "nftCollection",
          aggregation: { field: "status", value: "PENDING" },
          icon: "mdi:clock-outline",
        },
        {
          id: "suspended_collections",
          title: "Suspended Collections",
          metric: "SUSPENDED",
          model: "nftCollection",
          aggregation: { field: "status", value: "SUSPENDED" },
          icon: "mdi:pause-circle",
        },
      ],
    },
    {
      type: "chart",
      items: [
        {
          id: "collectionStatusDistribution",
          title: "Collection Status Distribution",
          type: "pie",
          model: "nftCollection",
          metrics: ["ACTIVE", "DRAFT", "PENDING", "SUSPENDED"],
          config: {
            field: "status",
            status: [
              {
                value: "ACTIVE",
                label: "Active",
                color: "green",
                icon: "mdi:check-circle",
              },
              {
                value: "DRAFT",
                label: "Draft",
                color: "gray",
                icon: "mdi:file-document-outline",
              },
              {
                value: "PENDING",
                label: "Pending",
                color: "orange",
                icon: "mdi:clock-outline",
              },
              {
                value: "SUSPENDED",
                label: "Suspended",
                color: "red",
                icon: "mdi:pause-circle",
              },
            ],
          },
        },
      ],
    },
  ],

  // ─────────────────────────────────────────────────────────────
  // Group 2: Blockchain Distribution – KPI Grid on Left, Pie Chart on Right
  // ─────────────────────────────────────────────────────────────
  [
    {
      type: "kpi",
      layout: { cols: 3, rows: 2 },
      items: [
        {
          id: "ethereum_collections",
          title: "Ethereum",
          metric: "ETH",
          model: "nftCollection",
          aggregation: { field: "chain", value: "ETH" },
          icon: "mdi:ethereum",
        },
        {
          id: "bsc_collections",
          title: "BSC",
          metric: "BSC",
          model: "nftCollection",
          aggregation: { field: "chain", value: "BSC" },
          icon: "mdi:currency-btc",
        },
        {
          id: "polygon_collections",
          title: "Polygon",
          metric: "POLYGON",
          model: "nftCollection",
          aggregation: { field: "chain", value: "POLYGON" },
          icon: "mdi:polygon",
        },
        {
          id: "arbitrum_collections",
          title: "Arbitrum",
          metric: "ARBITRUM",
          model: "nftCollection",
          aggregation: { field: "chain", value: "ARBITRUM" },
          icon: "mdi:triangle",
        },
        {
          id: "optimism_collections",
          title: "Optimism",
          metric: "OPTIMISM",
          model: "nftCollection",
          aggregation: { field: "chain", value: "OPTIMISM" },
          icon: "mdi:circle",
        },
        {
          id: "erc721_collections",
          title: "ERC-721",
          metric: "ERC721",
          model: "nftCollection",
          aggregation: { field: "standard", value: "ERC721" },
          icon: "mdi:cube",
        },
      ],
    },
    {
      type: "chart",
      items: [
        {
          id: "collectionChainDistribution",
          title: "Blockchain Distribution",
          type: "pie",
          model: "nftCollection",
          metrics: ["ETH", "BSC", "POLYGON", "ARBITRUM", "OPTIMISM"],
          config: {
            field: "chain",
            status: [
              {
                value: "ETH",
                label: "Ethereum",
                color: "blue",
                icon: "mdi:ethereum",
              },
              {
                value: "BSC",
                label: "BSC",
                color: "yellow",
                icon: "mdi:currency-btc",
              },
              {
                value: "POLYGON",
                label: "Polygon",
                color: "purple",
                icon: "mdi:polygon",
              },
              {
                value: "ARBITRUM",
                label: "Arbitrum",
                color: "blue",
                icon: "mdi:triangle",
              },
              {
                value: "OPTIMISM",
                label: "Optimism",
                color: "red",
                icon: "mdi:circle",
              },
            ],
          },
        },
      ],
    },
  ],

  // ─────────────────────────────────────────────────────────────
  // Group 3: Collections Over Time – Full-Width Line Chart
  // ─────────────────────────────────────────────────────────────
  {
    type: "chart",
    items: [
      {
        id: "collectionsOverTime",
        title: "Collections Over Time",
        type: "line",
        model: "nftCollection",
        metrics: ["total", "ACTIVE", "verified"],
        timeframes: ["24h", "7d", "30d", "3m", "6m", "y"],
        labels: {
          total: "Total Collections",
          ACTIVE: "Active Collections",
          verified: "Verified Collections",
        },
      },
    ],
  },
]; 