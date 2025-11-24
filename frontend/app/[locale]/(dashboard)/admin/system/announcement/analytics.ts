import { AnalyticsConfig } from "@/components/blocks/data-table/types/analytics";

export const analytics: AnalyticsConfig = [
  [
    {
      type: "kpi",
      layout: { cols: 2, rows: 2 },
      items: [
        {
          id: "total_announcements",
          title: "Total Announcements",
          metric: "total", // 'total' is auto-computed (COUNT(*))
          model: "announcement",
          icon: "Announcement",
        },
        {
          id: "active_announcements",
          title: "Active Announcements",
          metric: "active",
          model: "announcement",
          aggregation: { field: "status", value: "true" },
          icon: "CheckSquare",
        },
        {
          id: "general_announcements",
          title: "General Announcements",
          metric: "general",
          model: "announcement",
          aggregation: { field: "type", value: "GENERAL" },
          icon: "Info",
        },
        {
          id: "event_announcements",
          title: "Event Announcements",
          metric: "event",
          model: "announcement",
          aggregation: { field: "type", value: "EVENT" },
          icon: "Calendar",
        },
      ],
    },
    {
      type: "chart",
      items: [
        {
          id: "announcementTypeDistribution",
          title: "Announcement Type Distribution",
          type: "pie",
          model: "announcement",
          metrics: ["general", "event", "update"],
          config: {
            field: "type",
            status: [
              {
                value: "GENERAL",
                label: "General",
                color: "blue",
                icon: "mdi:information",
              },
              {
                value: "EVENT",
                label: "Event",
                color: "green",
                icon: "mdi:calendar",
              },
              {
                value: "UPDATE",
                label: "Update",
                color: "amber",
                icon: "mdi:update",
              },
            ],
          },
        },
      ],
    },
  ],
  [
    {
      type: "chart",
      items: [
        {
          id: "announcementTrendsOverTime",
          title: "Announcements Over Time",
          type: "line",
          model: "announcement",
          metrics: ["total", "active"],
          timeframes: ["24h", "7d", "30d", "3m", "6m", "y"],
          labels: {
            total: "Total Announcements",
            active: "Active Announcements",
          },
        },
      ],
    },
    {
      type: "chart",
      items: [
        {
          id: "announcementStatusDistribution",
          title: "Announcement Status Distribution",
          type: "pie",
          model: "announcement",
          metrics: ["active", "inactive"],
          config: {
            field: "status",
            status: [
              {
                value: "true",
                label: "Active",
                color: "green",
                icon: "mdi:check",
              },
              {
                value: "false",
                label: "Inactive",
                color: "red",
                icon: "mdi:close",
              },
            ],
          },
        },
      ],
    },
  ],
];
