"use client";
import { AnalyticsConfig } from "@/components/blocks/data-table/types/analytics";

import { useTranslations } from "next-intl";
export function useAnalytics() {
  const t = useTranslations("ext_admin");
  const tExt = useTranslations("ext");
  return [
    // ─────────────────────────────────────────────────────────────
    // Group 1: Reward Claim Status Overview – KPI Grid & Pie Chart
    // ─────────────────────────────────────────────────────────────
    [
      {
        type: "kpi",
        layout: { cols: 2, rows: 2 },
        responsive: {
          mobile: { cols: 1, rows: 4, span: 1 },
          tablet: { cols: 2, rows: 2, span: 2 },
          desktop: { cols: 2, rows: 2, span: 2 },
        },
        items: [
          {
            id: "total_rewards",
            title: tExt("total_rewards"),
            metric: "total",
            model: "mlmReferralReward",
            icon: "mdi:gift",
          },
          {
            id: "total_reward_amount",
            title: t("total_reward_amount"),
            metric: "reward",
            model: "mlmReferralReward",
            icon: "mdi:currency-usd",
          },
          {
            id: "claimed_rewards",
            title: t("claimed"),
            metric: "claimed",
            model: "mlmReferralReward",
            aggregation: { field: "isClaimed", value: "true" },
            icon: "mdi:check-circle",
          },
          {
            id: "unclaimed_rewards",
            title: t("unclaimed"),
            metric: "unclaimed",
            model: "mlmReferralReward",
            aggregation: { field: "isClaimed", value: "false" },
            icon: "mdi:close-circle",
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
            id: "rewardClaimDistribution",
            title: t("reward_claim_distribution"),
            type: "pie",
            model: "mlmReferralReward",
            metrics: ["claimed", "unclaimed"],
            config: {
              field: "isClaimed",
              status: [
                {
                  value: "true",
                  label: t("claimed"),
                  color: "green",
                  icon: "mdi:check-circle",
                },
                {
                  value: "false",
                  label: t("unclaimed"),
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
      responsive: {
        mobile: { cols: 1, rows: 1, span: 1 },
        tablet: { cols: 1, rows: 1, span: 1 },
        desktop: { cols: 1, rows: 1, span: 1 },
      },
      items: [
        {
          id: "rewardsOverTime",
          title: t("rewards_over_time"),
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
  ] as AnalyticsConfig;
}
