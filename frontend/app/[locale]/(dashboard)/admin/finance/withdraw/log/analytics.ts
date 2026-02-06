"use client";
import { AnalyticsConfig } from "@/components/blocks/data-table/types/analytics";
import { useTranslations } from "next-intl";

export function useAnalytics(): AnalyticsConfig {
  const t = useTranslations("common");

  return [
    // ─────────────────────────────────────────────────────────────
    // Group 1: Withdrawal Status Overview – KPI Grid & Pie Chart
    // Layout: KPIs take 2/3 width, Pie chart takes 1/3 width on desktop
    // ─────────────────────────────────────────────────────────────
    [
      {
        type: "kpi",
        responsive: {
          // Mobile: single column, all KPIs stacked
          mobile: { cols: 1 },
          // Tablet: 2 columns for KPIs, span full width (2 cols)
          tablet: { cols: 2, span: 2 },
          // Desktop: 3 columns for KPIs in 2 rows, span 2/3 of parent (2 of 3 cols)
          desktop: { cols: 3, rows: 2, span: 2 },
        },
        items: [
          {
            id: "total_withdrawals",
            title: t("total_withdrawals"),
            metric: "total",
            model: "transaction",
            icon: "mdi:bank-transfer-out",
          },
          {
            id: "pending_withdrawals",
            title: t("pending"),
            metric: "PENDING",
            model: "transaction",
            aggregation: { field: "status", value: "PENDING" },
            icon: "mdi:clock-outline",
          },
          {
            id: "completed_withdrawals",
            title: t("completed"),
            metric: "COMPLETED",
            model: "transaction",
            aggregation: { field: "status", value: "COMPLETED" },
            icon: "mdi:check-circle",
          },
          {
            id: "failed_withdrawals",
            title: t("failed"),
            metric: "FAILED",
            model: "transaction",
            aggregation: { field: "status", value: "FAILED" },
            icon: "mdi:alert-circle",
          },
          {
            id: "cancelled_withdrawals",
            title: t("cancelled"),
            metric: "CANCELLED",
            model: "transaction",
            aggregation: { field: "status", value: "CANCELLED" },
            icon: "mdi:cancel",
          },
        ],
      },
      {
        type: "chart",
        responsive: {
          // Mobile: full width
          mobile: { span: 1 },
          // Tablet: full width below KPIs
          tablet: { span: 2 },
          // Desktop: 1/3 width beside KPIs (1 of 3 cols)
          desktop: { span: 1 },
        },
        items: [
          {
            id: "withdrawal_status_chart",
            title: t("status_distribution"),
            type: "pie",
            model: "transaction",
            metrics: ["PENDING", "PROCESSING", "COMPLETED", "FAILED", "CANCELLED"],
            config: {
              field: "status",
              status: [
                {
                  value: "PENDING",
                  label: t("pending"),
                  color: "orange",
                  icon: "mdi:clock-outline",
                },
                {
                  value: "PROCESSING",
                  label: t("processing"),
                  color: "blue",
                  icon: "mdi:sync",
                },
                {
                  value: "COMPLETED",
                  label: t("completed"),
                  color: "green",
                  icon: "mdi:check-circle",
                },
                {
                  value: "FAILED",
                  label: t("failed"),
                  color: "red",
                  icon: "mdi:alert-circle",
                },
                {
                  value: "CANCELLED",
                  label: t("cancelled"),
                  color: "gray",
                  icon: "mdi:cancel",
                },
              ],
            },
          },
        ],
      },
    ],
  ];
}
