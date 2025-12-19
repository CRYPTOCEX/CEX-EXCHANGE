import { AnalyticsConfig } from "@/components/blocks/data-table/types/analytics";

export const analytics: AnalyticsConfig = [
  // Row 1: Offering-Specific Transaction KPI Cards + Status Distribution
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
          title: "Total Transactions",
          metric: "total",
          model: "icoTransaction",
          icon: "TrendingUp",
        },
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
          title: "In Verification",
          metric: "verification",
          model: "icoTransaction",
          aggregation: { field: "status", value: "VERIFICATION" },
          icon: "Hourglass",
        },
        {
          id: "released_transactions",
          title: "Released Transactions",
          metric: "released",
          model: "icoTransaction",
          aggregation: { field: "status", value: "RELEASED" },
          icon: "CheckCircle",
        },
        {
          id: "rejected_transactions",
          title: "Rejected Transactions",
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
  // Row 2: Offering Financial KPIs + Investment Distribution
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
          title: "Total Investment Amount",
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
          id: "total_released_tokens",
          title: "Total Released Tokens",
          metric: "sum_amount_released",
          model: "icoTransaction",
          aggregation: { field: "status", value: "RELEASED" },
          icon: "CheckSquare",
        },
        {
          id: "unique_investors",
          title: "Unique Investors",
          metric: "unique_users",
          model: "icoTransaction",
          icon: "Users",
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
          id: "investmentDistribution",
          title: "Investment by Status",
          type: "pie",
          model: "icoTransaction",
          metrics: ["released", "pending", "verification"],
          config: {
            field: "status",
            status: [
              {
                value: "RELEASED",
                label: "Tokens Released",
                color: "green",
                icon: "mdi:check-circle",
              },
              {
                value: "PENDING",
                label: "Pending Release",
                color: "amber",
                icon: "mdi:clock-outline",
              },
              {
                value: "VERIFICATION",
                label: "Under Review",
                color: "blue",
                icon: "mdi:shield-search",
              },
            ],
          },
        },
      ],
    },
  ],
  // Row 3: Transaction Timeline + Completion Rate Analysis
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
          title: "Transactions Over Time",
          type: "line",
          model: "icoTransaction",
          metrics: ["total", "released", "pending", "verification"],
          timeframes: ["24h", "7d", "30d", "3m", "6m", "y"],
          labels: {
            total: "Total Transactions",
            released: "Released",
            pending: "Pending",
            verification: "In Verification",
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
          id: "completionRate",
          title: "Transaction Completion Rate",
          type: "pie",
          model: "icoTransaction",
          metrics: ["released", "rejected"],
          config: {
            field: "status",
            status: [
              {
                value: "RELEASED",
                label: "Completed Successfully",
                color: "green",
                icon: "mdi:check-circle",
              },
              {
                value: "REJECTED",
                label: "Failed/Rejected",
                color: "red",
                icon: "mdi:close-circle",
              },
            ],
          },
        },
      ],
    },
  ],
  // Row 4: Investment Volume Trends + Processing Pipeline
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
          id: "investmentVolumeOverTime",
          title: "Investment Volume Over Time",
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
    {
      type: "chart",
      responsive: {
        mobile: { cols: 1, rows: 1, span: 1 },
        tablet: { cols: 1, rows: 1, span: 1 },
        desktop: { cols: 1, rows: 1, span: 1 },
      },
      items: [
        {
          id: "processingPipeline",
          title: "Processing Pipeline",
          type: "pie",
          model: "icoTransaction",
          metrics: ["pending", "verification", "released", "rejected"],
          config: {
            field: "status",
            status: [
              {
                value: "PENDING",
                label: "Awaiting Processing",
                color: "amber",
                icon: "mdi:clock-outline",
              },
              {
                value: "VERIFICATION",
                label: "In Verification",
                color: "blue",
                icon: "mdi:shield-check",
              },
              {
                value: "RELEASED",
                label: "Processed",
                color: "green",
                icon: "mdi:check-circle",
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
];
