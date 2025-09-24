import { AnalyticsConfig } from "@/components/blocks/data-table/types/analytics";

export const aiInvestmentAnalytics: AnalyticsConfig = [
  // ─────────────────────────────────────────────────────────────
  // Group 1: Investment Status Overview – KPI Grid & Pie Chart
  // ─────────────────────────────────────────────────────────────
  [
    {
      type: "kpi",
      layout: { cols: 4, rows: 1 },
      items: [
        {
          id: "total_ai_investments",
          title: "Total Investments",
          metric: "total", // COUNT(*)
          model: "aiInvestment",
          icon: "mdi:chart-line",
        },
        {
          id: "active_investments",
          title: "Status",
          metric: "ACTIVE",
          model: "aiInvestment",
          aggregation: { field: "status", value: "ACTIVE" },
          icon: "mdi:play-circle",
        },
        {
          id: "completed_investments",
          title: "Completed",
          metric: "COMPLETED",
          model: "aiInvestment",
          aggregation: { field: "status", value: "COMPLETED" },
          icon: "mdi:check-circle",
        },
        {
          id: "cancelled_investments",
          title: "Cancelled",
          metric: "CANCELLED",
          model: "aiInvestment",
          aggregation: { field: "status", value: "CANCELLED" },
          icon: "mdi:cancel",
        },
        {
          id: "rejected_investments",
          title: "Rejected",
          metric: "REJECTED",
          model: "aiInvestment",
          aggregation: { field: "status", value: "REJECTED" },
          icon: "mdi:thumb-down",
        },
      ],
    },
    {
      type: "chart",
      items: [
        {
          id: "aiInvestmentStatusDistribution",
          title: "Status Distribution",
          type: "pie",
          model: "aiInvestment",
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
                color: "red",
                icon: "mdi:cancel",
              },
              {
                value: "REJECTED",
                label: "Rejected",
                color: "purple",
                icon: "mdi:thumb-down",
              },
            ],
          },
        },
      ],
    },
  ],

  // ─────────────────────────────────────────────────────────────
  // Group 2: Investment Result Overview – KPI Grid & Pie Chart
  // ─────────────────────────────────────────────────────────────
  [
    {
      type: "kpi",
      layout: { cols: 3, rows: 1 },
      items: [
        {
          id: "winning_investments",
          title: "Winning",
          metric: "WIN",
          model: "aiInvestment",
          aggregation: { field: "result", value: "WIN" },
          icon: "mdi:trophy",
        },
        {
          id: "losing_investments",
          title: "Losing",
          metric: "LOSS",
          model: "aiInvestment",
          aggregation: { field: "result", value: "LOSS" },
          icon: "mdi:thumb-down",
        },
        {
          id: "draw_investments",
          title: "Draw",
          metric: "DRAW",
          model: "aiInvestment",
          aggregation: { field: "result", value: "DRAW" },
          icon: "mdi:gesture-tap",
        },
      ],
    },
    {
      type: "chart",
      items: [
        {
          id: "aiInvestmentResultDistribution",
          title: "Result Distribution",
          type: "pie",
          model: "aiInvestment",
          metrics: ["WIN", "LOSS", "DRAW"],
          config: {
            field: "result",
            status: [
              {
                value: "WIN",
                label: "Win",
                color: "green",
                icon: "mdi:trophy",
              },
              {
                value: "LOSS",
                label: "Loss",
                color: "red",
                icon: "mdi:thumb-down",
              },
              {
                value: "DRAW",
                label: "Draw",
                color: "grey",
                icon: "mdi:gesture-tap",
              },
            ],
          },
        },
      ],
    },
  ],

  // ─────────────────────────────────────────────────────────────
  // Group 3: Investment Trends Over Time – Full-Width Line Chart
  // ─────────────────────────────────────────────────────────────
  {
    type: "chart",
    items: [
      {
        id: "aiInvestmentsOverTime",
        title: "Investments Over Time",
        type: "line",
        model: "aiInvestment",
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
