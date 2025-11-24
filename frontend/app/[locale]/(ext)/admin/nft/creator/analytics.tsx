// Analytics configuration for NFT Creators
export const nftCreatorAnalytics = [
  // ─────────────────────────────────────────────────────────────
  // Group 1: Key Performance Indicators – 3x2 Grid
  // ─────────────────────────────────────────────────────────────
  [
    {
      type: "kpi",
      layout: { cols: 3, rows: 2 },
      items: [
        {
          id: "total_creators",
          title: "Total Creators",
          metric: "total",
          model: "nftCreator",
          icon: "mdi:account-multiple",
        },
        {
          id: "verified_creators",
          title: "Verified Creators",
          metric: "verified",
          model: "nftCreator",
          aggregation: { field: "isVerified", value: true },
          icon: "mdi:shield-check",
        },
        {
          id: "public_profiles",
          title: "Public Profiles",
          metric: "public",
          model: "nftCreator",
          aggregation: { field: "profilePublic", value: true },
          icon: "mdi:eye",
        },
        {
          id: "creators_with_sales",
          title: "Creators with Sales",
          metric: "withSales",
          model: "nftCreator",
          aggregation: { field: "totalSales", operator: ">", value: 0 },
          icon: "mdi:currency-usd",
        },
        {
          id: "total_volume",
          title: "Total Volume",
          metric: "totalVolume",
          model: "nftCreator",
          aggregation: { field: "totalVolume", operation: "sum" },
          icon: "mdi:chart-line",
        },
        {
          id: "avg_floor_price",
          title: "Avg Floor Price",
          metric: "avgFloorPrice",
          model: "nftCreator",
          aggregation: { field: "floorPrice", operation: "avg" },
          icon: "mdi:trending-up",
        },
      ],
    },
  ],

  // ─────────────────────────────────────────────────────────────
  // Group 2: Distribution Charts – 2x1 Grid  
  // ─────────────────────────────────────────────────────────────
  [
    {
      type: "chart",
      items: [
        {
          id: "verificationDistribution",
          title: "Verification Status Distribution",
          type: "pie",
          model: "nftCreator",
          metrics: ["verified", "unverified"],
          config: {
            field: "isVerified",
            status: [
              {
                value: true,
                label: "Verified",
                color: "green",
                icon: "mdi:shield-check",
              },
              {
                value: false,
                label: "Unverified",
                color: "red",
                icon: "mdi:shield-off",
              },
            ],
          },
        },
        {
          id: "tierDistribution",
          title: "Verification Tier Distribution",
          type: "doughnut",
          model: "nftCreator",
          metrics: ["BRONZE", "SILVER", "GOLD", "PLATINUM"],
          config: {
            field: "verificationTier",
            status: [
              {
                value: "BRONZE",
                label: "Bronze",
                color: "#cd7f32",
                icon: "mdi:medal",
              },
              {
                value: "SILVER", 
                label: "Silver",
                color: "#c0c0c0",
                icon: "mdi:medal",
              },
              {
                value: "GOLD",
                label: "Gold",
                color: "#ffd700",
                icon: "mdi:medal",
              },
              {
                value: "PLATINUM",
                label: "Platinum",
                color: "#e5e4e2",
                icon: "mdi:crown",
              },
            ],
          },
        },
      ],
    },
  ],

  // ─────────────────────────────────────────────────────────────
  // Group 3: Performance Analysis – 2x1 Grid
  // ─────────────────────────────────────────────────────────────
  [
    {
      type: "kpi",
      layout: { cols: 3, rows: 1 },
      items: [
        {
          id: "avg_sales_per_creator",
          title: "Avg Sales/Creator",
          metric: "avgSales",
          model: "nftCreator",
          aggregation: { field: "totalSales", operation: "avg" },
          icon: "mdi:calculator",
        },
        {
          id: "avg_items_per_creator",
          title: "Avg NFTs/Creator",
          metric: "avgItems",
          model: "nftCreator",
          aggregation: { field: "totalItems", operation: "avg" },
          icon: "mdi:package-variant",
        },
        {
          id: "avg_volume_per_creator",
          title: "Avg Volume/Creator",
          metric: "avgVolumePerCreator",
          model: "nftCreator",
          aggregation: { field: "totalVolume", operation: "avg" },
          icon: "mdi:trending-up",
        },
      ],
    },
    {
      type: "chart",
      items: [
        {
          id: "topCreatorsByVolume",
          title: "Top Creators by Volume",
          type: "bar",
          model: "nftCreator",
          metrics: ["topVolume"],
          config: {
            field: "totalVolume",
            orderBy: "totalVolume",
            orderDirection: "desc",
            limit: 10,
          },
        },
      ],
    },
  ],

  // ─────────────────────────────────────────────────────────────
  // Group 4: Creator Growth Over Time – Full-Width Line Chart
  // ─────────────────────────────────────────────────────────────
  [
    {
      type: "chart",
      items: [
        {
          id: "creatorsOverTime",
          title: "Creator Growth Over Time",
          type: "line",
          model: "nftCreator",
          metrics: ["total", "verified", "public"],
          timeframes: ["24h", "7d", "30d", "3m", "6m", "y"],
          labels: {
            total: "Total Creators",
            verified: "Verified Creators", 
            public: "Public Profiles",
          },
        },
      ],
    },
  ],
];