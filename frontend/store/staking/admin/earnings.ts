"use client";

import { create } from "zustand";
import { $fetch } from "@/lib/api";

export type AggregatedEarnings = {
  totals: {
    totalUserEarnings: number;
    totalAdminEarnings: number;
    totalEarnings: number;
  };
  earningsByPool: Array<{
    poolId: string;
    poolName: string;
    totalUserEarnings: number;
    totalAdminEarnings: number;
    totalEarnings: number;
  }>;
  history: Array<{
    id: string;
    poolId: string;
    createdAt: string;
    userEarnings: number;
    adminEarnings: number;
    numberOfPositions: number;
    pool?: StakingPool;
  }>;
};

export interface EarningsState {
  earningsData: AggregatedEarnings | null;
  isLoading: boolean;
  error: string | null;
  fetchEarnings: (filters?: {
    poolId?: string;
    startDate?: string;
    endDate?: string;
  }) => Promise<void>;
  distributeEarnings: (params: {
    poolId: string;
    amount: number;
    distributionType: "regular" | "bonus";
  }) => Promise<any>;
}

export const useStakingAdminEarningsStore = create<EarningsState>(
  (set, get) => ({
    earningsData: null,
    isLoading: false,
    error: null,

    fetchEarnings: async (filters) => {
      set({ isLoading: true, error: null });
      try {
        const params: Record<string, string> = {};
        if (filters?.poolId) params.poolId = filters.poolId;
        if (filters?.startDate) params.startDate = filters.startDate;
        if (filters?.endDate) params.endDate = filters.endDate;
        const { data, error } = await $fetch({
          url: "/api/admin/staking/earning",
          params,
          silentSuccess: true,
        });
        if (error) throw new Error(error);
        set({ earningsData: data || null, isLoading: false });
      } catch (err) {
        console.error("Error fetching aggregated earnings:", err);
        set({
          error:
            err instanceof Error
              ? err.message
              : "Failed to fetch aggregated earnings",
          isLoading: false,
        });
      }
    },

    distributeEarnings: async (params) => {
      set({ isLoading: true, error: null });
      try {
        const { data, error, validationErrors } = await $fetch({
          url: "/api/admin/staking/earning/distribute",
          method: "POST",
          body: params,
        });
        
        if (error) {
          if (validationErrors) {
            // Create an error object with validation errors for the component to handle
            const validationError = new Error(error) as any;
            validationError.validationErrors = validationErrors;
            set({ isLoading: false });
            throw validationError;
          }
          throw new Error(error);
        }
        
        // Optionally refetch earnings after distribution.
        await get().fetchEarnings({
          poolId: params.poolId !== "all" ? params.poolId : undefined,
        });
        set({ isLoading: false });
        return data;
      } catch (err) {
        console.error("Error distributing earnings:", err);
        set({
          error:
            err instanceof Error
              ? err.message
              : "Failed to distribute earnings",
          isLoading: false,
        });
        throw err;
      }
    },
  })
);
