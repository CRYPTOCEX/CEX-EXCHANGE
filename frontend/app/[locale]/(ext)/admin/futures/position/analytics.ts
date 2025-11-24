import { AnalyticsConfig } from "@/components/blocks/data-table/types/analytics";

export const futuresPositionsAnalytics: AnalyticsConfig = [
  // Row 1: Status KPIs + Pie Chart for positions status.
  [
    {
      type: "kpi",
      layout: { cols: 2, rows: 2 },
      items: [
        {
          id: "total_positions",
          title: "Total Positions",
          metric: "total",
          model: "position",
          icon: "mdi:finance",
        },
        {
          id: "active_positions",
          title: "Active Positions",
          metric: "ACTIVE",
          model: "position",
          aggregation: { field: "status", value: "ACTIVE" },
          icon: "mdi:door-open",
        },
        {
          id: "closed_positions",
          title: "Closed Positions",
          metric: "CLOSED",
          model: "position",
          aggregation: { field: "status", value: "CLOSED" },
          icon: "mdi:door-closed",
        },
        {
          id: "liquidated_positions",
          title: "Liquidated Positions",
          metric: "LIQUIDATED",
          model: "position",
          aggregation: { field: "status", value: "LIQUIDATED" },
          icon: "mdi:alert-circle",
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
          model: "position",
          metrics: ["ACTIVE", "CLOSED", "LIQUIDATED"],
          config: {
            field: "status",
            status: [
              {
                value: "ACTIVE",
                label: "Active",
                color: "blue",
                icon: "mdi:door-open",
              },
              {
                value: "CLOSED",
                label: "Closed",
                color: "green",
                icon: "mdi:door-closed",
              },
              {
                value: "LIQUIDATED",
                label: "Liquidated",
                color: "red",
                icon: "mdi:alert-circle",
              },
            ],
          },
        },
      ],
    },
  ],
  // Row 2: Positions Over Time (Line Chart)
  {
    type: "chart",
    items: [
      {
        id: "positionsOverTime",
        title: "Positions Over Time",
        type: "line",
        model: "position",
        metrics: ["total", "ACTIVE", "CLOSED", "LIQUIDATED"],
        timeframes: ["24h", "7d", "30d", "3m", "6m", "y"],
        labels: {
          total: "Total",
          ACTIVE: "Active",
          CLOSED: "Closed",
          LIQUIDATED: "Liquidated",
        },
      },
    ],
  },
];
