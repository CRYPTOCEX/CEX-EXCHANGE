"use client";

import { create } from "zustand";
import { $fetch } from "@/lib/api";

// Types for user-specific operations
export interface StakeRequest {
  poolId: string;
  amount: number;
  /**
   * On-chain pools only: the disclosure version the user read and the five
   * acknowledgements, each true. The door refuses a stale version.
   */
  consent?: { version: string; acknowledgements: Record<string, boolean> };
  /**
   * The pool duration tier to stake into.
   *
   * REQUIRED when the pool publishes more than one tier — the endpoint refuses
   * the stake rather than guessing, because guessing would open a 365-day lock
   * for someone who meant to pick 30 days. Omit it for a pool that publishes
   * none; sending one there is also refused.
   */
  durationId?: string;
}

export interface positionId {
  positionId: string;
}

export interface ClaimRewardsRequest {
  positionId: string;
}

// Shape returned by GET /api/staking/user/summary (under the `summary` key).
//
// The three money figures are USD, priced per asset before they are summed —
// they used to be raw cross-currency sums, so a staker holding BTC and USDT was
// shown the two added together. `currency` is the unit and `unpriced` names the
// assets that HAVE no USD rate: while it is non-empty the three totals are LOWER
// BOUNDS, because an asset that cannot be priced is left out rather than counted
// as zero. `byToken` still carries the native per-asset amounts, which are the
// only figures here meaningful without a conversion.
export interface UserSummaryResponse {
  currency?: string;
  unpriced?: string[];
  totalStaked: number;
  totalEarnings: number;
  unclaimedEarnings: number;
  activePositions: number;
  completedPositions: number;
  byToken: Array<{
    tokenSymbol: string;
    tokenIcon: string | null;
    totalStaked: number;
    positionCount: number;
    totalEarnings?: number;
    unclaimedEarnings?: number;
    // Null when the asset has no USD rate — a different statement from 0.
    usdStaked?: number | null;
    usdEarnings?: number | null;
    usdUnclaimed?: number | null;
  }>;
}

// Normalized summary consumed by the dashboard UI.
export interface UserSummary {
  currency: string;
  unpriced: string[];
  totalStaked: number;
  totalRewards: number;
  unclaimedEarnings: number;
  activePositions: number;
  completedPositions: number;
  byToken: UserSummaryResponse["byToken"];
}

