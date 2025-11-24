import { AnalyticsConfig } from "@/components/blocks/data-table/types/analytics";

export const nftTokenAnalytics: AnalyticsConfig = [
  // ─────────────────────────────────────────────────────────────
  // Group 1: Token Overview – KPI Grid on Left, Pie Chart on Right
  // ─────────────────────────────────────────────────────────────
  [
    {
      type: "kpi",
      layout: { cols: 3, rows: 2 },
      items: [
        {
          id: "total_tokens",
          title: "Total NFTs",
          metric: "total",
          model: "nftToken",
          icon: "mdi:image-multiple",
        },
        {
          id: "minted_tokens",
          title: "Minted NFTs",
          metric: "minted",
          model: "nftToken",
          aggregation: { field: "isMinted", value: "true" },
          icon: "mdi:check-circle",
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
          id: "listed_tokens",
          title: "Listed NFTs",
          metric: "listed",
          model: "nftToken",
          aggregation: { field: "isListed", value: "true" },
          icon: "mdi:storefront",
        },
        {
          id: "burned_tokens",
          title: "Burned NFTs",
          metric: "BURNED",
          model: "nftToken",
          aggregation: { field: "status", value: "BURNED" },
          icon: "mdi:fire",
        },
      ],
    },
    {
      type: "chart",
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
  // Group 2: Rarity Distribution – KPI Grid on Left, Pie Chart on Right
  // ─────────────────────────────────────────────────────────────
  [
    {
      type: "kpi",
      layout: { cols: 3, rows: 2 },
      items: [
        {
          id: "common_tokens",
          title: "Common",
          metric: "COMMON",
          model: "nftToken",
          aggregation: { field: "rarity", value: "COMMON" },
          icon: "mdi:circle",
        },
        {
          id: "uncommon_tokens",
          title: "Uncommon",
          metric: "UNCOMMON",
          model: "nftToken",
          aggregation: { field: "rarity", value: "UNCOMMON" },
          icon: "mdi:circle-double",
        },
        {
          id: "rare_tokens",
          title: "Rare",
          metric: "RARE",
          model: "nftToken",
          aggregation: { field: "rarity", value: "RARE" },
          icon: "mdi:diamond",
        },
        {
          id: "epic_tokens",
          title: "Epic",
          metric: "EPIC",
          model: "nftToken",
          aggregation: { field: "rarity", value: "EPIC" },
          icon: "mdi:star",
        },
        {
          id: "legendary_tokens",
          title: "Legendary",
          metric: "LEGENDARY",
          model: "nftToken",
          aggregation: { field: "rarity", value: "LEGENDARY" },
          icon: "mdi:crown",
        },
      ],
    },
    {
      type: "chart",
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
  // Group 3: NFTs Over Time – Full-Width Line Chart
  // ─────────────────────────────────────────────────────────────
  {
    type: "chart",
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
]; 