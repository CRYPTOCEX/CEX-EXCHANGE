import { AnalyticsConfig } from "@/components/blocks/data-table/types/analytics";

export const nftCategoryAnalytics: AnalyticsConfig = [
  // ─────────────────────────────────────────────────────────────
  // Group 1: Category Overview – KPI Grid on Left, Pie Chart on Right
  // ─────────────────────────────────────────────────────────────
  [
    {
      type: "kpi",
      layout: { cols: 3, rows: 2 },
      responsive: {
        mobile: { cols: 1, rows: 6, span: 1 },
          tablet: { cols: 2, rows: 3, span: 2 },
          desktop: { cols: 3, rows: 2, span: 2 },
      },
      items: [
        {
          id: "total_categories",
          title: "Total Categories",
          metric: "total",
          model: "nftCategory",
          icon: "mdi:tag-multiple",
        },
        {
          id: "active_categories",
          title: "Active Categories",
          metric: "active",
          model: "nftCategory",
          aggregation: { field: "status", value: true },
          icon: "mdi:check-circle",
        },
        {
          id: "inactive_categories",
          title: "Inactive Categories",
          metric: "inactive",
          model: "nftCategory",
          aggregation: { field: "status", value: false },
          icon: "mdi:minus-circle",
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
          id: "categoryStatusDistribution",
          title: "Category Status Distribution",
          type: "pie",
          model: "nftCategory",
          metrics: ["active", "inactive"],
          config: {
            field: "status",
            status: [
              {
                value: true,
                label: "Active",
                color: "green",
                icon: "mdi:check-circle",
              },
              {
                value: false,
                label: "Inactive",
                color: "gray",
                icon: "mdi:minus-circle",
              },
            ],
          },
        },
      ],
    },
  ],

  // ─────────────────────────────────────────────────────────────
  // Group 2: Categories Over Time – Full-Width Line Chart
  // ─────────────────────────────────────────────────────────────
  {
    type: "chart",
    responsive: {
      mobile: { cols: 1, rows: 1, span: 1 },
      tablet: { cols: 1, rows: 1, span: 1 },
      desktop: { cols: 1, rows: 1, span: 1 },
    },
    items: [
      {
        id: "categoriesOverTime",
        title: "Categories Over Time",
        type: "line",
        model: "nftCategory",
        metrics: ["total", "active", "inactive"],
        timeframes: ["24h", "7d", "30d", "3m", "6m", "y"],
        labels: {
          total: "Total Categories",
          active: "Active Categories",
          inactive: "Inactive Categories",
        },
      },
    ],
  },
] satisfies AnalyticsConfig;