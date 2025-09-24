import { AnalyticsConfig } from "@/components/blocks/data-table/types/analytics";

export const authorAnalytics: AnalyticsConfig = [
  // ─────────────────────────────────────────────────────────────
  // Group 1: Author Overview – KPI Grid (Left) & Status Distribution Pie Chart (Right)
  // ─────────────────────────────────────────────────────────────
  [
    {
      type: "kpi",
      layout: { cols: 3, rows: 1 }, // 3 KPI cards in one row
      items: [
        {
          id: "total_authors",
          title: "Total Authors",
          metric: "total", // COUNT(*) of all author records
          model: "author",
          icon: "mdi:account-multiple",
        },
        {
          id: "approved_authors",
          title: "Approved",
          metric: "APPROVED",
          model: "author",
          aggregation: { field: "status", value: "APPROVED" },
          icon: "mdi:check-circle",
        },
        {
          id: "pending_authors",
          title: "Pending",
          metric: "PENDING",
          model: "author",
          aggregation: { field: "status", value: "PENDING" },
          icon: "mdi:clock-outline",
        },
      ],
    },
    {
      type: "chart",
      items: [
        {
          id: "authorStatusDistribution",
          title: "Status Distribution",
          type: "pie",
          model: "author",
          metrics: ["APPROVED", "PENDING", "REJECTED"],
          config: {
            field: "status",
            status: [
              {
                value: "APPROVED",
                label: "Approved",
                color: "green",
                icon: "mdi:check-circle",
              },
              {
                value: "PENDING",
                label: "Pending",
                color: "orange",
                icon: "mdi:clock-outline",
              },
              {
                value: "REJECTED",
                label: "Rejected",
                color: "red",
                icon: "mdi:close-circle",
              },
            ],
          },
        },
      ],
    },
  ],

  // ─────────────────────────────────────────────────────────────
  // Group 2: Average Posts Per Author (Optional)
  // ─────────────────────────────────────────────────────────────
  {
    type: "kpi",
    layout: { cols: 1, rows: 1 },
    items: [
      {
        id: "avg_posts_per_author",
        title: "Avg Posts/Author",
        metric: "averagePosts", // Custom aggregator: total posts divided by total authors
        model: "author",
        icon: "mdi:post-outline",
      },
    ],
  },

  // ─────────────────────────────────────────────────────────────
  // Group 3: Author Trends Over Time – Full-Width Line Chart
  // ─────────────────────────────────────────────────────────────
  {
    type: "chart",
    items: [
      {
        id: "authorsOverTime",
        title: "Authors Over Time",
        type: "line",
        model: "author",
        metrics: ["total", "APPROVED", "PENDING", "REJECTED"],
        timeframes: ["24h", "7d", "30d", "3m", "6m", "y"],
        labels: {
          total: "Total Authors",
          APPROVED: "Approved",
          PENDING: "Pending",
          REJECTED: "Rejected",
        },
      },
    ],
  },
];
