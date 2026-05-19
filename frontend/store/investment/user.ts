import { create } from "zustand";
import { $fetch } from "@/lib/api";

interface InvestmentStats {
  activeInvestors: number;
  totalInvested: number;
  averageReturn: number;
  totalPlans: number;
  maxProfitPercentage: number;
}

interface InvestmentState {
  // Investment Plans
  plans: investmentPlanAttributes[];
  plansLoading: boolean;
  plansLastFetch: number;
  hasFetchedPlans: boolean;

  // User Investments
  investments: investmentAttributes[];
  investmentsLoading: boolean;
  activeInvestment: investmentAttributes | null;

  // Investment Creation
  isInvesting: boolean;
  investmentError: string | null;

  // Platform Stats
  stats: InvestmentStats | null;
  statsLoading: boolean;
  statsLastFetch: number;

  // Actions
  fetchPlans: () => Promise<void>;
  fetchUserInvestments: () => Promise<void>;
  createInvestment: (
    planId: string,
    durationId: string,
    amount: number
  ) => Promise<void>;
  fetchStats: () => Promise<void>;

  // Clear functions
  clearError: () => void;
}

// Cache duration in milliseconds (30 seconds)
const CACHE_DURATION = 30 * 1000;

export const useInvestmentStore = create<InvestmentState>((set, get) => ({
  // Initial state
  plans: [],
  plansLoading: false,
  plansLastFetch: 0,
  hasFetchedPlans: false,
  investments: [],
  investmentsLoading: false,
  activeInvestment: null,
  isInvesting: false,
  investmentError: null,
  stats: null,
  statsLoading: false,
  statsLastFetch: 0,

  // Fetch investment plans with caching
  fetchPlans: async () => {
    const now = Date.now();
    const state = get();
    
    // Check if data is still fresh or if already loading
    if (state.plansLoading) {
      return;
    }
    
    if (state.hasFetchedPlans && (now - state.plansLastFetch) < CACHE_DURATION) {
      return;
    }

    set({ plansLoading: true });

    try {
      const { data, error } = await $fetch({
        url: "/api/finance/investment/plan",
        silentSuccess: true,
      });

      if (!error && data) {
        set({ 
          plans: data,
          plansLastFetch: now,
          hasFetchedPlans: true 
        });
      }
    } catch (error) {
      console.error("Error fetching investment plans:", error);
    } finally {
      set({ plansLoading: false });
    }
  },

  // Fetch user investments
  fetchUserInvestments: async () => {
    set({ investmentsLoading: true });

    try {
      const { data, error } = await $fetch({
        url: "/api/finance/investment?type=general",
        silentSuccess: true,
      });

      if (!error && data) {
        // Ensure investments is always an array
        const investmentsList = Array.isArray(data) ? data : 
                               Array.isArray(data?.data) ? data.data : 
                               [];
        set({ investments: investmentsList });
      }
    } catch (error) {
      console.error("Error fetching user investments:", error);
    } finally {
      set({ investmentsLoading: false });
    }
  },

  // Create new investment
  createInvestment: async (
    planId: string,
    durationId: string,
    amount: number
  ) => {
    set({ isInvesting: true, investmentError: null });

    try {
      const { data, error } = await $fetch({
        url: "/api/finance/investment",
        method: "POST",
        body: {
          type: "general",
          planId,
          durationId,
          amount,
        },
      });

      if (error) {
        set({ investmentError: error });
        return;
      }

      // Refresh data after successful investment
      await get().fetchUserInvestments();
    } catch (error: any) {
      set({ investmentError: error.message || "Failed to create investment" });
    } finally {
      set({ isInvesting: false });
    }
  },

  // Fetch platform stats with caching
  fetchStats: async () => {
    const now = Date.now();
    const state = get();
    
    // Check if data is still fresh or if already loading
    if (state.statsLoading) {
      return;
    }
    
    if (state.stats && (now - state.statsLastFetch) < CACHE_DURATION) {
      return;
    }

    set({ statsLoading: true });

    try {
      const { data, error } = await $fetch({
        url: "/api/finance/investment/stats",
        silentSuccess: true,
      });

      if (!error && data) {
        set({ 
          stats: data,
          statsLastFetch: now 
        });
      }
    } catch (error) {
      console.error("Error fetching investment stats:", error);
    } finally {
      set({ statsLoading: false });
    }
  },

  // Clear error
  clearError: () => set({ investmentError: null }),
}));
