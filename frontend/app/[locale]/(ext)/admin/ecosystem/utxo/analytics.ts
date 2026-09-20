"use client";
import { AnalyticsConfig } from "@/components/blocks/data-table/types/analytics";

import { useTranslations } from "next-intl";
export function useAnalytics() {
  const t = useTranslations("ext_admin");
  const tCommon = useTranslations("common");
  return [
    // ─────────────────────────────────────────────────────────────
    // Group 1: UTXO Overview – KPI Grid & Pie Chart
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
            id: "total_utxos",
            title: t("total_utxos"),
            metric: "total",
            model: "ecosystemUtxo",
            icon: "mdi:counter",
          },
          {
            id: "active_utxos",
            title: t("active_utxos"),
            metric: "active",
            model: "ecosystemUtxo",
            aggregation: { field: "status", value: "true" },
            icon: "mdi:checkbox-marked-circle",
          },
          {
            id: "inactive_utxos",
            title: t("inactive_utxos"),
            metric: "inactive",
            model: "ecosystemUtxo",
            aggregation: { field: "status", value: "false" },
            icon: "mdi:checkbox-blank-circle-outline",
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
            id: "utxoStatusDistribution",
            title: t("utxo_status_distribution"),
            type: "pie",
            model: "ecosystemUtxo",
            metrics: ["active", "inactive"],
            config: {
              field: "status",
              status: [
                {
                  value: "true",
                  label: tCommon("active"),
                  color: "green",
                  icon: "mdi:checkbox-marked-circle",
                },
                {
                  value: "false",
                  label: tCommon("inactive"),
                  color: "red",
                  icon: "mdi:checkbox-blank-circle-outline",
                },
              ],
            },
          },
        ],
      },
    ],

    // ─────────────────────────────────────────────────────────────
    // Group 2: Financial Metrics – KPI Grid
    // ─────────────────────────────────────────────────────────────
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
          id: "total_amount",
          title: tCommon("total_amount"),
          metric: "amount",
          model: "ecosystemUtxo",
          icon: "mdi:cash-multiple",
        },
        {
          id: "average_amount",
          title: t("average_amount"),
          metric: "average",
          model: "ecosystemUtxo",
          icon: "mdi:calculator",
        },
      ],
    },

    // ─────────────────────────────────────────────────────────────
    // Group 3: UTXOs Over Time – Full-Width Line Chart
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
          id: "utxosOverTime",
          title: t("utxos_over_time"),
          type: "line",
          model: "ecosystemUtxo",
          metrics: ["total", "active", "inactive"],
          timeframes: ["24h", "7d", "30d", "3m", "6m", "y"],
          labels: {
            total: "Total",
            active: "Active",
            inactive: "Inactive",
          },
        },
      ],
    },
  ] as AnalyticsConfig;
}
