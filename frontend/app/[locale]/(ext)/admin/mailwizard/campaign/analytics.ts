"use client";
import { AnalyticsConfig } from "@/components/blocks/data-table/types/analytics";

import { useTranslations } from "next-intl";
export function useAnalytics() {
  const t = useTranslations("ext_admin");
  const tCommon = useTranslations("common");
  return [
    // ─────────────────────────────────────────────────────────────
    // Group 1: Campaign Status Overview – KPI Grid & Pie Chart
    // ─────────────────────────────────────────────────────────────
    [
      {
        type: "kpi",
        layout: { cols: 7, rows: 1 },
        responsive: {
          mobile: { cols: 1, rows: 7, span: 1 },
          tablet: { cols: 2, rows: 4, span: 2 },
          desktop: { cols: 7, rows: 1, span: 2 },
        },
        items: [
          {
            id: "total_campaigns",
            title: t("total_campaigns"),
            metric: "total",
            model: "mailwizardCampaign",
            icon: "mdi:email-multiple",
          },
          {
            id: "pending_campaigns",
            title: tCommon("pending"),
            metric: "PENDING",
            model: "mailwizardCampaign",
            aggregation: { field: "status", value: "PENDING" },
            icon: "mdi:clock-outline",
          },
          {
            id: "paused_campaigns",
            title: tCommon("paused"),
            metric: "PAUSED",
            model: "mailwizardCampaign",
            aggregation: { field: "status", value: "PAUSED" },
            icon: "mdi:pause-circle",
          },
          {
            id: "active_campaigns",
            title: tCommon("active"),
            metric: "ACTIVE",
            model: "mailwizardCampaign",
            aggregation: { field: "status", value: "ACTIVE" },
            icon: "mdi:play-circle",
          },
          {
            id: "stopped_campaigns",
            title: tCommon("stopped"),
            metric: "STOPPED",
            model: "mailwizardCampaign",
            aggregation: { field: "status", value: "STOPPED" },
            icon: "mdi:stop-circle",
          },
          {
            id: "completed_campaigns",
            title: tCommon("completed"),
            metric: "COMPLETED",
            model: "mailwizardCampaign",
            aggregation: { field: "status", value: "COMPLETED" },
            icon: "mdi:check-circle",
          },
          {
            id: "cancelled_campaigns",
            title: tCommon("cancelled"),
            metric: "CANCELLED",
            model: "mailwizardCampaign",
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
            id: "campaignStatusDistribution",
            title: tCommon("status_distribution"),
            type: "pie",
            model: "mailwizardCampaign",
            metrics: [
              "PENDING",
              "PAUSED",
              "ACTIVE",
              "STOPPED",
              "COMPLETED",
              "CANCELLED",
            ],
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
                  value: "PAUSED",
                  label: tCommon("paused"),
                  color: "yellow",
                  icon: "mdi:pause-circle",
                },
                {
                  value: "ACTIVE",
                  label: tCommon("active"),
                  color: "green",
                  icon: "mdi:play-circle",
                },
                {
                  value: "STOPPED",
                  label: tCommon("stopped"),
                  color: "red",
                  icon: "mdi:stop-circle",
                },
                {
                  value: "COMPLETED",
                  label: tCommon("completed"),
                  color: "blue",
                  icon: "mdi:check-circle",
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
    // Group 2: Speed Metrics – KPI Grid
    // ─────────────────────────────────────────────────────────────
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
          id: "total_speed",
          title: t("total_speed"),
          metric: "speed",
          model: "mailwizardCampaign",
          icon: "mdi:speedometer",
        },
        {
          id: "average_speed",
          title: t("average_speed"),
          metric: "average",
          model: "mailwizardCampaign",
          icon: "mdi:calculator",
        },
      ],
    },

    // ─────────────────────────────────────────────────────────────
    // Group 3: Campaign Trends Over Time – Full-Width Line Chart
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
          id: "campaignsOverTime",
          title: t("campaigns_over_time"),
          type: "line",
          model: "mailwizardCampaign",
          metrics: [
            "total",
            "PENDING",
            "ACTIVE",
            "COMPLETED",
            "PAUSED",
            "STOPPED",
            "CANCELLED",
          ],
          timeframes: ["24h", "7d", "30d", "3m", "6m", "y"],
          labels: {
            total: "Total",
            PENDING: "Pending",
            ACTIVE: "Active",
            COMPLETED: "Completed",
            PAUSED: "Paused",
            STOPPED: "Stopped",
            CANCELLED: "Cancelled",
          },
        },
      ],
    },
  ] as AnalyticsConfig;
}
