export const nftCategoryAnalytics = [
  // ─────────────────────────────────────────────────────────────
  // Group 1: Category Overview – KPI Grid on Left, Pie Chart on Right
  // ─────────────────────────────────────────────────────────────
  [
    {
      type: "kpi",
      layout: { cols: 3, rows: 2 },
      items: [
        {
          id: "total_categories",
          title: "Total Categories",
          metric: "total",
          model: "nftCategory",
          icon: "mdi:tag-multiple",
        },
        {
          id: "active_categories",
          title: "Active Categories",
          metric: "active",
          model: "nftCategory",
          aggregation: { field: "status", value: true },
          icon: "mdi:check-circle",
        },
        {
          id: "inactive_categories",
          title: "Inactive Categories",
          metric: "inactive",
          model: "nftCategory",
          aggregation: { field: "status", value: false },
          icon: "mdi:minus-circle",
        },
      ],
    },
    {
      type: "chart",
      items: [
        {
          id: "categoryStatusDistribution",
          title: "Category Status Distribution",
          type: "pie",
          model: "nftCategory",
          metrics: ["active", "inactive"],
          config: {
            field: "status",
            status: [
              {
                value: true,
                label: "Active",
                color: "green",
                icon: "mdi:check-circle",
              },
              {
                value: false,
                label: "Inactive",
                color: "gray",
                icon: "mdi:minus-circle",
              },
            ],
          },
        },
      ],
    },
  ],

  // ─────────────────────────────────────────────────────────────
  // Group 2: Categories Over Time – Full-Width Line Chart
  // ─────────────────────────────────────────────────────────────
  {
    type: "chart",
    items: [
      {
        id: "categoriesOverTime",
        title: "Categories Over Time",
        type: "line",
        model: "nftCategory",
        metrics: ["total", "active", "inactive"],
        timeframes: ["24h", "7d", "30d", "3m", "6m", "y"],
        labels: {
          total: "Total Categories",
          active: "Active Categories",
          inactive: "Inactive Categories",
        },
      },
    ],
  },
];