"use client";
import { AnalyticsConfig } from "@/components/blocks/data-table/types/analytics";

import { useTranslations } from "next-intl";
export function useAnalytics() {
  const t = useTranslations("ext_admin");
  const tCommon = useTranslations("common");
  const tExt = useTranslations("ext");
  return [
    // ─────────────────────────────────────────────────────────────
    // Group 1: Product Status Overview - KPI Grid & Pie Chart
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
            id: "total_products",
            title: t("total_products"),
            metric: "total",
            model: "ecommerceProduct",
            icon: "mdi:storefront",
          },
          {
            id: "active_products",
            title: tCommon("active"),
            metric: "active",
            model: "ecommerceProduct",
            aggregation: { field: "status", value: "true" },
            icon: "mdi:check-circle",
          },
          {
            id: "inactive_products",
            title: tCommon("inactive"),
            metric: "inactive",
            model: "ecommerceProduct",
            aggregation: { field: "status", value: "false" },
            icon: "mdi:close-circle",
          },
          {
            id: "downloadable_products",
            title: t("downloadable"),
            metric: "DOWNLOADABLE",
            model: "ecommerceProduct",
            aggregation: { field: "type", value: "DOWNLOADABLE" },
            icon: "mdi:download",
          },
          {
            id: "physical_products",
            title: t("physical"),
            metric: "PHYSICAL",
            model: "ecommerceProduct",
            aggregation: { field: "type", value: "PHYSICAL" },
            icon: "mdi:truck",
          },
          {
            id: "outofstock_products",
            title: tExt("out_of_stock"),
            metric: "outofstock",
            model: "ecommerceProduct",
            aggregation: { field: "inventoryQuantity", value: "0" },
            icon: "mdi:package-variant-remove",
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
            id: "productStatusDistribution",
            title: tCommon("status_distribution"),
            type: "pie",
            model: "ecommerceProduct",
            metrics: ["active", "inactive"],
            config: {
              field: "status",
              status: [
                {
                  value: "true",
                  label: tCommon("active"),
                  color: "green",
                  icon: "mdi:check-circle",
                },
                {
                  value: "false",
                  label: tCommon("inactive"),
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
    // Group 2: Product Type Distribution - KPI Grid & Pie Chart
    // ─────────────────────────────────────────────────────────────
    [
      {
        type: "kpi",
        layout: { cols: 2, rows: 1 },
        responsive: {
          mobile: { cols: 1, rows: 2, span: 1 },
          tablet: { cols: 2, rows: 1, span: 2 },
          desktop: { cols: 2, rows: 1, span: 2 },
        },
        items: [
          {
            id: "downloadable_type_products",
            title: t("downloadable"),
            metric: "DOWNLOADABLE",
            model: "ecommerceProduct",
            aggregation: { field: "type", value: "DOWNLOADABLE" },
            icon: "mdi:download",
          },
          {
            id: "physical_type_products",
            title: t("physical"),
            metric: "PHYSICAL",
            model: "ecommerceProduct",
            aggregation: { field: "type", value: "PHYSICAL" },
            icon: "mdi:truck",
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
            id: "productTypeDistribution",
            title: t("product_type_distribution"),
            type: "pie",
            model: "ecommerceProduct",
            metrics: ["DOWNLOADABLE", "PHYSICAL"],
            config: {
              field: "type",
              status: [
                {
                  value: "DOWNLOADABLE",
                  label: t("downloadable"),
                  color: "blue",
                  icon: "mdi:download",
                },
                {
                  value: "PHYSICAL",
                  label: t("physical"),
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
    // Group 3: Wallet Type Distribution - KPI Grid & Pie Chart
    // ─────────────────────────────────────────────────────────────
    [
      {
        type: "kpi",
        layout: { cols: 3, rows: 1 },
        responsive: {
          mobile: { cols: 1, rows: 3, span: 1 },
          tablet: { cols: 3, rows: 1, span: 2 },
          desktop: { cols: 3, rows: 1, span: 2 },
        },
        items: [
          {
            id: "fiat_products",
            title: tCommon("fiat"),
            metric: "FIAT",
            model: "ecommerceProduct",
            aggregation: { field: "walletType", value: "FIAT" },
            icon: "mdi:currency-usd",
          },
          {
            id: "spot_products",
            title: tCommon("spot"),
            metric: "SPOT",
            model: "ecommerceProduct",
            aggregation: { field: "walletType", value: "SPOT" },
            icon: "mdi:chart-line",
          },
          {
            id: "eco_products",
            title: tCommon("eco"),
            metric: "ECO",
            model: "ecommerceProduct",
            aggregation: { field: "walletType", value: "ECO" },
            icon: "mdi:leaf",
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
            id: "walletTypeDistribution",
            title: tCommon("wallet_type_distribution"),
            type: "pie",
            model: "ecommerceProduct",
            metrics: ["FIAT", "SPOT", "ECO"],
            config: {
              field: "walletType",
              status: [
                {
                  value: "FIAT",
                  label: tCommon("fiat"),
                  color: "amber",
                  icon: "mdi:currency-usd",
                },
                {
                  value: "SPOT",
                  label: tCommon("spot"),
                  color: "blue",
                  icon: "mdi:chart-line",
                },
                {
                  value: "ECO",
                  label: tCommon("eco"),
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
    // Group 4: Financial & Inventory Metrics - KPI Grid
    // ─────────────────────────────────────────────────────────────
    {
      type: "kpi",
      layout: { cols: 3, rows: 1 },
      responsive: {
        mobile: { cols: 1, rows: 3, span: 1 },
          tablet: { cols: 3, rows: 1, span: 2 },
          desktop: { cols: 3, rows: 1, span: 2 },
      },
      items: [
        {
          id: "total_product_value",
          title: "Total Inventory Value",
          metric: "price",
          model: "ecommerceProduct",
          icon: "mdi:cash-multiple",
        },
        {
          id: "average_product_price",
          title: "Average Product Price",
          metric: "average",
          model: "ecommerceProduct",
          icon: "mdi:calculator",
        },
        {
          id: "total_inventory_quantity",
          title: "Total Inventory Quantity",
          metric: "inventoryQuantity",
          model: "ecommerceProduct",
          icon: "mdi:package-variant",
        },
      ],
    },

    // ─────────────────────────────────────────────────────────────
    // Group 5: Product Trends Over Time - Full-Width Line Chart
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
          id: "productsOverTime",
          title: t("products_over_time"),
          type: "line",
          model: "ecommerceProduct",
          metrics: ["total", "DOWNLOADABLE", "PHYSICAL", "active", "inactive"],
          timeframes: ["24h", "7d", "30d", "3m", "6m", "y"],
          labels: {
            total: "Total Products",
            DOWNLOADABLE: "Downloadable",
            PHYSICAL: "Physical",
            active: "Active",
            inactive: "Inactive",
          },
        },
      ],
    },
  ] as AnalyticsConfig;
}
