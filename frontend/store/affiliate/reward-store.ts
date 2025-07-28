import { create } from "zustand";
import { $fetch } from "@/lib/api";

// Update the Reward interface to match what's in types/affiliate.d.ts
export interface Reward {
  id: string;
  reward: number;
  isClaimed: boolean;
  conditionId: string;
  referrerId: string;
  createdAt: Date | string;
  condition?: {
    id: string;
    title: string;
    rewardType: string;
    rewardWalletType: string;
    rewardCurrency: string;
    rewardChain?: string;
  };
  // Legacy fields for compatibility
  date?: string;
  type?: string;
  description?: string;
  status?: string;
  amount?: number;
}

// Add pagination interface
interface Pagination {
  totalItems: number;
  currentPage: number;
  perPage: number;
  totalPages: number;
}

interface RewardStore {
  rewards: Reward[];
  pagination: Pagination;
  loading: boolean;
  error: string | null;
  claimingRewardId: string | null;
  fetchRewards: (page?: number, perPage?: number) => Promise<void>;
  claimReward: (rewardId: string) => Promise<boolean>;
  getAffiliateRewards: (
    affiliateId: string
  ) => Promise<{ data: Reward[] | null; error: string | null }>;
}

export const useRewardStore = create<RewardStore>((set) => ({
  rewards: [],
  pagination: {
    totalItems: 0,
    currentPage: 1,
    perPage: 10,
    totalPages: 1,
  },
  loading: false,
  error: null,
  claimingRewardId: null,
  fetchRewards: async (page = 1, perPage = 10) => {
    // Validate parameters on client side as well
    const validPage = Math.max(1, Math.min(page, 1000));
    const validPerPage = Math.max(1, Math.min(perPage, 100));
    
    set({ loading: true, error: null });
    try {
      const { data, error } = await $fetch({
        url: `/api/affiliate/reward?page=${validPage}&perPage=${validPerPage}`,
        silentSuccess: true,
      });

      if (!error) {
        // Ensure we always set an array, even if the API returns null or undefined
        const rewardsArray = Array.isArray(data?.items) ? data.items : [];
        set({
          rewards: rewardsArray,
          pagination: data?.pagination || {
            totalItems: rewardsArray.length,
            currentPage: page,
            perPage,
            totalPages: Math.ceil(rewardsArray.length / perPage),
          },
          loading: false,
        });
      } else {
        set({
          error,
          loading: false,
          rewards: [], // Set empty array on error
        });
      }
    } catch (err) {
      console.error("Error fetching rewards:", err);
      set({
        error: "Failed to fetch rewards",
        loading: false,
        rewards: [], // Set empty array on error
      });
    }
  },
  claimReward: async (rewardId: string) => {
    set((state) => ({ claimingRewardId: rewardId }));
    try {
      const { data, error } = await $fetch({
        url: `/api/affiliate/reward/${rewardId}/claim`,
        method: "POST",
        silentSuccess: true,
      });

      if (!error) {
        // Update the local state to reflect the claimed reward
        set((state) => ({
          rewards: state.rewards.map((reward) =>
            reward.id === rewardId ? { ...reward, isClaimed: true } : reward
          ),
          claimingRewardId: null,
        }));
        return true;
      }
      set({ claimingRewardId: null });
      return false;
    } catch (err) {
      console.error("Error claiming reward:", err);
      set({ claimingRewardId: null });
      return false;
    }
  },
  getAffiliateRewards: async (affiliateId: string) => {
    set({ loading: true, error: null });
    try {
      const { data, error } = await $fetch({
        url: `/api/admin/affiliates/${affiliateId}/rewards`,
        silentSuccess: true,
      });

      set({ loading: false });
      return { data: Array.isArray(data) ? data : [], error };
    } catch (err) {
      console.error("Error fetching affiliate rewards:", err);
      set({ loading: false });
      return { data: [], error: "Failed to fetch affiliate rewards" };
    }
  },
}));
