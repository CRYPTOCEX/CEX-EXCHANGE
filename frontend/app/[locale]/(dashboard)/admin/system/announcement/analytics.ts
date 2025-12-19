"use client";
import { AnalyticsConfig } from "@/components/blocks/data-table/types/analytics";
import { useTranslations } from "next-intl";

export function useAnalytics() {
  const tDashboardAdmin = useTranslations("dashboard_admin");
  const tCommon = useTranslations("common");

  return [
  // ─────────────────────────────────────────────────────────────
  // Group 1: Announcement Type Overview – KPI Grid & Pie Chart
  // ─────────────────────────────────────────────────────────────
  [
    {
      type: "kpi" as const,
      layout: { cols: 2, rows: 2 },
      responsive: {
        mobile: { cols: 1, rows: 4, span: 1 },
        tablet: { cols: 2, rows: 2, span: 2 },
        desktop: { cols: 2, rows: 2, span: 2 }
      },
      items: [
        {
          id: "total_announcements",
          title: tDashboardAdmin("total_announcements"),
          metric: "total",
          model: "announcement",
          icon: "Announcement",
        },
        {
          id: "general_announcements",
          title: tDashboardAdmin("general_announcements"),
          metric: "general",
          model: "announcement",
          aggregation: { field: "type", value: "GENERAL" },
          icon: "Info",
        },
        {
          id: "event_announcements",
          title: tDashboardAdmin("event_announcements"),
          metric: "event",
          model: "announcement",
          aggregation: { field: "type", value: "EVENT" },
          icon: "Calendar",
        },
        {
          id: "update_announcements",
          title: tDashboardAdmin("update_announcements"),
          metric: "update",
          model: "announcement",
          aggregation: { field: "type", value: "UPDATE" },
          icon: "RefreshCw",
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
          id: "announcementTypeDistribution",
          title: tDashboardAdmin("announcement_type_distribution"),
          type: "pie" as const,
          model: "announcement",
          metrics: ["general", "event", "update"],
          config: {
            field: "type",
            status: [
              {
                value: "GENERAL",
                label: tCommon("general"),
                color: "blue",
                icon: "mdi:information",
              },
              {
                value: "EVENT",
                label: tDashboardAdmin("event"),
                color: "green",
                icon: "mdi:calendar",
              },
              {
                value: "UPDATE",
                label: tCommon("update"),
                color: "amber",
                icon: "mdi:update",
              },
            ],
          },
        },
      ],
    },
  ],

  // ─────────────────────────────────────────────────────────────
  // Group 2: Announcement Status Overview – KPI Grid & Pie Chart
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
          id: "active_announcements",
          title: tDashboardAdmin("active_announcements"),
          metric: "active",
          model: "announcement",
          aggregation: { field: "status", value: "true" },
          icon: "CheckSquare",
        },
        {
          id: "inactive_announcements",
          title: tDashboardAdmin("inactive_announcements"),
          metric: "inactive",
          model: "announcement",
          aggregation: { field: "status", value: "false" },
          icon: "XSquare",
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
          id: "announcementStatusDistribution",
          title: tDashboardAdmin("announcement_status_distribution"),
          type: "pie" as const,
          model: "announcement",
          metrics: ["active", "inactive"],
          config: {
            field: "status",
            status: [
              {
                value: "true",
                label: tCommon("active"),
                color: "green",
                icon: "mdi:check",
              },
              {
                value: "false",
                label: tCommon("inactive"),
                color: "red",
                icon: "mdi:close",
              },
            ],
          },
        },
      ],
    },
  ],

  // ─────────────────────────────────────────────────────────────
  // Group 3: Announcements Over Time – Full-Width Line Chart
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
        id: "announcementTrendsOverTime",
        title: tDashboardAdmin("announcements_over_time"),
        type: "line" as const,
        model: "announcement",
        metrics: ["total", "general", "event", "update"],
        timeframes: ["24h", "7d", "30d", "3m", "6m", "y"],
        labels: {
          total: "Total Announcements",
          general: "General",
          event: "Event",
          update: "Update",
        },
      },
    ],
  },
] as AnalyticsConfig;
}
