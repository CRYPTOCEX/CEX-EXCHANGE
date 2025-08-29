"use client";

import { create } from "zustand";
import { $fetch } from "@/lib/api";

// Types for user-specific operations
export interface StakeRequest {
  poolId: string;
  amount: number;
}

export interface positionId {
  positionId: string;
}

export interface ClaimRewardsRequest {
  positionId: string;
}

export interface UserSummary {
  totalStaked: number;
  totalRewards: number;
  activePositions: number;
  completedPositions: number;
  totalEarningsToDate: number;
  pendingWithdrawals: number;
}

export interface PoolAnalytics {
  totalUsers: number;
  averageStakeAmount: number;
  totalRewardsDistributed: number;
  averageStakeDuration: number; // in days
}

export interface UserStakingState {
  // Data
  pool: StakingPool | null;
  pools: StakingPool[];
  positions: StakingPosition[];
  userSummary: UserSummary | null;
  poolAnalytics: Record<string, PoolAnalytics>;
  positionEarnings: Record<string, stakingEarningRecordAttributes[]>;
  userEarningsOverTime: {
    labels: string[];
    data: number[];
    totalEarnings: number;
  } | null;
  potentialRewards: {
    dailyReward: number;
    totalReward: number;
    effectiveApr: number;
  } | null;
  isLoading: boolean;
  error: string | null;

  // Pool actions
  getPools: (filters?: {
    status?: "ACTIVE" | "INACTIVE" | "COMING_SOON";
    search?: string;
    minApr?: number;
    maxApr?: number;
    token?: string;
  }) => Promise<void>;

  getPoolById: (id: string) => Promise<void>;

  getPoolAnalytics: (id: string) => Promise<void>;

  // Position actions
  getUserPositions: (filters?: {
    poolId?: string;
    status?: "ACTIVE" | "COMPLETED" | "CANCELLED" | "PENDING_WITHDRAWAL";
  }) => Promise<void>;

  getPositionById: (id: string) => Promise<void>;

  getPositionEarnings: (id: string) => Promise<void>;

  // Staking operations
  stake: (stakeRequest: StakeRequest) => Promise<void>;

  withdraw: (positionId: string) => Promise<void>;

  claimRewards: (positionId: string) => Promise<void>;

  // User summary and analytics
  getUserSummary: () => Promise<void>;

  getUserEarningsOverTime: (
    timeframe: "week" | "month" | "year" | "all"
  ) => Promise<void>;

  // Calculation
  calculatePotentialRewards: (
    poolId: string,
    amount: number,
    days: number
  ) => Promise<void>;

  // Helper functions
  enrichPositionData: (positions: StakingPosition[]) => StakingPosition[];
}

