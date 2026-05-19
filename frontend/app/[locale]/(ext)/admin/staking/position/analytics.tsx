import { AnalyticsConfig } from "@/components/blocks/data-table/types/analytics";

export const analytics: AnalyticsConfig = [
  // First row: Status KPIs and Status Distribution Chart
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
          id: "total_positions",
          title: "Total Positions",
          metric: "total",
          model: "stakingPosition",
          icon: "Database",
        },
        {
          id: "active_positions",
          title: "Active Positions",
          metric: "active",
          model: "stakingPosition",
          aggregation: { field: "status", value: "ACTIVE" },
          icon: "CheckCircle",
        },
        {
          id: "completed_positions",
          title: "Completed Positions",
          metric: "completed",
          model: "stakingPosition",
          aggregation: { field: "status", value: "COMPLETED" },
          icon: "Check",
        },
        {
          id: "cancelled_positions",
          title: "Cancelled Positions",
          metric: "cancelled",
          model: "stakingPosition",
          aggregation: { field: "status", value: "CANCELLED" },
          icon: "XCircle",
        },
        {
          id: "pending_withdrawals",
          title: "Pending Withdrawals",
          metric: "pendingWithdrawal",
          model: "stakingPosition",
          aggregation: { field: "status", value: "PENDING_WITHDRAWAL" },
          icon: "Clock",
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
          id: "positionStatusDistribution",
          title: "Position Status Distribution",
          type: "pie",
          model: "stakingPosition",
          metrics: ["active", "completed", "cancelled", "pendingWithdrawal"],
          config: {
            field: "status",
            status: [
              {
                value: "ACTIVE",
                label: "Active",
                color: "green",
                icon: "mdi:check",
              },
              {
                value: "COMPLETED",
                label: "Completed",
                color: "blue",
                icon: "mdi:check-circle",
              },
              {
                value: "CANCELLED",
                label: "Cancelled",
                color: "red",
                icon: "mdi:close-circle",
              },
              {
                value: "PENDING_WITHDRAWAL",
                label: "Pending Withdrawal",
                color: "amber",
                icon: "mdi:clock",
              },
            ],
          },
        },
      ],
    },
  ],
  // Second row: Financial Metrics KPIs
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
          id: "total_staked_amount",
          title: "Total Staked Amount",
          metric: "totalStaked",
          model: "stakingPosition",
          aggregation: { field: "amount", aggregationType: "sum" },
          icon: "DollarSign",
          format: "currency",
        },
        {
          id: "avg_stake_amount",
          title: "Average Stake Amount",
          metric: "avgStake",
          model: "stakingPosition",
          aggregation: { field: "amount", aggregationType: "avg" },
          icon: "TrendingUp",
          format: "currency",
        },
        {
          id: "active_staked_amount",
          title: "Active Staked Amount",
          metric: "activeStaked",
          model: "stakingPosition",
          aggregation: {
            field: "amount",
            aggregationType: "sum",
            filter: { status: "ACTIVE" },
          },
          icon: "Activity",
          format: "currency",
        },
        {
          id: "completed_staked_amount",
          title: "Completed Staked Amount",
          metric: "completedStaked",
          model: "stakingPosition",
          aggregation: {
            field: "amount",
            aggregationType: "sum",
            filter: { status: "COMPLETED" },
          },
          icon: "CheckSquare",
          format: "currency",
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
          id: "withdrawalStatusDistribution",
          title: "Withdrawal Request Status",
          type: "pie",
          model: "stakingPosition",
          metrics: ["withdrawalRequested", "noWithdrawal"],
          config: {
            field: "withdrawalRequested",
            status: [
              {
                value: true,
                label: "Withdrawal Requested",
                color: "amber",
                icon: "mdi:account-arrow-right",
              },
              {
                value: false,
                label: "No Withdrawal",
                color: "green",
                icon: "mdi:account-check",
              },
            ],
          },
        },
      ],
    },
  ],
  // Third row: Staking Amount Distribution
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
          id: "stakeAmountDistribution",
          title: "Stake Amount Distribution",
          type: "bar",
          model: "stakingPosition",
          metrics: ["amount"],
          config: {
            field: "amount",
            groupBy: "amount",
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
          id: "stakingTrendByStatus",
          title: "Staking Volume by Status",
          type: "area",
          model: "stakingPosition",
          metrics: ["active", "completed", "cancelled", "pendingWithdrawal"],
          timeframes: ["7d", "30d", "3m", "6m", "y"],
          config: {
            field: "status",
            groupBy: "status",
          },
          labels: {
            active: "Active",
            completed: "Completed",
            cancelled: "Cancelled",
            pendingWithdrawal: "Pending Withdrawal",
          },
        },
      ],
    },
  ],
  // Fourth row: Withdrawal Analytics
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
          id: "total_withdrawal_requests",
          title: "Total Withdrawal Requests",
          metric: "totalWithdrawals",
          model: "stakingPosition",
          aggregation: { field: "withdrawalRequested", value: true },
          icon: "ArrowRightCircle",
        },
        {
          id: "active_withdrawal_requests",
          title: "Active Withdrawal Requests",
          metric: "activeWithdrawals",
          model: "stakingPosition",
          aggregation: {
            field: "status",
            value: "PENDING_WITHDRAWAL",
          },
          icon: "Clock",
        },
        {
          id: "withdrawal_amount",
          title: "Total Withdrawal Amount",
          metric: "withdrawalAmount",
          model: "stakingPosition",
          aggregation: {
            field: "amount",
            aggregationType: "sum",
            filter: { withdrawalRequested: true },
          },
          icon: "DollarSign",
          format: "currency",
        },
        {
          id: "withdrawal_rate",
          title: "Withdrawal Rate",
          metric: "withdrawalRate",
          model: "stakingPosition",
          aggregation: {
            field: "withdrawalRequested",
            aggregationType: "percentage",
          },
          icon: "Percent",
          format: "percentage",
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
          id: "withdrawalTrend",
          title: "Withdrawal Requests Over Time",
          type: "line",
          model: "stakingPosition",
          metrics: ["withdrawalRequested"],
          timeframes: ["7d", "30d", "3m", "6m", "y"],
          config: {
            field: "withdrawalRequested",
            value: true,
          },
          labels: { withdrawalRequested: "Withdrawal Requests" },
        },
      ],
    },
  ],
  // Fifth row: Time Series
  {
    type: "chart",
    responsive: {
      mobile: { cols: 1, rows: 1, span: 1 },
      tablet: { cols: 1, rows: 1, span: 1 },
      desktop: { cols: 1, rows: 1, span: 1 },
    },
    items: [
      {
        id: "positionsOverTime",
        title: "Positions Over Time",
        type: "line",
        model: "stakingPosition",
        metrics: ["total"],
        timeframes: ["7d", "30d", "3m", "6m", "y"],
        labels: { total: "Total Positions" },
      },
    ],
  },
];
