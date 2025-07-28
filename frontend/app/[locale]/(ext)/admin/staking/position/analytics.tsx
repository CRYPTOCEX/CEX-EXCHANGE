export const analytics = [
  [
    {
      type: "kpi",
      layout: { cols: 2, rows: 2 },
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
      items: [
        {
          id: "positionStatusDistribution",
          title: "Position Status Distribution",
          type: "pie",
          model: "stakingPosition",
          metrics: ["active", "completed", "pendingWithdrawal"],
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
  {
    type: "chart",
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
