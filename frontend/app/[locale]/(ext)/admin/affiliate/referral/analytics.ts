"use client";
import { AnalyticsConfig } from "@/components/blocks/data-table/types/analytics";

import { useTranslations } from "next-intl";
export function useAnalytics() {
  const tCommon = useTranslations("common");
  const tExt = useTranslations("ext");
  return [
    // ─────────────────────────────────────────────────────────────
    // Group 1: Referral Status Overview – KPI Grid & Pie Chart
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
            id: "total_referrals",
            title: tExt("total_referrals"),
            metric: "total",
            model: "mlmReferral",
            icon: "mdi:account-multiple",
          },
          {
            id: "pending_referrals",
            title: tCommon("pending"),
            metric: "PENDING",
            model: "mlmReferral",
            aggregation: { field: "status", value: "PENDING" },
            icon: "mdi:clock-outline",
          },
          {
            id: "active_referrals",
            title: tCommon("active"),
            metric: "ACTIVE",
            model: "mlmReferral",
            aggregation: { field: "status", value: "ACTIVE" },
            icon: "mdi:check-circle",
          },
          {
            id: "rejected_referrals",
            title: tCommon("rejected"),
            metric: "REJECTED",
            model: "mlmReferral",
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
            id: "referralStatusDistribution",
            title: tCommon("status_distribution"),
            type: "pie",
            model: "mlmReferral",
            metrics: ["PENDING", "ACTIVE", "REJECTED"],
            config: {
              field: "status",
              status: [
                {
                  value: "PENDING",
                  label: tCommon("pending"),
                  color: "orange",
                  icon: "mdi:clock-outline",
                },
                {
                  value: "ACTIVE",
                  label: tCommon("active"),
                  color: "green",
                  icon: "mdi:check-circle",
                },
                {
                  value: "REJECTED",
                  label: tCommon("rejected"),
                  color: "red",
                  icon: "mdi:thumb-down",
                },
              ],
            },
          },
        ],
      },
    ],

    // ─────────────────────────────────────────────────────────────
    // Group 2: Referral Trends – Full-Width Line Chart
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
          id: "referralsOverTime",
          title: tCommon("referrals_over_time"),
          type: "line",
          model: "mlmReferral",
          metrics: ["total", "PENDING", "ACTIVE", "REJECTED"],
          timeframes: ["24h", "7d", "30d", "3m", "6m", "y"],
          labels: {
            total: "Total Referrals",
            PENDING: "Pending",
            ACTIVE: "Active",
            REJECTED: "Rejected",
          },
        },
      ],
    },
  ] as AnalyticsConfig;
}
