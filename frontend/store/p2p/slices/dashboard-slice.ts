import { $fetch } from "@/lib/api";

// `$fetch` always resolves `{ data, error }` and never throws, so try/catch
// around it is dead code - the server's explanation only reaches the user if we
// read it off `error`. Mirrors the helper in offer-slice.ts / trade-slice.ts.
const errorMessage = (error: unknown, fallback: string): string => {
  if (typeof error === "string" && error.trim()) return error;
  if (error && typeof error === "object") {
    const message = (error as any).message;
    if (typeof message === "string" && message.trim()) return message;
  }
  return fallback;
};

export interface P2PDashboardData {
  tradingActivity: any[];
  transactions: any[];
  portfolio: P2PPortfolioData;
  stats: P2PStatData[];
}

export interface P2PPortfolioData {
  [key: string]: any;
}

/**
 * One display tile, as `/api/p2p/dashboard` and `/api/p2p/dashboard/stats` build
 * them. Typed rather than left as a bare index signature because two of these
 * fields are claims about the figure that a renderer MUST honour:
 *
 * - `value: null` means "not available". It is not a zero, and drawing it as one
 *   tells a trader with money on the platform that they have none.
 * - `partial` means the money total is a LOWER BOUND: the currencies in
 *   `unpricedCurrencies` were held but had no USD rate, so they contributed
 *   nothing to it. The server also names them in the `change` caption.
 *
 * The index signature stays so neither route's extra fields are lost in transit.
 */
export interface P2PStatData {
  title?: string;
  value?: string | null;
  partial?: boolean;
  unpricedCurrencies?: string[];
  error?: string | null;
  change?: string | null;
  changeType?: string;
  icon?: string;
  gradient?: string;
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
  userOffers: any[];

  // Loading states
  isLoadingDashboardData: boolean;
  isLoadingPortfolio: boolean;
  isLoadingDashboardStats: boolean;
  isLoadingTradingActivity: boolean;
  isLoadingTransactions: boolean;
  isLoadingUserOffers: boolean;

  // Error states
  dashboardDataError: string | null;
  portfolioError: string | null;
  dashboardStatsError: string | null;
  tradingActivityError: string | null;
  transactionsError: string | null;
  userOffersError: string | null;
}

export interface DashboardActions {
  fetchDashboardData: () => Promise<void>;
  fetchPortfolio: () => Promise<void>;
  fetchDashboardStats: () => Promise<void>;
  fetchTradingActivity: () => Promise<void>;
  fetchTransactions: () => Promise<void>;
  fetchUserOffers: () => Promise<void>;
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
  userOffers: [],

  // Loading states
  isLoadingDashboardData: false,
  isLoadingPortfolio: false,
  isLoadingDashboardStats: false,
  isLoadingTradingActivity: false,
  isLoadingTransactions: false,
  isLoadingUserOffers: false,

  // Error states
  dashboardDataError: null,
  portfolioError: null,
  dashboardStatsError: null,
  tradingActivityError: null,
  transactionsError: null,
  userOffersError: null,

  // Actions
  fetchDashboardData: async () => {
    try {
      set({
        isLoadingDashboardData: true,
        dashboardDataError: null,
        portfolioError: null,
        dashboardStatsError: null,
        tradingActivityError: null,
      });
      const { data, error } = await $fetch({
        url: "/api/p2p/dashboard",
        silentSuccess: true,
      });

      if (error || !data) {
        // This one call is what feeds the stats cards, the portfolio chart and
        // the trading-activity list, so its failure has to be visible in all
        // three places - otherwise they render zeros as if they were measured.
        const message = errorMessage(error, "Failed to fetch dashboard data");
        set({
          dashboardDataError: message,
          portfolioError: message,
          dashboardStatsError: message,
          tradingActivityError: message,
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

      // The route answers 200 with the sections it COULD build and names the
      // ones it could not in `errors` (omitted entirely when nothing failed).
      // Reading it is the whole point of the field: without this a failed
      // aggregate arrives as an empty array and the page renders "no trades" to
      // someone who has an open trade.
      const sectionErrors = (data as any).errors || {};

      set({
        dashboardData: processedData,
        portfolio: data.portfolio || null,
        dashboardStats: Array.isArray(data.stats) ? data.stats : [],
        tradingActivity: processedData.tradingActivity,
        transactions: processedData.transactions,
        portfolioError: sectionErrors.volume || null,
        tradingActivityError: sectionErrors.activity || null,
        transactionsError: sectionErrors.transactions || null,
        isLoadingDashboardData: false,
      });

      // Also fetch user offers
      get().fetchUserOffers();
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
          portfolioError: errorMessage(error, "Failed to fetch portfolio data"),
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
          dashboardStatsError: errorMessage(error, "Failed to fetch dashboard stats"),
          isLoadingDashboardStats: false,
        });
        return;
      }

      // Extract stats array from backend response.
      // The tiles are kept VERBATIM: the Total Balance tile now carries
      // `partial` / `unpricedCurrencies` when a held currency had no USD rate,
      // and picking fields off it here is how that marker would get lost between
      // the route that measured it and the tile that has to say so.
      const stats = Array.isArray(data.stats) ? data.stats : [];

      set({ dashboardStats: stats, isLoadingDashboardStats: false });
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
          tradingActivityError: errorMessage(error, "Failed to fetch trading activity"),
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
          transactionsError: errorMessage(error, "Failed to fetch transactions"),
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

  fetchUserOffers: async () => {
    try {
      set({ isLoadingUserOffers: true, userOffersError: null });
      const { data, error } = await $fetch({
        url: "/api/p2p/offer/user",
        silentSuccess: true,
      });

      if (error || !data) {
        set({
          userOffersError: errorMessage(error, "Failed to fetch user offers"),
          isLoadingUserOffers: false,
        });
        return;
      }

      set({ userOffers: Array.isArray(data) ? data : [], isLoadingUserOffers: false });
    } catch (err) {
      set({
        userOffersError: "An unexpected error occurred",
        isLoadingUserOffers: false,
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
      userOffersError: null,
    });
  },
});
