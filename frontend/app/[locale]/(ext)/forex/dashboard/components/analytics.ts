import { AnalyticsConfig } from "@/components/blocks/data-table/types/analytics";

export const forexInvestmentAnalytics: AnalyticsConfig = [
  [
    {
      type: "kpi",
      layout: { cols: 2, rows: 2 },
      items: [
        {
          id: "total_investments",
          title: "Total Investments",
          metric: "total",
          model: "forexInvestment",
          icon: "mdi:swap-horizontal-bold",
        },
        {
          id: "active_investments",
          title: "Active",
          metric: "ACTIVE",
          model: "forexInvestment",
          aggregation: { field: "status", value: "ACTIVE" },
          icon: "mdi:arrow-up-bold",
        },
        {
          id: "completed_investments",
          title: "Completed",
          metric: "COMPLETED",
          model: "forexInvestment",
          aggregation: { field: "status", value: "COMPLETED" },
          icon: "mdi:check-bold",
        },
        {
          id: "cancelled_investments",
          title: "Cancelled/Rejected",
          metric: "CANCELLED_REJECTED",
          model: "forexInvestment",
          aggregation: { field: "status", value: "CANCELLED" },
          icon: "mdi:close-thick",
        },
      ],
    },
    {
      type: "chart",
      items: [
        {
          id: "investmentStatusPie",
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
                icon: "mdi:arrow-up-bold",
              },
              {
                value: "COMPLETED",
                label: "Completed",
                color: "green",
                icon: "mdi:check-bold",
              },
              {
                value: "CANCELLED",
                label: "Cancelled",
                color: "red",
                icon: "mdi:close-thick",
              },
              {
                value: "REJECTED",
                label: "Rejected",
                color: "orange",
                icon: "mdi:close-thick",
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
        id: "investmentsOverTime",
        title: "Investments Over Time",
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
];
