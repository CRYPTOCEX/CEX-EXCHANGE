import { AnalyticsConfig } from "@/components/blocks/data-table/types/analytics";

export const nftSaleAnalytics: AnalyticsConfig = [
  // ─────────────────────────────────────────────────────────────
  // Group 1: Sale Overview – KPI Grid on Left, Pie Chart on Right
  // ─────────────────────────────────────────────────────────────
  [
    {
      type: "kpi",
      layout: { cols: 3, rows: 2 },
      items: [
        {
          id: "total_sales",
          title: "Total Sales",
          metric: "total",
          model: "nftSale",
          icon: "mdi:currency-usd",
        },
        {
          id: "completed_sales",
          title: "Completed Sales",
          metric: "COMPLETED",
          model: "nftSale",
          aggregation: { field: "status", value: "COMPLETED" },
          icon: "mdi:check-circle",
        },
        {
          id: "pending_sales",
          title: "Pending Sales",
          metric: "PENDING",
          model: "nftSale",
          aggregation: { field: "status", value: "PENDING" },
          icon: "mdi:clock-outline",
        },
        {
          id: "failed_sales",
          title: "Failed Sales",
          metric: "FAILED",
          model: "nftSale",
          aggregation: { field: "status", value: "FAILED" },
          icon: "mdi:close-circle",
        },
        {
          id: "cancelled_sales",
          title: "Cancelled Sales",
          metric: "CANCELLED",
          model: "nftSale",
          aggregation: { field: "status", value: "CANCELLED" },
          icon: "mdi:cancel",
        },
        {
          id: "refunded_sales",
          title: "Refunded Sales",
          metric: "REFUNDED",
          model: "nftSale",
          aggregation: { field: "status", value: "REFUNDED" },
          icon: "mdi:undo",
        },
      ],
    },
    {
      type: "chart",
      items: [
        {
          id: "saleStatusDistribution",
          title: "Sale Status Distribution",
          type: "pie",
          model: "nftSale",
          metrics: ["COMPLETED", "PENDING", "FAILED", "CANCELLED", "REFUNDED"],
          config: {
            field: "status",
            status: [
              {
                value: "COMPLETED",
                label: "Completed",
                color: "green",
                icon: "mdi:check-circle",
              },
              {
                value: "PENDING",
                label: "Pending",
                color: "orange",
                icon: "mdi:clock-outline",
              },
              {
                value: "FAILED",
                label: "Failed",
                color: "red",
                icon: "mdi:close-circle",
              },
              {
                value: "CANCELLED",
                label: "Cancelled",
                color: "gray",
                icon: "mdi:cancel",
              },
              {
                value: "REFUNDED",
                label: "Refunded",
                color: "blue",
                icon: "mdi:undo",
              },
            ],
          },
        },
      ],
    },
  ],

  // ─────────────────────────────────────────────────────────────
  // Group 2: Sales Over Time – Full-Width Line Chart
  // ─────────────────────────────────────────────────────────────
  {
    type: "chart",
    items: [
      {
        id: "salesOverTime",
        title: "Sales Over Time",
        type: "line",
        model: "nftSale",
        metrics: ["total", "COMPLETED", "PENDING", "FAILED"],
        timeframes: ["24h", "7d", "30d", "3m", "6m", "y"],
        labels: {
          total: "Total Sales",
          COMPLETED: "Completed Sales",
          PENDING: "Pending Sales",
          FAILED: "Failed Sales",
        },
      },
    ],
  },
]; 