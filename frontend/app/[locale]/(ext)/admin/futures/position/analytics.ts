"use client";
import { AnalyticsConfig } from "@/components/blocks/data-table/types/analytics";

import { useTranslations } from "next-intl";
export function useAnalytics() {
  const t = useTranslations("ext_admin");
  const tCommon = useTranslations("common");
  return [
    // ─────────────────────────────────────────────────────────────
    // Group 1: Position Status Overview – KPI Grid & Pie Chart
    // ─────────────────────────────────────────────────────────────
    [
      {
        type: "kpi",
        layout: { cols: 2, rows: 2 },
        responsive: {
          mobile: { cols: 1, rows: 4, span: 1 },
        tablet: { cols: 2, rows: 2, span: 2 },
        desktop: { cols: 2, rows: 2, span: 2 },
        },
        items: [
          {
            id: "total_positions",
            title: t("total_positions"),
            metric: "total",
            model: "position",
            icon: "mdi:finance",
          },
          {
            id: "active_positions",
            title: tCommon("active_positions"),
            metric: "ACTIVE",
            model: "position",
            aggregation: { field: "status", value: "ACTIVE" },
            icon: "mdi:door-open",
          },
          {
            id: "closed_positions",
            title: t("closed_positions"),
            metric: "CLOSED",
            model: "position",
            aggregation: { field: "status", value: "CLOSED" },
            icon: "mdi:door-closed",
          },
          {
            id: "liquidated_positions",
            title: t("liquidated_positions"),
            metric: "LIQUIDATED",
            model: "position",
            aggregation: { field: "status", value: "LIQUIDATED" },
            icon: "mdi:alert-circle",
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
            id: "positionStatusDistribution",
            title: t("position_status_distribution"),
            type: "pie",
            model: "position",
            metrics: ["ACTIVE", "CLOSED", "LIQUIDATED"],
            config: {
              field: "status",
              status: [
                {
                  value: "ACTIVE",
                  label: tCommon("active"),
                  color: "blue",
                  icon: "mdi:door-open",
                },
                {
                  value: "CLOSED",
                  label: tCommon("closed"),
                  color: "green",
                  icon: "mdi:door-closed",
                },
                {
                  value: "LIQUIDATED",
                  label: t("liquidated"),
                  color: "red",
                  icon: "mdi:alert-circle",
                },
              ],
            },
          },
        ],
      },
    ],

    // ─────────────────────────────────────────────────────────────
    // Group 2: Positions Over Time – Full-Width Line Chart
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
          id: "positionsOverTime",
          title: t("positions_over_time"),
          type: "line",
          model: "position",
          metrics: ["total", "ACTIVE", "CLOSED", "LIQUIDATED"],
          timeframes: ["24h", "7d", "30d", "3m", "6m", "y"],
          labels: {
            total: "Total",
            ACTIVE: "Active",
            CLOSED: "Closed",
            LIQUIDATED: "Liquidated",
          },
        },
      ],
    },
  ] as AnalyticsConfig;
}
