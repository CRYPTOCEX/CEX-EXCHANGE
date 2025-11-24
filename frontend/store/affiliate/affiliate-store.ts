import { create } from "zustand";
import { $fetch } from "@/lib/api";

export interface Affiliate {
  id: string;
  name: string;
  email: string;
  phone?: string;
  location?: string;
  status: "active" | "pending" | "suspended" | "inactive";
  joinDate: string;
  referralCode?: string;
  referrals: number;
  earnings: number;
  conversionRate?: number;
  ctr?: number;
  aov?: number;
  mlmSystem?: string;
}

export interface NetworkNode {
  id: string;
  name: string;
  email: string;
  level: number;
  status: string;
  earnings: number;
  referrals: number;
  joinDate: string;
}

export interface Reward {
  id: string;
  conditionId: string;
  referrerId: string;
  reward: number;
  isClaimed: boolean;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  condition?: {
    name: string;
  };
}

export interface MonthlyEarning {
  month: string;
  earnings: number;
}

// Update your dashboardData interface to include previousStats
interface DashboardData {
  referrals: any[];
  rewards: any[];
  network: NetworkNode[];
  monthlyEarnings: MonthlyEarning[];
  stats: Stats;
  previousStats?: {
    totalReferrals: number;
    activeReferrals: number;
    pendingReferrals: number;
    conversionRate: number;
    totalEarnings: number;
  };
}

export interface AffiliateDetails {
  affiliate: Affiliate | null;
  network: NetworkNode[];
  rewards: Reward[];
  monthlyEarnings: MonthlyEarning[];
}

interface AffiliateStore {
  affiliates: Affiliate[];
  affiliateDetails: AffiliateDetails;
  dashboardData: DashboardData;
  loading: boolean;
  error: string | null;
  fetchAffiliates: () => Promise<void>;
  fetchAffiliateDetails: (id: string) => Promise<void>;
  fetchDashboardData: (period?: string) => Promise<void>;
  updateAffiliateStatus: (
    id: string,
    status: "active" | "suspended" | "inactive"
  ) => Promise<boolean>;
}

export interface Stats {
  totalReferrals: number;
  activeReferrals: number;
  pendingReferrals: number;
  conversionRate: number;
  totalEarnings: number;
  weeklyGrowth: number;
}

export const useAffiliateStore = create<AffiliateStore>((set, get) => ({
  affiliates: [],
  affiliateDetails: {
    affiliate: null,
    network: [],
    rewards: [],
    monthlyEarnings: [],
  },
  dashboardData: {
    referrals: [],
    rewards: [],
    network: [],
    monthlyEarnings: [],
    stats: {
      totalReferrals: 0,
      activeReferrals: 0,
      pendingReferrals: 0,
      conversionRate: 0,
      totalEarnings: 0,
      weeklyGrowth: 0,
    },
    previousStats: {
      totalReferrals: 0,
      activeReferrals: 0,
      pendingReferrals: 0,
      conversionRate: 0,
      totalEarnings: 0,
    },
  },
  loading: false,
  error: null,
  fetchAffiliates: async () => {
    set({ loading: true, error: null });
    const { data, error } = await $fetch({
      url: "/api/admin/affiliate/referral",
      silentSuccess: true,
    });

    if (!error) {
      set({ affiliates: data, loading: false });
    } else {
      set({
        error,
        loading: false,
      });
    }
  },
  fetchAffiliateDetails: async (id: string) => {
    set({ loading: true, error: null });

    try {
      const { data, error } = await $fetch({
        url: `/api/admin/affiliate/referral/${id}`,
        silentSuccess: true,
      });

      if (error) {
        throw new Error(error);
      }

      set({
        affiliateDetails: {
          affiliate: data.affiliate,
          network: data.network || [],
          rewards: data.rewards || [],
          monthlyEarnings: data.monthlyEarnings || [],
        },
        loading: false,
      });
    } catch (err) {
      set({
        error:
          err instanceof Error ? err.message : "Failed to load affiliate data",
        loading: false,
      });
    }
  },
  fetchDashboardData: async (period = "6m") => {
    set({ loading: true, error: null });

    try {
      const { data, error } = await $fetch({
        url: `/api/affiliate`,
        params: { period },
        silentSuccess: true,
      });

      if (error) {
        throw new Error(error);
      }

      set({
        dashboardData: data,
        loading: false,
      });
    } catch (err) {
      set({
        error:
          err instanceof Error ? err.message : "Failed to load dashboard data",
        loading: false,
      });
    }
  },
  updateAffiliateStatus: async (
    id: string,
    status: "active" | "suspended" | "inactive"
  ) => {
    const { data, error } = await $fetch({
      url: `/api/admin/affiliate/referral/${id}/status`,
      method: "PUT",
      body: { status },
    });

    if (!error) {
      // Update local state
      const updatedAffiliates = get().affiliates.map((affiliate) =>
        affiliate.id === id ? { ...affiliate, status } : affiliate
      );

      // Also update the affiliate details if it's the current affiliate
      const currentAffiliate = get().affiliateDetails.affiliate;
      if (currentAffiliate && currentAffiliate.id === id) {
        set({
          affiliateDetails: {
            ...get().affiliateDetails,
            affiliate: {
              ...currentAffiliate,
              status,
            },
          },
        });
      }

      set({ affiliates: updatedAffiliates });
      return true;
    } else {
      console.error("Failed to update affiliate status:", error);
      return false;
    }
  },
}));
