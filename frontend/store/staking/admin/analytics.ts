"use client";

import { create } from "zustand";
import { $fetch } from "@/lib/api";

// Enhanced data structures based on comprehensive model analysis

interface PoolStatusMetrics {
  total: number;
  active: number;
  inactive: number;
  comingSoon: number;
}

interface WalletTypeMetrics {
  fiat: number;
  spot: number;
  eco: number;
}

interface EarningFrequencyMetrics {
  daily: number;
  weekly: number;
  monthly: number;
  endOfTerm: number;
}

interface PoolFinancialMetrics {
  totalAvailableToStake: number;
  avgAPR: number;
  minAPR: number;
  maxAPR: number;
  avgLockPeriod: number;
  avgMinStake: number;
  avgMaxStake: number;
  avgEarlyWithdrawalFee: number;
  avgAdminFeePercentage: number;
  promotedPoolsCount: number;
  autoCompoundPoolsCount: number;
}

interface PositionStatusMetrics {
  total: number;
  active: number;
  completed: number;
  cancelled: number;
  pendingWithdrawal: number;
}

interface PositionFinancialMetrics {
  totalStakedAmount: number;
  activeStakedAmount: number;
  completedStakedAmount: number;
  cancelledStakedAmount: number;
  avgStakeAmount: number;
  minStakeAmount: number;
  maxStakeAmount: number;
}

interface WithdrawalMetrics {
  totalWithdrawalRequests: number;
  activeWithdrawalRequests: number;
  withdrawalRequestedAmount: number;
  withdrawalRate: number;
  avgWithdrawalProcessingTime: number;
}

interface EarningMetrics {
  totalEarnings: number;
  totalRegularEarnings: number;
  totalBonusEarnings: number;
  totalReferralEarnings: number;
  claimedEarnings: number;
  unclaimedEarnings: number;
  avgEarningPerPosition: number;
}

interface TimeSeriesDataPoint {
  date: string;
  value: number;
  metadata?: Record<string, any>;
  // Additional fields used by UI components
  staked?: number;
  earnings?: number;
  users?: number;
}

interface PoolAnalyticsData {
  statusMetrics: PoolStatusMetrics;
  walletTypeMetrics: WalletTypeMetrics;
  earningFrequencyMetrics: EarningFrequencyMetrics;
  financialMetrics: PoolFinancialMetrics;

  // Additional metrics for UI components
  metrics: {
    activePositions: number;
    totalEarnings: number;
    averageStake: number;
    avgStakeAmount: number;
    utilizationRate: number;
    efficiency: number;
    actualAPR: number;
    expectedAPR: number;
  };

  performance: {
    dailyReturn: number;
    weeklyReturn: number;
    monthlyReturn: number;
    aprOverTime: TimeSeriesDataPoint[];
    efficiencyTrend: TimeSeriesDataPoint[];
  };

  timeSeriesData: {
    poolsCreated: TimeSeriesDataPoint[];
    poolsByStatus: TimeSeriesDataPoint[];
    aprTrend: TimeSeriesDataPoint[];
    availableStakeTrend: TimeSeriesDataPoint[];
  } & TimeSeriesDataPoint[];

  distributions: {
    statusDistribution: Array<{ name: string; value: number; color: string }>;
    walletTypeDistribution: Array<{ name: string; value: number; color: string }>;
    earningFrequencyDistribution: Array<{ name: string; value: number; color: string }>;
    aprDistribution: Array<{ range: string; count: number }>;
    lockPeriodDistribution: Array<{ range: string; count: number }>;
    // Additional distribution types for UI
    earningsDistribution: Array<{ name: string; value: number; color: string }>;
    earningsByType: Array<{ name: string; value: number; color: string }>;
    userRetention: Array<{ name: string; value: number; color: string }>;
  };
}

interface PositionAnalyticsData {
  statusMetrics: PositionStatusMetrics;
  financialMetrics: PositionFinancialMetrics;
  withdrawalMetrics: WithdrawalMetrics;
  earningMetrics: EarningMetrics;

  timeSeriesData: {
    positionsCreated: TimeSeriesDataPoint[];
    positionsByStatus: TimeSeriesDataPoint[];
    stakingVolume: TimeSeriesDataPoint[];
    withdrawalRequests: TimeSeriesDataPoint[];
    earningsDistributed: TimeSeriesDataPoint[];
  };

