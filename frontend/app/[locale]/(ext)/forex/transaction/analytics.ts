"use client";

import { AnalyticsConfig } from "@/components/blocks/data-table/types/analytics";

import { useTranslations } from "next-intl";
export function useAnalytics() {
  const t = useTranslations("ext_forex");
  const tCommon = useTranslations("common");
  const tExt = useTranslations("ext");
  return [
  // First row: KPI cards and status distribution pie chart
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
          id: "total_transactions",
          title: tCommon("total_transactions"),
          metric: "total",
          model: "transaction",
          icon: "Receipt",
        },
        {
          id: "pending_transactions",
          title: tExt("pending_transactions"),
          metric: "pending",
          model: "transaction",
          aggregation: { field: "status", value: "PENDING" },
          icon: "Clock",
        },
        {
          id: "completed_transactions",
          title: tExt("completed_transactions"),
          metric: "completed",
          model: "transaction",
          aggregation: { field: "status", value: "COMPLETED" },
          icon: "CheckCircle",
        },
        {
          id: "failed_transactions",
          title: tExt("failed_transactions"),
          metric: "failed",
          model: "transaction",
          aggregation: { field: "status", value: "FAILED" },
          icon: "AlertCircle",
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
          id: "transactionStatusDistribution",
          title: t("transaction_status_distribution"),
          type: "pie",
          model: "transaction",
          metrics: ["completed", "pending", "failed", "cancelled", "rejected"],
          config: {
            field: "status",
            status: [
              {
                value: "COMPLETED",
                label: tCommon("completed"),
                color: "green",
                icon: "CheckCircle",
              },
              {
                value: "PENDING",
                label: tCommon("pending"),
                color: "amber",
                icon: "Clock",
              },
              {
                value: "FAILED",
                label: tCommon("failed"),
                color: "red",
                icon: "AlertCircle",
              },
              {
                value: "CANCELLED",
                label: tCommon("cancelled"),
                color: "gray",
                icon: "XCircle",
              },
              {
                value: "REJECTED",
                label: tCommon("rejected"),
                color: "red",
                icon: "AlertTriangle",
              },
            ],
          },
        },
      ],
    },
  ],
  // Second row: Transaction type distribution
  [
    {
      type: "chart",
      responsive: {
        mobile: { cols: 1, rows: 1, span: 1 },
        tablet: { cols: 1, rows: 1, span: 1 },
        desktop: { cols: 1, rows: 1, span: 1 },
      },
      items: [
        {
          id: "transactionTypeDistribution",
          title: tCommon("transaction_type_distribution"),
          type: "pie",
          model: "transaction",
          metrics: ["forex_deposit", "forex_withdraw"],
          config: {
            field: "type",
            status: [
              {
                value: "FOREX_DEPOSIT",
                label: tCommon("deposits"),
                color: "green",
                icon: "ArrowDown",
              },
              {
                value: "FOREX_WITHDRAW",
                label: tCommon("withdrawals"),
                color: "orange",
                icon: "ArrowUp",
              },
            ],
          },
        },
      ],
    },
  ],
  // Third row: Transaction trends over time
  [
    {
      type: "chart",
      responsive: {
        mobile: { cols: 1, rows: 1, span: 1 },
        tablet: { cols: 1, rows: 1, span: 1 },
        desktop: { cols: 1, rows: 1, span: 1 },
      },
      items: [
        {
          id: "transactionsOverTime",
          title: tCommon("transactions_over_time"),
          type: "line",
          model: "transaction",
          metrics: ["total"],
          timeframes: ["24h", "7d", "30d", "3m", "6m", "y"],
          labels: {
            total: "Total Transactions",
          },
        },
      ],
    },
  ],
] as AnalyticsConfig;
}
