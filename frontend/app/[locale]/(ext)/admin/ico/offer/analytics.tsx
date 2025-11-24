import { AnalyticsConfig } from "@/components/blocks/data-table/types/analytics";

export const analytics: AnalyticsConfig = [
  [
    {
      type: "kpi",
      layout: { cols: 2, rows: 2 },
      items: [
        {
          id: "total_offerings",
          title: "Total Offerings",
          metric: "total",
          model: "icoTokenOffering",
          icon: "FileText",
        },
        {
          id: "active_offerings",
          title: "Active Offerings",
          metric: "active",
          model: "icoTokenOffering",
          aggregation: { field: "status", value: "ACTIVE" },
          icon: "CheckSquare",
        },
        {
          id: "target_amount",
          title: "Total Target (USD)",
          metric: "sum_target",
          model: "icoTokenOffering",
          icon: "DollarSign",
        },
        {
          id: "raised_amount",
          title: "Total Raised (USD)",
          metric: "sum_raised",
          model: "icoTokenOffering",
          icon: "TrendingUp",
        },
      ],
    },
    {
      type: "chart",
      items: [
        {
          id: "offeringStatusDistribution",
          title: "Offering Status Distribution",
          type: "pie",
          model: "icoTokenOffering",
          metrics: [
            "active",
            "success",
            "failed",
            "upcoming",
            "pending",
            "rejected",
          ],
          config: {
            field: "status",
            status: [
              {
                value: "ACTIVE",
                label: "Active",
                color: "green",
                icon: "mdi:check",
              },
              {
                value: "SUCCESS",
                label: "Success",
                color: "blue",
                icon: "mdi:check-all",
              },
              {
                value: "FAILED",
                label: "Failed",
                color: "red",
                icon: "mdi:close",
              },
              {
                value: "UPCOMING",
                label: "Upcoming",
                color: "amber",
                icon: "mdi:clock",
              },
              {
                value: "PENDING",
                label: "Pending",
                color: "gray",
                icon: "mdi:clock-outline",
              },
              {
                value: "REJECTED",
                label: "Rejected",
                color: "red",
                icon: "mdi:alert",
              },
            ],
          },
        },
      ],
    },
  ],
  {
    type: "chart",
    items: [
      {
        id: "offeringsOverTime",
        title: "Offerings Over Time",
        type: "line",
        model: "icoTokenOffering",
        metrics: ["total"],
        timeframes: ["24h", "7d", "30d", "3m", "6m", "y"],
        labels: {
          total: "Total Offerings",
        },
      },
    ],
  },
];
