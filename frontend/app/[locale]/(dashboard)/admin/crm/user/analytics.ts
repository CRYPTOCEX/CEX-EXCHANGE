"use client";

import { AnalyticsConfig } from "@/components/blocks/data-table/types/analytics";

import { useTranslations } from "next-intl";
export function useAnalytics() {
  const t = useTranslations("dashboard_admin");
  const tCommon = useTranslations("common");
  return [
  // ─────────────────────────────────────────────────────────────
  // Group 1: User Status Overview – KPI Grid & Pie Chart
  // ─────────────────────────────────────────────────────────────
  [
    {
      type: "kpi" as const,
      layout: { cols: 3, rows: 2 },
      responsive: {
        mobile: { cols: 1, rows: 5, span: 1 },
        tablet: { cols: 3, rows: 2, span: 2 },
        desktop: { cols: 3, rows: 2, span: 2 }
      },
      items: [
        {
          id: "total_users",
          title: tCommon("total_users"),
          metric: "total",
          model: "user",
          icon: "User",
        },
        {
          id: "active_users",
          title: tCommon("active_users"),
          metric: "active",
          model: "user",
          aggregation: { field: "status", value: "ACTIVE" },
          icon: "UserCheck",
        },
        {
          id: "inactive_users",
          title: t("inactive_users"),
          metric: "inactive",
          model: "user",
          aggregation: { field: "status", value: "INACTIVE" },
          icon: "UserX",
        },
        {
          id: "suspended_users",
          title: tCommon("suspended"),
          metric: "suspended",
          model: "user",
          aggregation: { field: "status", value: "SUSPENDED" },
          icon: "UserCog",
        },
        {
          id: "banned_users",
          title: t("banned_users"),
          metric: "banned",
          model: "user",
          aggregation: { field: "status", value: "BANNED" },
          icon: "UserMinus",
        },
      ],
    },
    {
      type: "chart" as const,
      responsive: {
        mobile: { cols: 1 },
        tablet: { cols: 1 },
        desktop: { cols: 1 }
      },
      items: [
        {
          id: "userStatusDistribution",
          title: t("user_status_distribution"),
          type: "pie" as const,
          model: "user",
          metrics: ["active", "inactive", "suspended", "banned"],
          config: {
            // Use the 'status' column as the grouping field.
            field: "status",
            status: [
              {
                value: "ACTIVE",
                label: tCommon("active"),
                color: "green",
                icon: "mdi:user-check",
              },
              {
                value: "INACTIVE",
                label: tCommon("inactive"),
                color: "gray",
                icon: "mdi:user-off",
              },
              {
                value: "SUSPENDED",
                label: tCommon("suspended"),
                color: "amber",
                icon: "mdi:user-lock",
              },
              {
                value: "BANNED",
                label: tCommon("banned"),
                color: "red",
                icon: "mdi:user-remove",
              },
            ],
          },
        },
      ],
    },
  ],

  // ─────────────────────────────────────────────────────────────
  // Group 2: Email Verification Overview – KPI Grid & Pie Chart
  // ─────────────────────────────────────────────────────────────
  [
    {
      type: "kpi" as const,
      layout: { cols: 2, rows: 1 },
      responsive: {
        mobile: { cols: 1, rows: 2, span: 1 },
        tablet: { cols: 2, rows: 1, span: 2 },
        desktop: { cols: 2, rows: 1, span: 2 }
      },
      items: [
        {
          id: "verified_emails",
          title: tCommon("verified"),
          metric: "verified",
          model: "user",
          aggregation: { field: "emailVerified", value: "true" },
          icon: "MailCheck",
        },
        {
          id: "unverified_emails",
          title: tCommon("not_verified"),
          metric: "not_verified",
          model: "user",
          aggregation: { field: "emailVerified", value: "false" },
          icon: "MailX",
        },
      ],
    },
    {
      type: "chart" as const,
      responsive: {
        mobile: { cols: 1, span: 1 },
        tablet: { cols: 1, span: 1 },
        desktop: { cols: 1, span: 1 }
      },
      items: [
        {
          id: "emailVerificationDistribution",
          title: t("email_verification_distribution"),
          type: "pie" as const,
          model: "user",
          metrics: ["verified", "not_verified"],
          config: {
            field: "emailVerified",
            status: [
              {
                value: "true",
                label: tCommon("verified"),
                color: "blue",
                icon: "mdi:check",
              },
              {
                value: "false",
                label: tCommon("not_verified"),
                color: "gray",
                icon: "mdi:close",
              },
            ],
          },
        },
      ],
    },
  ],

  // ─────────────────────────────────────────────────────────────
  // Group 3: User Registrations Over Time – Full-Width Line Chart
  // ─────────────────────────────────────────────────────────────
  {
    type: "chart" as const,
    responsive: {
      mobile: { cols: 1, span: 1 },
      tablet: { cols: 1, span: 1 },
      desktop: { cols: 1, span: 1 }
    },
    items: [
      {
        id: "userRegistrationsOverTime",
        title: t("user_registrations_over_time"),
        type: "line" as const,
        model: "user",
        metrics: ["total", "active", "inactive", "suspended", "banned"],
        timeframes: ["24h", "7d", "30d", "3m", "6m", "y"],
        labels: {
          total: "Total Users",
          active: "Active",
          inactive: "Inactive",
          suspended: "Suspended",
          banned: "Banned",
        },
      },
    ],
  },
] as AnalyticsConfig;
}
