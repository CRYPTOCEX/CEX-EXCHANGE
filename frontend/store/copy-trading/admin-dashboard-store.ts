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
  distributions: {
    tradingStyle: TradingStyleDist[];
    riskLevel: RiskLevelDist[];
  };
  tradeTimeline: TradeTimelineItem[];
  sparklines: Sparklines;
  topLeaders: TopLeader[];
  recentTrades: RecentTrade[];
  pendingApplications: PendingApplication[];
  recentActivity: RecentActivity[];
}

interface CopyTradingAdminDashboardStore {
  data: DashboardData | null;
  isLoading: boolean;
  error: string | null;
  fetchDashboard: () => Promise<void>;
}

export const useCopyTradingAdminDashboardStore = create<CopyTradingAdminDashboardStore>((set) => ({
  data: null,
  isLoading: false,
  error: null,

  fetchDashboard: async () => {
    set({ isLoading: true, error: null });

    const { data, error } = await $fetch({
      url: "/api/admin/copy-trading",
      silentSuccess: true,
    });

    if (error) {
      console.error("Error fetching copy trading dashboard:", error);
      set({
        error: "Failed to load dashboard data. Please try again.",
        isLoading: false,
      });
      return;
    }

    set({ data: data || null, isLoading: false });
  },
}));
