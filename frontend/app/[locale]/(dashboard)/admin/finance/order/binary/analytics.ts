import { AnalyticsConfig } from "@/components/blocks/data-table/types/analytics";

export const binaryOrderAnalytics: AnalyticsConfig = [
  // 1) Row #1: First set of KPI cards
  {
    type: "kpi",
    layout: { cols: 4, rows: 1 },
    items: [
      {
        id: "total_binary_orders",
        title: "Total Orders",
        metric: "total", // COUNT(*)
        model: "binaryOrder",
        icon: "mdi:finance",
      },
      {
        id: "winning_orders",
        title: "Winning Orders",
        metric: "WIN",
        model: "binaryOrder",
        aggregation: { field: "status", value: "WIN" },
        icon: "mdi:trophy",
      },
      {
        id: "losing_orders",
        title: "Losing Orders",
        metric: "LOSS",
        model: "binaryOrder",
        aggregation: { field: "status", value: "LOSS" },
        icon: "mdi:thumb-down",
      },
      {
        id: "draw_orders",
        title: "Draw Orders",
        metric: "DRAW",
        model: "binaryOrder",
        aggregation: { field: "status", value: "DRAW" },
        icon: "mdi:gesture-tap",
      },
    ],
  },

  // 2) Row #2: Second set of KPI cards
  {
    type: "kpi",
    layout: { cols: 4, rows: 1 },
    items: [
      {
        id: "pending_orders",
        title: "Pending Orders",
        metric: "PENDING",
        model: "binaryOrder",
        aggregation: { field: "status", value: "PENDING" },
        icon: "mdi:clock-outline",
      },
      {
        id: "canceled_orders",
        title: "Canceled Orders",
        metric: "CANCELED",
        model: "binaryOrder",
        aggregation: { field: "status", value: "CANCELED" },
        icon: "mdi:cancel",
      },
      {
        id: "demo_orders",
        title: "Demo Orders",
        metric: "demo",
        model: "binaryOrder",
        aggregation: { field: "isDemo", value: "true" },
        icon: "mdi:account-question",
      },
      {
        id: "live_orders",
        title: "Live Orders",
        metric: "live",
        model: "binaryOrder",
        aggregation: { field: "isDemo", value: "false" },
        icon: "mdi:account-check",
      },
    ],
  },

  // 3) Row #3: Pie chart for status distribution
  {
    type: "chart",
    items: [
      {
        id: "binaryOrderStatusDistribution",
        title: "Order Status Distribution",
        type: "pie",
        model: "binaryOrder",
        metrics: ["WIN", "LOSS", "DRAW", "PENDING", "CANCELED"],
        config: {
          field: "status",
          status: [
            { value: "WIN", label: "Win", color: "green", icon: "mdi:trophy" },
            {
              value: "LOSS",
              label: "Loss",
              color: "red",
              icon: "mdi:thumb-down",
            },
            {
              value: "DRAW",
              label: "Draw",
              color: "gray",
              icon: "mdi:gesture-tap",
            },
            {
              value: "PENDING",
              label: "Pending",
              color: "blue",
              icon: "mdi:clock-outline",
            },
            {
              value: "CANCELED",
              label: "Canceled",
              color: "amber",
              icon: "mdi:cancel",
            },
          ],
        },
      },
    ],
  },

  // 6) Row #6: Line chart for time-series (status-based)
  {
    type: "chart",
    items: [
      {
        id: "binaryOrdersOverTime",
        title: "Orders Over Time",
        type: "line",
        model: "binaryOrder",
        metrics: ["total", "WIN", "LOSS", "DRAW", "PENDING", "CANCELED"],
        timeframes: ["24h", "7d", "30d", "3m", "6m", "y"],
        labels: {
          total: "Total",
          WIN: "Win",
          LOSS: "Loss",
          DRAW: "Draw",
          PENDING: "Pending",
          CANCELED: "Canceled",
        },
      },
    ],
  },

  // 7) Row #7: Stacked area chart for Demo vs. Live over time
  {
    type: "chart",
    items: [
      {
        id: "demoVsLiveOverTime",
        title: "Demo vs. Live Over Time",
        type: "stackedArea",
        model: "binaryOrder",
        metrics: ["demo", "live"], // aggregator sees isDemo=true or false
        timeframes: ["24h", "7d", "30d", "3m", "6m", "y"],
        labels: {
          demo: "Demo",
          live: "Live",
        },
        // For aggregator, specify config if needed. But your aggregator
        // automatically picks up these from "metrics" + "aggregation" in the KPI form
        // Alternatively, you can specify a config field + status array. However,
        // your aggregator is usually set to handle each metric as a separate aggregator
        // if you define them as separate items.
      },
    ],
  },
];
