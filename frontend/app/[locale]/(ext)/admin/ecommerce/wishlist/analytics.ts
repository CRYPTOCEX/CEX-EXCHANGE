"use client";
import { AnalyticsConfig } from "@/components/blocks/data-table/types/analytics";

import { useTranslations } from "next-intl";
export function useAnalytics() {
  const t = useTranslations("ext_admin");
  return [
    // ─────────────────────────────────────────────────────────────
    // Group 1: Wishlist Overview - KPI Grid
    // ─────────────────────────────────────────────────────────────
    {
      type: "kpi",
      layout: { cols: 1, rows: 1 },
      responsive: {
        mobile: { cols: 1, rows: 1, span: 1 },
        tablet: { cols: 1, rows: 1, span: 1 },
        desktop: { cols: 1, rows: 1, span: 1 },
      },
      items: [
        {
          id: "total_wishlists",
          title: t("total_wishlists"),
          metric: "total",
          model: "ecommerceWishlist",
          icon: "mdi:heart-multiple",
        },
      ],
    },

    // ─────────────────────────────────────────────────────────────
    // Group 2: Wishlist Trends Over Time - Full-Width Line Chart
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
          id: "wishlistsOverTime",
          title: t("wishlists_over_time"),
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
  ] as AnalyticsConfig;
}
