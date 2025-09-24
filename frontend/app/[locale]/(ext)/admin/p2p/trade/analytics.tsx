// src/config/tradeAnalytics.ts

import { AnalyticsConfig } from "@/components/blocks/data-table/types/analytics";

export const tradeAnalytics: AnalyticsConfig = [
  [
    {
      type: "kpi",
      layout: { cols: 2, rows: 2 },
      items: [
        {
          id: "total_trades",
          title: "Total Trades",
          metric: "total",
          model: "p2pTrade",
          icon: "TrendingUp", // replace with your preferred icon
        },
        {
          id: "completed_trades",
          title: "Completed Trades",
          metric: "completed",
          model: "p2pTrade",
          aggregation: { field: "status", value: "COMPLETED" },
          icon: "CheckCircle",
        },
        {
          id: "pending_trades",
          title: "Pending Trades",
          metric: "pending",
          model: "p2pTrade",
          aggregation: { field: "status", value: "PENDING" },
          icon: "Hourglass",
        },
        {
          id: "cancelled_trades",
          title: "Cancelled Trades",
          metric: "cancelled",
          model: "p2pTrade",
          aggregation: { field: "status", value: "CANCELLED" },
          icon: "XCircle",
        },
      ],
    },
    {
      type: "chart",
      items: [
        {
          id: "tradeStatusDistribution",
          title: "Trade Status Distribution",
          type: "pie",
          model: "p2pTrade",
          metrics: ["completed", "pending", "cancelled", "disputed"],
          config: {
            field: "status",
            status: [
              {
                value: "COMPLETED",
                label: "Completed",
                color: "green",
                icon: "CheckCircle",
              },
              {
                value: "PENDING",
                label: "Pending",
                color: "amber",
                icon: "Hourglass",
              },
              {
                value: "CANCELLED",
                label: "Cancelled",
                color: "red",
                icon: "XCircle",
              },
              {
                value: "DISPUTED",
                label: "Disputed",
                color: "purple",
                icon: "AlertTriangle",
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
          id: "tradeVolumeOverTime",
          title: "Trade Volume Over Time",
          type: "line",
          model: "p2pTrade",
          metrics: ["total"],
          timeframes: ["24h", "7d", "30d", "3m", "6m", "y"],
          labels: { total: "Trade Volume" },
        },
      ],
    },
  ],
];
