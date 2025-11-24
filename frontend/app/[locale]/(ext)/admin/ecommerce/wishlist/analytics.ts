import { AnalyticsConfig } from "@/components/blocks/data-table/types/analytics";

export const ecommerceWishlistAnalytics: AnalyticsConfig = [
  // ─────────────────────────────────────────────────────────────
  // Row 1: KPI for Total Wishlists
  // ─────────────────────────────────────────────────────────────
  {
    type: "kpi",
    layout: { cols: 1, rows: 1 },
    items: [
      {
        id: "total_wishlists",
        title: "Total Wishlists",
        metric: "total", // COUNT(*)
        model: "ecommerceWishlist",
        icon: "mdi:heart-outline",
      },
    ],
  },

  // ─────────────────────────────────────────────────────────────
  // Row 2: Line Chart for Wishlists Over Time
  // ─────────────────────────────────────────────────────────────
  {
    type: "chart",
    items: [
      {
        id: "wishlistsOverTime",
        title: "Wishlists Over Time",
        type: "line",
        model: "ecommerceWishlist",
        metrics: ["total"],
        timeframes: ["24h", "7d", "30d", "3m", "6m", "y"],
        labels: {
          total: "Total Wishlists",
        },
      },
    ],
  },
];
