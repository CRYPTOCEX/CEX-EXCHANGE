import { AnalyticsConfig } from "@/components/blocks/data-table/types/analytics";

export const offersAnalytics: AnalyticsConfig = [
  [
    {
      type: "kpi",
      layout: { cols: 2, rows: 2 },
      items: [
        {
          id: "total_offers",
          title: "Total Offers",
          metric: "total",
          model: "p2pOffer",
          icon: "Ticket", // replace with the icon you prefer
        },
        {
          id: "active_offers",
          title: "Active Offers",
          metric: "active",
          model: "p2pOffer",
          aggregation: { field: "status", value: "ACTIVE" },
          icon: "CheckCircle",
        },
        {
          id: "pending_offers",
          title: "Pending Offers",
          metric: "pending",
          model: "p2pOffer",
          aggregation: { field: "status", value: "PENDING" },
          icon: "Hourglass",
        },
        {
          id: "flagged_offers",
          title: "Flagged Offers",
          metric: "flagged",
          model: "p2pOffer",
          aggregation: { field: "status", value: "FLAGGED" },
          icon: "AlertTriangle",
        },
      ],
    },
    {
      type: "chart",
      items: [
        {
          id: "offerStatusDistribution",
          title: "Offer Status Distribution",
          type: "pie",
          model: "p2pOffer",
          metrics: ["active", "pending", "flagged"],
          config: {
            field: "status",
            status: [
              {
                value: "ACTIVE",
                label: "Active",
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
                value: "FLAGGED",
                label: "Flagged",
                color: "red",
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
          id: "offerCreationOverTime",
          title: "Offers Over Time",
          type: "line",
          model: "p2pOffer",
          metrics: ["total", "pending", "active", "flagged"],
          timeframes: ["24h", "7d", "30d", "3m", "6m", "y"],
          labels: {
            total: "Total Offers",
            pending: "Pending Offers",
            active: "Active Offers",
            flagged: "Flagged Offers",
          },
        },
      ],
    },
  ],
];
