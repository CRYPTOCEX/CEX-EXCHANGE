import { AnalyticsConfig } from "@/components/blocks/data-table/types/analytics";

export const transactionAnalytics: AnalyticsConfig = [
  // ─────────────────────────────────────────────────────────────
  // Group 1: Transaction Status Overview – KPI Grid & Pie Chart
  // ─────────────────────────────────────────────────────────────
  [
    {
      type: "kpi",
      layout: { cols: 4, rows: 1 },
      items: [
        {
          id: "total_transactions",
          title: "Total Transactions",
          metric: "total", // COUNT(*)
          model: "transaction",
          icon: "mdi:tag-outline",
        },
        {
          id: "pending_transactions",
          title: "Pending",
          metric: "PENDING",
          model: "transaction",
          aggregation: { field: "status", value: "PENDING" },
          icon: "mdi:clock-outline",
        },
        {
          id: "completed_transactions",
          title: "Completed",
          metric: "COMPLETED",
          model: "transaction",
          aggregation: { field: "status", value: "COMPLETED" },
          icon: "mdi:check-circle",
        },
        {
          id: "failed_transactions",
          title: "Failed",
          metric: "FAILED",
          model: "transaction",
          aggregation: { field: "status", value: "FAILED" },
          icon: "mdi:alert-circle",
        },
      ],
    },
    {
      type: "chart",
      items: [
        {
          id: "transactionStatusDistribution",
          title: "Status Distribution",
          type: "pie",
          model: "transaction",
          metrics: ["PENDING", "COMPLETED", "FAILED", "CANCELLED"],
          config: {
            field: "status",
            status: [
              {
                value: "PENDING",
                label: "Pending",
                color: "orange",
                icon: "mdi:clock-outline",
              },
              {
                value: "COMPLETED",
                label: "Completed",
                color: "green",
                icon: "mdi:check-circle",
              },
              {
                value: "FAILED",
                label: "Failed",
                color: "red",
                icon: "mdi:alert-circle",
              },
              {
                value: "CANCELLED",
                label: "Cancelled",
                color: "purple",
                icon: "mdi:cancel",
              },
            ],
          },
        },
      ],
    },
  ],

  // ─────────────────────────────────────────────────────────────
  // Group 2: Transaction Type Distribution – KPI Grid & Pie Chart
  // ─────────────────────────────────────────────────────────────
  [
    {
      type: "kpi",
      layout: { cols: 4, rows: 1 },
      items: [
        {
          id: "deposit_transactions",
          title: "Deposits",
          metric: "DEPOSIT",
          model: "transaction",
          aggregation: { field: "type", value: "DEPOSIT" },
          icon: "mdi:bank-transfer-in",
        },
        {
          id: "withdraw_transactions",
          title: "Withdrawals",
          metric: "WITHDRAW",
          model: "transaction",
          aggregation: { field: "type", value: "WITHDRAW" },
          icon: "mdi:bank-transfer-out",
        },
        {
          id: "payment_transactions",
          title: "Payments",
          metric: "PAYMENT",
          model: "transaction",
          aggregation: { field: "type", value: "PAYMENT" },
          icon: "mdi:cash-fast",
        },
        {
          id: "refund_transactions",
          title: "Refunds",
          metric: "REFUND",
          model: "transaction",
          aggregation: { field: "type", value: "REFUND" },
          icon: "mdi:cash-refund",
        },
      ],
    },
    {
      type: "chart",
      items: [
        {
          id: "transactionTypeDistribution",
          title: "Type Distribution",
          type: "pie",
          model: "transaction",
          metrics: ["DEPOSIT", "WITHDRAW", "PAYMENT", "REFUND"],
          config: {
            field: "type",
            status: [
              {
                value: "DEPOSIT",
                label: "Deposit",
                color: "green",
                icon: "mdi:bank-transfer-in",
              },
              {
                value: "WITHDRAW",
                label: "Withdraw",
                color: "red",
                icon: "mdi:bank-transfer-out",
              },
              {
                value: "PAYMENT",
                label: "Payment",
                color: "blue",
                icon: "mdi:cash-fast",
              },
              {
                value: "REFUND",
                label: "Refund",
                color: "purple",
                icon: "mdi:cash-refund",
              },
            ],
          },
        },
      ],
    },
  ],

  // ─────────────────────────────────────────────────────────────
  // Group 3: Financial Overview – KPI Grid
  // ─────────────────────────────────────────────────────────────
  {
    type: "kpi",
    layout: { cols: 3, rows: 1 },
    items: [
      {
        id: "total_transaction_amount",
        title: "Total Amount",
        metric: "amount", // SUM(amount); aggregator must perform a SUM operation
        model: "transaction",
        icon: "mdi:cash-multiple",
      },
      {
        id: "total_fees",
        title: "Total Fees",
        metric: "fee", // SUM(fee)
        model: "transaction",
        icon: "mdi:cash",
      },
      {
        id: "average_transaction_amount",
        title: "Avg Amount",
        metric: "average", // Custom aggregator: average of amount
        model: "transaction",
        icon: "mdi:calculator",
      },
    ],
  },

  // ─────────────────────────────────────────────────────────────
  // Group 4: Transaction Trends Over Time – Full-Width Line Chart
  // ─────────────────────────────────────────────────────────────
  {
    type: "chart",
    items: [
      {
        id: "transactionsOverTime",
        title: "Transactions Over Time",
        type: "line",
        model: "transaction",
        metrics: [
          "total",
          "PENDING",
          "COMPLETED",
          "FAILED",
          "CANCELLED",
          "EXPIRED",
          "REJECTED",
          "REFUNDED",
          "FROZEN",
          "PROCESSING",
          "TIMEOUT",
        ],
        timeframes: ["24h", "7d", "30d", "3m", "6m", "y"],
        labels: {
          total: "Total",
          PENDING: "Pending",
          COMPLETED: "Completed",
          FAILED: "Failed",
          CANCELLED: "Cancelled",
          EXPIRED: "Expired",
          REJECTED: "Rejected",
          REFUNDED: "Refunded",
          FROZEN: "Frozen",
          PROCESSING: "Processing",
          TIMEOUT: "Timeout",
        },
      },
    ],
  },
];
