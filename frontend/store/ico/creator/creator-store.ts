import { create } from "zustand";
import { $fetch } from "@/lib/api";

export type Offering = {
  id: string;
  userId: string;
  planId: string;
  typeId: string;
  name: string;
  symbol: string;
  icon: string;
  status: "ACTIVE" | "SUCCESS" | "FAILED" | "UPCOMING" | "PENDING" | "REJECTED";
  purchaseWalletCurrency: string;
  purchaseWalletType: string;
  tokenPrice: number;
  targetAmount: number;
  currentRaised: number;
  startDate: string;
  endDate: string;
  participants: number;
  currentPrice?: number;
  priceChange?: number;
  submittedAt?: string;
  approvedAt?: string;
  rejectedAt?: string;
  reviewNotes?: string;
  isPaused: boolean;
  isFlagged: boolean;
  featured?: boolean;
  website?: string;
  createdAt?: string;
  updatedAt?: string;
  deletedAt?: string;
  phases?: any[];
  tokenDetail?: any;
  plan: any;
  fundsRaised: number;
  fundingGoal: number;
  launchDate: string | null;
  timeline: {
    id: string;
    title: string;
    date: string;
  }[];
  currentPhase?: {
    id: string;
    name: string;
    tokenPrice: number;
    allocation: number;
    remaining: number;
    duration: number;
    endsIn: number;
  } | null;
  nextPhase?: {
    id: string;
    name: string;
    tokenPrice: number;
    allocation: number;
    remaining: number;
    duration: number;
    endsIn: number;
  } | null;
  investorsCount: number;
};

export type CreatorStats = {
  totalOfferings: number;
  pendingOfferings: number;
  activeOfferings: number;
  completedOfferings: number;
  rejectedOfferings: number;
  totalRaised: number;
  offeringGrowth: number;
  raiseGrowth: number;
  successRate: number;
  successRateGrowth: number;
};

export type ChartPoint = {
  date: string;
  amount: number;
};

type CreatorStore = {
  tokens: {
    active: Offering[];
    pending: Offering[];
    completed: Offering[];
  };
  stats: CreatorStats;
  chartData: ChartPoint[];
  performanceCache: Record<"7d" | "30d" | "90d" | "all", ChartPoint[]>;
  currentToken: Offering | null;
  isLoadingTokens: boolean;
  isLoadingStats: boolean;
  isLoadingToken: boolean;
  isSubmitting: boolean;
  tokensError: string | null;
  statsError: string | null;
  tokenError: string | null;
  submitError: string | null;
  // Cache flags (for tokens, stats, performance)
  hasFetchedTokens: boolean;
  hasFetchedStats: boolean;
  // The performance cache is handled separately for each range.
  currentPerformanceRange?: "7d" | "30d" | "90d" | "all";
  // API methods
  fetchTokens: () => Promise<void>;
  fetchStats: () => Promise<void>;
  fetchPerformance: (range?: "7d" | "30d" | "90d" | "all") => Promise<void>;
  fetchToken: (id: string) => Promise<void>;
  sortTokens: (sortBy: "progress" | "raised" | "investors") => void;
  searchTokens: (query: string) => Offering[];
};

