import { create } from "zustand";
import { $fetch } from "@/lib/api";
import { useUserStore } from "@/store/user";

interface ForexState {
  // Data arrays
  plans: (forexPlanAttributes & {
    totalInvestors: number;
    invested: number;
    durations: forexDurationAttributes[];
  })[];
  durations: forexDurationAttributes[];
  investments: forexInvestmentAttributes[];
  accounts: forexAccountAttributes[];
  signals: forexSignalAttributes[];

  // Flags to track if data has been fetched
  hasFetchedPlans: boolean;
  hasFetchedInvestments: boolean;
  hasFetchedAccounts: boolean;

  // Dashboard Data (fetched via new endpoint)
  dashboardData: {
    overview: {
      totalInvested: number;
      totalProfit: number;
      profitPercentage: number;
      activeInvestments: number;
      completedInvestments: number;
    };
    chartData: { name: string; value: number }[];
    planDistribution: { name: string; value: number; percentage: number }[];
    recentInvestments: {
      id: string;
      plan: string;
      amount: number;
      createdAt: string;
      status: string;
    }[];
  } | null;

  // UI State
  selectedPlan: forexPlanAttributes | null;
  selectedDuration: forexDurationAttributes | null;
  investmentAmount: number;

  // Global loading state
  isLoading: boolean;

  // Actions
  selectPlan: (planId: string) => void;
  selectDuration: (durationId: string) => void;
  setInvestmentAmount: (amount: number) => void;
  createInvestment: () => Promise<forexInvestmentAttributes>;
  fetchPlans: () => Promise<void>;
  fetchDurations: () => Promise<void>;
  fetchInvestments: () => Promise<void>;
  fetchAccounts: () => Promise<void>;
  fetchSignals: () => Promise<void>;
  fetchDashboardData: (timeframe?: string) => Promise<void>;

  // Getters
  getPlanDurations: (planId: string) => Promise<forexDurationAttributes[]>;
  getAccountSignals: (accountId: string) => Promise<forexSignalAttributes[]>;
}

export const useForexStore = create<ForexState>((set, get) => ({
  // Initial state
  plans: [],
  durations: [],
  investments: [],
  accounts: [],
  signals: [],

  hasFetchedPlans: false,
  hasFetchedInvestments: false,
  hasFetchedAccounts: false,

  dashboardData: null,

  selectedPlan: null,
  selectedDuration: null,
  investmentAmount: 0,

  isLoading: false,

  // Actions
  selectPlan: (planId) => {
    const plan = get().plans.find((p) => p.id === planId) || null;
    set({
      selectedPlan: plan,
      selectedDuration: null, // Reset duration when plan changes
      investmentAmount: plan?.minAmount || 0,
    });
  },

  selectDuration: (durationId) => {
    const duration = get().durations.find((d) => d.id === durationId) || null;
    set({ selectedDuration: duration });
  },

  setInvestmentAmount: (amount) => {
    set({ investmentAmount: amount });
  },

  fetchPlans: async () => {
    const { hasFetchedPlans } = get();
    if (hasFetchedPlans) return;
    
    set({ isLoading: true });
    const { data, error } = await $fetch({
      url: "/api/forex/plan",
      silentSuccess: true,
    });
    if (data) {
      set({ plans: data, hasFetchedPlans: true });
    }
    set({ isLoading: false });
  },

  fetchDurations: async () => {
    set({ isLoading: true });
    const { data, error } = await $fetch({
      url: "/api/forex/duration",
      silentSuccess: true,
    });
    if (data) {
      set({ durations: data });
    }
    set({ isLoading: false });
  },

  fetchInvestments: async () => {
    const { hasFetchedInvestments } = get();
    if (hasFetchedInvestments) return;
    
    set({ isLoading: true });
    const { data, error } = await $fetch({
      url: "/api/forex/investment",
      silentSuccess: true,
    });
    if (data) {
      // Handle both direct array and paginated response
      const investments = Array.isArray(data) ? data : data.data || [];
      set({ investments, hasFetchedInvestments: true });
    }
    set({ isLoading: false });
  },

  fetchAccounts: async () => {
    const { hasFetchedAccounts } = get();
    if (hasFetchedAccounts) return;
    
    set({ isLoading: true });
    const { data, error } = await $fetch({
      url: "/api/forex/account",
      silentSuccess: true,
    });
    if (data) {
      // If API returns an object, extract the values as an array.
      set({
        accounts: Array.isArray(data) ? data : Object.values(data),
        hasFetchedAccounts: true,
      });
    }
    set({ isLoading: false });
  },

  fetchSignals: async () => {
    set({ isLoading: true });
    const { data, error } = await $fetch({
      url: "/api/forex/signal",
      silentSuccess: true,
    });
    if (data) {
      set({ signals: data });
    }
    set({ isLoading: false });
  },

  fetchDashboardData: async (timeframe = "1y") => {
    set({ isLoading: true });
    const { data, error } = await $fetch({
      url: "/api/forex/overview",
      params: { timeframe },
      silentSuccess: true,
    });
    if (data) {
      set({ dashboardData: data });
    }
    set({ isLoading: false });
  },

  createInvestment: async () => {
    const currentUser = useUserStore.getState().user;
    const { selectedPlan, selectedDuration, investmentAmount } = get();
    if (!currentUser || !selectedPlan || !selectedDuration) {
      throw new Error("Missing required information for investment");
    }
    set({ isLoading: true });
    const { data, error } = await $fetch({
      url: "/api/forex/investment",
      method: "POST",
      body: {
        planId: selectedPlan.id,
        durationId: selectedDuration.id,
        amount: investmentAmount,
      },
      successMessage: "Investment created successfully!",
    });
    set({
      isLoading: false,
      selectedPlan: null,
      selectedDuration: null,
      investmentAmount: 0,
      hasFetchedInvestments: false, // Reset flag to refetch
    });
    if (error || !data) {
      throw new Error(error || "Failed to create investment");
    }
    await get().fetchInvestments();
    return data;
  },

  getPlanDurations: async (planId) => {
    const { data, error } = await $fetch({
      url: `/api/forex/plan/${planId}/duration`,
      silentSuccess: true,
    });
    return data || [];
  },

  getAccountSignals: async (accountId) => {
    const { data, error } = await $fetch({
      url: `/api/forex/account/${accountId}/signal`,
      silentSuccess: true,
    });
    return data || [];
  },
}));
