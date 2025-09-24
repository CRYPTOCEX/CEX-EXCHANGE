// src/config/disputeAnalytics.ts

import { AnalyticsConfig } from "@/components/blocks/data-table/types/analytics";

export const disputeAnalytics: AnalyticsConfig = [
  [
    {
      type: "kpi",
      layout: { cols: 2, rows: 2 },
      items: [
        {
          id: "total_disputes",
          title: "Total Disputes",
          metric: "total",
          model: "p2pDispute",
          icon: "AlertTriangle", // replace with your preferred icon name
        },
        {
          id: "pending_disputes",
          title: "Pending Disputes",
          metric: "pending",
          model: "p2pDispute",
          aggregation: { field: "status", value: "PENDING" },
          icon: "Hourglass",
        },
        {
          id: "in_progress_disputes",
          title: "In Progress",
          metric: "in_progress",
          model: "p2pDispute",
          aggregation: { field: "status", value: "IN_PROGRESS" },
          icon: "Loader", // use an appropriate icon
        },
        {
          id: "resolved_disputes",
          title: "Resolved Disputes",
          metric: "resolved",
          model: "p2pDispute",
          aggregation: { field: "status", value: "RESOLVED" },
          icon: "CheckCircle",
        },
      ],
    },
    {
      type: "chart",
      items: [
        {
          id: "disputeStatusDistribution",
          title: "Dispute Status Distribution",
          type: "pie",
          model: "p2pDispute",
          metrics: ["pending", "in_progress", "resolved"],
          config: {
            field: "status",
            status: [
              {
                value: "PENDING",
                label: "Pending",
                color: "amber",
                icon: "Hourglass",
              },
              {
                value: "IN_PROGRESS",
                label: "In Progress",
                color: "blue",
                icon: "Loader",
              },
              {
                value: "RESOLVED",
                label: "Resolved",
                color: "green",
                icon: "CheckCircle",
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
          id: "disputesOverTime",
          title: "Disputes Over Time",
          type: "line",
          model: "p2pDispute",
          metrics: ["total"],
          timeframes: ["24h", "7d", "30d", "3m", "6m", "y"],
          labels: { total: "Disputes" },
        },
      ],
    },
  ],
];
