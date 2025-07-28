// analytics.ts
export const analytics = [
  [
    {
      type: "kpi",
      layout: { cols: 2, rows: 2 },
      items: [
        {
          id: "total_pools",
          title: "Total Pools",
          metric: "total",
          model: "stakingPool",
          icon: "Database",
        },
        {
          id: "active_pools",
          title: "Active Pools",
          metric: "active",
          model: "stakingPool",
          aggregation: { field: "status", value: "ACTIVE" },
          icon: "CheckCircle",
        },
        {
          id: "inactive_pools",
          title: "Inactive Pools",
          metric: "inactive",
          model: "stakingPool",
          aggregation: { field: "status", value: "INACTIVE" },
          icon: "XCircle",
        },
        {
          id: "coming_soon_pools",
          title: "Coming Soon",
          metric: "comingSoon",
          model: "stakingPool",
          aggregation: { field: "status", value: "COMING_SOON" },
          icon: "Clock",
        },
      ],
    },
    {
      type: "chart",
      items: [
        {
          id: "poolStatusDistribution",
          title: "Pool Status Distribution",
          type: "pie",
          model: "stakingPool",
          metrics: ["active", "inactive", "comingSoon"],
          config: {
            field: "status",
            status: [
              {
                value: "ACTIVE",
                label: "Active",
                color: "green",
                icon: "mdi:check",
              },
              {
                value: "INACTIVE",
                label: "Inactive",
                color: "gray",
                icon: "mdi:close",
              },
              {
                value: "COMING_SOON",
                label: "Coming Soon",
                color: "blue",
                icon: "mdi:clock",
              },
            ],
          },
        },
      ],
    },
  ],
  {
    type: "chart",
    items: [
      {
        id: "poolsOverTime",
        title: "Pools Created Over Time",
        type: "line",
        model: "stakingPool",
        metrics: ["total"],
        timeframes: ["7d", "30d", "3m", "6m", "y"],
        labels: { total: "Total Pools" },
      },
    ],
  },
];
