// Trading Bot Store
import { create } from "zustand";
import $fetch from "@/lib/api";

// Types
export interface TradingBot {
  id: string;
  name: string;
  symbol: string;
  type: "DCA" | "GRID" | "INDICATOR" | "TRAILING_STOP" | "CUSTOM";
  mode: "LIVE" | "PAPER";
  status: "DRAFT" | "RUNNING" | "PAUSED" | "STOPPED" | "ERROR" | "LIMIT_REACHED";
  allocatedAmount: number;
  availableBalance: number;
  currentBalance: number;
  totalProfit: number;
  dailyProfit: number;
  profitPercent: number;
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  winRate: number;
  totalVolume: number;
  config: Record<string, any>;
  lastTradeAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface BotTrade {
  id: string;
  botId: string;
  symbol: string;
  side: "BUY" | "SELL";
  type: string;
  amount: number;
  price: number;
  cost: number;
  fee: number;
  realizedPnl: number;
  status: "PENDING" | "FILLED" | "CANCELLED" | "FAILED";
  createdAt: string;
}

export interface TradingBotTrade {
  id: string;
  botId: string;
  symbol: string;
  side: "BUY" | "SELL";
  amount: number;
  price: number;
  cost: number;
  fee: number;
  profit: number;
  profitPercent: number;
  status: "PENDING" | "FILLED" | "CANCELLED" | "FAILED";
  executedAt: string;
}

export interface TradingBotStats {
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  winRate: number;
  totalProfit: number;
  profitPercent: number;
  maxDrawdown: number;
  avgTradeProfit: number;
  avgTradeDuration: number;
  sharpeRatio: number;
  dailyPnL: { date: string; profit: number }[];
}

export interface MarketplaceStrategy {
  id: string;
  name: string;
  description: string;
  type: string;
  price: number;
  currency: string;
  purchaseCount: number;
  avgRating: number;
  reviewCount: number;
  creator: {
    id: string;
    firstName: string;
    lastName: string;
    avatar?: string;
  };
  createdAt: string;
}

export interface PaperAccount {
  balance: number;
  initialBalance: number;
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  totalProfit: number;
  winRate: number;
  profitPercent: number;
}

// Bot Store
interface BotState {
  bots: TradingBot[];
  selectedBot: TradingBot | null;
  botTrades: BotTrade[];
  stats: TradingBotStats | null;
  isLoading: boolean;
  error: string | null;

