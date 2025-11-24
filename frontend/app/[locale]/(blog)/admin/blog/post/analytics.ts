import { AnalyticsConfig } from "@/components/blocks/data-table/types/analytics";

export const postAnalytics: AnalyticsConfig = [
  // Group 1: Post Overview – KPI Grid on Left, Pie Chart on Right
  [
    {
      type: "kpi",
      layout: { cols: 2, rows: 2 },
      items: [
        {
          id: "total_posts",
          title: "Total Posts",
          metric: "total",
          model: "post",
          icon: "mdi:post-outline",
        },
        {
          id: "published_posts",
          title: "Published",
          metric: "PUBLISHED",
          model: "post",
          aggregation: { field: "status", value: "PUBLISHED" },
          icon: "mdi:check-circle",
        },
        {
          id: "draft_posts",
          title: "Draft",
          metric: "DRAFT",
          model: "post",
          aggregation: { field: "status", value: "DRAFT" },
          icon: "mdi:eye-off",
        },
      ],
    },
    {
      type: "chart",
      items: [
        {
          id: "postStatusDistribution",
          title: "Post Status Distribution",
          type: "pie",
          model: "post",
          metrics: ["PUBLISHED", "DRAFT"],
          config: {
            field: "status",
            status: [
              {
                value: "PUBLISHED",
                label: "Published",
                color: "green",
                icon: "mdi:check-circle",
              },
              {
                value: "DRAFT",
                label: "Draft",
                color: "grey",
                icon: "mdi:eye-off",
              },
            ],
          },
        },
      ],
    },
  ],

  // Group 2: Post Trends Over Time – Full-Width Line Chart
  {
    type: "chart",
    items: [
      {
        id: "postsOverTime",
        title: "Posts Over Time",
        type: "line",
        model: "post",
        metrics: ["total", "PUBLISHED", "DRAFT"],
        timeframes: ["24h", "7d", "30d", "3m", "6m", "y"],
        labels: {
          total: "Total Posts",
          PUBLISHED: "Published",
          DRAFT: "Draft",
        },
      },
    ],
  },
];
