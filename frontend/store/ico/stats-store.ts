"use client";

import { create } from "zustand";
import { $fetch } from "@/lib/api";
interface StatsStoreState {
  stats: any;
  fetchStats: () => Promise<void>;
}

export const useStatsStore = create<StatsStoreState>((set) => ({
  stats: {
    totalRaised: 0,
    raisedGrowth: 0,
    successfulOfferings: 0,
    offeringsGrowth: 0,
    totalInvestors: 0,
    investorsGrowth: 0,
    averageROI: 0,
    roiGrowth: 0,
  },

  fetchStats: async () => {
    const { data, error } = await $fetch({
      url: "/api/ico/stat",
      silent: true,
    });

    if (data && !error) {
      set({ stats: data });
    }
  },
}));
