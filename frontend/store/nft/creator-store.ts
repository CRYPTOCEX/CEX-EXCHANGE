import { create } from "zustand";
import { $fetch } from "@/lib/api";

interface CreatorProfile {
  id: string;
  userId: string;
  displayName?: string;
  bio?: string;
  banner?: string;
  isVerified: boolean;
  verificationTier?: "BRONZE" | "SILVER" | "GOLD" | "PLATINUM";
  totalEarnings: number;
  totalSales: number;
  totalVolume: number;
  totalItems: number;
  totalCollections: number;
  followerCount: number;
  followingCount: number;
  floorPrice?: number;
  profilePublic?: boolean;
  createdAt: string;
  updatedAt: string;
  user?: {
    id: string;
    firstName: string;
    lastName: string;
    avatar?: string;
    email: string;
  };
}

interface CreatorDashboard {
  creator: CreatorProfile;
  overview: {
    totalCollections: number;
    totalTokens: number;
    totalSales: number;
    totalVolume: number;
    totalRoyalties: number;
    totalRoyaltyEarnings: number;
    averageSalePrice: number;
    activeListingsCount: number;
    receivedOffersCount: number;
  };
  collections: any[];
  tokens: any[];
  sales: any[];
  royaltyPayments: any[];
  activeListings: any[];
  activities: any[];
  trendingCollections: any[];
  receivedOffers: any[];
  analytics: {
    period: string;
    dailySales: any[];
    topPerformingCollections: any[];
  };
}

interface CreatorAnalytics {
  period: string;
  granularity: string;
  summary: {
    totalSales: number;
    totalVolume: number;
    totalRoyalties: number;
    avgSalePrice: number;
    uniqueBuyers: number;
    salesGrowth: number;
    volumeGrowth: number;
    totalCollections: number;
    totalNFTs: number;
  };
  timeSeries: Array<{
    period: string;
    sales: number;
    volume: number;
    royalties: number;
    avgPrice: number;
    uniqueBuyers: number;
  }>;
  collections: any[];
  topSellingNFTs: any[];
  topBuyers: any[];
  marketPosition: {
    rank: number;
    totalCreators: number;
    percentile: number;
    avgVolume: number;
    topVolume: number;
  } | null;
  insights: {
    bestPerformingDay?: string;
    mostPopularCollection?: string;
    avgDaysToSell: number;
    repeatBuyerRate: number;
  };
}

interface CreatorStore {
  // State
  profile: CreatorProfile | null;
  dashboard: CreatorDashboard | null;
  analytics: CreatorAnalytics | null;
  loading: boolean;
  error: string | null;

  // Actions
  fetchProfile: () => Promise<void>;
  updateProfile: (data: Partial<CreatorProfile>) => Promise<void>;
  fetchDashboard: (period?: string) => Promise<void>;
  fetchAnalytics: (period?: string, granularity?: string) => Promise<void>;
  
  // Utilities
  clearError: () => void;
  reset: () => void;
}

export const useCreatorStore = create<CreatorStore>((set, get) => ({
  // Initial state
  profile: null,
  dashboard: null,
  analytics: null,
  loading: false,
  error: null,

  // Fetch creator profile
  fetchProfile: async () => {
    set({ loading: true, error: null });
    
    const { data, error } = await $fetch({
      url: "/api/nft/creator/profile",
      method: "GET",
    });

    if (error) {
      set({ error, loading: false });
    } else {
      set({ profile: data, loading: false });
    }
  },

  // Update creator profile
  updateProfile: async (profileData: Partial<CreatorProfile>) => {
    set({ loading: true, error: null });
    
    const { data, error } = await $fetch({
      url: "/api/nft/creator/profile",
      method: "PUT",
      body: profileData,
      successMessage: "Profile updated successfully!",
    });

    if (error) {
      set({ error, loading: false });
    } else {
      set({ profile: data, loading: false });
    }
  },

  // Fetch creator dashboard
  fetchDashboard: async (period = "30d") => {
    set({ loading: true, error: null });
    
    const { data, error } = await $fetch({
      url: "/api/nft/creator/dashboard",
      method: "GET",
      params: { period },
    });

    if (error) {
      set({ error, loading: false });
    } else {
      set({ dashboard: data, loading: false });
    }
  },

  // Fetch creator analytics
  fetchAnalytics: async (period = "30d", granularity = "day") => {
    set({ loading: true, error: null });
    
    const { data, error } = await $fetch({
      url: "/api/nft/creator/analytics",
      method: "GET",
      params: { period, granularity },
    });

    if (error) {
      set({ error, loading: false });
    } else {
      set({ analytics: data, loading: false });
    }
  },

  // Clear error
  clearError: () => {
    set({ error: null });
  },

  // Reset store
  reset: () => {
    set({
      profile: null,
      dashboard: null,
      analytics: null,
      loading: false,
      error: null,
    });
  },
})); 