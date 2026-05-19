// store/staking/stats-store.ts
import { create } from "zustand";
import { $fetch } from "@/lib/api";

export interface StakingStats {
  totalStaked: number;
  activeUsers: number;
  avgApr: number;
  totalRewards: number;
}

interface State {
  stats: StakingStats | null;
  loading: boolean;
  error: string | null;
  fetchStats: () => Promise<void>;
}

export const useStakingStatsStore = create<State>((set) => ({
  stats: null,
  loading: false,
  error: null,
  fetchStats: async () => {
    set({ loading: true, error: null });
    const { data, error } = await $fetch({
      url: "/api/staking/stats",
      silent: true,
    });
    if (error) set({ error: "Failed to load stats", loading: false });
    else set({ stats: data, loading: false });
  },
}));
