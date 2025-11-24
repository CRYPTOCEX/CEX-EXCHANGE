import { AnalyticsConfig } from "@/components/blocks/data-table/types/analytics";

export const ecommerceProductAnalytics: AnalyticsConfig = [
  // ─────────────────────────────────────────────────────────────
  // Group 1: Product Overview (Status & Type)
  // Left: KPI Grid (3 columns × 2 rows)
  // Right: Pie chart for Product Type Distribution
  // ─────────────────────────────────────────────────────────────
  [
    {
      type: "kpi",
      layout: { cols: 3, rows: 2 },
      items: [
        {
          id: "total_products",
          title: "Total Products",
          metric: "total", // COUNT(*)
          model: "ecommerceProduct",
          icon: "mdi:storefront",
        },
        {
          id: "active_products",
          title: "Status",
          metric: "active",
          model: "ecommerceProduct",
          aggregation: { field: "status", value: "true" },
          icon: "mdi:check-circle",
        },
        {
          id: "inactive_products",
          title: "Inactive",
          metric: "inactive",
          model: "ecommerceProduct",
          aggregation: { field: "status", value: "false" },
          icon: "mdi:close-circle",
        },
        {
          id: "outofstock_products",
          title: "Out-of-Stock",
          metric: "outofstock",
          model: "ecommerceProduct",
          aggregation: { field: "inventoryQuantity", value: "0" },
          icon: "mdi:package-variant-remove",
        },
        {
          id: "downloadable_products",
          title: "Downloadable",
          metric: "DOWNLOADABLE",
          model: "ecommerceProduct",
          aggregation: { field: "type", value: "DOWNLOADABLE" },
          icon: "mdi:download",
        },
        {
          id: "physical_products",
          title: "Physical",
          metric: "PHYSICAL",
          model: "ecommerceProduct",
          aggregation: { field: "type", value: "PHYSICAL" },
          icon: "mdi:truck",
        },
      ],
    },
    {
      type: "chart",
      items: [
        {
          id: "productTypeDistribution",
          title: "Product Type Distribution",
          type: "pie",
          model: "ecommerceProduct",
          metrics: ["DOWNLOADABLE", "PHYSICAL"],
          config: {
            field: "type",
            status: [
              {
                value: "DOWNLOADABLE",
                label: "Downloadable",
                color: "blue",
                icon: "mdi:download",
              },
              {
                value: "PHYSICAL",
                label: "Physical",
                color: "green",
                icon: "mdi:truck",
              },
            ],
          },
        },
      ],
    },
  ],

  // ─────────────────────────────────────────────────────────────
  // Group 2: Wallet Type Distribution
  // Left: KPI Grid (3 columns × 1 row)
  // Right: Pie chart for Wallet Type Distribution
  // ─────────────────────────────────────────────────────────────
  [
    {
      type: "kpi",
      layout: { cols: 3, rows: 1 },
      items: [
        {
          id: "fiat_products",
          title: "FIAT",
          metric: "FIAT",
          model: "ecommerceProduct",
          aggregation: { field: "walletType", value: "FIAT" },
          icon: "mdi:currency-usd",
        },
        {
          id: "spot_products",
          title: "SPOT",
          metric: "SPOT",
          model: "ecommerceProduct",
          aggregation: { field: "walletType", value: "SPOT" },
          icon: "mdi:chart-line",
        },
        {
          id: "eco_products",
          title: "ECO",
          metric: "ECO",
          model: "ecommerceProduct",
          aggregation: { field: "walletType", value: "ECO" },
          icon: "mdi:leaf",
        },
      ],
    },
    {
      type: "chart",
      items: [
        {
          id: "walletTypeDistribution",
          title: "Wallet Type Distribution",
          type: "pie",
          model: "ecommerceProduct",
          metrics: ["FIAT", "SPOT", "ECO"],
          config: {
            field: "walletType",
            status: [
              {
                value: "FIAT",
                label: "FIAT",
                color: "gold",
                icon: "mdi:currency-usd",
              },
              {
                value: "SPOT",
                label: "SPOT",
                color: "blue",
                icon: "mdi:chart-line",
              },
              {
                value: "ECO",
                label: "ECO",
                color: "green",
                icon: "mdi:leaf",
              },
            ],
          },
        },
      ],
    },
  ],

  // ─────────────────────────────────────────────────────────────
  // Group 3: Time-Series – New Product Additions Over Time
  // Full-width line chart
  // ─────────────────────────────────────────────────────────────
  {
    type: "chart",
    items: [
      {
        id: "productsOverTime",
        title: "Products Over Time",
        type: "line",
        model: "ecommerceProduct",
        metrics: ["total"],
        timeframes: ["24h", "7d", "30d", "3m", "6m", "y"],
        labels: {
          total: "New Products",
        },
      },
    ],
  },
];
