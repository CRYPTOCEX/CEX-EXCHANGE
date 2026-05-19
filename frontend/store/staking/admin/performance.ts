"use client";

import { create } from "zustand";
import { $fetch } from "@/lib/api";

interface PerformanceState {
  externalPerformance: StakingExternalPoolPerformance[];
  isLoading: boolean;
  error: string | null;
  fetchPerformance: (filters?: {
    poolId?: string;
    startDate?: string;
    endDate?: string;
  }) => Promise<void>;
  addPerformance: (
    performance: Omit<stakingExternalPoolPerformanceAttributes, "id">
  ) => Promise<StakingExternalPoolPerformance | null>;
}

export const useStakingAdminPerformanceStore = create<PerformanceState>(
  (set) => ({
    externalPerformance: [],
    isLoading: false,
    error: null,

    fetchPerformance: async (filters) => {
      set({ isLoading: true, error: null });
      try {
        const params: Record<string, string> = {};
        if (filters?.poolId) params.poolId = filters.poolId;
        if (filters?.startDate) params.startDate = filters.startDate;
        if (filters?.endDate) params.endDate = filters.endDate;
        const { data, error } = await $fetch({
          url: "/api/admin/staking/performance",
          params,
          silentSuccess: true,
        });
        if (error) throw new Error(error);
        set({ externalPerformance: data || [], isLoading: false });
      } catch (err) {
        console.error("Error fetching performance data:", err);
        set({
          error:
            err instanceof Error
              ? err.message
              : "Failed to fetch performance data",
          isLoading: false,
        });
      }
    },

    addPerformance: async (performance) => {
      set({ isLoading: true, error: null });
      try {
        const { data, error } = await $fetch({
          url: "/api/admin/staking/performance",
          method: "POST",
          body: performance,
        });
        if (error) throw new Error(error);
        if (data) {
          set((state) => ({
            externalPerformance: [...state.externalPerformance, data],
            isLoading: false,
          }));
          return data;
        }
        return null;
      } catch (err) {
        console.error("Error adding performance record:", err);
        set({
          error:
            err instanceof Error
              ? err.message
              : "Failed to add performance record",
          isLoading: false,
        });
        return null;
      }
    },
  })
);
