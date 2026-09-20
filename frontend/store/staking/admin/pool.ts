"use client";

import { create } from "zustand";
import { $fetch } from "@/lib/api";

/**
 * A duration tier as it travels to the backend.
 *
 * `id` is OPTIONAL and that is the whole contract: present means "update this
 * tier", absent means "create one". The admin form strips the client-side draft
 * ids it generates for unsaved rows, because the backend matches by id and
 * refuses one it never issued.
 */
export interface PoolDurationPayload {
  id?: string;
  name?: string | null;
  lockPeriod: number;
  apr: number;
  earningFrequency: "DAILY" | "WEEKLY" | "MONTHLY" | "END_OF_TERM";
  autoCompound?: boolean | null;
  minStake?: number | null;
  maxStake?: number | null;
  adminFeePercentage?: number | null;
  earlyWithdrawalFee?: number | null;
  status?: "ACTIVE" | "INACTIVE";
  /**
   * Marks the term the pool advertises. At most one OPEN term may carry it, and
   * sending two is refused — the admin form clears the others when one is set.
   */
  isFeatured?: boolean;
  order?: number;
}

/**
 * The pool write payload. `durations` is not a model attribute — it is a child
 * COLLECTION the pool routes reconcile — so it has to be added on top of
 * `stakingPoolAttributes` rather than being generated with it.
 *
 * OMITTING `durations` on an update leaves the pool's tiers untouched; sending
 * `[]` clears them. The two are deliberately different, so this stays optional.
 */
export type PoolWritePayload = Omit<
  stakingPoolAttributes,
  "id" | "createdAt" | "updatedAt"
> & {
  durations?: PoolDurationPayload[];
};

interface PoolsState {
  selectedPool: StakingPool | null;
  pools: StakingPool[];
  isLoading: boolean;
  error: string | null;
  fetchPools: () => Promise<void>;
  getPoolById: (id: string) => Promise<StakingPool | null>;
  createPool: (
    pool: PoolWritePayload
  ) => Promise<{ success: boolean; data?: StakingPool; validationErrors?: Record<string, string> }>;
  updatePool: (
    id: string,
    updates: Partial<PoolWritePayload>
  ) => Promise<{ success: boolean; data?: StakingPool; validationErrors?: Record<string, string> }>;
  deletePool: (id: string) => Promise<boolean>;
  reorderPools: (poolIds: string[]) => Promise<boolean>;
}

// `$fetch` resolves `{ data, error }` and never rejects, so a failure is only
// visible by inspecting `error`. Every action below therefore checks it
// explicitly and clears `isLoading` in a `finally` — an unchecked failure used
// to leave the admin pool pages spinning on their skeleton forever.
export const useStakingAdminPoolsStore = create<PoolsState>((set, get) => ({
  selectedPool: null,
  pools: [],
  isLoading: false,
  error: null,

  fetchPools: async () => {
    set({ isLoading: true, error: null });
    try {
      const { data, error } = await $fetch({
        url: "/api/admin/staking/pool/all",
        silentSuccess: true,
      });
      if (error) {
        set({ error });
        return;
      }
      // Handle both array and paginated responses
      const pools = Array.isArray(data) ? data : (data?.items || []);
      set({ pools });
    } finally {
      set({ isLoading: false });
    }
  },

  getPoolById: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      const existingPool = get().pools.find((p) => p.id === id);
      if (existingPool) {
        set({ selectedPool: existingPool });
        return existingPool;
      }
      const { data, error } = await $fetch({
        url: `/api/admin/staking/pool/${id}`,
        silentSuccess: true,
      });
      if (error) {
        set({ error });
        return null;
      }
      if (data) {
        set({ selectedPool: data });
        return data;
      }
      set({ error: `Failed to fetch staking pool ${id}` });
      return null;
    } finally {
      set({ isLoading: false });
    }
  },

  createPool: async (pool) => {
    set({ isLoading: true, error: null });
    try {
      const { data, error, validationErrors } = await $fetch({
        url: "/api/admin/staking/pool",
        method: "POST",
        body: pool,
      });
      if (error) {
        if (validationErrors) {
          return { success: false, validationErrors };
        }
        set({ error });
        return { success: false };
      }
      if (data) {
        set((state) => ({ pools: [...state.pools, data] }));
        return { success: true, data };
      }
      set({ error: "Failed to create staking pool" });
      return { success: false };
    } finally {
      set({ isLoading: false });
    }
  },

  updatePool: async (id: string, updates) => {
    set({ isLoading: true, error: null });
    try {
      const { data, error, validationErrors } = await $fetch({
        url: `/api/admin/staking/pool/${id}`,
        method: "PUT",
        body: updates,
      });
      if (error) {
        if (validationErrors) {
          return { success: false, validationErrors };
        }
        set({ error });
        return { success: false };
      }
      if (data) {
        set((state) => ({
          pools: state.pools.map((p) => (p.id === id ? data : p)),
          selectedPool:
            state.selectedPool?.id === id ? data : state.selectedPool,
        }));
        return { success: true, data };
      }
      set({ error: `Failed to update staking pool ${id}` });
      return { success: false };
    } finally {
      set({ isLoading: false });
    }
  },

  deletePool: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      const { error } = await $fetch({
        url: `/api/admin/staking/pool/${id}`,
        method: "DELETE",
      });
      if (error) {
        set({ error });
        return false;
      }
      set((state) => ({
        pools: state.pools.filter((p) => p.id !== id),
      }));
      return true;
    } finally {
      set({ isLoading: false });
    }
  },

  reorderPools: async (poolIds: string[]) => {
    set({ isLoading: true, error: null });
    try {
      const { error } = await $fetch({
        url: "/api/admin/staking/pool/reorder",
        method: "POST",
        body: { poolIds },
      });
      if (error) {
        set({ error });
        return false;
      }
      // Reload so the list reflects the persisted order.
      await get().fetchPools();
      return true;
    } finally {
      set({ isLoading: false });
    }
  },
}));