  // Actions
  fetchBots: () => Promise<void>;
  fetchBot: (id: string) => Promise<void>;
  createBot: (data: Partial<TradingBot>) => Promise<TradingBot>;
  updateBot: (id: string, data: Partial<TradingBot>) => Promise<void>;
  deleteBot: (id: string) => Promise<void>;
  startBot: (id: string) => Promise<void>;
  stopBot: (id: string) => Promise<void>;
  pauseBot: (id: string) => Promise<void>;
  resumeBot: (id: string) => Promise<void>;
  fetchBotTrades: (botId: string) => Promise<void>;
  fetchStats: (botId: string) => Promise<void>;
  addAllocation: (botId: string, amount: number) => Promise<void>;
  removeAllocation: (botId: string, amount: number) => Promise<void>;
  killAllBots: () => Promise<void>;
  clearError: () => void;
}

// Legacy alias
interface TradingBotState extends BotState {}

export const useTradingBotStore = create<TradingBotState>((set, get) => ({
  bots: [],
  selectedBot: null,
  botTrades: [],
  stats: null,
  isLoading: false,
  error: null,

  fetchBots: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await $fetch({
        url: "/api/trading-bot/bot",
        method: "GET",
        silent: true,
      });
      set({ bots: (response as any)?.items || [], isLoading: false });
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
    }
  },

  fetchBot: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      const response = await $fetch({
        url: `/api/trading-bot/bot/${id}`,
        method: "GET",
        silent: true,
      });
      set({ selectedBot: response as any as any, isLoading: false });
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
    }
  },

  createBot: async (data: Partial<TradingBot>) => {
    set({ isLoading: true, error: null });
    try {
      const response = await $fetch({
        url: "/api/trading-bot/bot",
        method: "POST",
        body: data,
      });
      const { bots } = get();
      set({ bots: [response as any as any, ...bots], isLoading: false });
      return response as any;
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  updateBot: async (id: string, data: Partial<TradingBot>) => {
    set({ isLoading: true, error: null });
    try {
      const response = await $fetch({
        url: `/api/trading-bot/bot/${id}`,
        method: "PUT",
        body: data,
      });
      const { bots } = get();
      set({
        bots: bots.map((b) => (b.id === id ? response as any : b)),
        selectedBot: response as any,
        isLoading: false,
      });
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  deleteBot: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      await $fetch({
        url: `/api/trading-bot/bot/${id}`,
        method: "DELETE",
      });
      const { bots } = get();
      set({ bots: bots.filter((b) => b.id !== id), isLoading: false });
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  startBot: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      const response = await $fetch({
        url: `/api/trading-bot/bot/${id}/start`,
        method: "POST",
      });
      const { bots } = get();
      set({
        bots: bots.map((b) => (b.id === id ? { ...b, status: "RUNNING" } : b)),
        selectedBot: response as any,
        isLoading: false,
      });
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  stopBot: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      const response = await $fetch({
        url: `/api/trading-bot/bot/${id}/stop`,
        method: "POST",
      });
      const { bots } = get();
      set({
        bots: bots.map((b) => (b.id === id ? { ...b, status: "STOPPED" } : b)),
        selectedBot: response as any,
        isLoading: false,
      });
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  pauseBot: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      const response = await $fetch({
        url: `/api/trading-bot/bot/${id}/pause`,
        method: "POST",
      });
      const { bots } = get();
      set({
        bots: bots.map((b) => (b.id === id ? { ...b, status: "PAUSED" } : b)),
        selectedBot: response as any,
        isLoading: false,
      });
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  resumeBot: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      const response = await $fetch({
        url: `/api/trading-bot/bot/${id}/resume`,
        method: "POST",
      });
      const { bots } = get();
      set({
        bots: bots.map((b) => (b.id === id ? { ...b, status: "RUNNING" } : b)),
        selectedBot: response as any,
        isLoading: false,
      });
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  fetchBotTrades: async (botId: string) => {
    set({ isLoading: true, error: null });
    try {
      const response = await $fetch({
        url: `/api/trading-bot/bot/${botId}/trades`,
        method: "GET",
        silent: true,
      });
      set({ botTrades: (response as any)?.items || [], isLoading: false });
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
    }
  },

  fetchStats: async (botId: string) => {
    set({ isLoading: true, error: null });
    try {
      const response = await $fetch({
        url: `/api/trading-bot/bot/${botId}/stats`,
        method: "GET",
        silent: true,
      });
      set({ stats: response as any, isLoading: false });
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
    }
  },

  addAllocation: async (botId: string, amount: number) => {
    set({ isLoading: true, error: null });
    try {
      const response = await $fetch({
        url: `/api/trading-bot/bot/${botId}/allocation/add`,
        method: "POST",
        body: { amount },
      });
      set({ isLoading: false });
      return response as any;
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  removeAllocation: async (botId: string, amount: number) => {
    set({ isLoading: true, error: null });
    try {
      const response = await $fetch({
        url: `/api/trading-bot/bot/${botId}/allocation/remove`,
        method: "POST",
        body: { amount },
      });
      set({ isLoading: false });
      return response as any;
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  killAllBots: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await $fetch({
        url: "/api/trading-bot/bot/kill-all",
        method: "POST",
      });
      // Refresh bots list
      await get().fetchBots();
      set({ isLoading: false });
      return response as any;
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  clearError: () => set({ error: null }),
}));

// Alias for backwards compatibility
export const useBotStore = useTradingBotStore;

// Marketplace Store
interface MarketplaceState {
  strategies: MarketplaceStrategy[];
  myStrategies: MarketplaceStrategy[];
  purchases: MarketplaceStrategy[];
  currentStrategy: MarketplaceStrategy | null;
  isLoading: boolean;
  error: string | null;
  pagination: { total: number; limit: number; offset: number };

  // Actions
  fetchStrategies: (params?: Record<string, any>) => Promise<void>;
  fetchMyStrategies: () => Promise<void>;
  fetchPurchases: () => Promise<void>;
  fetchStrategy: (id: string) => Promise<void>;
  purchaseStrategy: (id: string) => Promise<void>;
  createStrategy: (data: any) => Promise<any>;
  updateStrategy: (id: string, data: any) => Promise<void>;
  submitForReview: (id: string) => Promise<void>;
  clearError: () => void;
}

export const useMarketplaceStore = create<MarketplaceState>((set, get) => ({
  strategies: [],
  myStrategies: [],
  purchases: [],
  currentStrategy: null,
  isLoading: false,
  error: null,
  pagination: { total: 0, limit: 20, offset: 0 },

  fetchStrategies: async (params?: Record<string, any>) => {
    set({ isLoading: true, error: null });
    try {
      const queryParams = new URLSearchParams(params as any).toString();
      const response = await $fetch({
        url: `/api/trading-bot/marketplace${queryParams ? `?${queryParams}` : ""}`,
        method: "GET",
        silent: true,
      });
      set({
        strategies: (response as any)?.items || [],
        pagination: (response as any)?.pagination || { total: 0, limit: 20, offset: 0 },
        isLoading: false,
      });
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
    }
  },

  fetchMyStrategies: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await $fetch({
        url: "/api/trading-bot/marketplace/strategy",
        method: "GET",
        silent: true,
      });
      set({ myStrategies: (response as any)?.items || [], isLoading: false });
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
    }
  },

  fetchPurchases: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await $fetch({
        url: "/api/trading-bot/marketplace/purchases",
        method: "GET",
        silent: true,
      });
      set({ purchases: (response as any)?.items || [], isLoading: false });
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
    }
  },

  fetchStrategy: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      const response = await $fetch({
        url: `/api/trading-bot/marketplace/strategy/${id}`,
        method: "GET",
        silent: true,
      });
      set({ currentStrategy: response as any, isLoading: false });
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
    }
  },

  purchaseStrategy: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      await $fetch({
        url: `/api/trading-bot/marketplace/strategy/${id}/purchase`,
        method: "POST",
      });
      // Refresh purchases
      await get().fetchPurchases();
      set({ isLoading: false });
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  createStrategy: async (data: any) => {
    set({ isLoading: true, error: null });
    try {
      const response = await $fetch({
        url: "/api/trading-bot/marketplace/strategy",
        method: "POST",
        body: data,
      });
      const { myStrategies } = get();
      set({ myStrategies: [response as any, ...myStrategies], isLoading: false });
      return response as any;
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  updateStrategy: async (id: string, data: any) => {
    set({ isLoading: true, error: null });
    try {
      const response = await $fetch({
        url: `/api/trading-bot/marketplace/strategy/${id}`,
        method: "PUT",
        body: data,
      });
      const { myStrategies } = get();
      set({
        myStrategies: myStrategies.map((s) => (s.id === id ? response as any : s)),
        currentStrategy: response as any,
        isLoading: false,
      });
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  submitForReview: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      await $fetch({
        url: `/api/trading-bot/marketplace/strategy/${id}/submit`,
        method: "POST",
      });
      // Refresh my strategies
      await get().fetchMyStrategies();
      set({ isLoading: false });
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  clearError: () => set({ error: null }),
}));

// Paper Account Store
interface PaperAccountState {
  account: PaperAccount | null;
  isLoading: boolean;
  error: string | null;

  fetchAccount: (currency?: string) => Promise<void>;
  resetAccount: (currency?: string) => Promise<void>;
  clearError: () => void;
}

export const usePaperAccountStore = create<PaperAccountState>((set) => ({
  account: null,
  isLoading: false,
  error: null,

  fetchAccount: async (currency: string = "USDT") => {
    set({ isLoading: true, error: null });
    try {
      const response = await $fetch({
        url: `/api/trading-bot/paper-account?currency=${currency}`,
        method: "GET",
        silent: true,
      });
      set({ account: response as any, isLoading: false });
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
    }
  },

  resetAccount: async (currency: string = "USDT") => {
    set({ isLoading: true, error: null });
    try {
      const response = await $fetch({
        url: "/api/trading-bot/paper-account/reset",
        method: "POST",
        body: { currency },
      });
      set({
        account: {
          ...response as any,
          initialBalance: (response as any)?.balance || 0,
          totalTrades: 0,
          winningTrades: 0,
          losingTrades: 0,
          totalProfit: 0,
          winRate: 0,
          profitPercent: 0,
        },
        isLoading: false
      });
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  clearError: () => set({ error: null }),
}));
