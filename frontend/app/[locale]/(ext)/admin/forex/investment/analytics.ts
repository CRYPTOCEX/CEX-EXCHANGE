import { AnalyticsConfig } from "@/components/blocks/data-table/types/analytics";

export const forexInvestmentAnalytics: AnalyticsConfig = [
  // ─────────────────────────────────────────────────────────────
  // Group 1: Status Overview – KPI Grid on Left, Pie Chart on Right
  // ─────────────────────────────────────────────────────────────
  [
    {
      type: "kpi",
      layout: { cols: 3, rows: 2 },
      items: [
        {
          id: "total_forex_investments",
          title: "Total Investments",
          metric: "total", // COUNT(*)
          model: "forexInvestment",
          icon: "mdi:chart-line",
        },
        {
          id: "active_investments",
          title: "Status",
          metric: "ACTIVE",
          model: "forexInvestment",
          aggregation: { field: "status", value: "ACTIVE" },
          icon: "mdi:play-circle",
        },
        {
          id: "completed_investments",
          title: "Completed",
          metric: "COMPLETED",
          model: "forexInvestment",
          aggregation: { field: "status", value: "COMPLETED" },
          icon: "mdi:check-circle",
        },
        {
          id: "cancelled_investments",
          title: "Cancelled",
          metric: "CANCELLED",
          model: "forexInvestment",
          aggregation: { field: "status", value: "CANCELLED" },
          icon: "mdi:cancel",
        },
        {
          id: "rejected_investments",
          title: "Rejected",
          metric: "REJECTED",
          model: "forexInvestment",
          aggregation: { field: "status", value: "REJECTED" },
          icon: "mdi:thumb-down",
        },
        // If needed, you can add a sixth KPI (e.g. Total Profit) if aggregator logic is updated.
      ],
    },
    {
      type: "chart",
      items: [
        {
          id: "forexInvestmentStatusDistribution",
          title: "Status Distribution",
          type: "pie",
          model: "forexInvestment",
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
  // Group 2: Result Overview – KPI Grid on Left, Pie Chart on Right
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
          model: "forexInvestment",
          aggregation: { field: "result", value: "WIN" },
          icon: "mdi:trophy",
        },
        {
          id: "losing_investments",
          title: "Losing",
          metric: "LOSS",
          model: "forexInvestment",
          aggregation: { field: "result", value: "LOSS" },
          icon: "mdi:thumb-down",
        },
        {
          id: "draw_investments",
          title: "Draw",
          metric: "DRAW",
          model: "forexInvestment",
          aggregation: { field: "result", value: "DRAW" },
          icon: "mdi:gesture-tap",
        },
      ],
    },
    {
      type: "chart",
      items: [
        {
          id: "forexInvestmentResultDistribution",
          title: "Result Distribution",
          type: "pie",
          model: "forexInvestment",
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
                color: "gray",
                icon: "mdi:gesture-tap",
              },
            ],
          },
        },
      ],
    },
  ],

  // ─────────────────────────────────────────────────────────────
  // Group 3: Investments Over Time by Status – Full-Width Line Chart
  // ─────────────────────────────────────────────────────────────
  {
    type: "chart",
    items: [
      {
        id: "forexInvestmentsOverTime",
        title: "Investments Over Time (Status)",
        type: "line",
        model: "forexInvestment",
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

  // ─────────────────────────────────────────────────────────────
  // Group 4: Investments Over Time by Result – Full-Width Stacked Area Chart
  // ─────────────────────────────────────────────────────────────
  {
    type: "chart",
    items: [
      {
        id: "forexInvestmentsOverTimeByResult",
        title: "Investments Over Time (Result)",
        type: "stackedArea",
        model: "forexInvestment",
        metrics: ["WIN", "LOSS", "DRAW"],
        timeframes: ["24h", "7d", "30d", "3m", "6m", "y"],
        labels: {
          WIN: "Win",
          LOSS: "Loss",
          DRAW: "Draw",
        },
      },
    ],
  },
];
