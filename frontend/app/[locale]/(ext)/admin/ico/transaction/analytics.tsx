import { AnalyticsConfig } from "@/components/blocks/data-table/types/analytics";

export const analytics: AnalyticsConfig = [
  // Row 1: Comprehensive KPI Cards + Status Distribution Pie Chart
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
          title: "Pending Verification",
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
  // Row 2: Financial KPIs + Release Rate Chart
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
          id: "total_amount",
          title: "Total Transaction Amount",
          metric: "sum_amount",
          model: "icoTransaction",
          icon: "DollarSign",
        },
        {
          id: "average_amount",
          title: "Average Transaction Amount",
          metric: "avg_amount",
          model: "icoTransaction",
          icon: "TrendingUp",
        },
        {
          id: "total_released_amount",
          title: "Total Released Amount",
          metric: "sum_amount_released",
          model: "icoTransaction",
          aggregation: { field: "status", value: "RELEASED" },
          icon: "CheckSquare",
        },
        {
          id: "pending_amount",
          title: "Pending Amount",
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
          id: "releaseRateChart",
          title: "Transaction Release Rate",
          type: "pie",
          model: "icoTransaction",
          metrics: ["released", "pending", "verification"],
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
                label: "In Progress",
                color: "amber",
                icon: "mdi:progress-clock",
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
  // Row 3: Multi-Status Time Series + Transaction Volume Chart
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
          title: "Transactions Over Time by Status",
          type: "line",
          model: "icoTransaction",
          metrics: ["total", "released", "pending", "verification", "rejected"],
          timeframes: ["24h", "7d", "30d", "3m", "6m", "y"],
          labels: {
            total: "Total Transactions",
            released: "Released",
            pending: "Pending",
            verification: "In Verification",
            rejected: "Rejected",
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
          id: "transactionVolumeOverTime",
          title: "Transaction Volume Over Time",
          type: "line",
          model: "icoTransaction",
          metrics: ["sum_amount"],
          timeframes: ["24h", "7d", "30d", "3m", "6m", "y"],
          labels: {
            sum_amount: "Total Volume",
          },
        },
      ],
    },
  ],
  // Row 4: Success vs Rejection Rate + Verification Pipeline
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
          id: "successVsRejectionRate",
          title: "Success vs Rejection Rate",
          type: "pie",
          model: "icoTransaction",
          metrics: ["released", "rejected"],
          config: {
            field: "status",
            status: [
              {
                value: "RELEASED",
                label: "Successfully Released",
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
    {
      type: "chart",
      responsive: {
        mobile: { cols: 1, rows: 1, span: 1 },
        tablet: { cols: 1, rows: 1, span: 1 },
        desktop: { cols: 1, rows: 1, span: 1 },
      },
      items: [
        {
          id: "verificationPipeline",
          title: "Verification Pipeline Status",
          type: "pie",
          model: "icoTransaction",
          metrics: ["pending", "verification"],
          config: {
            field: "status",
            status: [
              {
                value: "PENDING",
                label: "Awaiting Verification",
                color: "amber",
                icon: "mdi:clock-outline",
              },
              {
                value: "VERIFICATION",
                label: "Under Verification",
                color: "blue",
                icon: "mdi:shield-check",
              },
            ],
          },
        },
      ],
    },
  ],
];
