"use client";

import { create } from "zustand";
import { $fetch } from "@/lib/api";

interface PoolAnalyticsData {
  timeSeriesData: Array<{
    date: string;
    staked: number;
    earnings: number;
    users: number;
  }>;
  metrics: {
    activePositions: number;
    totalEarnings: number;
    avgStakeAmount: number;
    expectedAPR: number;
    actualAPR: number;
    efficiency: number;
  };
  distributions: {
    earningsDistribution: Array<{ name: string; value: number }>;
    earningsByType: Array<{ name: string; value: number }>;
    userRetention: Array<{ name: string; value: number }>;
  };
  performance: {
    aprOverTime: Array<{
      date: string;
      expectedAPR: number;
      actualAPR: number;
    }>;
    efficiencyTrend: Array<{
      date: string;
      efficiency: number;
    }>;
  };
}

interface StakingAdminAnalyticsState {
  // Data
  analytics: stakingAnalyticsAttributes | null;
  poolAnalytics: PoolAnalyticsData | null;
  isLoading: boolean;
  error: string | null;
  timeRange: "7d" | "30d" | "90d" | "1y";

  // Actions
  fetchAnalytics: () => Promise<void>;
  fetchPoolAnalytics: (poolId: string) => Promise<void>;
  setTimeRange: (range: "7d" | "30d" | "90d" | "1y") => void;
}

export const useStakingAdminAnalyticsStore = create<StakingAdminAnalyticsState>(
  (set, get) => ({
    // Initial state
    analytics: null,
    poolAnalytics: null,
    isLoading: false,
    error: null,
    timeRange: "30d",

    // Actions
    fetchAnalytics: async () => {
      set({ isLoading: true, error: null });
      try {
        const { data, error } = await $fetch({
          url: "/api/admin/staking/analytic",
          silentSuccess: true,
        });
        if (error) {
          throw new Error(error);
        }
        set({
          analytics: data || {
            totalStaked: 0,
            totalUsers: 0,
            totalPools: 0,
            totalRewardsDistributed: 0,
            stakingByToken: {},
            stakingOverTime: [],
            totalAdminEarnings: 0,
            adminEarningsByPool: {},
            averageUserROI: 0,
            earlyWithdrawalRate: 0,
            retentionRate: 0,
            poolPerformance: {},
          },
          isLoading: false,
        });
      } catch (error) {
        console.error("Error fetching staking analytics:", error);
        set({
          error:
            error instanceof Error
              ? error.message
              : "Failed to fetch staking analytics",
          isLoading: false,
        });
      }
    },

    fetchPoolAnalytics: async (poolId: string) => {
      set({ isLoading: true, error: null });

      try {
        const { data, error } = await $fetch({
          url: `/api/admin/staking/pool/${poolId}/analytics`,
          method: "GET",
          params: { timeRange: get().timeRange },
          silentSuccess: true,
        });

        if (error) {
          throw new Error(error);
        }

        set({
          poolAnalytics: data || null,
          isLoading: false,
        });
      } catch (error) {
        console.error(`Error fetching pool analytics for ${poolId}:`, error);
        set({
          error:
            error instanceof Error
              ? error.message
              : `Failed to fetch pool analytics for ${poolId}`,
          isLoading: false,
        });
      }
    },

    setTimeRange: (range: "7d" | "30d" | "90d" | "1y") => {
      set({ timeRange: range });
    },
  })
);
