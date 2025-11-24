import { AnalyticsConfig } from "@/components/blocks/data-table/types/analytics";

export const analytics: AnalyticsConfig = [
  // First row: KPI cards and a pie chart for transaction status.
  [
    {
      type: "kpi",
      layout: { cols: 2, rows: 2 }, // updated to fit 5 items
      items: [
        {
          id: "pending_transactions",
          title: "Pending Transactions",
          metric: "pending",
          model: "icoTransaction",
          aggregation: { field: "status", value: "PENDING" },
          icon: "Clock",
        },
        {
          id: "verification_transactions",
          title: "Pending Verification",
          metric: "verification",
          model: "icoTransaction",
          aggregation: { field: "status", value: "VERIFICATION" },
          icon: "Clock",
        },
        {
          id: "released_transactions",
          title: "Released Transactions",
          metric: "released",
          model: "icoTransaction",
          aggregation: { field: "status", value: "RELEASED" },
          icon: "CheckSquare",
        },
        {
          id: "rejected_transactions",
          title: "Rejected Transactions",
          metric: "rejected",
          model: "icoTransaction",
          aggregation: { field: "status", value: "REJECTED" },
          icon: "AlertCircle",
        },
      ],
    },
    {
      type: "chart",
      items: [
        {
          id: "transactionStatusDistribution",
          title: "Transaction Status Distribution",
          type: "pie",
          model: "icoTransaction",
          metrics: ["released", "pending", "verification", "rejected"],
          config: {
            field: "status",
            status: [
              {
                value: "RELEASED",
                label: "Released",
                color: "green",
                icon: "mdi:check",
              },
              {
                value: "PENDING",
                label: "Pending",
                color: "amber",
                icon: "mdi:clock",
              },
              {
                value: "VERIFICATION",
                label: "Verification",
                color: "blue",
                icon: "mdi:clock-outline",
              },
              {
                value: "REJECTED",
                label: "Rejected",
                color: "red",
                icon: "mdi:close",
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
        id: "transactionsOverTime",
        title: "Transactions Over Time",
        type: "line",
        model: "icoTransaction",
        metrics: ["total"],
        timeframes: ["24h", "7d", "30d", "3m", "6m", "y"],
        labels: {
          total: "Total Transactions",
        },
      },
    ],
  },
];
