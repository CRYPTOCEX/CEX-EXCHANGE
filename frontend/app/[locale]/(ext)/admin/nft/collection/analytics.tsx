import { AnalyticsConfig } from "@/components/blocks/data-table/types/analytics";

export const nftCollectionAnalytics: AnalyticsConfig = [
  // ─────────────────────────────────────────────────────────────
  // Group 1: Collection Status Overview – KPI Grid + Pie Chart
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
          id: "total_collections",
          title: "Total Collections",
          metric: "total",
          model: "nftCollection",
          icon: "mdi:view-grid",
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
          id: "active_collections",
          title: "Active Collections",
          metric: "ACTIVE",
          model: "nftCollection",
          aggregation: { field: "status", value: "ACTIVE" },
          icon: "mdi:check-circle",
        },
        {
          id: "inactive_collections",
          title: "Inactive Collections",
          metric: "INACTIVE",
          model: "nftCollection",
          aggregation: { field: "status", value: "INACTIVE" },
          icon: "mdi:close-circle",
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
      responsive: {
        mobile: { cols: 1, rows: 1, span: 1 },
        tablet: { cols: 1, rows: 1, span: 1 },
        desktop: { cols: 1, rows: 1, span: 1 },
      },
      items: [
        {
          id: "collectionStatusDistribution",
          title: "Collection Status Distribution",
          type: "pie",
          model: "nftCollection",
          metrics: ["DRAFT", "PENDING", "ACTIVE", "INACTIVE", "SUSPENDED"],
          config: {
            field: "status",
            status: [
              {
                value: "DRAFT",
                label: "Draft",
                color: "gray",
                icon: "mdi:file-document-outline",
              },
              {
                value: "PENDING",
                label: "Pending",
                color: "amber",
                icon: "mdi:clock-outline",
              },
              {
                value: "ACTIVE",
                label: "Active",
                color: "green",
                icon: "mdi:check-circle",
              },
              {
                value: "INACTIVE",
                label: "Inactive",
                color: "orange",
                icon: "mdi:close-circle",
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
      responsive: {
        mobile: { cols: 1, rows: 6, span: 1 },
          tablet: { cols: 2, rows: 3, span: 2 },
          desktop: { cols: 3, rows: 2, span: 2 },
      },
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
      responsive: {
        mobile: { cols: 1, rows: 1, span: 1 },
        tablet: { cols: 1, rows: 1, span: 1 },
        desktop: { cols: 1, rows: 1, span: 1 },
      },
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
  // Group 3: Token Standard Distribution – KPI Grid + Pie Chart
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
          id: "erc721_collections",
          title: "ERC-721 Collections",
          metric: "ERC721",
          model: "nftCollection",
          aggregation: { field: "standard", value: "ERC721" },
          icon: "mdi:cube",
        },
        {
          id: "erc1155_collections",
          title: "ERC-1155 Collections",
          metric: "ERC1155",
          model: "nftCollection",
          aggregation: { field: "standard", value: "ERC1155" },
          icon: "mdi:cube-outline",
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
          id: "standardDistribution",
          title: "Token Standard Distribution",
          type: "pie",
          model: "nftCollection",
          metrics: ["ERC721", "ERC1155"],
          config: {
            field: "standard",
            status: [
              {
                value: "ERC721",
                label: "ERC-721",
                color: "blue",
                icon: "mdi:cube",
              },
              {
                value: "ERC1155",
                label: "ERC-1155",
                color: "purple",
                icon: "mdi:cube-outline",
              },
            ],
          },
        },
      ],
    },
  ],

  // ─────────────────────────────────────────────────────────────
  // Group 4: Verification & Feature Flags – KPI Grid
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
        id: "verified_collections",
        title: "Verified Collections",
        metric: "verified",
        model: "nftCollection",
        aggregation: { field: "isVerified", value: "true" },
        icon: "mdi:shield-check",
      },
      {
        id: "unverified_collections",
        title: "Unverified Collections",
        metric: "unverified",
        model: "nftCollection",
        aggregation: { field: "isVerified", value: "false" },
        icon: "mdi:shield-off",
      },
      {
        id: "lazy_minted_collections",
        title: "Lazy Minted",
        metric: "lazy_minted",
        model: "nftCollection",
        aggregation: { field: "isLazyMinted", value: "true" },
        icon: "mdi:cloud-upload",
      },
      {
        id: "non_lazy_minted_collections",
        title: "Not Lazy Minted",
        metric: "not_lazy_minted",
        model: "nftCollection",
        aggregation: { field: "isLazyMinted", value: "false" },
        icon: "mdi:upload",
      },
      {
        id: "public_mint_enabled_collections",
        title: "Public Mint Enabled",
        metric: "public_mint",
        model: "nftCollection",
        aggregation: { field: "isPublicMintEnabled", value: "true" },
        icon: "mdi:account-multiple-check",
      },
      {
        id: "public_mint_disabled_collections",
        title: "Public Mint Disabled",
        metric: "no_public_mint",
        model: "nftCollection",
        aggregation: { field: "isPublicMintEnabled", value: "false" },
        icon: "mdi:account-multiple-remove",
      },
    ],
  },

  // ─────────────────────────────────────────────────────────────
  // Group 5: Supply Metrics – KPI Grid
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
        id: "total_supply",
        title: "Total Supply (All Collections)",
        metric: "sum",
        model: "nftCollection",
        aggregation: { field: "totalSupply", operation: "sum" },
        icon: "mdi:package-variant",
      },
      {
        id: "avg_mint_price",
        title: "Avg Mint Price",
        metric: "avg",
        model: "nftCollection",
        aggregation: { field: "mintPrice", operation: "avg" },
        icon: "mdi:currency-usd",
      },
      {
        id: "avg_royalty_percentage",
        title: "Avg Royalty %",
        metric: "avg",
        model: "nftCollection",
        aggregation: { field: "royaltyPercentage", operation: "avg" },
        icon: "mdi:percent",
      },
    ],
  },

  // ─────────────────────────────────────────────────────────────
  // Group 6: Collections Over Time – Full-Width Line Chart
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
] satisfies AnalyticsConfig; 