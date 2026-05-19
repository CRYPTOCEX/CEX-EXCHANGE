"use client";

import { create } from "zustand";
import { $fetch } from "@/lib/api";

interface TradeUser {
  id: string;
  name: string;
  avatar?: string;
}

interface RecentTrade {
  id: string;
  type: "BUY" | "SELL";
  currency: string;
  amount: number;
  total: number;
  status: string;
  createdAt: string;
  buyer: TradeUser | null;
  seller: TradeUser | null;
}

interface RecentDispute {
  id: string;
  reason: string;
  status: string;
  priority: "HIGH" | "MEDIUM" | "LOW";
  createdAt: string;
  reportedBy: TradeUser | null;
  trade: {
    id: string;
    currency: string;
    total: number;
  } | null;
}

interface TopTrader {
  id: string;
  name: string;
  avatar?: string;
  tradeCount: number;
  totalVolume: number;
}

interface TradeTimelineItem {
  date: string;
  trades: number;
  volume: number;
  revenue: number;
}

interface CurrencyDistItem {
  currency: string;
  count: number;
}

interface OfferStatusDistItem {
  status: string;
  count: number;
}

interface PaymentMethod {
  id: string;
  name: string;
  icon?: string;
  popularityRank: number;
}

interface AdminDashboardStats {
  // Basic Stats
  totalOffers: number;
  offerGrowth: string;
  activeOffers: number;
  pendingOffers: number;
  activeTrades: number;
  tradeGrowth: string;
  openDisputes: number;
  disputeChange: string;
  platformRevenue: string;
  revenueGrowth: string;
  pendingVerifications: number;
  flaggedOffers: number;
  systemHealth: string;
  healthScore: number;

  // Trade Statistics
  completedTrades: number;
  totalVolume: number;
  weekVolume: number;
  avgTradeValue: number;

  // Distributions
  offerTypeDist: { buy: number; sell: number };
  offerStatusDist: OfferStatusDistItem[];
  currencyDist: CurrencyDistItem[];

  // Payment Methods
  paymentMethods: PaymentMethod[];

  // Dispute Analytics
  disputeStats: {
    open: number;
    resolved: number;
    highPriority: number;
  };

  // Top Traders
  topTraders: TopTrader[];

  // Timeline
  tradeTimeline: TradeTimelineItem[];

  // Recent Items
  recentTrades: RecentTrade[];
  recentDisputes: RecentDispute[];
}

interface PlatformActivity {
  date: string;
  trades: number;
  volume: number;
  revenue: number;
}

interface RecentActivity {
  id: string;
  type: string;
  title: string;
  description: string;
  createdAt: string;
  status: string;
  priority?: "high" | "medium" | "low";
  user?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    avatar: string;
    initials?: string;
  };
}

interface AdminDashboardStore {
  stats: AdminDashboardStats | null;
  isLoadingStats: boolean;
  statsError: string | null;
  fetchStats: () => Promise<void>;
  platformActivity: PlatformActivity[];
  isLoadingActivity: boolean;
  activityError: string | null;
  fetchPlatformActivity: () => Promise<void>;
  recentActivity: RecentActivity[];
  isLoadingRecentActivity: boolean;
  recentActivityError: string | null;
  fetchRecentActivity: () => Promise<void>;
  allActivity: RecentActivity[];
  isLoadingAllActivity: boolean;
  allActivityError: string | null;
  fetchAllActivity: () => Promise<void>;
}

export const useAdminDashboardStore = create<AdminDashboardStore>((set) => ({
  // Stats
  stats: null,
  isLoadingStats: false,
  statsError: null,
  fetchStats: async () => {
    set({ isLoadingStats: true, statsError: null });

    const { data, error } = await $fetch({
      url: "/api/admin/p2p/dashboard/stats",
      silentSuccess: true,
    });

    if (error) {
      console.error("Error fetching admin dashboard stats:", error);
      set({
        statsError: "Failed to load dashboard stats. Please try again.",
        isLoadingStats: false,
      });
      return;
    }

    set({ stats: data || null, isLoadingStats: false });
  },

  // Platform Activity
  platformActivity: [],
  isLoadingActivity: false,
  activityError: null,
  fetchPlatformActivity: async () => {
    set({ isLoadingActivity: true, activityError: null });

    const { data, error } = await $fetch({
      url: "/api/admin/p2p/dashboard/activity",
      silentSuccess: true,
    });

    if (error) {
      console.error("Error fetching platform activity:", error);
      set({ activityError: error, isLoadingActivity: false });
      return;
    }

    set({ platformActivity: data || [], isLoadingActivity: false });
  },

  // Recent Activity
  recentActivity: [],
  isLoadingRecentActivity: false,
  recentActivityError: null,
  fetchRecentActivity: async () => {
    set({ isLoadingRecentActivity: true, recentActivityError: null });

    const { data, error } = await $fetch({
      url: "/api/admin/p2p/dashboard/activity/recent",
      silentSuccess: true,
    });

    if (error) {
      console.error("Error fetching recent activity:", error);
      set({ recentActivityError: error, isLoadingRecentActivity: false });
      return;
    }

    set({ recentActivity: data || [], isLoadingRecentActivity: false });
  },

  // All Activity
  allActivity: [],
  isLoadingAllActivity: false,
  allActivityError: null,
  fetchAllActivity: async () => {
    set({ isLoadingAllActivity: true, allActivityError: null });

    const { data, error } = await $fetch({
      url: "/api/admin/p2p/dashboard/activity/all",
      silentSuccess: true,
    });

    if (error) {
      console.error("Error fetching all activity:", error);
      set({ allActivityError: error, isLoadingAllActivity: false });
      return;
    }

    set({ allActivity: data?.activities || data || [], isLoadingAllActivity: false });
  },
}));