  distributions: {
    statusDistribution: Array<{ name: string; value: number; color: string }>;
    withdrawalStatusDistribution: Array<{ name: string; value: number; color: string }>;
    stakeAmountDistribution: Array<{ range: string; count: number }>;
    earningTypeDistribution: Array<{ type: string; amount: number; color: string }>;
  };

  performance: {
    avgROI: number;
    totalRewardsDistributed: number;
    retentionRate: number;
    earlyWithdrawalRate: number;
    completionRate: number;
    avgStakingDuration: number;
  };
}

interface StakingAdminAnalyticsState {
  // Data
  /*
   * `/api/admin/staking/analytic`'s ACTUAL payload — `stakingAnalyticsAttributes`
   * in types/staking.d.ts, kept in step with the route's OpenAPI block.
   *
   * This was typed as an invented `OverallStakingAnalytics` shape
   * (`poolMetrics`, `positionMetrics`, `topPools`, `topUsers`, a
   * `performance.totalValueLocked`…) that the endpoint has never returned a
   * single key of. Nothing rendered it, so the lie was free — but it is exactly
   * how a component gets written against fields that arrive undefined.
   */
  overallAnalytics: stakingAnalyticsAttributes | null;
  poolAnalytics: PoolAnalyticsData | null;
  positionAnalytics: PositionAnalyticsData | null;

  // UI State
  isLoading: boolean;
  error: string | null;
  timeRange: "7d" | "30d" | "90d" | "1y" | "all";
  selectedPoolId: string | null;

  // Actions
  fetchOverallAnalytics: () => Promise<void>;
  fetchPoolAnalytics: (poolId?: string) => Promise<void>;
  fetchPositionAnalytics: (poolId?: string) => Promise<void>;
  setTimeRange: (range: "7d" | "30d" | "90d" | "1y" | "all") => void;
  setSelectedPoolId: (poolId: string | null) => void;
  clearError: () => void;
  reset: () => void;
}

const initialState = {
  overallAnalytics: null,
  poolAnalytics: null,
  positionAnalytics: null,
  isLoading: false,
  error: null,
  timeRange: "30d" as const,
  selectedPoolId: null,
};

export const useStakingAdminAnalyticsStore = create<StakingAdminAnalyticsState>(
  (set, get) => ({
    // Initial state
    ...initialState,

    // Actions
    fetchOverallAnalytics: async () => {
      set({ isLoading: true, error: null });
      try {
        const { data, error } = await $fetch({
          url: "/api/admin/staking/analytic",
          method: "GET",
          silentSuccess: true,
        });

        if (error) {
          throw new Error(error);
        }

        set({
          overallAnalytics: data || null,
          isLoading: false,
        });
      } catch (error) {
        console.error("Error fetching overall staking analytics:", error);
        set({
          error:
            error instanceof Error
              ? error.message
              : "Failed to fetch overall staking analytics",
          isLoading: false,
        });
      }
    },

    fetchPoolAnalytics: async (poolId?: string) => {
      const targetPoolId = poolId || get().selectedPoolId;
      if (!targetPoolId) {
        // No pool ID provided, skip fetch
        return;
      }

      set({ isLoading: true, error: null });

      try {
        const { data, error } = await $fetch({
          url: `/api/admin/staking/pool/${targetPoolId}/analytics`,
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
        console.error("Error fetching pool analytics:", error);
        set({
          error:
            error instanceof Error
              ? error.message
              : "Failed to fetch pool analytics",
          isLoading: false,
        });
      }
    },

    fetchPositionAnalytics: async (_poolId?: string) => {
      // Position analytics endpoint doesn't exist yet - skip for now
      set({ positionAnalytics: null, isLoading: false });
    },

    setTimeRange: (range: "7d" | "30d" | "90d" | "1y" | "all") => {
      set({ timeRange: range });
      // Automatically refetch analytics when time range changes
      const { fetchOverallAnalytics, selectedPoolId } = get();
      fetchOverallAnalytics();
      if (selectedPoolId) {
        get().fetchPoolAnalytics(selectedPoolId);
        get().fetchPositionAnalytics(selectedPoolId);
      }
    },

    setSelectedPoolId: (poolId: string | null) => {
      set({ selectedPoolId: poolId });
      if (poolId) {
        get().fetchPoolAnalytics(poolId);
        get().fetchPositionAnalytics(poolId);
      }
    },

    clearError: () => {
      set({ error: null });
    },

    reset: () => {
      set(initialState);
    },
  })
);
