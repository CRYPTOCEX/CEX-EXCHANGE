"use client";

import { create } from "zustand";
import { $fetch } from "@/lib/api";

interface PositionsState {
  positions: StakingPosition[];
  isLoading: boolean;
  error: string | null;
  fetchPositions: (filters?: {
    poolId?: string;
    status?: string;
  }) => Promise<void>;
  updatePosition: (
    id: string,
    updates: Partial<stakingPositionAttributes>
  ) => Promise<StakingPosition | null>;
}

export const useStakingAdminPositionsStore = create<PositionsState>((set) => ({
  positions: [],
  isLoading: false,
  error: null,

  fetchPositions: async (filters) => {
    set({ isLoading: true, error: null });
    try {
      const params: Record<string, string> = {};
      if (filters?.poolId) params.poolId = filters.poolId;
      if (filters?.status) params.status = filters.status;
      const { data, error } = await $fetch({
        url: "/api/admin/staking/position/all",
        params,
        silentSuccess: true,
      });
      if (error) throw new Error(error);
      set({ positions: data || [], isLoading: false });
    } catch (err) {
      console.error("Error fetching staking positions:", err);
      set({
        error:
          err instanceof Error
            ? err.message
            : "Failed to fetch staking positions",
        isLoading: false,
      });
    }
  },

  updatePosition: async (id, updates) => {
    set({ isLoading: true, error: null });
    try {
      const { data, error } = await $fetch({
        url: `/api/admin/staking/position/${id}`,
        method: "PUT",
        body: updates,
      });
      if (error) throw new Error(error);
      if (data) {
        set((state) => ({
          positions: state.positions.map((p) => (p.id === id ? data : p)),
          isLoading: false,
        }));
        return data;
      }
      return null;
    } catch (err) {
      console.error(`Error updating position ${id}:`, err);
      set({
        error:
          err instanceof Error
            ? err.message
            : `Failed to update position ${id}`,
        isLoading: false,
      });
      return null;
    }
  },
}));
