"use client";
import { AnalyticsConfig } from "@/components/blocks/data-table/types/analytics";
import { useTranslations } from "next-intl";

export function useAnalytics(): AnalyticsConfig {
  const t = useTranslations("common");

  return [
    // ─────────────────────────────────────────────────────────────
    // Group 1: Transaction Status Overview – KPI Grid & Pie Chart
    // ─────────────────────────────────────────────────────────────
    [
      {
        type: "kpi",
        layout: { cols: 5, rows: 1 },
        responsive: {
          mobile: { cols: 1, rows: 5, span: 1 },
          tablet: { cols: 3, rows: 2, span: 1 },
          desktop: { cols: 5, rows: 1, span: 1 },
        },
        items: [
          {
            id: "total_transactions",
            title: t("total_transactions"),
            metric: "total",
            model: "transaction",
            icon: "mdi:receipt",
          },
          {
            id: "pending_transactions",
            title: t("pending"),
            metric: "PENDING",
            model: "transaction",
            aggregation: { field: "status", value: "PENDING" },
            icon: "mdi:clock-outline",
          },
          {
            id: "completed_transactions",
            title: t("completed"),
            metric: "COMPLETED",
            model: "transaction",
            aggregation: { field: "status", value: "COMPLETED" },
            icon: "mdi:check-circle",
          },
          {
            id: "failed_transactions",
            title: t("failed"),
            metric: "FAILED",
            model: "transaction",
            aggregation: { field: "status", value: "FAILED" },
            icon: "mdi:alert-circle",
          },
          {
            id: "cancelled_transactions",
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
          mobile: { cols: 1, rows: 1, span: 1 },
          tablet: { cols: 1, rows: 1, span: 1 },
          desktop: { cols: 1, rows: 1, span: 1 },
        },
        items: [
          {
            id: "transaction_status_chart",
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
    // ─────────────────────────────────────────────────────────────
    // Group 2: Transaction Types Overview – KPI Grid & Pie Chart
    // ─────────────────────────────────────────────────────────────
    [
      {
        type: "kpi",
        layout: { cols: 4, rows: 1 },
        responsive: {
          mobile: { cols: 1, rows: 4, span: 1 },
          tablet: { cols: 2, rows: 2, span: 1 },
          desktop: { cols: 4, rows: 1, span: 1 },
        },
        items: [
          {
            id: "deposit_transactions",
            title: t("deposits"),
            metric: "DEPOSIT",
            model: "transaction",
            aggregation: { field: "type", value: "DEPOSIT" },
            icon: "mdi:bank-transfer-in",
          },
          {
            id: "withdraw_transactions",
            title: t("withdrawals"),
            metric: "WITHDRAW",
            model: "transaction",
            aggregation: { field: "type", value: "WITHDRAW" },
            icon: "mdi:bank-transfer-out",
          },
          {
            id: "incoming_transfer_transactions",
            title: t("incoming_transfers"),
            metric: "INCOMING_TRANSFER",
            model: "transaction",
            aggregation: { field: "type", value: "INCOMING_TRANSFER" },
            icon: "mdi:arrow-down-bold",
          },
          {
            id: "outgoing_transfer_transactions",
            title: t("outgoing_transfers"),
            metric: "OUTGOING_TRANSFER",
            model: "transaction",
            aggregation: { field: "type", value: "OUTGOING_TRANSFER" },
            icon: "mdi:arrow-up-bold",
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
            id: "transaction_type_chart",
            title: t("type_distribution"),
            type: "pie",
            model: "transaction",
            metrics: ["DEPOSIT", "WITHDRAW", "INCOMING_TRANSFER", "OUTGOING_TRANSFER"],
            config: {
              field: "type",
              status: [
                {
                  value: "DEPOSIT",
                  label: t("deposit"),
                  color: "green",
                  icon: "mdi:bank-transfer-in",
                },
                {
                  value: "WITHDRAW",
                  label: t("withdraw"),
                  color: "red",
                  icon: "mdi:bank-transfer-out",
                },
                {
                  value: "INCOMING_TRANSFER",
                  label: t("incoming_transfer"),
                  color: "emerald",
                  icon: "mdi:arrow-down-bold",
                },
                {
                  value: "OUTGOING_TRANSFER",
                  label: t("outgoing_transfer"),
                  color: "rose",
                  icon: "mdi:arrow-up-bold",
                },
              ],
            },
          },
        ],
      },
    ],
    // ─────────────────────────────────────────────────────────────
    // Group 3: Financial Metrics
    // ─────────────────────────────────────────────────────────────
    {
      type: "kpi",
      layout: { cols: 3, rows: 1 },
      responsive: {
        mobile: { cols: 1, rows: 3, span: 1 },
        tablet: { cols: 3, rows: 1, span: 1 },
        desktop: { cols: 3, rows: 1, span: 1 },
      },
      items: [
        {
          id: "total_transaction_volume",
          title: t("total_volume"),
          metric: "amount",
          model: "transaction",
          aggregation: { field: "amount", type: "sum" },
          icon: "mdi:cash-multiple",
          format: "currency",
        },
        {
          id: "total_transaction_fees",
          title: t("total_fees"),
          metric: "fee",
          model: "transaction",
          aggregation: { field: "fee", type: "sum" },
          icon: "mdi:percent",
          format: "currency",
        },
        {
          id: "avg_transaction_amount",
          title: t("average_amount"),
          metric: "average",
          model: "transaction",
          aggregation: { field: "amount", type: "avg" },
          icon: "mdi:calculator",
          format: "currency",
        },
      ],
    },
  ];
}
