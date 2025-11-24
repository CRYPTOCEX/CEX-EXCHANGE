import { create } from "zustand";
import { $fetch } from "@/lib/api";

interface WalletState {
  fiatWallets: any[] | null;
  spotWallets: any[] | null;
  ecoWallets: any[] | null;
  futuresWallets: any[] | null;
  wallet: any | null;
  pnl: any | null;
  stats: any | null;
  isLoading: boolean;
  isLoadingStats: boolean;
  hasFetchedStats: boolean;
  totalBalance: number;
  totalChange: number;
  totalChangePercent: number;
  totalWallets: number;
  activeWallets: number;
  walletsByType: any;

  fetchWallets: () => Promise<void>;
  fetchPnl: () => Promise<void>;
  fetchStats: () => Promise<void>;
  fetchWallet: (type: string, currency: string) => Promise<void>;
  unlockAddress: (address: string) => Promise<void>;
}

export const useWalletStore = create<WalletState>((set, get) => ({
  fiatWallets: null,
  spotWallets: null,
  ecoWallets: null,
  futuresWallets: null,
  wallet: null,
  pnl: null,
  stats: null,
  isLoading: false,
  isLoadingStats: false,
  hasFetchedStats: false,
  totalBalance: 0,
  totalChange: 0,
  totalChangePercent: 0,
  totalWallets: 0,
  activeWallets: 0,
  walletsByType: null,

  fetchWallets: async () => {
    set({ isLoading: true });

    try {
      const { data, error } = await $fetch({
        url: "/api/finance/wallet",
        silent: true,
      });

      if (!error && data) {
        set((state) => ({
          fiatWallets: Array.isArray(data.FIAT) ? data.FIAT : [],
          spotWallets: Array.isArray(data.SPOT) ? data.SPOT : [],
          ecoWallets: Array.isArray(data.ECO) ? data.ECO : [],
          futuresWallets: Array.isArray(data.FUTURES) ? data.FUTURES : [],
          isLoading: false,
        }));
      } else {
        // If there's an error or no data, set empty arrays
        set((state) => ({
          fiatWallets: [],
          spotWallets: [],
          ecoWallets: [],
          futuresWallets: [],
          isLoading: false,
        }));
        console.error("Error fetching wallets:", error);
      }
    } catch (err) {
      console.error("Exception in fetchWallets:", err);
      set({
        fiatWallets: [],
        spotWallets: [],
        ecoWallets: [],
        futuresWallets: [],
        isLoading: false,
      });
    }
  },

  fetchPnl: async () => {
    const { pnl } = get();
    if (pnl) return;

    try {
      const { data, error } = await $fetch({
        url: "/api/finance/wallet?pnl=true",
        silent: true,
      });

      if (!error && data) {
        set((state) => ({
          pnl: data,
        }));
      }
    } catch (err) {
      console.error("Exception in fetchPnl:", err);
    }
  },

  fetchStats: async () => {
    const { isLoadingStats, hasFetchedStats } = get();
    
    // Prevent multiple simultaneous fetches
    if (isLoadingStats || hasFetchedStats) {
      console.log("fetchStats skipped - already loading or fetched");
      return;
    }
    
    console.trace("fetchStats called from:");
    set({ isLoadingStats: true });
    
    try {
      const { data, error } = await $fetch({
        url: "/api/finance/wallet/stats",
        silent: true,
      });

      if (!error && data) {
        set((state) => ({
          stats: data,
          totalBalance: data.totalBalance || 0,
          totalChange: data.totalChange || 0,
          totalChangePercent: data.totalChangePercent || 0,
          totalWallets: data.totalWallets || 0,
          activeWallets: data.activeWallets || 0,
          walletsByType: data.walletsByType || null,
          isLoadingStats: false,
          hasFetchedStats: true,
        }));
      } else {
        console.error("Error fetching wallet stats:", error);
        set({ isLoadingStats: false });
      }
    } catch (err) {
      console.error("Exception in fetchStats:", err);
      set({ isLoadingStats: false });
    }
  },

  fetchWallet: async (type: string, currency: string) => {
    set({ isLoading: true });

    try {
      const { data, error } = await $fetch({
        url: `/api/finance/wallet/${type}/${currency}`,
        silent: true,
      });

      if (!error && data) {
        set((state) => ({
          wallet: data,
          isLoading: false,
        }));
      } else {
        set({ isLoading: false });
      }
    } catch (err) {
      console.error("Exception in fetchWallet:", err);
      set({ isLoading: false });
    }
  },

  unlockAddress: async (address) => {
    try {
      await $fetch({
        url: `/api/ecosystem/deposit/unlock?address=${address}`,
        silent: true,
      });
    } catch (err) {
      console.error("Exception in unlockAddress:", err);
    }
  },
}));
