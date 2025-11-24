import { AnalyticsConfig } from "@/components/blocks/data-table/types/analytics";

export const mlmReferralRewardAnalytics: AnalyticsConfig = [
  // ─────────────────────────────────────────────────────────────
  // Group 1: Reward Overview – KPI Grid (Left) & Pie Chart (Right)
  // ─────────────────────────────────────────────────────────────
  [
    {
      type: "kpi",
      layout: { cols: 2, rows: 2 }, // 2 columns x 2 rows = 4 KPI cards
      items: [
        {
          id: "total_rewards",
          title: "Total Rewards",
          metric: "total", // COUNT(*) of rewards
          model: "mlmReferralReward",
          icon: "mdi:gift",
        },
        {
          id: "total_reward_amount",
          title: "Total Reward Amount",
          metric: "reward", // Aggregated sum of reward values (requires aggregator adjustment)
          model: "mlmReferralReward",
          icon: "mdi:currency-usd",
        },
        {
          id: "claimed_rewards",
          title: "Claimed",
          metric: "claimed",
          model: "mlmReferralReward",
          aggregation: { field: "isClaimed", value: "true" },
          icon: "mdi:check-circle",
        },
        {
          id: "unclaimed_rewards",
          title: "Unclaimed",
          metric: "unclaimed",
          model: "mlmReferralReward",
          aggregation: { field: "isClaimed", value: "false" },
          icon: "mdi:close-circle",
        },
      ],
    },
    {
      type: "chart",
      items: [
        {
          id: "rewardClaimDistribution",
          title: "Reward Claim Distribution",
          type: "pie",
          model: "mlmReferralReward",
          metrics: ["claimed", "unclaimed"],
          config: {
            field: "isClaimed",
            status: [
              {
                value: "true",
                label: "Claimed",
                color: "green",
                icon: "mdi:check-circle",
              },
              {
                value: "false",
                label: "Unclaimed",
                color: "red",
                icon: "mdi:close-circle",
              },
            ],
          },
        },
      ],
    },
  ],

  // ─────────────────────────────────────────────────────────────
  // Group 2: Rewards Over Time – Full-Width Line Chart
  // ─────────────────────────────────────────────────────────────
  {
    type: "chart",
    items: [
      {
        id: "rewardsOverTime",
        title: "Rewards Over Time",
        type: "line",
        model: "mlmReferralReward",
        metrics: ["total", "claimed", "unclaimed"],
        timeframes: ["24h", "7d", "30d", "3m", "6m", "y"],
        labels: {
          total: "Total Rewards",
          claimed: "Claimed",
          unclaimed: "Unclaimed",
        },
      },
    ],
  },
];
