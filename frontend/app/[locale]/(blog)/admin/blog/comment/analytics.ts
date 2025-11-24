import { AnalyticsConfig } from "@/components/blocks/data-table/types/analytics";

export const commentAnalytics: AnalyticsConfig = [
  // ─────────────────────────────────────────────────────────────
  // Row 1: KPI Block (full-width) for Total Comments
  // ─────────────────────────────────────────────────────────────
  {
    type: "kpi",
    layout: { cols: 1, rows: 1 },
    items: [
      {
        id: "total_comments",
        title: "Total Comments",
        metric: "total", // COUNT(*)
        model: "comment",
        icon: "mdi:comment",
      },
    ],
  },

  // ─────────────────────────────────────────────────────────────
  // Row 2: Full-width Line Chart for Comments Over Time
  // ─────────────────────────────────────────────────────────────
  {
    type: "chart",
    items: [
      {
        id: "commentsOverTime",
        title: "Comments Over Time",
        type: "line",
        model: "comment",
        metrics: ["total"],
        timeframes: ["24h", "7d", "30d", "3m", "6m", "y"],
        labels: {
          total: "Comments",
        },
      },
    ],
  },

  // ─────────────────────────────────────────────────────────────
  // Row 3: Full-width Bar Chart for Hourly Distribution (when timeframe is 24h)
  // ─────────────────────────────────────────────────────────────
  {
    type: "chart",
    items: [
      {
        id: "commentsByHour",
        title: "Comments by Hour",
        type: "bar",
        model: "comment",
        metrics: ["total"],
        // This chart is most relevant for the 24h timeframe
        timeframes: ["24h"],
        labels: {
          total: "Comments",
        },
      },
    ],
  },
];
