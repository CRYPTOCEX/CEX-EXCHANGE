import { AnalyticsConfig } from "@/components/blocks/data-table/types/analytics";

export const nftTokenAnalytics: AnalyticsConfig = [
  // ─────────────────────────────────────────────────────────────
  // Group 1: Token Status Overview – KPI Grid + Pie Chart
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
          id: "total_tokens",
          title: "Total NFTs",
          metric: "total",
          model: "nftToken",
          icon: "mdi:image-multiple",
        },
        {
          id: "draft_tokens",
          title: "Draft NFTs",
          metric: "DRAFT",
          model: "nftToken",
          aggregation: { field: "status", value: "DRAFT" },
          icon: "mdi:file-document-outline",
        },
        {
          id: "minted_tokens",
          title: "Minted NFTs",
          metric: "MINTED",
          model: "nftToken",
          aggregation: { field: "status", value: "MINTED" },
          icon: "mdi:check-circle",
        },
        {
          id: "burned_tokens",
          title: "Burned NFTs",
          metric: "BURNED",
          model: "nftToken",
          aggregation: { field: "status", value: "BURNED" },
          icon: "mdi:fire",
        },
        {
          id: "listed_tokens",
          title: "Listed NFTs",
          metric: "listed",
          model: "nftToken",
          aggregation: { field: "isListed", value: "true" },
          icon: "mdi:storefront",
        },
        {
          id: "unlisted_tokens",
          title: "Unlisted NFTs",
          metric: "unlisted",
          model: "nftToken",
          aggregation: { field: "isListed", value: "false" },
          icon: "mdi:storefront-outline",
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
          id: "tokenStatusDistribution",
          title: "Token Status Distribution",
          type: "pie",
          model: "nftToken",
          metrics: ["DRAFT", "MINTED", "BURNED"],
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
                value: "MINTED",
                label: "Minted",
                color: "green",
                icon: "mdi:check-circle",
              },
              {
                value: "BURNED",
                label: "Burned",
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
  // Group 2: Rarity Distribution – KPI Grid + Pie Chart
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
          id: "common_tokens",
          title: "Common Tokens",
          metric: "COMMON",
          model: "nftToken",
          aggregation: { field: "rarity", value: "COMMON" },
          icon: "mdi:circle",
        },
        {
          id: "uncommon_tokens",
          title: "Uncommon Tokens",
          metric: "UNCOMMON",
          model: "nftToken",
          aggregation: { field: "rarity", value: "UNCOMMON" },
          icon: "mdi:circle-double",
        },
        {
          id: "rare_tokens",
          title: "Rare Tokens",
          metric: "RARE",
          model: "nftToken",
          aggregation: { field: "rarity", value: "RARE" },
          icon: "mdi:diamond",
        },
        {
          id: "epic_tokens",
          title: "Epic Tokens",
          metric: "EPIC",
          model: "nftToken",
          aggregation: { field: "rarity", value: "EPIC" },
          icon: "mdi:star",
        },
        {
          id: "legendary_tokens",
          title: "Legendary Tokens",
          metric: "LEGENDARY",
          model: "nftToken",
          aggregation: { field: "rarity", value: "LEGENDARY" },
          icon: "mdi:crown",
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
          id: "tokenRarityDistribution",
          title: "Rarity Distribution",
          type: "pie",
          model: "nftToken",
          metrics: ["COMMON", "UNCOMMON", "RARE", "EPIC", "LEGENDARY"],
          config: {
            field: "rarity",
            status: [
              {
                value: "COMMON",
                label: "Common",
                color: "gray",
                icon: "mdi:circle",
              },
              {
                value: "UNCOMMON",
                label: "Uncommon",
                color: "blue",
                icon: "mdi:circle-double",
              },
              {
                value: "RARE",
                label: "Rare",
                color: "purple",
                icon: "mdi:diamond",
              },
              {
                value: "EPIC",
                label: "Epic",
                color: "orange",
                icon: "mdi:star",
              },
              {
                value: "LEGENDARY",
                label: "Legendary",
                color: "yellow",
                icon: "mdi:crown",
              },
            ],
          },
        },
      ],
    },
  ],

  // ─────────────────────────────────────────────────────────────
  // Group 3: Listing Status – KPI Grid + Pie Chart
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
          id: "is_listed_true",
          title: "Listed Tokens",
          metric: "listed",
          model: "nftToken",
          aggregation: { field: "isListed", value: "true" },
          icon: "mdi:storefront",
        },
        {
          id: "is_listed_false",
          title: "Not Listed Tokens",
          metric: "unlisted",
          model: "nftToken",
          aggregation: { field: "isListed", value: "false" },
          icon: "mdi:storefront-outline",
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
          id: "tokenListingDistribution",
          title: "Listing Status Distribution",
          type: "pie",
          model: "nftToken",
          metrics: ["listed", "unlisted"],
          config: {
            field: "isListed",
            status: [
              {
                value: "true",
                label: "Listed",
                color: "green",
                icon: "mdi:storefront",
              },
              {
                value: "false",
                label: "Not Listed",
                color: "gray",
                icon: "mdi:storefront-outline",
              },
            ],
          },
        },
      ],
    },
  ],

  // ─────────────────────────────────────────────────────────────
  // Group 4: Mint Status – KPI Grid + Pie Chart
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
          id: "is_minted_true",
          title: "Minted Tokens",
          metric: "minted",
          model: "nftToken",
          aggregation: { field: "isMinted", value: "true" },
          icon: "mdi:check-circle",
        },
        {
          id: "is_minted_false",
          title: "Not Minted Tokens",
          metric: "not_minted",
          model: "nftToken",
          aggregation: { field: "isMinted", value: "false" },
          icon: "mdi:close-circle",
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
          id: "tokenMintingDistribution",
          title: "Minting Status Distribution",
          type: "pie",
          model: "nftToken",
          metrics: ["minted", "not_minted"],
          config: {
            field: "isMinted",
            status: [
              {
                value: "true",
                label: "Minted",
                color: "green",
                icon: "mdi:check-circle",
              },
              {
                value: "false",
                label: "Not Minted",
                color: "orange",
                icon: "mdi:close-circle",
              },
            ],
          },
        },
      ],
    },
  ],

  // ─────────────────────────────────────────────────────────────
  // Group 5: Engagement Metrics – KPI Grid
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
        id: "total_views",
        title: "Total Views",
        metric: "sum",
        model: "nftToken",
        aggregation: { field: "views", operation: "sum" },
        icon: "mdi:eye",
      },
      {
        id: "total_likes",
        title: "Total Likes",
        metric: "sum",
        model: "nftToken",
        aggregation: { field: "likes", operation: "sum" },
        icon: "mdi:heart",
      },
      {
        id: "avg_rarity_score",
        title: "Avg Rarity Score",
        metric: "avg",
        model: "nftToken",
        aggregation: { field: "rarityScore", operation: "avg" },
        icon: "mdi:star-circle",
      },
    ],
  },

  // ─────────────────────────────────────────────────────────────
  // Group 6: NFTs Over Time – Full-Width Line Chart
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
        id: "tokensOverTime",
        title: "NFTs Over Time",
        type: "line",
        model: "nftToken",
        metrics: ["total", "minted", "listed"],
        timeframes: ["24h", "7d", "30d", "3m", "6m", "y"],
        labels: {
          total: "Total NFTs",
          minted: "Minted NFTs",
          listed: "Listed NFTs",
        },
      },
    ],
  },
] satisfies AnalyticsConfig; 