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
  usedAmount: number;
  totalProfit: number;
  dailyProfit: number;
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  totalVolume: number;
  strategyConfig: Record<string, any>;
  lastTradeAt: string | null;
  createdAt: string;
  updatedAt: string;
  // Derived client-side by normalizeBot() — not columns on the API payload.
  availableBalance: number;
  currentBalance: number;
  profitPercent: number;
  winRate: number;
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
  /**
   * THE COLUMN IS `profit`. `getBotTrades` (`trading-bot/bot/utils.ts:581`)
   * returns raw `tradingBotTrade` rows, and the model's money column is
   * `profit` (`models/ext/trading-bot/tradingBotTrade.ts:267`) — so
   * `realizedPnl` was permanently undefined and every row in Trade History
   * rendered `+USDT 0.00` in green, losing rows included. The sibling
   * copy-trading route aliases it (`copy-trading/trade/index.get.ts:214`),
   * which is why the name looked plausible.
   */
  profit?: number;
  /** Kept for callers that alias it, e.g. the copy-trading trade route. */
  realizedPnl?: number;
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

// The API serves these rows straight from Sequelize, so DECIMAL columns arrive
// as strings ("125.00000000"). Coerce every numeric field at ingestion so the
// UI can call toFixed()/arithmetic on them, and derive the display-only fields
// (balance/percentages) the backend does not store as columns.
const num = (value: any, fallback = 0): number => {
  const parsed = typeof value === "number" ? value : parseFloat(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export function normalizeBot(bot: any): TradingBot {
  const allocatedAmount = num(bot?.allocatedAmount);
  const usedAmount = num(bot?.usedAmount);
  const totalProfit = num(bot?.totalProfit);
  const totalTrades = num(bot?.totalTrades);
  const winningTrades = num(bot?.winningTrades);

  return {
    ...bot,
    allocatedAmount,
    usedAmount,
    totalProfit,
    totalTrades,
    winningTrades,
    losingTrades: num(bot?.losingTrades),
    dailyProfit: num(bot?.dailyProfit),
    totalVolume: num(bot?.totalVolume),
    availableBalance: allocatedAmount - usedAmount,
    currentBalance: allocatedAmount + totalProfit,
    profitPercent: allocatedAmount > 0 ? (totalProfit / allocatedAmount) * 100 : 0,
    winRate: totalTrades > 0 ? (winningTrades / totalTrades) * 100 : 0,
  };
}

function normalizePaperAccount(account: any): PaperAccount {
  const balance = num(account?.balance);
  const initialBalance = num(account?.initialBalance);
  const totalTrades = num(account?.totalTrades);
  const winningTrades = num(account?.winningTrades);

  return {
    balance,
    initialBalance,
    totalTrades,
    winningTrades,
    losingTrades: num(account?.losingTrades),
    totalProfit: num(account?.totalProfit, balance - initialBalance),
    winRate: num(
      account?.winRate,
      totalTrades > 0 ? (winningTrades / totalTrades) * 100 : 0
    ),
    profitPercent: num(
      account?.profitPercent,
      initialBalance > 0 ? ((balance - initialBalance) / initialBalance) * 100 : 0
    ),
  };
}

// Merge the bot returned by a lifecycle endpoint (start/stop/pause/resume) back
// into the list, falling back to the optimistic status when the response body
// carries no bot.
function applyBotUpdate(
  set: (partial: Partial<BotState>) => void,
  get: () => BotState,
  id: string,
  payload: any,
  status: TradingBot["status"]
) {
  const { bots, selectedBot } = get();
  const merge = (bot: TradingBot) =>
    normalizeBot({ ...bot, ...(payload || {}), status: payload?.status || status });

  set({
    bots: bots.map((b) => (b.id === id ? merge(b) : b)),
    selectedBot:
      selectedBot?.id === id ? merge(selectedBot) : selectedBot,
    isLoading: false,
  });
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
  createBotFromStrategy: (
    strategyId: string,
    data: {
      name: string;
      symbol: string;
      mode: "LIVE" | "PAPER";
      allocatedAmount: number;
    }
  ) => Promise<TradingBot>;
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
    const { data, error } = await $fetch<{ items: TradingBot[] }>({
      url: "/api/trading-bot/bot",
      method: "GET",
      silent: true,
    });
    if (error) {
      set({ error, isLoading: false });
      return;
    }
    set({ bots: (data?.items || []).map(normalizeBot), isLoading: false });
  },

  fetchBot: async (id: string) => {
    set({ isLoading: true, error: null });
    const { data, error } = await $fetch<TradingBot>({
      url: `/api/trading-bot/bot/${id}`,
      method: "GET",
      silent: true,
    });
    if (error) {
      set({ error, isLoading: false });
      return;
    }
    set({ selectedBot: data ? normalizeBot(data) : null, isLoading: false });
  },

  createBot: async (payload: Partial<TradingBot>) => {
    set({ isLoading: true, error: null });
    const { data, error } = await $fetch<TradingBot>({
      url: "/api/trading-bot/bot",
      method: "POST",
      body: payload,
    });
    if (error || !data) {
      set({ error: error || "Failed to create bot", isLoading: false });
      throw new Error(error || "Failed to create bot");
    }
    const bot = normalizeBot(data);
    set({ bots: [bot, ...get().bots], isLoading: false });
    return bot;
  },

  /**
   * Deploy a purchased or owned marketplace strategy as a bot.
   *
   * The endpoint has existed since the marketplace shipped and nothing ever
   * called it: the strategy detail page pushed `/trading-bot/create?strategyId=`
   * and the wizard only ever read `?type=`, so the id was dropped on the floor
   * and a bought strategy could not be deployed at all. The strategy supplies
   * the type and config; the caller supplies name, market, mode and allocation.
   */
  createBotFromStrategy: async (strategyId: string, payload) => {
    set({ isLoading: true, error: null });
    const { data, error } = await $fetch<TradingBot>({
      url: `/api/trading-bot/marketplace/strategy/${strategyId}/create-bot`,
      method: "POST",
      body: payload,
    });
    if (error || !data) {
      set({ error: error || "Failed to create bot", isLoading: false });
      throw new Error(error || "Failed to create bot");
    }
    const bot = normalizeBot(data);
    set({ bots: [bot, ...get().bots], isLoading: false });
    return bot;
  },

  updateBot: async (id: string, payload: Partial<TradingBot>) => {
    set({ isLoading: true, error: null });
    const { data, error } = await $fetch<TradingBot>({
      url: `/api/trading-bot/bot/${id}`,
      method: "PUT",
      body: payload,
    });
    if (error || !data) {
      set({ error: error || "Failed to update bot", isLoading: false });
      throw new Error(error || "Failed to update bot");
    }
    const bot = normalizeBot(data);
    set({
      bots: get().bots.map((b) => (b.id === id ? bot : b)),
      selectedBot: bot,
      isLoading: false,
    });
  },

  deleteBot: async (id: string) => {
    set({ isLoading: true, error: null });
    const { error } = await $fetch({
      url: `/api/trading-bot/bot/${id}`,
      method: "DELETE",
    });
    if (error) {
      set({ error, isLoading: false });
      throw new Error(error);
    }
    set({ bots: get().bots.filter((b) => b.id !== id), isLoading: false });
  },

  startBot: async (id: string) => {
    set({ isLoading: true, error: null });
    const { data, error } = await $fetch<TradingBot>({
      url: `/api/trading-bot/bot/${id}/start`,
      method: "POST",
    });
    if (error) {
      set({ error, isLoading: false });
      throw new Error(error);
    }
    applyBotUpdate(set, get, id, data, "RUNNING");
  },

  stopBot: async (id: string) => {
    set({ isLoading: true, error: null });
    const { data, error } = await $fetch<TradingBot>({
      url: `/api/trading-bot/bot/${id}/stop`,
      method: "POST",
    });
    if (error) {
      set({ error, isLoading: false });
      throw new Error(error);
    }
    applyBotUpdate(set, get, id, data, "STOPPED");
  },

  pauseBot: async (id: string) => {
    set({ isLoading: true, error: null });
    const { data, error } = await $fetch<TradingBot>({
      url: `/api/trading-bot/bot/${id}/pause`,
      method: "POST",
    });
    if (error) {
      set({ error, isLoading: false });
      throw new Error(error);
    }
    applyBotUpdate(set, get, id, data, "PAUSED");
  },

  resumeBot: async (id: string) => {
    set({ isLoading: true, error: null });
    const { data, error } = await $fetch<TradingBot>({
      url: `/api/trading-bot/bot/${id}/resume`,
      method: "POST",
    });
    if (error) {
      set({ error, isLoading: false });
      throw new Error(error);
    }
    applyBotUpdate(set, get, id, data, "RUNNING");
  },

  fetchBotTrades: async (botId: string) => {
    set({ isLoading: true, error: null });
    const { data, error } = await $fetch<{ items: BotTrade[] }>({
      url: `/api/trading-bot/bot/${botId}/trades`,
      method: "GET",
      silent: true,
    });
    if (error) {
      set({ error, isLoading: false });
      return;
    }
    set({ botTrades: data?.items || [], isLoading: false });
  },

  fetchStats: async (botId: string) => {
    set({ isLoading: true, error: null });
    const { data, error } = await $fetch<TradingBotStats>({
      url: `/api/trading-bot/bot/${botId}/stats`,
      method: "GET",
      silent: true,
    });
    if (error) {
      set({ error, isLoading: false });
      return;
    }
    set({ stats: data, isLoading: false });
  },

  addAllocation: async (botId: string, amount: number) => {
    set({ isLoading: true, error: null });
    const { data, error } = await $fetch({
      url: `/api/trading-bot/bot/${botId}/allocation/add`,
      method: "POST",
      body: { amount },
    });
    if (error) {
      set({ error, isLoading: false });
      throw new Error(error);
    }
    set({ isLoading: false });
    return data as any;
  },

  removeAllocation: async (botId: string, amount: number) => {
    set({ isLoading: true, error: null });
    const { data, error } = await $fetch({
      url: `/api/trading-bot/bot/${botId}/allocation/remove`,
      method: "POST",
      body: { amount },
    });
    if (error) {
      set({ error, isLoading: false });
      throw new Error(error);
    }
    set({ isLoading: false });
    return data as any;
  },

  killAllBots: async () => {
    set({ isLoading: true, error: null });
    const { data, error } = await $fetch({
      url: "/api/trading-bot/bot/kill-all",
      method: "POST",
    });
    if (error) {
      set({ error, isLoading: false });
      throw new Error(error);
    }
    // Refresh bots list
    await get().fetchBots();
    set({ isLoading: false });
    return data as any;
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
    // Drop empty values BEFORE building the query string.
    //
    // `new URLSearchParams({ type: undefined })` does not omit the key — it
    // serialises the literal text "undefined", and the marketplace route then
    // filters `where.type = "undefined"` and matches nothing. The browse page
    // passes `type: undefined` whenever the filter is "all", which is its
    // default, so /trading-bot/marketplace returned an empty list on first
    // load no matter how many APPROVED + PUBLIC strategies existed.
    const queryParams = new URLSearchParams(
      Object.entries(params ?? {}).filter(
        ([, value]) => value !== undefined && value !== null && value !== ""
      ) as [string, string][]
    ).toString();
    const { data, error } = await $fetch<{
      items: MarketplaceStrategy[];
      pagination: { total: number; limit: number; offset: number };
    }>({
      url: `/api/trading-bot/marketplace${queryParams ? `?${queryParams}` : ""}`,
      method: "GET",
      silent: true,
    });
    if (error) {
      set({ error, isLoading: false });
      return;
    }
    set({
      strategies: data?.items || [],
      pagination: data?.pagination || { total: 0, limit: 20, offset: 0 },
      isLoading: false,
    });
  },

  fetchMyStrategies: async () => {
    set({ isLoading: true, error: null });
    const { data, error } = await $fetch<{ items: MarketplaceStrategy[] }>({
      url: "/api/trading-bot/marketplace/strategy",
      method: "GET",
      silent: true,
    });
    if (error) {
      set({ error, isLoading: false });
      return;
    }
    set({ myStrategies: data?.items || [], isLoading: false });
  },

  fetchPurchases: async () => {
    set({ isLoading: true, error: null });
    const { data, error } = await $fetch<{ items: MarketplaceStrategy[] }>({
      url: "/api/trading-bot/marketplace/purchases",
      method: "GET",
      silent: true,
    });
    if (error) {
      set({ error, isLoading: false });
      return;
    }
    set({ purchases: data?.items || [], isLoading: false });
  },

  fetchStrategy: async (id: string) => {
    set({ isLoading: true, error: null });
    const { data, error } = await $fetch<MarketplaceStrategy>({
      url: `/api/trading-bot/marketplace/strategy/${id}`,
      method: "GET",
      silent: true,
    });
    if (error) {
      set({ error, isLoading: false });
      return;
    }
    set({ currentStrategy: data, isLoading: false });
  },

  purchaseStrategy: async (id: string) => {
    set({ isLoading: true, error: null });
    const { error } = await $fetch({
      url: `/api/trading-bot/marketplace/strategy/${id}/purchase`,
      method: "POST",
    });
    if (error) {
      set({ error, isLoading: false });
      throw new Error(error);
    }
    // Refresh purchases
    await get().fetchPurchases();
    set({ isLoading: false });
  },

  createStrategy: async (payload: any) => {
    set({ isLoading: true, error: null });
    const { data, error } = await $fetch<MarketplaceStrategy>({
      url: "/api/trading-bot/marketplace/strategy",
      method: "POST",
      body: payload,
    });
    if (error || !data) {
      set({ error: error || "Failed to create strategy", isLoading: false });
      throw new Error(error || "Failed to create strategy");
    }
    set({ myStrategies: [data, ...get().myStrategies], isLoading: false });
    return data;
  },

  updateStrategy: async (id: string, payload: any) => {
    set({ isLoading: true, error: null });
    const { data, error } = await $fetch<MarketplaceStrategy>({
      url: `/api/trading-bot/marketplace/strategy/${id}`,
      method: "PUT",
      body: payload,
    });
    if (error || !data) {
      set({ error: error || "Failed to update strategy", isLoading: false });
      throw new Error(error || "Failed to update strategy");
    }
    set({
      myStrategies: get().myStrategies.map((s) => (s.id === id ? data : s)),
      currentStrategy: data,
      isLoading: false,
    });
  },

  submitForReview: async (id: string) => {
    set({ isLoading: true, error: null });
    const { error } = await $fetch({
      url: `/api/trading-bot/marketplace/strategy/${id}/submit`,
      method: "POST",
    });
    if (error) {
      set({ error, isLoading: false });
      throw new Error(error);
    }
    // Refresh my strategies
    await get().fetchMyStrategies();
    set({ isLoading: false });
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
    const { data, error } = await $fetch<PaperAccount>({
      url: `/api/trading-bot/paper-account?currency=${currency}`,
      method: "GET",
      silent: true,
    });
    if (error || !data) {
      set({ error: error || null, isLoading: false });
      return;
    }
    set({ account: normalizePaperAccount(data), isLoading: false });
  },

  resetAccount: async (currency: string = "USDT") => {
    set({ isLoading: true, error: null });
    const { data, error } = await $fetch<{ balance: number }>({
      url: "/api/trading-bot/paper-account/reset",
      method: "POST",
      body: { currency },
    });
    if (error) {
      set({ error, isLoading: false });
      throw new Error(error);
    }
    set({
      account: normalizePaperAccount({
        balance: data?.balance,
        initialBalance: data?.balance,
      }),
      isLoading: false,
    });
  },

  clearError: () => set({ error: null }),
}));
