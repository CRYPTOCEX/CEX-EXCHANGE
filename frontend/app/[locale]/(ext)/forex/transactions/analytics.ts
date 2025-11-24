import { AnalyticsConfig } from "@/components/blocks/data-table/types/analytics";

export const transactionAnalytics: AnalyticsConfig = [
  // First row: KPI cards and status distribution pie chart
  [
    {
      type: "kpi",
      layout: { cols: 2, rows: 2 },
      items: [
        {
          id: "total_transactions",
          title: "Total Transactions",
          metric: "total",
          model: "transaction",
          icon: "Receipt",
        },
        {
          id: "pending_transactions",
          title: "Pending Transactions",
          metric: "pending",
          model: "transaction",
          aggregation: { field: "status", value: "PENDING" },
          icon: "Clock",
        },
        {
          id: "completed_transactions",
          title: "Completed Transactions",
          metric: "completed",
          model: "transaction",
          aggregation: { field: "status", value: "COMPLETED" },
          icon: "CheckCircle",
        },
        {
          id: "failed_transactions",
          title: "Failed Transactions",
          metric: "failed",
          model: "transaction",
          aggregation: { field: "status", value: "FAILED" },
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
          model: "transaction",
          metrics: ["completed", "pending", "failed", "cancelled", "rejected"],
          config: {
            field: "status",
            status: [
              {
                value: "COMPLETED",
                label: "Completed",
                color: "green",
                icon: "CheckCircle",
              },
              {
                value: "PENDING",
                label: "Pending",
                color: "amber",
                icon: "Clock",
              },
              {
                value: "FAILED",
                label: "Failed",
                color: "red",
                icon: "AlertCircle",
              },
              {
                value: "CANCELLED",
                label: "Cancelled",
                color: "gray",
                icon: "XCircle",
              },
              {
                value: "REJECTED",
                label: "Rejected",
                color: "red",
                icon: "AlertTriangle",
              },
            ],
          },
        },
      ],
    },
  ],
  // Second row: Transaction type distribution
  [
    {
      type: "chart",
      items: [
        {
          id: "transactionTypeDistribution",
          title: "Transaction Type Distribution",
          type: "pie",
          model: "transaction",
          metrics: ["forex_deposit", "forex_withdraw"],
          config: {
            field: "type",
            status: [
              {
                value: "FOREX_DEPOSIT",
                label: "Deposits",
                color: "green",
                icon: "ArrowDown",
              },
              {
                value: "FOREX_WITHDRAW",
                label: "Withdrawals",
                color: "orange",
                icon: "ArrowUp",
              },
            ],
          },
        },
      ],
    },
  ],
  // Third row: Transaction trends over time
  [
    {
      type: "chart",
      items: [
        {
          id: "transactionsOverTime",
          title: "Transactions Over Time",
          type: "line",
          model: "transaction",
          metrics: ["total"],
          timeframes: ["24h", "7d", "30d", "3m", "6m", "y"],
          labels: {
            total: "Total Transactions",
          },
        },
      ],
    },
  ],
]; 