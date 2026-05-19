import { AnalyticsConfig } from "@/components/blocks/data-table/types/analytics";

export const nftCreatorAnalytics: AnalyticsConfig = [
  // ─────────────────────────────────────────────────────────────
  // Group 1: Creator Overview – KPI Grid + Pie Chart
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
          aggregation: { field: "isVerified", value: "true" },
          icon: "mdi:shield-check",
        },
        {
          id: "unverified_creators",
          title: "Unverified Creators",
          metric: "unverified",
          model: "nftCreator",
          aggregation: { field: "isVerified", value: "false" },
          icon: "mdi:shield-off",
        },
        {
          id: "public_profiles",
          title: "Public Profiles",
          metric: "public",
          model: "nftCreator",
          aggregation: { field: "profilePublic", value: "true" },
          icon: "mdi:eye",
        },
        {
          id: "private_profiles",
          title: "Private Profiles",
          metric: "private",
          model: "nftCreator",
          aggregation: { field: "profilePublic", value: "false" },
          icon: "mdi:eye-off",
        },
        {
          id: "creators_with_sales",
          title: "Creators with Sales",
          metric: "withSales",
          model: "nftCreator",
          aggregation: { field: "totalSales", operation: ">", value: 0 },
          icon: "mdi:cash-check",
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
          id: "verificationDistribution",
          title: "Verification Status Distribution",
          type: "pie",
          model: "nftCreator",
          metrics: ["verified", "unverified"],
          config: {
            field: "isVerified",
            status: [
              {
                value: "true",
                label: "Verified",
                color: "green",
                icon: "mdi:shield-check",
              },
              {
                value: "false",
                label: "Unverified",
                color: "red",
                icon: "mdi:shield-off",
              },
            ],
          },
        },
      ],
    },
  ],

  // ─────────────────────────────────────────────────────────────
  // Group 2: Verification Tiers – KPI Grid + Pie Chart
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
          id: "bronze_creators",
          title: "Bronze Tier",
          metric: "BRONZE",
          model: "nftCreator",
          aggregation: { field: "verificationTier", value: "BRONZE" },
          icon: "mdi:medal",
        },
        {
          id: "silver_creators",
          title: "Silver Tier",
          metric: "SILVER",
          model: "nftCreator",
          aggregation: { field: "verificationTier", value: "SILVER" },
          icon: "mdi:medal",
        },
        {
          id: "gold_creators",
          title: "Gold Tier",
          metric: "GOLD",
          model: "nftCreator",
          aggregation: { field: "verificationTier", value: "GOLD" },
          icon: "mdi:medal",
        },
        {
          id: "platinum_creators",
          title: "Platinum Tier",
          metric: "PLATINUM",
          model: "nftCreator",
          aggregation: { field: "verificationTier", value: "PLATINUM" },
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
          id: "tierDistribution",
          title: "Verification Tier Distribution",
          type: "pie",
          model: "nftCreator",
          metrics: ["BRONZE", "SILVER", "GOLD", "PLATINUM"],
          config: {
            field: "verificationTier",
            status: [
              {
                value: "BRONZE",
                label: "Bronze",
                color: "amber",
                icon: "mdi:medal",
              },
              {
                value: "SILVER",
                label: "Silver",
                color: "gray",
                icon: "mdi:medal",
              },
              {
                value: "GOLD",
                label: "Gold",
                color: "yellow",
                icon: "mdi:medal",
              },
              {
                value: "PLATINUM",
                label: "Platinum",
                color: "blue",
                icon: "mdi:crown",
              },
            ],
          },
        },
      ],
    },
  ],

  // ─────────────────────────────────────────────────────────────
  // Group 3: Profile Privacy – KPI Grid + Pie Chart
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
          id: "profile_public_true",
          title: "Public Profiles",
          metric: "public",
          model: "nftCreator",
          aggregation: { field: "profilePublic", value: "true" },
          icon: "mdi:eye",
        },
        {
          id: "profile_public_false",
          title: "Private Profiles",
          metric: "private",
          model: "nftCreator",
          aggregation: { field: "profilePublic", value: "false" },
          icon: "mdi:eye-off",
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
          id: "profilePrivacyDistribution",
          title: "Profile Privacy Distribution",
          type: "pie",
          model: "nftCreator",
          metrics: ["public", "private"],
          config: {
            field: "profilePublic",
            status: [
              {
                value: "true",
                label: "Public",
                color: "green",
                icon: "mdi:eye",
              },
              {
                value: "false",
                label: "Private",
                color: "orange",
                icon: "mdi:eye-off",
              },
            ],
          },
        },
      ],
    },
  ],

  // ─────────────────────────────────────────────────────────────
  // Group 4: Sales & Volume Metrics – KPI Grid
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
        id: "total_sales",
        title: "Total Sales (All Creators)",
        metric: "sum",
        model: "nftCreator",
        aggregation: { field: "totalSales", operation: "sum" },
        icon: "mdi:cart-check",
      },
      {
        id: "avg_sales_per_creator",
        title: "Avg Sales/Creator",
        metric: "avg",
        model: "nftCreator",
        aggregation: { field: "totalSales", operation: "avg" },
        icon: "mdi:calculator",
      },
      {
        id: "total_volume",
        title: "Total Volume (All Creators)",
        metric: "sum",
        model: "nftCreator",
        aggregation: { field: "totalVolume", operation: "sum" },
        icon: "mdi:currency-usd",
      },
      {
        id: "avg_volume_per_creator",
        title: "Avg Volume/Creator",
        metric: "avg",
        model: "nftCreator",
        aggregation: { field: "totalVolume", operation: "avg" },
        icon: "mdi:cash",
      },
      {
        id: "total_items",
        title: "Total Items (All Creators)",
        metric: "sum",
        model: "nftCreator",
        aggregation: { field: "totalItems", operation: "sum" },
        icon: "mdi:package-variant",
      },
      {
        id: "avg_items_per_creator",
        title: "Avg Items/Creator",
        metric: "avg",
        model: "nftCreator",
        aggregation: { field: "totalItems", operation: "avg" },
        icon: "mdi:package-variant-closed",
      },
    ],
  },

  // ─────────────────────────────────────────────────────────────
  // Group 5: Floor Price Metrics – KPI Grid
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
        id: "avg_floor_price",
        title: "Avg Floor Price",
        metric: "avg",
        model: "nftCreator",
        aggregation: { field: "floorPrice", operation: "avg" },
        icon: "mdi:trending-up",
      },
      {
        id: "highest_floor_price",
        title: "Highest Floor Price",
        metric: "max",
        model: "nftCreator",
        aggregation: { field: "floorPrice", operation: "max" },
        icon: "mdi:arrow-up-bold",
      },
      {
        id: "lowest_floor_price",
        title: "Lowest Floor Price",
        metric: "min",
        model: "nftCreator",
        aggregation: { field: "floorPrice", operation: "min" },
        icon: "mdi:arrow-down-bold",
      },
    ],
  },

  // ─────────────────────────────────────────────────────────────
  // Group 6: Creator Growth Over Time – Full-Width Line Chart
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

  // ─────────────────────────────────────────────────────────────
  // Group 7: Volume & Sales Over Time – Full-Width Line Chart
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
        id: "volumeAndSalesOverTime",
        title: "Volume & Sales Over Time",
        type: "line",
        model: "nftCreator",
        metrics: ["total_volume", "total_sales", "avg_floor_price"],
        timeframes: ["24h", "7d", "30d", "3m", "6m", "y"],
        labels: {
          total_volume: "Total Volume",
          total_sales: "Total Sales",
          avg_floor_price: "Avg Floor Price",
        },
      },
    ],
  },
] satisfies AnalyticsConfig;
