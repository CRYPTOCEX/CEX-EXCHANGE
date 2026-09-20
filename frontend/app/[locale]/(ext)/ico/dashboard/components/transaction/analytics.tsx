import { AnalyticsConfig } from "@/components/blocks/data-table/types/analytics";

export const analytics: AnalyticsConfig = [
  // Row 1: User Transaction KPI Cards + Status Distribution
  [
    {
      type: "kpi",
      layout: { cols: 3, rows: 2 },
      responsive: {
        mobile: { cols: 1, rows: 5, span: 1 },
          tablet: { cols: 2, rows: 3, span: 2 },
          desktop: { cols: 3, rows: 2, span: 2 },
      },
      items: [
        {
          id: "total_transactions",
          title: "My Total Transactions",
          metric: "total",
          model: "icoTransaction",
          icon: "TrendingUp",
        },
        {
          id: "pending_transactions",
          title: "Pending",
          metric: "pending",
          model: "icoTransaction",
          aggregation: { field: "status", value: "PENDING" },
          icon: "Clock",
        },
        {
          id: "verification_transactions",
          title: "In Verification",
          metric: "verification",
          model: "icoTransaction",
          aggregation: { field: "status", value: "VERIFICATION" },
          icon: "Hourglass",
        },
        {
          id: "released_transactions",
          title: "Tokens Released",
          metric: "released",
          model: "icoTransaction",
          aggregation: { field: "status", value: "RELEASED" },
          icon: "CheckCircle",
        },
        {
          id: "rejected_transactions",
          title: "Rejected",
          metric: "rejected",
          model: "icoTransaction",
          aggregation: { field: "status", value: "REJECTED" },
          icon: "XCircle",
        },
      ],
    },
    {
      type: "chart",
      responsive: {
        mobile: { cols: 1, rows: 1, span: 1 },
        tablet: { cols: 1, rows: 1, span: 1 },
        desktop: { cols: 1, rows: 1, span: 1 },
      },
      items: [
        {
          id: "transactionStatusDistribution",
          title: "My Transaction Status",
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
                icon: "mdi:check-circle",
              },
              {
                value: "PENDING",
                label: "Pending",
                color: "amber",
                icon: "mdi:clock-outline",
              },
              {
                value: "VERIFICATION",
                label: "Verification",
                color: "blue",
                icon: "mdi:shield-check",
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
  // Row 2: Investment KPIs + Success Rate
  [
    {
      type: "kpi",
      layout: { cols: 2, rows: 2 },
      responsive: {
        mobile: { cols: 1, rows: 4, span: 1 },
          tablet: { cols: 2, rows: 2, span: 2 },
          desktop: { cols: 2, rows: 2, span: 2 },
      },
      items: [
        {
          id: "total_invested",
          title: "Total Invested",
          metric: "sum_amount",
          model: "icoTransaction",
          icon: "DollarSign",
        },
        {
          id: "average_investment",
          title: "Average Investment",
          metric: "avg_amount",
          model: "icoTransaction",
          icon: "TrendingUp",
        },
        {
          id: "tokens_received",
          title: "Tokens Received",
          metric: "sum_amount_released",
          model: "icoTransaction",
          aggregation: { field: "status", value: "RELEASED" },
          icon: "CheckSquare",
        },
        {
          id: "pending_value",
          title: "Pending Value",
          metric: "sum_amount_pending",
          model: "icoTransaction",
          aggregation: { field: "status", value: "PENDING" },
          icon: "Hourglass",
        },
      ],
    },
    {
      type: "chart",
      responsive: {
        mobile: { cols: 1, rows: 1, span: 1 },
        tablet: { cols: 1, rows: 1, span: 1 },
        desktop: { cols: 1, rows: 1, span: 1 },
      },
      items: [
        {
          id: "successRate",
          title: "My Success Rate",
          type: "pie",
          model: "icoTransaction",
          metrics: ["released", "rejected"],
          config: {
            field: "status",
            status: [
              {
                value: "RELEASED",
                label: "Successful",
                color: "green",
                icon: "mdi:check-circle",
              },
              {
                value: "REJECTED",
                label: "Failed",
                color: "red",
                icon: "mdi:close-circle",
              },
            ],
          },
        },
      ],
    },
  ],
  // Row 3: Transaction History + Investment Trends
  [
    {
      type: "chart",
      responsive: {
        mobile: { cols: 1, rows: 1, span: 1 },
        tablet: { cols: 1, rows: 1, span: 1 },
        desktop: { cols: 1, rows: 1, span: 1 },
      },
      items: [
        {
          id: "transactionsOverTime",
          title: "My Transactions Over Time",
          type: "line",
          model: "icoTransaction",
          metrics: ["total", "released", "pending"],
          timeframes: ["24h", "7d", "30d", "3m", "6m", "y"],
          labels: {
            total: "Total Transactions",
            released: "Released",
            pending: "Pending",
          },
        },
      ],
    },
    {
      type: "chart",
      responsive: {
        mobile: { cols: 1, rows: 1, span: 1 },
        tablet: { cols: 1, rows: 1, span: 1 },
        desktop: { cols: 1, rows: 1, span: 1 },
      },
      items: [
        {
          id: "investmentTrends",
          title: "Investment Value Over Time",
          type: "line",
          model: "icoTransaction",
          metrics: ["sum_amount"],
          timeframes: ["24h", "7d", "30d", "3m", "6m", "y"],
          labels: {
            sum_amount: "Total Investment",
          },
        },
      ],
    },
  ],
];
