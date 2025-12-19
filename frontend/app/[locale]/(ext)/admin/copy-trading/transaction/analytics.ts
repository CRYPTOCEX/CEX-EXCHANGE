"use client";
import { AnalyticsConfig } from "@/components/blocks/data-table/types/analytics";
import { useTranslations } from "next-intl";

export function useAnalytics() {
  const t = useTranslations("ext_admin");
  const tCommon = useTranslations("common");
  const tExt = useTranslations("ext");

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
            metric: "total",
            model: "copyTradingTransaction",
            icon: "mdi:receipt",
          },
          {
            id: "completed_transactions",
            title: tExt("completed_transactions"),
            metric: "COMPLETED",
            model: "copyTradingTransaction",
            aggregation: { field: "status", value: "COMPLETED" },
            icon: "mdi:check-circle",
          },
          {
            id: "pending_transactions",
            title: tExt("pending_transactions"),
            metric: "PENDING",
            model: "copyTradingTransaction",
            aggregation: { field: "status", value: "PENDING" },
            icon: "mdi:clock-outline",
          },
          {
            id: "failed_transactions",
            title: tExt("failed_transactions"),
            metric: "FAILED",
            model: "copyTradingTransaction",
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
            model: "copyTradingTransaction",
            metrics: ["COMPLETED", "PENDING", "FAILED", "REVERSED"],
            config: {
              field: "status",
              status: [
                {
                  value: "COMPLETED",
                  label: tCommon("completed"),
                  color: "green",
                  icon: "mdi:check-circle",
                },
                {
                  value: "PENDING",
                  label: tCommon("pending"),
                  color: "yellow",
                  icon: "mdi:clock-outline",
                },
                {
                  value: "FAILED",
                  label: tCommon("failed"),
                  color: "red",
                  icon: "mdi:alert-circle",
                },
                {
                  value: "REVERSED",
                  label: t("reversed"),
                  color: "gray",
                  icon: "mdi:undo",
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
            id: "allocation_transactions",
            title: t("allocations"),
            metric: "ALLOCATION",
            model: "copyTradingTransaction",
            aggregation: { field: "type", value: "ALLOCATION" },
            icon: "mdi:cash-plus",
          },
          {
            id: "withdrawal_transactions",
            title: tCommon("withdrawals"),
            metric: "WITHDRAWAL",
            model: "copyTradingTransaction",
            aggregation: { field: "type", value: "WITHDRAWAL" },
            icon: "mdi:cash-minus",
          },
          {
            id: "profit_share_transactions",
            title: t("profit_shares"),
            metric: "PROFIT_SHARE",
            model: "copyTradingTransaction",
            aggregation: { field: "type", value: "PROFIT_SHARE" },
            icon: "mdi:cash-multiple",
          },
          {
            id: "platform_fee_transactions",
            title: tExt("platform_fees"),
            metric: "PLATFORM_FEE",
            model: "copyTradingTransaction",
            aggregation: { field: "type", value: "PLATFORM_FEE" },
            icon: "mdi:percent",
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
            model: "copyTradingTransaction",
            metrics: ["ALLOCATION", "WITHDRAWAL", "PROFIT_SHARE", "PLATFORM_FEE"],
            config: {
              field: "type",
              status: [
                {
                  value: "ALLOCATION",
                  label: tExt("allocation"),
                  color: "blue",
                  icon: "mdi:cash-plus",
                },
                {
                  value: "WITHDRAWAL",
                  label: tCommon("withdrawal"),
                  color: "orange",
                  icon: "mdi:cash-minus",
                },
                {
                  value: "PROFIT_SHARE",
                  label: tCommon("profit_share"),
                  color: "green",
                  icon: "mdi:cash-multiple",
                },
                {
                  value: "PLATFORM_FEE",
                  label: tCommon("platform_fee"),
                  color: "indigo",
                  icon: "mdi:percent",
                },
              ],
            },
          },
        ],
      },
    ],

    // ─────────────────────────────────────────────────────────────
    // Group 3: Transactions Over Time – Full-Width Line Chart
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
          model: "copyTradingTransaction",
          metrics: ["total", "COMPLETED", "PENDING", "FAILED"],
          timeframes: ["24h", "7d", "30d", "3m", "6m", "y"],
          labels: {
            total: tCommon("total"),
            COMPLETED: tCommon("completed"),
            PENDING: tCommon("pending"),
            FAILED: tCommon("failed"),
          },
        },
      ],
    },
  ] as AnalyticsConfig;
}
