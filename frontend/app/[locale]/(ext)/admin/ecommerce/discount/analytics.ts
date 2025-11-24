import { AnalyticsConfig } from "@/components/blocks/data-table/types/analytics";

export const ecommerceDiscountAnalytics: AnalyticsConfig = [
  // ─────────────────────────────────────────────────────────────
  // Group 1: Discount Overview (Status)
  // Left: KPI Grid for Total, Active, and Inactive discounts
  // Right: Pie Chart for Status Distribution
  // ─────────────────────────────────────────────────────────────
  [
    {
      type: "kpi",
      layout: { cols: 2, rows: 1 }, // 2 KPI cards side by side
      items: [
        {
          id: "total_discounts",
          title: "Total Discounts",
          metric: "total", // Counts all discount codes
          model: "ecommerceDiscount",
          icon: "mdi:tag",
        },
        {
          id: "active_discounts",
          title: "Status",
          metric: "active",
          model: "ecommerceDiscount",
          aggregation: { field: "status", value: "true" },
          icon: "mdi:check-circle",
        },
        {
          id: "inactive_discounts",
          title: "Inactive",
          metric: "inactive",
          model: "ecommerceDiscount",
          aggregation: { field: "status", value: "false" },
          icon: "mdi:close-circle",
        },
      ],
    },
    {
      type: "chart",
      items: [
        {
          id: "discountStatusDistribution",
          title: "Discount Status Distribution",
          type: "pie",
          model: "ecommerceDiscount",
          metrics: ["active", "inactive"],
          config: {
            field: "status",
            status: [
              {
                value: "true",
                label: "Active",
                color: "green",
                icon: "mdi:check-circle",
              },
              {
                value: "false",
                label: "Inactive",
                color: "red",
                icon: "mdi:close-circle",
              },
            ],
          },
        },
      ],
    },
  ],

  // ─────────────────────────────────────────────────────────────
  // Group 2: Discount Percentage Distribution
  // Left: KPI Grid (2×2) for common discount percentages
  // Right: Pie Chart for Percentage Distribution
  // ─────────────────────────────────────────────────────────────
  [
    {
      type: "kpi",
      layout: { cols: 2, rows: 2 }, // 2 columns x 2 rows = 4 KPI cards
      items: [
        {
          id: "discount_10",
          title: "10% Discounts",
          metric: "10",
          model: "ecommerceDiscount",
          aggregation: { field: "percentage", value: "10" },
          icon: "mdi:percent",
        },
        {
          id: "discount_20",
          title: "20% Discounts",
          metric: "20",
          model: "ecommerceDiscount",
          aggregation: { field: "percentage", value: "20" },
          icon: "mdi:percent",
        },
        {
          id: "discount_30",
          title: "30% Discounts",
          metric: "30",
          model: "ecommerceDiscount",
          aggregation: { field: "percentage", value: "30" },
          icon: "mdi:percent",
        },
        {
          id: "discount_50",
          title: "50% Discounts",
          metric: "50",
          model: "ecommerceDiscount",
          aggregation: { field: "percentage", value: "50" },
          icon: "mdi:percent",
        },
      ],
    },
    {
      type: "chart",
      items: [
        {
          id: "discountPercentageDistribution",
          title: "Discount Percentage Distribution",
          type: "pie",
          model: "ecommerceDiscount",
          metrics: ["10", "20", "30", "50"],
          config: {
            field: "percentage",
            status: [
              { value: "10", label: "10%", color: "blue", icon: "mdi:percent" },
              {
                value: "20",
                label: "20%",
                color: "green",
                icon: "mdi:percent",
              },
              {
                value: "30",
                label: "30%",
                color: "orange",
                icon: "mdi:percent",
              },
              { value: "50", label: "50%", color: "red", icon: "mdi:percent" },
            ],
          },
        },
      ],
    },
  ],

  // ─────────────────────────────────────────────────────────────
  // Group 3: Discounts Over Time (Trend Analysis)
  // Full-width line chart showing new discount codes over time
  // ─────────────────────────────────────────────────────────────
  {
    type: "chart",
    items: [
      {
        id: "discountsOverTime",
        title: "Discounts Over Time",
        type: "line",
        model: "ecommerceDiscount",
        metrics: ["total"],
        timeframes: ["24h", "7d", "30d", "3m", "6m", "y"],
        labels: {
          total: "New Discounts",
        },
      },
    ],
  },
];
