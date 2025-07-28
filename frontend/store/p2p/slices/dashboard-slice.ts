import { $fetch } from "@/lib/api";

export interface P2PDashboardData {
  tradingActivity: any[];
  transactions: any[];
  portfolio: P2PPortfolioData;
  stats: P2PStatData[];
}

export interface P2PPortfolioData {
  [key: string]: any;
}

export interface P2PStatData {
  [key: string]: any;
}

export interface P2PTradeActivity {
  [key: string]: any;
  createdAt?: Date;
}

export interface P2PTransaction {
  [key: string]: any;
  createdAt?: Date;
}

export interface DashboardState {
  // Dashboard data
  dashboardData: P2PDashboardData | null;
  portfolio: P2PPortfolioData | null;
  dashboardStats: P2PStatData[];
  tradingActivity: P2PTradeActivity[];
  transactions: P2PTransaction[];

  // Loading states
  isLoadingDashboardData: boolean;
  isLoadingPortfolio: boolean;
  isLoadingDashboardStats: boolean;
  isLoadingTradingActivity: boolean;
  isLoadingTransactions: boolean;

  // Error states
  dashboardDataError: string | null;
  portfolioError: string | null;
  dashboardStatsError: string | null;
  tradingActivityError: string | null;
  transactionsError: string | null;
}

export interface DashboardActions {
  fetchDashboardData: () => Promise<void>;
  fetchPortfolio: () => Promise<void>;
  fetchDashboardStats: () => Promise<void>;
  fetchTradingActivity: () => Promise<void>;
  fetchTransactions: () => Promise<void>;
  clearDashboardErrors: () => void;
}

export const createDashboardSlice = (
  set: any,
  get: any
): DashboardState & DashboardActions => ({
  // Initial state
  dashboardData: null,
  portfolio: null,
  dashboardStats: [],
  tradingActivity: [],
  transactions: [],

  // Loading states
  isLoadingDashboardData: false,
  isLoadingPortfolio: false,
  isLoadingDashboardStats: false,
  isLoadingTradingActivity: false,
  isLoadingTransactions: false,

  // Error states
  dashboardDataError: null,
  portfolioError: null,
  dashboardStatsError: null,
  tradingActivityError: null,
  transactionsError: null,

  // Actions
  fetchDashboardData: async () => {
    try {
      set({ isLoadingDashboardData: true, dashboardDataError: null });
      const { data, error } = await $fetch({
        url: "/api/p2p/dashboard",
        silentSuccess: true,
      });

      if (error || !data) {
        set({
          dashboardDataError: "Failed to fetch dashboard data",
          isLoadingDashboardData: false,
        });
        return;
      }

      // Convert string times to Date objects with null checks
      const processedData = {
        ...data,
        tradingActivity: Array.isArray(data.tradingActivity) 
          ? data.tradingActivity.map((activity: any) => ({
              ...activity,
              createdAt: new Date(activity.time || activity.createdAt),
            }))
          : [],
        transactions: Array.isArray(data.transactions)
          ? data.transactions.map((transaction: any) => ({
              ...transaction,
              createdAt: new Date(transaction.time || transaction.createdAt),
            }))
          : [],
      };

      set({
        dashboardData: processedData,
        portfolio: data.portfolio || null,
        dashboardStats: Array.isArray(data.stats) ? data.stats : [],
        tradingActivity: processedData.tradingActivity,
        transactions: processedData.transactions,
        isLoadingDashboardData: false,
      });
    } catch (err) {
      set({
        dashboardDataError: "An unexpected error occurred",
        isLoadingDashboardData: false,
      });
    }
  },

  fetchPortfolio: async () => {
    try {
      set({ isLoadingPortfolio: true, portfolioError: null });
      const { data, error } = await $fetch({
        url: "/api/p2p/dashboard/portfolio",
        silentSuccess: true,
      });

      if (error || !data) {
        set({
          portfolioError: "Failed to fetch portfolio data",
          isLoadingPortfolio: false,
        });
        return;
      }

      set({ portfolio: data, isLoadingPortfolio: false });
    } catch (err) {
      set({
        portfolioError: "An unexpected error occurred",
        isLoadingPortfolio: false,
      });
    }
  },

  fetchDashboardStats: async () => {
    try {
      set({ isLoadingDashboardStats: true, dashboardStatsError: null });
      const { data, error } = await $fetch({
        url: "/api/p2p/dashboard/stats",
        silentSuccess: true,
      });

      if (error || !data) {
        set({
          dashboardStatsError: "Failed to fetch dashboard stats",
          isLoadingDashboardStats: false,
        });
        return;
      }

      set({ dashboardStats: data, isLoadingDashboardStats: false });
    } catch (err) {
      set({
        dashboardStatsError: "An unexpected error occurred",
        isLoadingDashboardStats: false,
      });
    }
  },

  fetchTradingActivity: async () => {
    try {
      set({ isLoadingTradingActivity: true, tradingActivityError: null });
      const { data, error } = await $fetch({
        url: "/api/p2p/dashboard/activity",
        silentSuccess: true,
      });

      if (error || !data) {
        set({
          tradingActivityError: "Failed to fetch trading activity",
          isLoadingTradingActivity: false,
        });
        return;
      }

      // Convert string times to Date objects with null check
      const processedData = Array.isArray(data) 
        ? data.map((activity: any) => ({
            ...activity,
            createdAt: new Date(activity.time || activity.createdAt),
          }))
        : [];

      set({ tradingActivity: processedData, isLoadingTradingActivity: false });
    } catch (err) {
      set({
        tradingActivityError: "An unexpected error occurred",
        isLoadingTradingActivity: false,
      });
    }
  },

  fetchTransactions: async () => {
    try {
      set({ isLoadingTransactions: true, transactionsError: null });
      const { data, error } = await $fetch({
        url: "/api/p2p/dashboard/transaction",
        silentSuccess: true,
      });

      if (error || !data) {
        set({
          transactionsError: "Failed to fetch transactions",
          isLoadingTransactions: false,
        });
        return;
      }

      // Convert string times to Date objects with null check
      const processedData = Array.isArray(data) 
        ? data.map((transaction: any) => ({
            ...transaction,
            createdAt: new Date(transaction.time || transaction.createdAt),
          }))
        : [];

      set({ transactions: processedData, isLoadingTransactions: false });
    } catch (err) {
      set({
        transactionsError: "An unexpected error occurred",
        isLoadingTransactions: false,
      });
    }
  },

  clearDashboardErrors: () => {
    set({
      dashboardDataError: null,
      portfolioError: null,
      dashboardStatsError: null,
      tradingActivityError: null,
      transactionsError: null,
    });
  },
});
