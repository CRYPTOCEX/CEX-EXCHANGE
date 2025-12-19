"use client";
import { AnalyticsConfig } from "@/components/blocks/data-table/types/analytics";

import { useTranslations } from "next-intl";
export function useAnalytics() {
  const t = useTranslations("ext_admin");
  const tCommon = useTranslations("common");
  const tExt = useTranslations("ext");
  return [
    // ─────────────────────────────────────────────────────────────
    // Group 1: Investment Status Overview – KPI Grid & Pie Chart
    // ─────────────────────────────────────────────────────────────
    [
      {
        type: "kpi",
        layout: { cols: 5, rows: 1 },
        responsive: {
          mobile: { cols: 1, rows: 5, span: 1 },
          tablet: { cols: 2, rows: 3, span: 2 },
          desktop: { cols: 5, rows: 1, span: 2 },
        },
        items: [
          {
            id: "total_ai_investments",
            title: tCommon("total_investments"),
            metric: "total",
            model: "aiInvestment",
            icon: "mdi:chart-line",
          },
          {
            id: "active_investments",
            title: tCommon("active"),
            metric: "ACTIVE",
            model: "aiInvestment",
            aggregation: { field: "status", value: "ACTIVE" },
            icon: "mdi:play-circle",
          },
          {
            id: "completed_investments",
            title: tCommon("completed"),
            metric: "COMPLETED",
            model: "aiInvestment",
            aggregation: { field: "status", value: "COMPLETED" },
            icon: "mdi:check-circle",
          },
          {
            id: "cancelled_investments",
            title: tCommon("cancelled"),
            metric: "CANCELLED",
            model: "aiInvestment",
            aggregation: { field: "status", value: "CANCELLED" },
            icon: "mdi:cancel",
          },
          {
            id: "rejected_investments",
            title: tCommon("rejected"),
            metric: "REJECTED",
            model: "aiInvestment",
            aggregation: { field: "status", value: "REJECTED" },
            icon: "mdi:thumb-down",
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
            id: "aiInvestmentStatusDistribution",
            title: tCommon("status_distribution"),
            type: "pie",
            model: "aiInvestment",
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
    // Group 2: Investment Type Overview – KPI Grid & Pie Chart
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
            id: "spot_investments",
            title: t("spot_investments"),
            metric: "SPOT",
            model: "aiInvestment",
            aggregation: { field: "type", value: "SPOT" },
            icon: "mdi:chart-areaspline",
          },
          {
            id: "eco_investments",
            title: t("eco_investments"),
            metric: "ECO",
            model: "aiInvestment",
            aggregation: { field: "type", value: "ECO" },
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
            id: "aiInvestmentTypeDistribution",
            title: tCommon("type_distribution"),
            type: "pie",
            model: "aiInvestment",
            metrics: ["SPOT", "ECO"],
            config: {
              field: "type",
              status: [
                {
                  value: "SPOT",
                  label: "Spot",
                  color: "blue",
                  icon: "mdi:chart-areaspline",
                },
                {
                  value: "ECO",
                  label: "Eco",
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
    // Group 3: Investment Result Overview – KPI Grid & Pie Chart
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
            model: "aiInvestment",
            aggregation: { field: "result", value: "WIN" },
            icon: "mdi:trophy",
          },
          {
            id: "losing_investments",
            title: tCommon("losing"),
            metric: "LOSS",
            model: "aiInvestment",
            aggregation: { field: "result", value: "LOSS" },
            icon: "mdi:thumb-down",
          },
          {
            id: "draw_investments",
            title: tCommon("draw"),
            metric: "DRAW",
            model: "aiInvestment",
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
            id: "aiInvestmentResultDistribution",
            title: t("result_distribution"),
            type: "pie",
            model: "aiInvestment",
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
                  color: "grey",
                  icon: "mdi:gesture-tap",
                },
              ],
            },
          },
        ],
      },
    ],

    // ─────────────────────────────────────────────────────────────
    // Group 4: Financial Metrics – KPI Grid
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
          id: "total_investment_amount",
          title: t("total_investment_amount"),
          metric: "amount",
          model: "aiInvestment",
          icon: "mdi:cash-multiple",
        },
        {
          id: "total_profit",
          title: tExt("total_profit"),
          metric: "profit",
          model: "aiInvestment",
          icon: "mdi:cash-plus",
        },
        {
          id: "average_investment",
          title: t("average_investment"),
          metric: "average",
          model: "aiInvestment",
          icon: "mdi:calculator",
        },
      ],
    },

    // ─────────────────────────────────────────────────────────────
    // Group 5: Investment Trends Over Time – Full-Width Line Chart
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
          id: "aiInvestmentsOverTime",
          title: tCommon("investments_over_time"),
          type: "line",
          model: "aiInvestment",
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
    // Group 6: Investment Types Over Time – Full-Width Stacked Area Chart
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
          id: "aiInvestmentsByType",
          title: t("investments_by_type"),
          type: "stackedArea",
          model: "aiInvestment",
          metrics: ["SPOT", "ECO"],
          timeframes: ["24h", "7d", "30d", "3m", "6m", "y"],
          labels: {
            SPOT: "Spot",
            ECO: "Eco",
          },
        },
      ],
    },
  ] as AnalyticsConfig;
}
