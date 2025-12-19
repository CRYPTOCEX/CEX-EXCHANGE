"use client";
import { AnalyticsConfig } from "@/components/blocks/data-table/types/analytics";
import { useTranslations } from "next-intl";

export function useAnalytics() {
  const t = useTranslations("ext_admin");
  const tCommon = useTranslations("common");

  return [
    // ─────────────────────────────────────────────────────────────
    // Group 1: Action Type Overview – KPI Grid & Pie Chart
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
            id: "total_audit_logs",
            title: t("total_audit_logs"),
            metric: "total",
            model: "copyTradingAudit",
            icon: "mdi:file-document-multiple",
          },
          {
            id: "approve_actions",
            title: t("approve_actions"),
            metric: "APPROVE",
            model: "copyTradingAudit",
            aggregation: { field: "action", value: "APPROVE" },
            icon: "mdi:check-circle",
          },
          {
            id: "reject_actions",
            title: t("reject_actions"),
            metric: "REJECT",
            model: "copyTradingAudit",
            aggregation: { field: "action", value: "REJECT" },
            icon: "mdi:close-circle",
          },
          {
            id: "suspend_actions",
            title: t("suspend_actions"),
            metric: "SUSPEND",
            model: "copyTradingAudit",
            aggregation: { field: "action", value: "SUSPEND" },
            icon: "mdi:pause-circle",
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
            id: "actionDistribution",
            title: t("action_distribution"),
            type: "pie",
            model: "copyTradingAudit",
            metrics: [
              "APPROVE",
              "REJECT",
              "SUSPEND",
              "ACTIVATE",
              "UPDATE",
              "CREATE",
            ],
            config: {
              field: "action",
              status: [
                {
                  value: "APPROVE",
                  label: tCommon("approve"),
                  color: "green",
                  icon: "mdi:check-circle",
                },
                {
                  value: "REJECT",
                  label: tCommon("reject"),
                  color: "red",
                  icon: "mdi:close-circle",
                },
                {
                  value: "SUSPEND",
                  label: tCommon("suspend"),
                  color: "yellow",
                  icon: "mdi:pause-circle",
                },
                {
                  value: "ACTIVATE",
                  label: tCommon("activate"),
                  color: "blue",
                  icon: "mdi:play-circle",
                },
                {
                  value: "UPDATE",
                  label: tCommon("update"),
                  color: "indigo",
                  icon: "mdi:pencil-circle",
                },
                {
                  value: "CREATE",
                  label: tCommon("create"),
                  color: "purple",
                  icon: "mdi:plus-circle",
                },
              ],
            },
          },
        ],
      },
    ],

    // ─────────────────────────────────────────────────────────────
    // Group 2: Entity Type Overview – KPI Grid & Pie Chart
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
            id: "leader_actions",
            title: t("leader_actions"),
            metric: "LEADER",
            model: "copyTradingAudit",
            aggregation: { field: "entityType", value: "LEADER" },
            icon: "mdi:account-star",
          },
          {
            id: "subscription_actions",
            title: t("subscription_actions"),
            metric: "SUBSCRIPTION",
            model: "copyTradingAudit",
            aggregation: { field: "entityType", value: "SUBSCRIPTION" },
            icon: "mdi:account-multiple",
          },
          {
            id: "trade_actions",
            title: t("trade_actions"),
            metric: "TRADE",
            model: "copyTradingAudit",
            aggregation: { field: "entityType", value: "TRADE" },
            icon: "mdi:swap-horizontal",
          },
          {
            id: "transaction_actions",
            title: t("transaction_actions"),
            metric: "TRANSACTION",
            model: "copyTradingAudit",
            aggregation: { field: "entityType", value: "TRANSACTION" },
            icon: "mdi:cash-fast",
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
            id: "entityTypeDistribution",
            title: t("entity_type_distribution"),
            type: "pie",
            model: "copyTradingAudit",
            metrics: ["LEADER", "SUBSCRIPTION", "TRADE", "TRANSACTION"],
            config: {
              field: "entityType",
              status: [
                {
                  value: "LEADER",
                  label: t("leader"),
                  color: "indigo",
                  icon: "mdi:account-star",
                },
                {
                  value: "SUBSCRIPTION",
                  label: t("subscription"),
                  color: "blue",
                  icon: "mdi:account-multiple",
                },
                {
                  value: "TRADE",
                  label: tCommon("trade"),
                  color: "green",
                  icon: "mdi:swap-horizontal",
                },
                {
                  value: "TRANSACTION",
                  label: tCommon("transaction"),
                  color: "orange",
                  icon: "mdi:cash-fast",
                },
              ],
            },
          },
        ],
      },
    ],

    // ─────────────────────────────────────────────────────────────
    // Group 3: Activity Over Time – Full-Width Line Chart
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
          id: "auditLogsOverTime",
          title: t("audit_activity_over_time"),
          type: "line",
          model: "copyTradingAudit",
          metrics: ["total", "APPROVE", "REJECT", "SUSPEND", "UPDATE"],
          timeframes: ["24h", "7d", "30d", "3m", "6m", "y"],
          labels: {
            total: tCommon("total"),
            APPROVE: tCommon("approve"),
            REJECT: tCommon("reject"),
            SUSPEND: tCommon("suspend"),
            UPDATE: tCommon("update"),
          },
        },
      ],
    },
  ] as AnalyticsConfig;
}
