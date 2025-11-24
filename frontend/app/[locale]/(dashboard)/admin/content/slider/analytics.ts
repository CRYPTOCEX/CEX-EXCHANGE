import { AnalyticsConfig } from "@/components/blocks/data-table/types/analytics";

export const sliderAnalytics: AnalyticsConfig = [
  // Group 1: Slider Overview – KPI Grid on Left, Pie Chart on Right
  [
    {
      type: "kpi",
      layout: { cols: 3, rows: 1 },
      items: [
        {
          id: "total_sliders",
          title: "Total Sliders",
          metric: "total", // COUNT(*) of all slider records
          model: "slider",
          icon: "mdi:image-multiple",
        },
        {
          id: "active_sliders",
          title: "Status",
          metric: "active",
          model: "slider",
          aggregation: { field: "status", value: "true" },
          icon: "mdi:check-circle",
        },
        {
          id: "inactive_sliders",
          title: "Inactive",
          metric: "inactive",
          model: "slider",
          aggregation: { field: "status", value: "false" },
          icon: "mdi:close-circle",
        },
      ],
    },
    {
      type: "chart",
      items: [
        {
          id: "sliderStatusDistribution",
          title: "Status Distribution",
          type: "pie",
          model: "slider",
          metrics: ["active", "inactive"],
          config: {
            field: "status",
            status: [
              {
                value: "true",
                label: "Active",
                color: "green",
                icon: "mdi:check-circle",
              },
              {
                value: "false",
                label: "Inactive",
                color: "red",
                icon: "mdi:close-circle",
              },
            ],
          },
        },
      ],
    },
  ],

  // Group 2: Sliders Over Time – Full-Width Line Chart
  {
    type: "chart",
    items: [
      {
        id: "slidersOverTime",
        title: "Sliders Over Time",
        type: "line",
        model: "slider",
        metrics: ["total"],
        timeframes: ["24h", "7d", "30d", "3m", "6m", "y"],
        labels: {
          total: "Total Sliders",
        },
      },
    ],
  },
];
