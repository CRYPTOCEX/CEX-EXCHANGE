import { AnalyticsConfig } from "@/components/blocks/data-table/types/analytics";

export const tagAnalytics: AnalyticsConfig = [
  // Group 1: Tag Overview – KPI Card for Total Tags
  {
    type: "kpi",
    layout: { cols: 1, rows: 1 },
    items: [
      {
        id: "total_tags",
        title: "Total Tags",
        metric: "total", // COUNT(*) of all tag records
        model: "tag",
        icon: "mdi:tag",
      },
    ],
  },

  // Group 2: Tags Over Time – Full-Width Line Chart
  {
    type: "chart",
    items: [
      {
        id: "tagsOverTime",
        title: "Tags Over Time",
        type: "line",
        model: "tag",
        metrics: ["total"],
        timeframes: ["24h", "7d", "30d", "3m", "6m", "y"],
        labels: {
          total: "New Tags",
        },
      },
    ],
  },
];
