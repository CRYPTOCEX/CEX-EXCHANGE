import { AnalyticsConfig } from "@/components/blocks/data-table/types/analytics";

export const ecommerceOrderAnalytics: AnalyticsConfig = [
  // ─────────────────────────────────────────────────────────────
  // Row 1: KPI Grid (3×2) for Order Statuses on the left + Status Pie Chart on the right
  // ─────────────────────────────────────────────────────────────
  [
    {
      type: "kpi",
      layout: { cols: 3, rows: 2 },
      items: [
        {
          id: "total_orders",
          title: "Total Orders",
          metric: "total", // COUNT(*)
          model: "ecommerceOrder",
          icon: "mdi:shopping",
        },
        {
          id: "pending_orders",
          title: "Pending Orders",
          metric: "PENDING",
          model: "ecommerceOrder",
          aggregation: { field: "status", value: "PENDING" },
          icon: "mdi:progress-clock",
        },
        {
          id: "completed_orders",
          title: "Completed Orders",
          metric: "COMPLETED",
          model: "ecommerceOrder",
          aggregation: { field: "status", value: "COMPLETED" },
          icon: "mdi:check-circle",
        },
        {
          id: "cancelled_orders",
          title: "Cancelled Orders",
          metric: "CANCELLED",
          model: "ecommerceOrder",
          aggregation: { field: "status", value: "CANCELLED" },
          icon: "mdi:cancel",
        },
        {
          id: "rejected_orders",
          title: "Rejected Orders",
          metric: "REJECTED",
          model: "ecommerceOrder",
          aggregation: { field: "status", value: "REJECTED" },
          icon: "mdi:thumb-down",
        },
      ],
    },
    {
      type: "chart",
      items: [
        {
          id: "orderStatusDistribution",
          title: "Order Status Distribution",
          type: "pie",
          model: "ecommerceOrder",
          metrics: ["PENDING", "COMPLETED", "CANCELLED", "REJECTED"],
          config: {
            field: "status",
            status: [
              {
                value: "PENDING",
                label: "Pending",
                color: "orange",
                icon: "mdi:progress-clock",
              },
              {
                value: "COMPLETED",
                label: "Completed",
                color: "green",
                icon: "mdi:check-circle",
              },
              {
                value: "CANCELLED",
                label: "Cancelled",
                color: "red",
                icon: "mdi:cancel",
              },
              {
                value: "REJECTED",
                label: "Rejected",
                color: "purple",
                icon: "mdi:thumb-down",
              },
            ],
          },
        },
      ],
    },
  ],

  // ─────────────────────────────────────────────────────────────
  // Row 2: Full-Width Line Chart for Orders Over Time
  // ─────────────────────────────────────────────────────────────
  {
    type: "chart",
    items: [
      {
        id: "ordersOverTime",
        title: "Orders Over Time",
        type: "line",
        model: "ecommerceOrder",
        metrics: ["total", "PENDING", "COMPLETED", "CANCELLED", "REJECTED"],
        timeframes: ["24h", "7d", "30d", "3m", "6m", "y"],
        labels: {
          total: "Total",
          PENDING: "Pending",
          COMPLETED: "Completed",
          CANCELLED: "Cancelled",
          REJECTED: "Rejected",
        },
      },
    ],
  },
];
