"use client";

import { AnalyticsConfig } from "@/components/blocks/data-table/types/analytics";

import { useTranslations } from "next-intl";
export function useAnalytics() {
  const t = useTranslations("finance_history");
  const tCommon = useTranslations("common");
  return [
  // ─────────────────────────────────────────────────────────────
  // Group 1: Transaction Status Overview – KPI Grid & Pie Chart
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
          id: "total_transactions",
          title: tCommon("total_transactions"),
          metric: "total", // COUNT(*)
          model: "transaction",
          icon: "mdi:tag-outline",
        },
        {
          id: "pending_transactions",
          title: tCommon("pending"),
          metric: "PENDING",
          model: "transaction",
          aggregation: { field: "status", value: "PENDING" },
          icon: "mdi:clock-outline",
        },
        {
          id: "completed_transactions",
          title: tCommon("completed"),
          metric: "COMPLETED",
          model: "transaction",
          aggregation: { field: "status", value: "COMPLETED" },
          icon: "mdi:check-circle",
        },
        {
          id: "failed_transactions",
          title: tCommon("failed"),
          metric: "FAILED",
          model: "transaction",
          aggregation: { field: "status", value: "FAILED" },
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
          id: "transactionStatusDistribution",
          title: tCommon("status_distribution"),
          type: "pie",
          model: "transaction",
          metrics: ["PENDING", "COMPLETED", "FAILED", "CANCELLED"],
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
                value: "COMPLETED",
                label: tCommon("completed"),
                color: "green",
                icon: "mdi:check-circle",
              },
              {
                value: "FAILED",
                label: tCommon("failed"),
                color: "red",
                icon: "mdi:alert-circle",
              },
              {
                value: "CANCELLED",
                label: tCommon("cancelled"),
                color: "purple",
                icon: "mdi:cancel",
              },
            ],
          },
        },
      ],
    },
  ],

  // ─────────────────────────────────────────────────────────────
  // Group 2: Transaction Type Distribution – KPI Grid & Pie Chart
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
          id: "deposit_transactions",
          title: tCommon("deposits"),
          metric: "DEPOSIT",
          model: "transaction",
          aggregation: { field: "type", value: "DEPOSIT" },
          icon: "mdi:bank-transfer-in",
        },
        {
          id: "withdraw_transactions",
          title: tCommon("withdrawals"),
          metric: "WITHDRAW",
          model: "transaction",
          aggregation: { field: "type", value: "WITHDRAW" },
          icon: "mdi:bank-transfer-out",
        },
        {
          id: "payment_transactions",
          title: tCommon("payments"),
          metric: "PAYMENT",
          model: "transaction",
          aggregation: { field: "type", value: "PAYMENT" },
          icon: "mdi:cash-fast",
        },
        {
          id: "refund_transactions",
          title: tCommon("refunds"),
          metric: "REFUND",
          model: "transaction",
          aggregation: { field: "type", value: "REFUND" },
          icon: "mdi:cash-refund",
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
          id: "transactionTypeDistribution",
          title: tCommon("type_distribution"),
          type: "pie",
          model: "transaction",
          metrics: ["DEPOSIT", "WITHDRAW", "PAYMENT", "REFUND"],
          config: {
            field: "type",
            status: [
              {
                value: "DEPOSIT",
                label: tCommon("deposit"),
                color: "green",
                icon: "mdi:bank-transfer-in",
              },
              {
                value: "WITHDRAW",
                label: tCommon("withdraw"),
                color: "red",
                icon: "mdi:bank-transfer-out",
              },
              {
                value: "PAYMENT",
                label: tCommon("payment"),
                color: "blue",
                icon: "mdi:cash-fast",
              },
              {
                value: "REFUND",
                label: tCommon("refund"),
                color: "purple",
                icon: "mdi:cash-refund",
              },
            ],
          },
        },
      ],
    },
  ],

  // ─────────────────────────────────────────────────────────────
  // Group 3: Financial Overview – KPI Grid
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
        id: "total_transaction_amount",
        title: tCommon("total_amount"),
        metric: "amount", // SUM(amount); aggregator must perform a SUM operation
        model: "transaction",
        icon: "mdi:cash-multiple",
      },
      {
        id: "total_fees",
        title: tCommon("total_fees"),
        metric: "fee", // SUM(fee)
        model: "transaction",
        icon: "mdi:cash",
      },
      {
        id: "average_transaction_amount",
        title: t("avg_amount"),
        metric: "average", // Custom aggregator: average of amount
        model: "transaction",
        icon: "mdi:calculator",
      },
    ],
  },

  // ─────────────────────────────────────────────────────────────
  // Group 4: Transaction Trends Over Time – Full-Width Line Chart
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
        id: "transactionsOverTime",
        title: tCommon("transactions_over_time"),
        type: "line",
        model: "transaction",
        metrics: [
          "total",
          "PENDING",
          "COMPLETED",
          "FAILED",
          "CANCELLED",
          "EXPIRED",
          "REJECTED",
          "REFUNDED",
          "FROZEN",
          "PROCESSING",
          "TIMEOUT",
        ],
        timeframes: ["24h", "7d", "30d", "3m", "6m", "y"],
        labels: {
          total: "Total",
          PENDING: "Pending",
          COMPLETED: "Completed",
          FAILED: "Failed",
          CANCELLED: "Cancelled",
          EXPIRED: "Expired",
          REJECTED: "Rejected",
          REFUNDED: "Refunded",
          FROZEN: "Frozen",
          PROCESSING: "Processing",
          TIMEOUT: "Timeout",
        },
      },
    ],
  },
] as AnalyticsConfig;
}
