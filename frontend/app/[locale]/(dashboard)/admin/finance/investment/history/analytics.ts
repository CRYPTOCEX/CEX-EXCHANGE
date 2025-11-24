import { AnalyticsConfig } from "@/components/blocks/data-table/types/analytics";

export const investmentAnalytics: AnalyticsConfig = [
  // 1) Row of KPIs for statuses
  {
    type: "kpi",
    layout: { cols: 4, rows: 1 },
    items: [
      {
        id: "total_investments",
        title: "Total Investments",
        metric: "total",
        model: "investment",
        icon: "mdi:finance",
      },
      {
        id: "active_investments",
        title: "Status",
        metric: "ACTIVE",
        model: "investment",
        aggregation: { field: "status", value: "ACTIVE" },
        icon: "mdi:play-circle",
      },
      {
        id: "completed_investments",
        title: "Completed",
        metric: "COMPLETED",
        model: "investment",
        aggregation: { field: "status", value: "COMPLETED" },
        icon: "mdi:check-circle",
      },
      {
        id: "cancelled_investments",
        title: "Cancelled",
        metric: "CANCELLED",
        model: "investment",
        aggregation: { field: "status", value: "CANCELLED" },
        icon: "mdi:cancel",
      },
    ],
  },

  // 2) Row of KPIs for results (WIN, LOSS, DRAW)
  {
    type: "kpi",
    layout: { cols: 3, rows: 1 },
    items: [
      {
        id: "winning_investments",
        title: "Winning",
        metric: "WIN",
        model: "investment",
        aggregation: { field: "result", value: "WIN" },
        icon: "mdi:trophy",
      },
      {
        id: "losing_investments",
        title: "Losing",
        metric: "LOSS",
        model: "investment",
        aggregation: { field: "result", value: "LOSS" },
        icon: "mdi:thumb-down",
      },
      {
        id: "draw_investments",
        title: "Draw",
        metric: "DRAW",
        model: "investment",
        aggregation: { field: "result", value: "DRAW" },
        icon: "mdi:gesture-tap",
      },
    ],
  },

  // 3) Pie chart for status distribution
  {
    type: "chart",
    // layout is optional for charts since you already do "width='full'"
    items: [
      {
        id: "investmentStatusDistribution",
        title: "Investment Status Distribution",
        type: "pie",
        model: "investment",
        metrics: ["ACTIVE", "COMPLETED", "CANCELLED", "REJECTED"],
        config: {
          field: "status",
          status: [
            {
              value: "ACTIVE",
              label: "Active",
              color: "blue",
              icon: "mdi:play-circle",
            },
            {
              value: "COMPLETED",
              label: "Completed",
              color: "green",
              icon: "mdi:check-circle",
            },
            {
              value: "CANCELLED",
              label: "Cancelled",
              color: "amber",
              icon: "mdi:cancel",
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

  // 4) Bar chart for result distribution
  {
    type: "chart",
    items: [
      {
        id: "investmentResultDistribution",
        title: "Investment Result Distribution",
        type: "bar",
        model: "investment",
        metrics: ["WIN", "LOSS", "DRAW"],
        config: {
          field: "result",
          status: [
            { value: "WIN", label: "Win", color: "green", icon: "mdi:trophy" },
            {
              value: "LOSS",
              label: "Loss",
              color: "red",
              icon: "mdi:thumb-down",
            },
            {
              value: "DRAW",
              label: "Draw",
              color: "gray",
              icon: "mdi:gesture-tap",
            },
          ],
        },
      },
    ],
  },

  // 5) Line chart for time-series
  {
    type: "chart",
    items: [
      {
        id: "investmentsOverTime",
        title: "Investments Over Time",
        type: "line",
        model: "investment",
        metrics: ["total", "ACTIVE", "COMPLETED", "CANCELLED", "REJECTED"],
        timeframes: ["24h", "7d", "30d", "3m", "6m", "y"],
        labels: {
          total: "Total",
          ACTIVE: "Active",
          COMPLETED: "Completed",
          CANCELLED: "Cancelled",
          REJECTED: "Rejected",
        },
      },
    ],
  },
];