export const userStakingStore = create<UserStakingState>((set, get) => ({
  // Initial state
  pool: null,
  pools: [],
  positions: [],
  userSummary: null,
  poolAnalytics: {},
  positionEarnings: {},
  userEarningsOverTime: null,
  potentialRewards: null,
  isLoading: false,
  error: null,

  // Pool actions
  getPools: async (filters) => {
    set({ isLoading: true, error: null });
    const params: Record<string, string> = {};
    if (filters?.status) params.status = filters.status;
    if (filters?.search) params.search = filters.search;
    if (filters?.minApr !== undefined)
      params.minApr = filters.minApr.toString();
    if (filters?.maxApr !== undefined)
      params.maxApr = filters.maxApr.toString();
    if (filters?.token) params.token = filters.token;

    const { data, error } = await $fetch<StakingPool[]>({
      url: "/api/staking/pool",
      silentSuccess: true,
      params,
    });
    if (error) {
      set({ error, isLoading: false });
      return;
    }
    set({ pools: data || [], isLoading: false });
  },

  getPoolById: async (id) => {
    set({ isLoading: true, error: null, pool: null });
    try {
      // Check if the pool is already in state
      const existingPool = get().pools.find((p) => p.id === id);
      if (existingPool) {
        // Set the pool state from the existing pool
        set({ pool: existingPool, isLoading: false });
        return;
      }
      const { data, error } = await $fetch<StakingPool>({
        url: `/api/staking/pool/${id}`,
        silentSuccess: true,
      });
      if (error) {
        set({ error: error || "Failed to load pool", isLoading: false });
        return;
      }
      if (data) {
        set({ pool: data, isLoading: false });
      } else {
        set({ error: "Pool not found", isLoading: false });
      }
    } catch (err) {
      console.error("Error fetching pool:", err);
      set({ 
        error: err instanceof Error ? err.message : "An unexpected error occurred",
        isLoading: false 
      });
    }
  },

  getPoolAnalytics: async (id) => {
    set({ isLoading: true, error: null });
    const { data, error } = await $fetch<PoolAnalytics>({
      url: `/api/staking/pool/${id}/analytics`,
      silentSuccess: true,
    });
    if (error) {
      set({ error, isLoading: false });
      return;
    }
    if (data) {
      set((state) => ({
        poolAnalytics: {
          ...state.poolAnalytics,
          [id]: data,
        },
        isLoading: false,
      }));
    } else {
      set({ isLoading: false });
    }
  },

  // Helper function to enrich position data with pool information
  enrichPositionData: (positions) => {
    return positions.map((position) => {
      // Use actual pool data from the position if it's already included
      if (position.pool) {
        return {
          ...position,
          poolName: position.pool.name,
          tokenSymbol: position.pool.symbol,
          rewardTokenSymbol: position.pool.symbol,
          apr: position.pool.apr,
          pendingRewards: 0,
          lockPeriodEnd: position.endDate,
          icon: position.pool.icon || `/img/crypto/${position.pool.symbol.toLowerCase()}.svg`,
        };
      }
      
      // Fallback if pool data is not included (shouldn't happen with proper includes)
      return {
        ...position,
        poolName: "Unknown Pool",
        tokenSymbol: "???",
        rewardTokenSymbol: "???",
        apr: 0,
        pendingRewards: 0,
        lockPeriodEnd: position.endDate,
        icon: `/img/placeholder.svg`,
      };
    });
  },

  // Position actions
  getUserPositions: async (filters) => {
    set({ isLoading: true, error: null });
    const params: Record<string, string> = {};
    if (filters?.poolId) params.poolId = filters.poolId;
    if (filters?.status) params.status = filters.status;

    const { data, error } = await $fetch<StakingPosition[]>({
      url: "/api/staking/position",
      silentSuccess: true,
      params,
    });
    if (error) {
      set({ error, isLoading: false });
      return;
    }
    const enrichedPositions = get().enrichPositionData(data || []);
    set({ positions: enrichedPositions, isLoading: false });
  },

  getPositionById: async (id) => {
    set({ isLoading: true, error: null });
    // Check if position already exists
    const existingPosition = get().positions.find((p) => p.id === id);
    if (existingPosition) {
      set({ isLoading: false });
      return;
    }
    const { data, error } = await $fetch<StakingPosition>({
      url: `/api/staking/position/${id}`,
      silentSuccess: true,
    });
    if (error) {
      set({ error, isLoading: false });
      return;
    }
    if (data) {
      set((state) => ({
        positions: [...state.positions, data],
        isLoading: false,
      }));
    } else {
      set({ isLoading: false });
    }
  },

  getPositionEarnings: async (id) => {
    const { data, error } = await $fetch<any>({
      url: `/api/staking/position/${id}/earnings`,
      silentSuccess: true,
    });
    if (error) {
      set({ error });
      return;
    }
    // Ensure we always set an array in the store.
    const earnings = Array.isArray(data)
      ? data
      : data && data.earnings
        ? data.earnings
        : [];
    set((state) => ({
      positionEarnings: {
        ...state.positionEarnings,
        [id]: earnings,
      },
    }));
  },

  // Staking operations
  stake: async (stakeRequest) => {
    set({ isLoading: true, error: null });
    const { data, error } = await $fetch<StakingPosition>({
      url: "/api/staking/position",
      method: "POST",
      body: stakeRequest,
    });
    if (error) {
      set({ error, isLoading: false });
      return;
    }
    // Refresh positions after successful staking
    set({ isLoading: false });
    get().getUserPositions();
  },

  withdraw: async (positionId) => {
    set({ isLoading: true, error: null });
    const { data, error } = await $fetch<StakingPosition>({
      url: `/api/staking/position/${positionId}/withdraw`,
      method: "POST",
    });
    if (error || !data) {
      set({ error: error || "No data returned", isLoading: false });
      return;
    }
    set({ isLoading: false });
    get().getUserPositions();
  },

  claimRewards: async (positionId) => {
    set({ isLoading: true, error: null });
    const { data, error } = await $fetch<StakingPosition>({
      url: `/api/staking/position/${positionId}/claim`,
      method: "POST",
    });
    if (error || !data) {
      set({ error: error || "No data returned", isLoading: false });
      return;
    }
    set({ isLoading: false });
    get().getUserPositions();
  },

  // User summary and analytics
  getUserSummary: async () => {
    set({ isLoading: true, error: null });
    const { data, error } = await $fetch<UserSummary>({
      url: "/api/staking/user/summary",
      silentSuccess: true,
    });
    if (error) {
      set({ error, isLoading: false });
      return;
    }
    set({ userSummary: data || null, isLoading: false });
  },

  getUserEarningsOverTime: async (timeframe) => {
    set({ isLoading: true, error: null });
    const { data, error } = await $fetch<{
      labels: string[];
      data: number[];
      totalEarnings: number;
    }>({
      url: "/api/staking/user/earnings",
      silentSuccess: true,
      params: { timeframe },
    });
    if (error) {
      set({ error, isLoading: false });
      return;
    }
    set({ userEarningsOverTime: data || null, isLoading: false });
  },

  // Calculation
  calculatePotentialRewards: async (poolId, amount, days) => {
    set({ isLoading: true, error: null });
    const { data, error } = await $fetch<{
      dailyReward: number;
      totalReward: number;
      effectiveApr: number;
    }>({
      url: "/api/staking/calculate-rewards",
      method: "POST",
      body: { poolId, amount, days },
    });
    if (error) {
      set({ error, isLoading: false });
      return;
    }
    set({ potentialRewards: data || null, isLoading: false });
  },
}));
