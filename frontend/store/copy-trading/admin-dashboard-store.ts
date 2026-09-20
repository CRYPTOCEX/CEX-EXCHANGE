"use client";

import { create } from "zustand";
import { $fetch } from "@/lib/api";

interface LeaderStats {
  total: number;
  active: number;
  pending: number;
  suspended: number;
  rejected: number;
  growth: string;
}

interface FollowerStats {
  total: number;
  active: number;
  paused: number;
  stopped: number;
  growth: string;
}

interface TradeStats {
  today: number;
  todayGrowth: string;
  completed: number;
  volume: number;
  todayVolume: number;
  failureRate: string;
}

interface FinancialStats {
  totalAllocated: number;
  platformRevenue: number;
  monthRevenue: number;
}

interface HealthStats {
  score: number;
  status: string;
  pendingTrades: number;
  failureRate: string;
  /** Trades that failed to replicate since midnight. A true COUNT, not a page. */
  failedToday: number;
}

/**
 * Follower capital, bucketed by the state it is sitting in.
 *
 * The four ids are the SERVER's and they are the contract — the handler derives
 * them from one grouped scan of the allocation table, so these four `capital`
 * figures sum to `totalAllocated` exactly. Renaming one here would silently
 * draw the band that matters at zero width.
 */
export type CapitalBandId = "copying" | "paused" | "dormant" | "stranded";

interface CapitalBand {
  id: CapitalBandId;
  capital: number;
  followers: number;
}

/** A leader whose followers' money is not being traded, and why. */
interface CapitalRiskLeader {
  id: string;
  displayName: string | null;
  status: string | null;
  /** The portion of this leader's book the `reason` applies to. */
  capital: number;
  totalCapital: number;
  strandedCapital: number;
  dormantCapital: number;
  followers: number;
  lastTradeAt: string | null;
  daysIdle: number | null;
  reason: "leader-inactive" | "dormant" | "unreleased";
}

interface CapitalStats {
  /**
   * The quote asset every open allocation is denominated in, or null when they
   * span more than one.
   *
   * `quoteAmount` is per-symbol, so a book holding BTC/USDT and ETH/BTC sums
   * USDT into BTC. Null means the totals are still a correct sum of the column
   * and are simply not a money amount in any single denomination — print them
   * bare rather than picking a symbol.
   */
  currency: string | null;
  quoteAssets: number;
  totalAllocated: number;
  /** Of the total, how much is locked in open trades right now. */
  inUse: number;
  /** Days without a leader trade after which capital counts as dormant. */
  dormantDays: number;
  bands: CapitalBand[];
  /** Capital behind a leader who cannot or does not trade. */
  atRisk: number;
  /** True count of such leaders; `leaders` below is capped for rendering. */
  atRiskLeaders: number;
  leaders: CapitalRiskLeader[];
  underwaterFollowers: number;
  underwaterNet: number;
}

interface TopLeader {
  id: string;
  displayName: string;
  avatar?: string;
  tradingStyle: string;
  riskLevel: string;
  followerCount: number;
  totalTrades: number;
  winRate: string;
  totalProfit: number;
  /** Follower money this leader is responsible for. */
  capital: number;
  lastTradeAt: string | null;
}

interface TradeTimelineItem {
  date: string;
  trades: number;
  volume: number;
  profit: number;
}

interface TradingStyleDist {
  style: string;
  count: number;
}

interface RiskLevelDist {
  level: string;
  count: number;
}

interface RecentTrade {
  id: string;
  symbol: string;
  side: "BUY" | "SELL";
  type: string;
  amount: number;
  price: number;
  cost: number;
  profit: number | null;
  profitPercent: number | null;
  status: string;
  isLeaderTrade: boolean;
  createdAt: string;
  leader?: {
    id: string;
    displayName: string;
  };
}

/** A copy that did not fire today, with whatever the engine said about it. */
interface FailedReplication {
  id: string;
  symbol: string;
  side: string;
  status: string;
  cost: number;
  errorMessage?: string | null;
  createdAt: string;
  leader?: {
    id: string;
    displayName: string;
  } | null;
}

interface PendingApplication {
  id: string;
  displayName: string;
  tradingStyle: string;
  riskLevel: string;
  bio?: string;
  createdAt: string;
  user?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    avatar?: string;
  };
}

interface RecentActivity {
  id: string;
  entityType: string;
  entityId: string;
  action: string;
  oldValue: any;
  newValue: any;
  reason?: string;
  createdAt: string;
  user?: {
    id: string;
    firstName: string;
    lastName: string;
    avatar?: string;
  };
  admin?: {
    id: string;
    firstName: string;
    lastName: string;
    avatar?: string;
  };
}

interface SparklineDataPoint {
  date: string;
  value: number;
}

interface Sparklines {
  leaders: SparklineDataPoint[];
  followers: SparklineDataPoint[];
  revenue: SparklineDataPoint[];
  allocation: SparklineDataPoint[];
}

interface DashboardData {
  stats: {
    leaders: LeaderStats;
    followers: FollowerStats;
    trades: TradeStats;
    financial: FinancialStats;
    health: HealthStats;
  };
  capital: CapitalStats;
  distributions: {
    tradingStyle: TradingStyleDist[];
    riskLevel: RiskLevelDist[];
  };
  tradeTimeline: TradeTimelineItem[];
  sparklines: Sparklines;
  topLeaders: TopLeader[];
  recentTrades: RecentTrade[];
  failedReplications: FailedReplication[];
  pendingApplications: PendingApplication[];
  recentActivity: RecentActivity[];
  /** When the server built this payload. Drives the masthead's liveness rail. */
  generatedAt: string;
  /** Denomination of `financial.platformRevenue`, or null if profit share was
   *  booked in more than one currency. */
  revenueCurrency: string | null;
}

interface CopyTradingAdminDashboardStore {
  data: DashboardData | null;
  isLoading: boolean;
  /** A poll in flight over an already-rendered dashboard. */
  isRefreshing: boolean;
  error: string | null;
  fetchDashboard: (background?: boolean) => Promise<void>;
}

export const useCopyTradingAdminDashboardStore = create<CopyTradingAdminDashboardStore>((set, get) => ({
  data: null,
  isLoading: false,
  isRefreshing: false,
  error: null,

  /**
   * A BACKGROUND fetch never blanks the page and never clears the error rail.
   *
   * The previous version set `isLoading` on every call, so the 30s poll this
   * page now runs would have swapped a fully-rendered console for skeletons
   * twice a minute. It also has to keep `data` on failure: a dashboard that is
   * true as of `generatedAt` is worth more than an empty one, and the masthead
   * says "stale" rather than pretending the figures are live.
   */
  fetchDashboard: async (background = false) => {
    if (background) set({ isRefreshing: true });
    else set({ isLoading: true, error: null });

    /* `$fetch` resolves an envelope and never throws — there is no catch branch
       to put this in. */
    const { data, error } = await $fetch({
      url: "/api/admin/copy-trading",
      silent: true,
    });

    if (error) {
      set({
        error: typeof error === "string" ? error : "Failed to load dashboard",
        isLoading: false,
        isRefreshing: false,
      });
      return;
    }

    set({
      data: (data as DashboardData) ?? get().data,
      error: null,
      isLoading: false,
      isRefreshing: false,
    });
  },
}));
