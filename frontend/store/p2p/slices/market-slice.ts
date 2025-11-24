import { $fetch } from "@/lib/api";

export interface MarketState {
  // Market data
  marketHighlights: P2PMarketHighlight[];
  stats: P2PStats | null;
  topCryptos: P2PCryptoPrice[];

  // Loading states
  isLoadingMarketHighlights: boolean;
  isLoadingP2PStats: boolean;
  isLoadingTopCryptos: boolean;

  // Error states
  marketHighlightsError: string | null;
  p2pStatsError: string | null;
  topCryptosError: string | null;
}

export interface MarketActions {
  fetchMarketHighlights: () => Promise<void>;
  fetchP2PStats: () => Promise<void>;
  fetchTopCryptos: () => Promise<void>;
  clearMarketErrors: () => void;
}

export const createMarketSlice = (
  set: any,
  get: any
): MarketState & MarketActions => ({
  // Initial state
  marketHighlights: [],
  stats: null,
  topCryptos: [],

  // Loading states
  isLoadingMarketHighlights: false,
  isLoadingP2PStats: false,
  isLoadingTopCryptos: false,

  // Error states
  marketHighlightsError: null,
  p2pStatsError: null,
  topCryptosError: null,

  // Actions
  fetchMarketHighlights: async () => {
    try {
      set({ isLoadingMarketHighlights: true, marketHighlightsError: null });
      const { data, error } = await $fetch({
        url: "/api/p2p/market/highlight",
        silentSuccess: true,
      });

      if (error) {
        set({
          marketHighlightsError: "Failed to fetch market highlights",
          isLoadingMarketHighlights: false,
        });
        return;
      }

      set({ marketHighlights: data, isLoadingMarketHighlights: false });
    } catch (err) {
      set({
        marketHighlightsError: "An unexpected error occurred",
        isLoadingMarketHighlights: false,
      });
    }
  },

  fetchP2PStats: async () => {
    try {
      set({ isLoadingP2PStats: true, p2pStatsError: null });
      const { data, error } = await $fetch({
        url: "/api/p2p/market/stats",
        silentSuccess: true,
      });

      if (error) {
        set({
          p2pStatsError: "Failed to fetch P2P stats",
          isLoadingP2PStats: false,
        });
        return;
      }

      set({ stats: data, isLoadingP2PStats: false });
    } catch (err) {
      set({
        p2pStatsError: "An unexpected error occurred",
        isLoadingP2PStats: false,
      });
    }
  },

  fetchTopCryptos: async () => {
    try {
      set({ isLoadingTopCryptos: true, topCryptosError: null });
      const { data, error } = await $fetch({
        url: "/api/p2p/market/top",
        silentSuccess: true,
      });

      if (error) {
        set({
          topCryptosError: "Failed to fetch top cryptocurrencies",
          isLoadingTopCryptos: false,
        });
        return;
      }

      // Ensure data is an array before setting it
      set({
        topCryptos: Array.isArray(data) ? data : data?.data || [],
        isLoadingTopCryptos: false,
      });
    } catch (err) {
      set({
        topCryptosError: "An unexpected error occurred",
        isLoadingTopCryptos: false,
      });
    }
  },

  clearMarketErrors: () => {
    set({
      marketHighlightsError: null,
      p2pStatsError: null,
      topCryptosError: null,
    });
  },
});
