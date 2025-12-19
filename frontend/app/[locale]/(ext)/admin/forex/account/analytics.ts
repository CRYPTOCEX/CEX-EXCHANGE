"use client";
import { AnalyticsConfig } from "@/components/blocks/data-table/types/analytics";
import { useTranslations } from "next-intl";

export function useAnalytics() {
  const t = useTranslations("ext_admin");
  const tCommon = useTranslations("common");

  return [
    // ─────────────────────────────────────────────────────────────
    // Group 1: Account Type Overview – KPI Grid & Pie Chart
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
            id: "total_forex_accounts",
            title: t("total_accounts"),
            metric: "total",
            model: "forexAccount",
            icon: "mdi:account-multiple",
          },
          {
            id: "live_forex_accounts",
            title: t("live_accounts"),
            metric: "LIVE",
            model: "forexAccount",
            aggregation: { field: "type", value: "LIVE" },
            icon: "mdi:account-check",
          },
          {
            id: "demo_forex_accounts",
            title: t("demo_accounts"),
            metric: "DEMO",
            model: "forexAccount",
            aggregation: { field: "type", value: "DEMO" },
            icon: "mdi:account-tie",
          },
          {
            id: "active_forex_accounts",
            title: t("active_accounts"),
            metric: "active",
            model: "forexAccount",
            aggregation: { field: "status", value: "true" },
            icon: "mdi:checkbox-marked-circle",
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
            id: "forexAccountTypeDistribution",
            title: t("account_type_distribution"),
            type: "pie",
            model: "forexAccount",
            metrics: ["LIVE", "DEMO"],
            config: {
              field: "type",
              status: [
                {
                  value: "LIVE",
                  label: tCommon("live"),
                  color: "green",
                  icon: "mdi:account-check",
                },
                {
                  value: "DEMO",
                  label: tCommon("demo"),
                  color: "blue",
                  icon: "mdi:account-tie",
                },
              ],
            },
          },
        ],
      },
    ],

    // ─────────────────────────────────────────────────────────────
    // Group 2: Account Status Overview – KPI Grid & Pie Chart
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
            id: "active_status_accounts",
            title: tCommon("active"),
            metric: "active_status",
            model: "forexAccount",
            aggregation: { field: "status", value: "true" },
            icon: "mdi:check-circle",
          },
          {
            id: "inactive_status_accounts",
            title: tCommon("inactive"),
            metric: "inactive_status",
            model: "forexAccount",
            aggregation: { field: "status", value: "false" },
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
            id: "forexAccountStatusDistribution",
            title: tCommon("status_distribution"),
            type: "pie",
            model: "forexAccount",
            metrics: ["active_status", "inactive_status"],
            config: {
              field: "status",
              status: [
                {
                  value: "true",
                  label: tCommon("active"),
                  color: "green",
                  icon: "mdi:check-circle",
                },
                {
                  value: "false",
                  label: tCommon("inactive"),
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
    // Group 3: Financial Metrics – KPI Grid
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
          id: "total_balance",
          title: tCommon("total_balance"),
          metric: "balance",
          model: "forexAccount",
          icon: "mdi:cash-multiple",
        },
        {
          id: "average_balance",
          title: t("average_balance"),
          metric: "average",
          model: "forexAccount",
          icon: "mdi:calculator",
        },
        {
          id: "total_leverage",
          title: t("total_leverage"),
          metric: "leverage",
          model: "forexAccount",
          icon: "mdi:chart-timeline-variant",
        },
      ],
    },

    // ─────────────────────────────────────────────────────────────
    // Group 4: Accounts Over Time – Full-Width Line Chart
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
          id: "forexAccountsOverTime",
          title: t("accounts_over_time"),
          type: "line",
          model: "forexAccount",
          metrics: ["total", "LIVE", "DEMO"],
          timeframes: ["24h", "7d", "30d", "3m", "6m", "y"],
          labels: {
            total: "Total",
            LIVE: "Live",
            DEMO: "Demo",
          },
        },
      ],
    },
  ] as AnalyticsConfig;
}
