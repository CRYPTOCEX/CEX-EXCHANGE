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
  /**
   * USD value of deposits the user has submitted that nobody has approved or
   * confirmed yet. Deliberately NOT part of `totalBalance` — see the note on
   * the pending map in backend/src/api/finance/wallet/stats.get.ts.
   */
  totalPending: number;
  totalChange: number;
  totalChangePercent: number;
  totalWallets: number;
  activeWallets: number;
  walletsByType: any;
  /** Currencies held with no usable USD rate; excluded from every USD total. */
  unpricedCurrencies: string[];

  fetchWallets: () => Promise<void>;
  fetchPnl: () => Promise<void>;
  fetchStats: (options?: { force?: boolean }) => Promise<void>;
  /**
   * Call after anything that moves money — a deposit, a withdrawal, a transfer.
   * Re-reads the wallet list AND the aggregate stats the hero and the header
   * balance chip render.
   */
  refreshBalances: () => Promise<void>;
  fetchWallet: (type: string, currency: string) => Promise<void>;
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
  totalPending: 0,
  totalChange: 0,
  totalChangePercent: 0,
  totalWallets: 0,
  activeWallets: 0,
  walletsByType: null,
  unpricedCurrencies: [],

  fetchWallets: async () => {
    set({ isLoading: true });

    try {
      const { data, error } = await $fetch({
        url: "/api/finance/wallet",
        silent: true,
      });

      if (!error && data) {
        // Backend returns { items, pagination }. Group the flat items array by
        // `type` ("FIAT" | "SPOT" | "ECO" | "FUTURES") into the per-type buckets
        // the UI expects. Fall back to empty arrays if items isn't an array.
        const items = Array.isArray(data.items) ? data.items : null;
        set((state) => ({
          fiatWallets: items ? items.filter((w: any) => w.type === "FIAT") : [],
          spotWallets: items ? items.filter((w: any) => w.type === "SPOT") : [],
          ecoWallets: items ? items.filter((w: any) => w.type === "ECO") : [],
          futuresWallets: items
            ? items.filter((w: any) => w.type === "FUTURES")
            : [],
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

  // `force` re-reads even when a previous call already succeeded. The
  // `hasFetchedStats` latch is what keeps four mounted widgets from firing four
  // identical requests, but it also meant an explicit refresh had to reach in
  // and clear the flag by hand — every caller that forgot got a stale total.
  fetchStats: async (options) => {
    const { isLoadingStats, hasFetchedStats } = get();

    // Prevent multiple simultaneous fetches
    if (isLoadingStats || (hasFetchedStats && !options?.force)) {
      return;
    }

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
          totalPending: data.totalPending || 0,
          totalChange: data.totalChange || 0,
          totalChangePercent: data.totalChangePercent || 0,
          totalWallets: data.totalWallets || 0,
          activeWallets: data.activeWallets || 0,
          walletsByType: data.walletsByType || null,
          unpricedCurrencies: Array.isArray(data.unpricedCurrencies)
            ? data.unpricedCurrencies
            : [],
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

  /*
    WHY THIS EXISTS RATHER THAN EACH CALLER CLEARING THE LATCH ITSELF.

    `hasFetchedStats` is a permanent latch — once true, `fetchStats()` returns
    immediately forever. It is there so several widgets mounting at once do not
    fire the same request four times, but nothing invalidated it when money
    moved: a user who deposited, withdrew or transferred and then returned to
    the wallet page was shown the totals from before their transaction, for the
    rest of the session. The only code that got it right reached into
    `useWalletStore.setState({ hasFetchedStats: false })` by hand, which every
    other caller forgot to do.
  */
  refreshBalances: async () => {
    await Promise.all([get().fetchWallets(), get().fetchStats({ force: true })]);
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
}));