export const useCreatorStore = create<CreatorStore>((set, get) => ({
  tokens: { active: [], pending: [], completed: [] },
  stats: {
    totalOfferings: 0,
    pendingOfferings: 0,
    activeOfferings: 0,
    completedOfferings: 0,
    rejectedOfferings: 0,
    totalRaised: 0,
    offeringGrowth: 0,
    raiseGrowth: 0,
    successRate: 0,
    successRateGrowth: 0,
  },
  chartData: [] as ChartPoint[],
  performanceCache: { "7d": [], "30d": [], "90d": [], all: [] },
  currentToken: null,
  isLoadingTokens: false,
  isLoadingStats: false,
  isLoadingToken: false,
  isSubmitting: false,
  tokensError: null,
  statsError: null,
  tokenError: null,
  submitError: null,
  hasFetchedTokens: false,
  hasFetchedStats: false,
  currentPerformanceRange: "30d",

  // Only fetch tokens if not already fetched.
  fetchTokens: async () => {
    if (get().hasFetchedTokens) return;
    set({ isLoadingTokens: true, tokensError: null });
    const { data, error } = await $fetch({
      url: "/api/ico/creator/token",
      silent: true,
    });
    if (!error && data) {
      // Transform API response to ensure numeric values
      const transformOffering = (offering: any): Offering => ({
        ...offering,
        tokenPrice: parseFloat(offering.tokenPrice) || 0,
        targetAmount: parseFloat(offering.targetAmount) || 0,
        currentRaised: parseFloat(offering.currentRaised) || 0,
        participants: offering.participants || 0,
        currentPrice: offering.currentPrice ? parseFloat(offering.currentPrice) : undefined,
        priceChange: offering.priceChange ? parseFloat(offering.priceChange) : undefined,
        fundsRaised: parseFloat(offering.fundsRaised) || parseFloat(offering.currentRaised) || 0,
        fundingGoal: parseFloat(offering.fundingGoal) || parseFloat(offering.targetAmount) || 0,
        investorsCount: offering.investorsCount || offering.participants || 0,
      });

      set({
        tokens: {
          active: (data.active || []).map(transformOffering),
          pending: (data.pending || []).map(transformOffering),
          completed: (data.completed || []).map(transformOffering),
        },
        isLoadingTokens: false,
        hasFetchedTokens: true,
      });
    } else {
      set({ tokensError: error, isLoadingTokens: false });
    }
  },

  // Only fetch aggregated stats once.
  fetchStats: async () => {
    if (get().hasFetchedStats) return;
    set({ isLoadingStats: true, statsError: null });
    const { data, error } = await $fetch({
      url: "/api/ico/creator/stat",
      silent: true,
    });
    if (!error && data) {
      // Transform API response to ensure numeric values
      set({
        stats: {
          totalOfferings: data.totalOfferings || 0,
          pendingOfferings: data.pendingOfferings || 0,
          activeOfferings: data.activeOfferings || 0,
          completedOfferings: data.completedOfferings || data.successfulOfferings || 0,
          rejectedOfferings: data.rejectedOfferings || data.failedOfferings || 0,
          totalRaised: parseFloat(data.totalRaised) || 0,
          offeringGrowth: parseFloat(data.offeringGrowth) || 0,
          raiseGrowth: parseFloat(data.raiseGrowth) || 0,
          successRate: parseFloat(data.successRate) || 0,
          successRateGrowth: parseFloat(data.successRateGrowth) || 0,
        },
        isLoadingStats: false,
        hasFetchedStats: true,
      });
    } else {
      set({ statsError: error, isLoadingStats: false });
    }
  },

  // Cache performance data per range.
  fetchPerformance: async (range = "30d") => {
    const { performanceCache } = get();
    if (performanceCache[range]?.length) {
      set({ chartData: performanceCache[range] });
      return;
    }
    set({ isLoadingStats: true, statsError: null });
    const { data, error } = await $fetch({
      url: "/api/ico/creator/performance",
      silent: true,
      params: { range },
    });
    if (!error && data) {
      // Transform API response to ensure numeric values
      const chartData: ChartPoint[] = (data || []).map((point: any) => ({
        date: point.date,
        amount: parseFloat(point.amount) || 0,
      }));
      set((state) => ({
        chartData,
        performanceCache: { ...state.performanceCache, [range]: chartData },
        isLoadingStats: false,
        currentPerformanceRange: range,
      }));
    } else {
      set({ statsError: error, isLoadingStats: false });
    }
  },

  // Prevent refetching token if it is already loaded.
  fetchToken: async (id: string) => {
    set({ isLoadingToken: true, tokenError: null });
    try {
      const { data, error } = await $fetch({
        url: `/api/ico/creator/token/${id}`,
        silent: true,
        errorMessage: "Failed to fetch token details",
      });

      if (!error && data) {
        set({
          currentToken: data,
          isLoadingToken: false,
        });
      } else {
        set({
          tokenError: error || "Failed to fetch token details",
          isLoadingToken: false,
          currentToken: null,
        });
      }
    } catch (err) {
      set({
        tokenError: "An unexpected error occurred",
        isLoadingToken: false,
        currentToken: null,
      });
    }
  },

  sortTokens: (sortBy) => {
    const { tokens } = get();
    const sortFn = (a: Offering, b: Offering) => {
      switch (sortBy) {
        case "progress": {
          const progressA =
            a.targetAmount > 0 ? (a.currentRaised / a.targetAmount) * 100 : 0;
          const progressB =
            b.targetAmount > 0 ? (b.currentRaised / b.targetAmount) * 100 : 0;
          return progressB - progressA;
        }
        case "raised":
          return (b.currentRaised || 0) - (a.currentRaised || 0);
        case "investors":
          return (b.participants || 0) - (a.participants || 0);
        default:
          return 0;
      }
    };
    set({
      tokens: {
        active: [...tokens.active].sort(sortFn),
        pending: [...tokens.pending],
        completed: [...tokens.completed].sort(sortFn),
      },
    });
  },

  searchTokens: (query) => {
    const { tokens } = get();
    const lowerQuery = query.toLowerCase();
    const filterFn = (token: Offering) =>
      token.name.toLowerCase().includes(lowerQuery) ||
      token.symbol.toLowerCase().includes(lowerQuery);
    return [
      ...tokens.active.filter(filterFn),
      ...tokens.pending.filter(filterFn),
      ...tokens.completed.filter(filterFn),
    ];
  },
}));
