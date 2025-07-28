"use client";

import { create } from "zustand";
import { $fetch } from "@/lib/api";

interface PoolsState {
  selectedPool: StakingPool | null;
  pools: StakingPool[];
  isLoading: boolean;
  error: string | null;
  fetchPools: () => Promise<void>;
  getPoolById: (id: string) => Promise<StakingPool | null>;
  createPool: (
    pool: Omit<stakingPoolAttributes, "id" | "createdAt" | "updatedAt">
  ) => Promise<{ success: boolean; data?: StakingPool; validationErrors?: Record<string, string> }>;
  updatePool: (
    id: string,
    updates: Partial<stakingPoolAttributes>
  ) => Promise<{ success: boolean; data?: StakingPool; validationErrors?: Record<string, string> }>;
  deletePool: (id: string) => Promise<boolean>;
  reorderPools: (poolIds: string[]) => Promise<boolean>;
}

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
      if (!error) {
        set({ pools: data, isLoading: false });
      }
    } catch (err) {
      console.error("Error fetching staking pools:", err);
      set({
        error:
          err instanceof Error ? err.message : "Failed to fetch staking pools",
        isLoading: false,
      });
    }
  },

  getPoolById: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      const existingPool = get().pools.find((p) => p.id === id);
      if (existingPool) {
        set({ selectedPool: existingPool, isLoading: false });
        return existingPool;
      }
      const { data, error } = await $fetch({
        url: `/api/admin/staking/pool/${id}`,
        silentSuccess: true,
      });
      if (error) throw new Error(error);
      if (data) {
        set({ selectedPool: data, isLoading: false });
        return data;
      }
      return null;
    } catch (err) {
      console.error(`Error fetching staking pool ${id}:`, err);
      set({
        error:
          err instanceof Error
            ? err.message
            : `Failed to fetch staking pool ${id}`,
        isLoading: false,
      });
      return null;
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
          set({ isLoading: false });
          return { success: false, validationErrors };
        }
        throw new Error(error);
      }
      if (data) {
        set((state) => ({ pools: [...state.pools, data], isLoading: false }));
        return { success: true, data };
      }
      set({ isLoading: false });
      return { success: false };
    } catch (err) {
      console.error("Error creating staking pool:", err);
      set({
        error:
          err instanceof Error ? err.message : "Failed to create staking pool",
        isLoading: false,
      });
      return { success: false };
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
          set({ isLoading: false });
          return { success: false, validationErrors };
        }
        throw new Error(error);
      }
      if (data) {
        set((state) => ({
          pools: state.pools.map((p) => (p.id === id ? data : p)),
          selectedPool:
            state.selectedPool?.id === id ? data : state.selectedPool,
          isLoading: false,
        }));
        return { success: true, data };
      }
      set({ isLoading: false });
      return { success: false };
    } catch (err) {
      console.error(`Error updating staking pool ${id}:`, err);
      set({
        error:
          err instanceof Error
            ? err.message
            : `Failed to update staking pool ${id}`,
        isLoading: false,
      });
      return { success: false };
    }
  },

  deletePool: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      const { data, error } = await $fetch({
        url: `/api/admin/staking/pool/${id}`,
        method: "DELETE",
      });
      if (error) throw new Error(error);
      set((state) => ({
        pools: state.pools.filter((p) => p.id !== id),
        isLoading: false,
      }));
      return true;
    } catch (err) {
      console.error(`Error deleting staking pool ${id}:`, err);
      set({
        error:
          err instanceof Error
            ? err.message
            : `Failed to delete staking pool ${id}`,
        isLoading: false,
      });
      return false;
    }
  },

  reorderPools: async (poolIds: string[]) => {
    set({ isLoading: true, error: null });
    try {
      const { data, error } = await $fetch({
        url: "/api/admin/staking/pool/reorder",
        method: "POST",
        body: { poolIds },
      });
      if (error) throw new Error(error);
      // Optionally refetch pools after reordering.
      await get().fetchPools();
      return true;
    } catch (err) {
      console.error("Error reordering staking pools:", err);
      set({
        error:
          err instanceof Error
            ? err.message
            : "Failed to reorder staking pools",
        isLoading: false,
      });
      return false;
    }
  },
}));
