import { useState, useEffect, useCallback } from "react";
import { $fetch } from "@/lib/api";
import { useUserStore } from "@/store/user";
import { useCoalescedCallback } from "@/hooks/use-coalesced-callback";
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

/**
 * Ceiling on how often order/wallet events may re-read the balance. See
 * `refreshBalancesCoalesced` below.
 */
const BALANCE_REFRESH_INTERVAL_MS = 2000;

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
      // The cache is module-level: clearing only the state would leave the
      // signed-out account's figures for the next session to render.
      balancesCache.data = null;
      balancesCache.lastFetchKey = "";
      return;
    }

    if (!baseCurrency || !quoteCurrency) {
      setState((prev) => ({ ...prev, isLoading: false }));
      return;
    }

    // Determine wallet type based on market type
    const walletType = marketType === "eco" ? "ECO" : marketType === "futures" ? "FUTURES" : "SPOT";
    /*
     * THE USER IS PART OF THE KEY, and it is not decoration.
     *
     * `balancesCache` is module-level and outlives a session. Without the id, a
     * sign-out and sign-in on the same pair leaves `isDifferentPair` false and
     * the cache populated — so now that a refresh no longer blanks the figure,
     * the PREVIOUS account's balance renders under the new one's name until the
     * response lands. The skeleton used to hide that; it must not become
     * visible as the price of removing it.
     */
    const fetchKey = `${user?.id ?? "anon"}-${walletType}-${baseCurrency}-${quoteCurrency}`;
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

    /*
     * `isLoading` HIDES THE NUMBER, so a refresh must not raise it.
     *
     * BalanceDisplay renders a pulsing grey bar instead of the balance whenever
     * this is true. That is right on a first load and right on a pair switch —
     * there is nothing to show, or what is shown belongs to the market you just
     * left. It is wrong for a REFRESH: the figure we are holding is correct
     * until proven otherwise, and replacing it with a placeholder for the length
     * of an HTTP round trip is what makes the AVAILABLE boxes strobe while a
     * trading bot works. Every fill fires `tp-order-updated`, and this hook
     * refetches on every one of them.
     */
    const isDifferentPair = balancesCache.lastFetchKey !== fetchKey;
    balancesCache.isFetching = true;
    balancesCache.lastFetchTime = now;
    balancesCache.lastFetchKey = fetchKey;
    setState((prev) => ({
      ...prev,
      isLoading: isDifferentPair || !balancesCache.data,
      error: null,
    }));

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

      // Handle both object and number formats. Balances may arrive as strings
      // (DECIMAL columns are commonly serialized as strings), so coerce to Number.
      const baseAvailable = Number(
        currencyData && typeof currencyData === "object"
          ? currencyData.balance ?? 0
          : currencyData ?? 0
      ) || 0;
      const quoteAvailable = Number(
        pairData && typeof pairData === "object"
          ? pairData.balance ?? 0
          : pairData ?? 0
      ) || 0;

      /*
       * ONLY IF THIS RESPONSE IS STILL THE ONE WE WANT.
       *
       * `force` bypasses the in-flight guard, so several reads can be open at
       * once — the refresh button, the visibility handler and the coalescer's
       * trailing run can overlap — and they do not resolve in the order they
       * were sent. Without this check the LAST response to arrive wins, which
       * after a pair switch means the previous market's balance is written under
       * the new market's currency labels: not a flicker, a wrong number that
       * sits there.
       */
      if (balancesCache.lastFetchKey !== fetchKey) return;

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
  }, [baseCurrency, quoteCurrency, marketType, isAuthenticated, user?.id]);

  // Fetch balances on mount and when currencies change
  useEffect(() => {
    fetchBalances();
  }, [fetchBalances]);

  /*
   * ONE BALANCE READ PER BURST.
   *
   * These three events are one per order the exchange touches, so a bot working
   * a ladder fires them dozens of times a second and each one used to be its own
   * `/api/finance/wallet/symbol` request — a request storm serving a number that
   * only has to be right, not instantaneous. The coalescer runs the first one
   * immediately (so a customer's own trade updates their balance at once) and
   * guarantees a final one after the burst, which is the only one whose figure
   * is the current one.
   */
  const refreshBalancesCoalesced = useCoalescedCallback(() => {
    if (baseCurrency && quoteCurrency) {
      fetchBalances(true);
    }
  }, BALANCE_REFRESH_INTERVAL_MS);

  // Listen for wallet updates (same as normal trading system)
  useEffect(() => {
    const handleWalletUpdate = () => {
      refreshBalancesCoalesced();
    };

    window.addEventListener("walletUpdated", handleWalletUpdate);
    window.addEventListener("order-placed", handleWalletUpdate);
    window.addEventListener("tp-order-updated", handleWalletUpdate);

    return () => {
      window.removeEventListener("walletUpdated", handleWalletUpdate);
      window.removeEventListener("order-placed", handleWalletUpdate);
      window.removeEventListener("tp-order-updated", handleWalletUpdate);
    };
  }, [refreshBalancesCoalesced]);

  // Refresh balances when tab becomes visible again
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && baseCurrency && quoteCurrency) {
        fetchBalances(true);
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
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
