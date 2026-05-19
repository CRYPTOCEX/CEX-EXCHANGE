import { useState, useEffect, useCallback } from "react";
import { $fetch } from "@/lib/api";
import { useUserStore } from "@/store/user";
import type { MarketType } from "../../../types/common";

interface BalancesState {
  baseBalance: number;
  quoteBalance: number;
  isLoading: boolean;
  error: string | null;
}

// Module-level cache to persist across StrictMode remounts
const balancesCache = {
  lastFetchTime: 0,
  isFetching: false,
  lastFetchKey: "",
  data: null as { baseBalance: number; quoteBalance: number } | null,
};

// Cooldown in ms to prevent StrictMode double-fetch
const FETCH_COOLDOWN_MS = 2000;

export function useBalances(
  baseCurrency?: string,
  quoteCurrency?: string,
  marketType: MarketType = "spot"
) {
  // Get user authentication status
  const user = useUserStore((state) => state.user);
  const isAuthenticated = !!user;

  const [state, setState] = useState<BalancesState>(() => ({
    baseBalance: balancesCache.data?.baseBalance ?? 0,
    quoteBalance: balancesCache.data?.quoteBalance ?? 0,
    isLoading: !balancesCache.data,
    error: null,
  }));

  const fetchBalances = useCallback(async (force = false) => {
    // Don't fetch balances if user is not authenticated
    if (!isAuthenticated) {
      setState({
        baseBalance: 0,
        quoteBalance: 0,
        isLoading: false,
        error: null,
      });
      return;
    }

    if (!baseCurrency || !quoteCurrency) {
      setState((prev) => ({ ...prev, isLoading: false }));
      return;
    }

    // Determine wallet type based on market type
    const walletType = marketType === "eco" ? "ECO" : marketType === "futures" ? "FUTURES" : "SPOT";
    const fetchKey = `${walletType}-${baseCurrency}-${quoteCurrency}`;
    const now = Date.now();

    // Prevent duplicate fetches within cooldown period (unless forced) using module-level cache
    if (
      !force && (
        balancesCache.isFetching ||
        (balancesCache.lastFetchKey === fetchKey && now - balancesCache.lastFetchTime < FETCH_COOLDOWN_MS)
      )
    ) {
      // If we have cached data, use it
      if (balancesCache.data) {
        setState({
          baseBalance: balancesCache.data.baseBalance,
          quoteBalance: balancesCache.data.quoteBalance,
          isLoading: false,
          error: null,
        });
      }
      return;
    }

    balancesCache.isFetching = true;
    balancesCache.lastFetchTime = now;
    balancesCache.lastFetchKey = fetchKey;
    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      // Use the same wallet endpoint as the normal trading system
      const endpoint = `/api/finance/wallet/symbol?type=${walletType}&currency=${baseCurrency}&pair=${quoteCurrency}`;

      const { data, error } = await $fetch<any>({
        url: endpoint,
        silent: true,
        silentSuccess: true,
      });

      if (error || !data) {
        throw new Error("Failed to fetch balances");
      }

      // Extract balances from response (same format as normal trading system)
      const currencyData = data.CURRENCY;
      const pairData = data.PAIR;

      // Handle both object and number formats
      const baseAvailable = typeof currencyData === "object"
        ? currencyData.balance || 0
        : currencyData || 0;
      const quoteAvailable = typeof pairData === "object"
        ? pairData.balance || 0
        : pairData || 0;

      // Update module-level cache
      balancesCache.data = { baseBalance: baseAvailable, quoteBalance: quoteAvailable };

      setState({
        baseBalance: baseAvailable,
        quoteBalance: quoteAvailable,
        isLoading: false,
        error: null,
      });
    } catch (err: any) {
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: err.message || "Failed to fetch balances",
      }));
    } finally {
      balancesCache.isFetching = false;
    }
  }, [baseCurrency, quoteCurrency, marketType, isAuthenticated]);

  // Fetch balances on mount and when currencies change
  useEffect(() => {
    fetchBalances();
  }, [fetchBalances]);

  // Listen for wallet updates (same as normal trading system)
  useEffect(() => {
    const handleWalletUpdate = () => {
      if (baseCurrency && quoteCurrency) {
        // Force refetch on wallet updates
        fetchBalances(true);
      }
    };

    window.addEventListener("walletUpdated", handleWalletUpdate);
    window.addEventListener("order-placed", handleWalletUpdate);
    window.addEventListener("tp-order-updated", handleWalletUpdate);

    return () => {
      window.removeEventListener("walletUpdated", handleWalletUpdate);
      window.removeEventListener("order-placed", handleWalletUpdate);
      window.removeEventListener("tp-order-updated", handleWalletUpdate);
    };
  }, [baseCurrency, quoteCurrency, fetchBalances]);

  // Refresh balances (force)
  const refresh = useCallback(() => {
    fetchBalances(true);
  }, [fetchBalances]);

  return {
    baseBalance: state.baseBalance,
    quoteBalance: state.quoteBalance,
    isLoading: state.isLoading,
    error: state.error,
    refresh,
  };
}

export type UseBalancesReturn = ReturnType<typeof useBalances>;
