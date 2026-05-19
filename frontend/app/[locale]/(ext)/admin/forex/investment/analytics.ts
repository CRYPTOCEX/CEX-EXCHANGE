"use client";
import { AnalyticsConfig } from "@/components/blocks/data-table/types/analytics";

import { useTranslations } from "next-intl";
export function useAnalytics() {
  const t = useTranslations("ext_admin");
  const tCommon = useTranslations("common");
  return [
    // ─────────────────────────────────────────────────────────────
    // Group 1: Status Overview – KPI Grid on Left, Pie Chart on Right
    // ─────────────────────────────────────────────────────────────
    [
      {
        type: "kpi",
        layout: { cols: 3, rows: 2 },
        responsive: {
          mobile: { cols: 1, rows: 5, span: 1 },
          tablet: { cols: 2, rows: 3, span: 2 },
          desktop: { cols: 3, rows: 2, span: 2 },
        },
        items: [
          {
            id: "total_forex_investments",
            title: tCommon("total_investments"),
            metric: "total", // COUNT(*)
            model: "forexInvestment",
            icon: "mdi:chart-line",
          },
          {
            id: "active_investments",
            title: tCommon("active"),
            metric: "ACTIVE",
            model: "forexInvestment",
            aggregation: { field: "status", value: "ACTIVE" },
            icon: "mdi:play-circle",
          },
          {
            id: "completed_investments",
            title: tCommon("completed"),
            metric: "COMPLETED",
            model: "forexInvestment",
            aggregation: { field: "status", value: "COMPLETED" },
            icon: "mdi:check-circle",
          },
          {
            id: "cancelled_investments",
            title: tCommon("cancelled"),
            metric: "CANCELLED",
            model: "forexInvestment",
            aggregation: { field: "status", value: "CANCELLED" },
            icon: "mdi:cancel",
          },
          {
            id: "rejected_investments",
            title: tCommon("rejected"),
            metric: "REJECTED",
            model: "forexInvestment",
            aggregation: { field: "status", value: "REJECTED" },
            icon: "mdi:thumb-down",
          },
          // If needed, you can add a sixth KPI (e.g. Total Profit) if aggregator logic is updated.
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
            id: "forexInvestmentStatusDistribution",
            title: tCommon("status_distribution"),
            type: "pie",
            model: "forexInvestment",
            metrics: ["ACTIVE", "COMPLETED", "CANCELLED", "REJECTED"],
            config: {
              field: "status",
              status: [
                {
                  value: "ACTIVE",
                  label: tCommon("active"),
                  color: "blue",
                  icon: "mdi:play-circle",
                },
                {
                  value: "COMPLETED",
                  label: tCommon("completed"),
                  color: "green",
                  icon: "mdi:check-circle",
                },
                {
                  value: "CANCELLED",
                  label: tCommon("cancelled"),
                  color: "red",
                  icon: "mdi:cancel",
                },
                {
                  value: "REJECTED",
                  label: tCommon("rejected"),
                  color: "purple",
                  icon: "mdi:thumb-down",
                },
              ],
            },
          },
        ],
      },
    ],

    // ─────────────────────────────────────────────────────────────
    // Group 2: Result Overview – KPI Grid on Left, Pie Chart on Right
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
            id: "winning_investments",
            title: tCommon("winning"),
            metric: "WIN",
            model: "forexInvestment",
            aggregation: { field: "result", value: "WIN" },
            icon: "mdi:trophy",
          },
          {
            id: "losing_investments",
            title: tCommon("losing"),
            metric: "LOSS",
            model: "forexInvestment",
            aggregation: { field: "result", value: "LOSS" },
            icon: "mdi:thumb-down",
          },
          {
            id: "draw_investments",
            title: tCommon("draw"),
            metric: "DRAW",
            model: "forexInvestment",
            aggregation: { field: "result", value: "DRAW" },
            icon: "mdi:gesture-tap",
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
            id: "forexInvestmentResultDistribution",
            title: t("result_distribution"),
            type: "pie",
            model: "forexInvestment",
            metrics: ["WIN", "LOSS", "DRAW"],
            config: {
              field: "result",
              status: [
                {
                  value: "WIN",
                  label: tCommon("win"),
                  color: "green",
                  icon: "mdi:trophy",
                },
                {
                  value: "LOSS",
                  label: tCommon("loss"),
                  color: "red",
                  icon: "mdi:thumb-down",
                },
                {
                  value: "DRAW",
                  label: tCommon("draw"),
                  color: "gray",
                  icon: "mdi:gesture-tap",
                },
              ],
            },
          },
        ],
      },
    ],

    // ─────────────────────────────────────────────────────────────
    // Group 3: Investments Over Time by Status – Full-Width Line Chart
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
          id: "forexInvestmentsOverTime",
          title: t("investments_over_time_status"),
          type: "line",
          model: "forexInvestment",
          metrics: ["total", "ACTIVE", "COMPLETED", "CANCELLED", "REJECTED"],
          timeframes: ["24h", "7d", "30d", "3m", "6m", "y"],
          labels: {
            total: "Total",
            ACTIVE: "Active",
            COMPLETED: "Completed",
            CANCELLED: "Cancelled",
            REJECTED: "Rejected",
          },
        },
      ],
    },

    // ─────────────────────────────────────────────────────────────
    // Group 4: Investments Over Time by Result – Full-Width Stacked Area Chart
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
          id: "forexInvestmentsOverTimeByResult",
          title: t("investments_over_time_result"),
          type: "stackedArea",
          model: "forexInvestment",
          metrics: ["WIN", "LOSS", "DRAW"],
          timeframes: ["24h", "7d", "30d", "3m", "6m", "y"],
          labels: {
            WIN: "Win",
            LOSS: "Loss",
            DRAW: "Draw",
          },
        },
      ],
    },
  ] as AnalyticsConfig;
}
