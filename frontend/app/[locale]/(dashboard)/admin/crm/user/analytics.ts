import { AnalyticsConfig } from "@/components/blocks/data-table/types/analytics";

export const analytics: AnalyticsConfig = [
  // First row: KPI cards and a pie chart for user status distribution.
  [
    {
      type: "kpi",
      layout: { cols: 2, rows: 2 },
      items: [
        {
          id: "total_users",
          title: "Total Users",
          metric: "total", // 'total' is automatically computed (COUNT(*))
          model: "user",
          icon: "User",
        },
        {
          id: "active_users",
          title: "Active Users",
          metric: "active",
          model: "user",
          aggregation: { field: "status", value: "ACTIVE" },
          icon: "UserCheck",
        },
        {
          id: "inactive_users",
          title: "Inactive Users",
          metric: "inactive",
          model: "user",
          aggregation: { field: "status", value: "INACTIVE" },
          icon: "UserX",
        },
        {
          id: "banned_users",
          title: "Banned Users",
          metric: "banned",
          model: "user",
          aggregation: { field: "status", value: "BANNED" },
          icon: "UserMinus",
        },
      ],
    },
    {
      type: "chart",
      items: [
        {
          id: "userStatusDistribution",
          title: "User Status Distribution",
          type: "pie",
          model: "user",
          metrics: ["active", "inactive", "suspended", "banned"],
          config: {
            // Use the 'status' column as the grouping field.
            field: "status",
            status: [
              {
                value: "ACTIVE",
                label: "Active",
                color: "green",
                icon: "mdi:user-check",
              },
              {
                value: "INACTIVE",
                label: "Inactive",
                color: "gray",
                icon: "mdi:user-off",
              },
              {
                value: "SUSPENDED",
                label: "Suspended",
                color: "amber",
                icon: "mdi:user-lock",
              },
              {
                value: "BANNED",
                label: "Banned",
                color: "red",
                icon: "mdi:user-remove",
              },
            ],
          },
        },
      ],
    },
  ],
  // Second row: A line chart for user registrations over time and a pie chart for email verification.
  [
    {
      type: "chart",
      items: [
        {
          id: "userRegistrationsOverTime",
          title: "User Registrations Over Time",
          type: "line",
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
    {
      type: "chart",
      items: [
        {
          id: "emailVerificationDistribution",
          title: "Email Verification Distribution",
          type: "pie",
          model: "user",
          metrics: ["verified", "not_verified"],
          config: {
            // For booleans, we assume the DB returns "true"/"false" as strings.
            field: "emailVerified",
            status: [
              {
                value: "true",
                label: "Verified",
                color: "blue",
                icon: "mdi:check",
              },
              {
                value: "false",
                label: "Not Verified",
                color: "gray",
                icon: "mdi:close",
              },
            ],
          },
        },
      ],
    },
  ],
];
