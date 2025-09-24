import { AnalyticsConfig } from "@/components/blocks/data-table/types/analytics";

export const ecommerceShippingAnalytics: AnalyticsConfig = [
  // ─────────────────────────────────────────────────────────────
  // Group 1: Shipment Overview – KPI Grid on Left, Pie Chart on Right
  // ─────────────────────────────────────────────────────────────
  [
    {
      type: "kpi",
      layout: { cols: 2, rows: 3 }, // 2 columns x 3 rows = 6 cells (5 used)
      items: [
        {
          id: "total_shipments",
          title: "Total Shipments",
          metric: "total", // Counts all shipments
          model: "ecommerceShipping",
          icon: "mdi:truck-fast",
        },
        {
          id: "pending_shipments",
          title: "Pending",
          metric: "PENDING",
          model: "ecommerceShipping",
          aggregation: { field: "loadStatus", value: "PENDING" },
          icon: "mdi:clock-outline",
        },
        {
          id: "transit_shipments",
          title: "In Transit",
          metric: "TRANSIT",
          model: "ecommerceShipping",
          aggregation: { field: "loadStatus", value: "TRANSIT" },
          icon: "mdi:truck-delivery",
        },
        {
          id: "delivered_shipments",
          title: "Delivered",
          metric: "DELIVERED",
          model: "ecommerceShipping",
          aggregation: { field: "loadStatus", value: "DELIVERED" },
          icon: "mdi:check-circle",
        },
        {
          id: "cancelled_shipments",
          title: "Cancelled",
          metric: "CANCELLED",
          model: "ecommerceShipping",
          aggregation: { field: "loadStatus", value: "CANCELLED" },
          icon: "mdi:cancel",
        },
        // You may leave the sixth cell empty or add another relevant KPI if needed.
      ],
    },
    {
      type: "chart",
      items: [
        {
          id: "shippingStatusDistribution",
          title: "Shipment Status Distribution",
          type: "pie",
          model: "ecommerceShipping",
          metrics: ["PENDING", "TRANSIT", "DELIVERED", "CANCELLED"],
          config: {
            field: "loadStatus",
            status: [
              {
                value: "PENDING",
                label: "Pending",
                color: "orange",
                icon: "mdi:clock-outline",
              },
              {
                value: "TRANSIT",
                label: "Transit",
                color: "blue",
                icon: "mdi:truck-delivery",
              },
              {
                value: "DELIVERED",
                label: "Delivered",
                color: "green",
                icon: "mdi:check-circle",
              },
              {
                value: "CANCELLED",
                label: "Cancelled",
                color: "red",
                icon: "mdi:cancel",
              },
            ],
          },
        },
      ],
    },
  ],

  // ─────────────────────────────────────────────────────────────
  // Group 2: Shipments Over Time – Full-Width Line Chart
  // ─────────────────────────────────────────────────────────────
  {
    type: "chart",
    items: [
      {
        id: "shipmentsOverTime",
        title: "Shipments Over Time",
        type: "line",
        model: "ecommerceShipping",
        // Show total shipments plus a line for each loadStatus.
        metrics: ["total", "PENDING", "TRANSIT", "DELIVERED", "CANCELLED"],
        timeframes: ["24h", "7d", "30d", "3m", "6m", "y"],
        labels: {
          total: "Total",
          PENDING: "Pending",
          TRANSIT: "In Transit",
          DELIVERED: "Delivered",
          CANCELLED: "Cancelled",
        },
      },
    ],
  },
];
