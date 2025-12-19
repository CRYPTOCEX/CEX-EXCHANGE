"use client";
import { AnalyticsConfig } from "@/components/blocks/data-table/types/analytics";
import { useTranslations } from "next-intl";

export function useAnalytics() {
  const t = useTranslations("dashboard_admin");

  return [
  // ─────────────────────────────────────────────────────────────
  // Group 1: API Key Type Overview – KPI Grid & Pie Chart
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
          id: "total_api_keys",
          title: t("total_api_keys"),
          metric: "total",
          model: "apiKey",
          icon: "Key",
        },
        {
          id: "plugin_api_keys",
          title: t("plugin_keys"),
          metric: "plugin",
          model: "apiKey",
          aggregation: { field: "type", value: "plugin" },
          icon: "Layers",
        },
        {
          id: "user_api_keys",
          title: t("user_keys"),
          metric: "user",
          model: "apiKey",
          aggregation: { field: "type", value: "user" },
          icon: "User",
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
          id: "apiKeyTypeDistribution",
          title: t("api_key_type_distribution"),
          type: "pie",
          model: "apiKey",
          metrics: ["plugin", "user"],
          config: {
            field: "type",
            status: [
              {
                value: "plugin",
                label: t("plugin_keys"),
                color: "blue",
                icon: "mdi:layers",
              },
              {
                value: "user",
                label: t("user_keys"),
                color: "green",
                icon: "mdi:account",
              },
            ],
          },
        },
      ],
    },
  ],

  // ─────────────────────────────────────────────────────────────
  // Group 2: IP Restriction Overview – KPI Grid & Pie Chart
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
          id: "restricted_api_keys",
          title: t("ip_restricted_keys"),
          metric: "restricted",
          model: "apiKey",
          aggregation: { field: "ipRestriction", value: "true" },
          icon: "Shield",
        },
        {
          id: "unrestricted_api_keys",
          title: t("unrestricted_keys"),
          metric: "unrestricted",
          model: "apiKey",
          aggregation: { field: "ipRestriction", value: "false" },
          icon: "ShieldOff",
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
          id: "ipRestrictionDistribution",
          title: t("ip_restriction_distribution"),
          type: "pie",
          model: "apiKey",
          metrics: ["restricted", "unrestricted"],
          config: {
            field: "ipRestriction",
            status: [
              {
                value: "true",
                label: t("restricted"),
                color: "green",
                icon: "mdi:shield-check",
              },
              {
                value: "false",
                label: t("unrestricted"),
                color: "orange",
                icon: "mdi:shield-off",
              },
            ],
          },
        },
      ],
    },
  ],

  // ─────────────────────────────────────────────────────────────
  // Group 3: API Keys Over Time – Full-Width Line Chart
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
        id: "apiKeyCreationOverTime",
        title: t("api_keys_over_time"),
        type: "line",
        model: "apiKey",
        metrics: ["total", "plugin", "user"],
        timeframes: ["24h", "7d", "30d", "3m", "6m", "y"],
        labels: {
          total: "Total API Keys",
          plugin: "Plugin Keys",
          user: "User Keys",
        },
      },
    ],
  },
] as AnalyticsConfig;
}
