import { AnalyticsConfig } from "@/components/blocks/data-table/types/analytics";

export const mlmReferralAnalytics: AnalyticsConfig = [
  // ─────────────────────────────────────────────────────────────
  // Group 1: Referral Overview – KPI Grid on Left, Pie Chart on Right
  // ─────────────────────────────────────────────────────────────
  [
    {
      type: "kpi",
      layout: { cols: 2, rows: 2 }, // 2 columns x 2 rows = 4 KPI cards
      items: [
        {
          id: "total_referrals",
          title: "Total Referrals",
          metric: "total", // COUNT(*)
          model: "mlmReferral",
          icon: "mdi:account-multiple",
        },
        {
          id: "pending_referrals",
          title: "Pending",
          metric: "PENDING",
          model: "mlmReferral",
          aggregation: { field: "status", value: "PENDING" },
          icon: "mdi:clock-outline",
        },
        {
          id: "active_referrals",
          title: "Status",
          metric: "ACTIVE",
          model: "mlmReferral",
          aggregation: { field: "status", value: "ACTIVE" },
          icon: "mdi:check-circle",
        },
        {
          id: "rejected_referrals",
          title: "Rejected",
          metric: "REJECTED",
          model: "mlmReferral",
          aggregation: { field: "status", value: "REJECTED" },
          icon: "mdi:thumb-down",
        },
      ],
    },
    {
      type: "chart",
      items: [
        {
          id: "referralStatusDistribution",
          title: "Status Distribution",
          type: "pie",
          model: "mlmReferral",
          metrics: ["PENDING", "ACTIVE", "REJECTED"],
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
                value: "ACTIVE",
                label: "Active",
                color: "green",
                icon: "mdi:check-circle",
              },
              {
                value: "REJECTED",
                label: "Rejected",
                color: "red",
                icon: "mdi:thumb-down",
              },
            ],
          },
        },
      ],
    },
  ],

  // ─────────────────────────────────────────────────────────────
  // Group 2: Referral Trends – Full-Width Line Chart
  // ─────────────────────────────────────────────────────────────
  {
    type: "chart",
    items: [
      {
        id: "referralsOverTime",
        title: "Referrals Over Time",
        type: "line",
        model: "mlmReferral",
        metrics: ["total", "PENDING", "ACTIVE", "REJECTED"],
        timeframes: ["24h", "7d", "30d", "3m", "6m", "y"],
        labels: {
          total: "Total Referrals",
          PENDING: "Pending",
          ACTIVE: "Active",
          REJECTED: "Rejected",
        },
      },
    ],
  },
];