// Shape returned by GET /api/staking/pool/[id]/analytics (under `analytics`).
export interface PoolAnalytics {
  poolId: string;
  poolName: string;
  tokenSymbol: string;
  apr: number;
  totalStaked: number;
  totalStakers: number;
  totalEarnings: number;
  performanceHistory: any[];
  stakingGrowth: Array<{ date: string; totalAmount: number; count: number }>;
  withdrawals: Array<{ date: string; totalAmount: number; count: number }>;
  timeframe: string;
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
    // "LOCKED" is a virtual filter the backend maps to ACTIVE positions with a
    // future endDate. CANCELLED positions exist in the model vocabulary.
    status?:
      | "ACTIVE"
      | "LOCKED"
      | "COMPLETED"
      | "CANCELLED"
      | "PENDING_WITHDRAWAL";
  }) => Promise<void>;

  getPositionById: (id: string) => Promise<void>;

  getPositionEarnings: (id: string) => Promise<void>;

  // Staking operations
  stake: (stakeRequest: StakeRequest) => Promise<{ success: boolean; error: string | null }>;

  withdraw: (
    positionId: string
  ) => Promise<{ success: boolean; error: string | null }>;

  claimRewards: (
    positionId: string
  ) => Promise<{ success: boolean; error: string | null }>;

  /** The on-chain exit: whole position, or `shares` of it. */
  unstake: (
    positionId: string,
    shares?: number | null
  ) => Promise<{ success: boolean; error: string | null }>;

  // User summary and analytics
  getUserSummary: () => Promise<void>;

  getUserEarningsOverTime: (
    timeframe: "week" | "month" | "year" | "all"
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
    // Backend wraps the payload as { analytics: {...} }.
    const { data, error } = await $fetch<{ analytics: PoolAnalytics }>({
      url: `/api/staking/pool/${id}/analytics`,
      silentSuccess: true,
    });
    if (error) {
      set({ error, isLoading: false });
      return;
    }
    if (data?.analytics) {
      set((state) => ({
        poolAnalytics: {
          ...state.poolAnalytics,
          [id]: data.analytics,
        },
        isLoading: false,
      }));
    } else {
      set({ isLoading: false });
    }
  },

  // Helper function to enrich position data with pool information
  enrichPositionData: (positions) => {
    // Safety check: ensure positions is an array
    if (!Array.isArray(positions)) {
      console.error("enrichPositionData received non-array:", positions);
      return [];
    }

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
    const baseParams: Record<string, string> = {};
    if (filters?.poolId) baseParams.poolId = filters.poolId;
    if (filters?.status) baseParams.status = filters.status;

    // The endpoint pages at 20 by default and caps `limit` at 100, and none of
    // the staking screens paginate — so walk every page instead of silently
    // hiding positions past the first one.
    const PER_PAGE = 100;
    const MAX_PAGES = 25;
    const collected: StakingPosition[] = [];
    let page = 1;
    let totalPages = 1;

    do {
      const { data, error } = await $fetch<{
        data: StakingPosition[];
        pagination?: { totalPages?: number };
      }>({
        url: "/api/staking/position",
        silentSuccess: true,
        params: { ...baseParams, page: String(page), limit: String(PER_PAGE) },
      });
      if (error) {
        set({ error, isLoading: false });
        return;
      }
      // Extract positions array from paginated response
      const positionsArray = Array.isArray(data?.data) ? data.data : [];
      collected.push(...positionsArray);
      totalPages = Number(data?.pagination?.totalPages) || 1;
      page += 1;
    } while (page <= totalPages && page <= MAX_PAGES);

    const enrichedPositions = get().enrichPositionData(collected);
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
      // Don't set error in store - return it for the form to handle
      // This prevents the pool detail page from showing "Error Loading Pool"
      set({ isLoading: false });
      return { success: false, error };
    }
    // Refresh positions after successful staking
    set({ isLoading: false });
    get().getUserPositions();
    return { success: true, error: null };
  },

  // Withdraw/claim return their outcome to the caller instead of parking it in
  // `error`: the dashboard and positions pages render a full-page error state
  // off that field, so a rejected action would blank the list the user is
  // looking at. $fetch has already surfaced the message as a toast.
  withdraw: async (positionId) => {
    set({ isLoading: true, error: null });
    const { data, error } = await $fetch<StakingPosition>({
      url: `/api/staking/position/${positionId}/withdraw`,
      method: "POST",
    });
    if (error || !data) {
      set({ isLoading: false });
      return { success: false, error: error || "No data returned" };
    }
    set({ isLoading: false });
    get().getUserPositions();
    return { success: true, error: null };
  },

  claimRewards: async (positionId) => {
    set({ isLoading: true, error: null });
    const { data, error } = await $fetch<StakingPosition>({
      url: `/api/staking/position/${positionId}/claim`,
      method: "POST",
    });
    if (error || !data) {
      set({ isLoading: false });
      return { success: false, error: error || "No data returned" };
    }
    set({ isLoading: false });
    get().getUserPositions();
    return { success: true, error: null };
  },

  // The on-chain exit. Any time from ACTIVE, whole or by shares, not
  // cancellable once accepted; the coins are credited when they land back in
  // the user's own address, and the list re-reads so the row shows UNBONDING.
  unstake: async (positionId, shares) => {
    set({ isLoading: true, error: null });
    const { data, error } = await $fetch<StakingPosition>({
      url: `/api/staking/position/${positionId}/unstake`,
      method: "POST",
      body: shares !== undefined && shares !== null ? { shares } : {},
    });
    if (error || !data) {
      set({ isLoading: false });
      return { success: false, error: error || "No data returned" };
    }
    set({ isLoading: false });
    get().getUserPositions();
    return { success: true, error: null };
  },

  // User summary and analytics
  getUserSummary: async () => {
    set({ isLoading: true, error: null });
    // Backend wraps the payload as { summary: { currency, unpriced,
    // totalStaked, totalEarnings, unclaimedEarnings, activePositions,
    // byToken } }.
    const { data, error } = await $fetch<{ summary: UserSummaryResponse }>({
      url: "/api/staking/user/summary",
      silentSuccess: true,
    });
    if (error) {
      set({ error, isLoading: false });
      return;
    }
    const summary = data?.summary;
    set({
      userSummary: summary
        ? {
            // "USD" only so a stale cached payload does not render a bare
            // number; it is what every current response sends.
            currency: summary.currency ?? "USD",
            unpriced: summary.unpriced ?? [],
            totalStaked: summary.totalStaked ?? 0,
            // Backend exposes lifetime earnings as `totalEarnings`.
            totalRewards: summary.totalEarnings ?? 0,
            unclaimedEarnings: summary.unclaimedEarnings ?? 0,
            activePositions: summary.activePositions ?? 0,
            completedPositions: summary.completedPositions ?? 0,
            byToken: summary.byToken ?? [],
          }
        : null,
      isLoading: false,
    });
  },

  getUserEarningsOverTime: async (timeframe) => {
    set({ isLoading: true, error: null });
    // Backend returns { earnings, summary: { total, claimed, unclaimed,
    // byToken, earningsByDay: [{ date, totalAmount }] } }. Transform the
    // per-day series into chart-friendly labels/data.
    const { data, error } = await $fetch<{
      summary?: {
        total?: number;
        earningsByDay?: Array<{ date: string; totalAmount: number }>;
      };
    }>({
      url: "/api/staking/user/earnings",
      silentSuccess: true,
      params: { timeframe },
    });
    if (error) {
      set({ error, isLoading: false });
      return;
    }
    const summary = data?.summary;
    const byDay = summary?.earningsByDay ?? [];
    set({
      userEarningsOverTime: {
        labels: byDay.map((d) => d.date),
        data: byDay.map((d) => Number(d.totalAmount) || 0),
        totalEarnings: summary?.total ?? 0,
      },
      isLoading: false,
    });
  },
}));
