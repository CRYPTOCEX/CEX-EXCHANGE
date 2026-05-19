import { create } from "zustand";
import { $fetch } from "@/lib/api";

export interface AffiliateCondition {
  id: string;
  name: string;
  title: string;
  description: string;
  type: string;
  reward: number;
  rewardType: "PERCENTAGE" | "FIXED";
  rewardWalletType: "FIAT" | "SPOT" | "ECO";
  rewardCurrency: string;
  rewardChain?: string;
  status: boolean;
}

interface ConditionStore {
  conditions: AffiliateCondition[];
  loading: boolean;
  error: string | null;
  fetchConditions: () => Promise<void>;
}

export const useConditionStore = create<ConditionStore>((set) => ({
  conditions: [],
  loading: false,
  error: null,
  fetchConditions: async () => {
    set({ loading: true, error: null });
    const { data, error } = await $fetch({
      url: "/api/affiliate/condition",
      silentSuccess: true,
    });
    if (!error) {
      set({ conditions: data, loading: false });
    } else {
      set({
        error,
        loading: false,
      });
    }
  },
}));
