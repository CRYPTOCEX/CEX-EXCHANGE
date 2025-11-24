import { AnalyticsConfig } from "@/components/blocks/data-table/types/analytics";

export const mailwizardCampaignAnalytics: AnalyticsConfig = [
  // ─────────────────────────────────────────────────────────────
  // Group 1: Campaign Status Overview – KPI Grid on Left, Pie Chart on Right
  // ─────────────────────────────────────────────────────────────
  [
    {
      type: "kpi",
      layout: { cols: 3, rows: 2 }, // 3 columns x 2 rows = 6 KPI cards
      items: [
        {
          id: "pending_campaigns",
          title: "Pending",
          metric: "PENDING",
          model: "mailwizardCampaign",
          aggregation: { field: "status", value: "PENDING" },
          icon: "mdi:clock-outline",
        },
        {
          id: "paused_campaigns",
          title: "Paused",
          metric: "PAUSED",
          model: "mailwizardCampaign",
          aggregation: { field: "status", value: "PAUSED" },
          icon: "mdi:pause-circle",
        },
        {
          id: "active_campaigns",
          title: "Status",
          metric: "ACTIVE",
          model: "mailwizardCampaign",
          aggregation: { field: "status", value: "ACTIVE" },
          icon: "mdi:play-circle",
        },
        {
          id: "stopped_campaigns",
          title: "Stopped",
          metric: "STOPPED",
          model: "mailwizardCampaign",
          aggregation: { field: "status", value: "STOPPED" },
          icon: "mdi:stop-circle",
        },
        {
          id: "completed_campaigns",
          title: "Completed",
          metric: "COMPLETED",
          model: "mailwizardCampaign",
          aggregation: { field: "status", value: "COMPLETED" },
          icon: "mdi:check-circle",
        },
        {
          id: "cancelled_campaigns",
          title: "Cancelled",
          metric: "CANCELLED",
          model: "mailwizardCampaign",
          aggregation: { field: "status", value: "CANCELLED" },
          icon: "mdi:cancel",
        },
      ],
    },
    {
      type: "chart",
      items: [
        {
          id: "campaignStatusDistribution",
          title: "Status Distribution",
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
                label: "Pending",
                color: "orange",
                icon: "mdi:clock-outline",
              },
              {
                value: "PAUSED",
                label: "Paused",
                color: "yellow",
                icon: "mdi:pause-circle",
              },
              {
                value: "ACTIVE",
                label: "Active",
                color: "green",
                icon: "mdi:play-circle",
              },
              {
                value: "STOPPED",
                label: "Stopped",
                color: "red",
                icon: "mdi:stop-circle",
              },
              {
                value: "COMPLETED",
                label: "Completed",
                color: "blue",
                icon: "mdi:check-circle",
              },
              {
                value: "CANCELLED",
                label: "Cancelled",
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
  // Group 2: Campaign Trends – Full-Width Line Chart
  // ─────────────────────────────────────────────────────────────
  {
    type: "chart",
    items: [
      {
        id: "campaignsOverTime",
        title: "Campaigns Over Time",
        type: "line",
        model: "mailwizardCampaign",
        metrics: ["total"],
        timeframes: ["24h", "7d", "30d", "3m", "6m", "y"],
        labels: {
          total: "Total Campaigns",
        },
      },
    ],
  },
];
