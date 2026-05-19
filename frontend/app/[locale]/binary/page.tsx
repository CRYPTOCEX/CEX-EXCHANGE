"use client";

import { useEffect, useRef, useMemo, useState } from "react";
import TradingInterface from "./components/trading-interface";
import { initializeBinaryStore, cleanupBinaryStore, useBinaryStore } from "@/store/trade/use-binary-store";
import { useUserStore } from "@/store/user";
import { useSearchParams } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";

// Hook to handle viewport height for tablets/mobile (fixes 100vh issue with browser chrome)
function useViewportHeight() {
  useEffect(() => {
    const updateViewportHeight = () => {
      // Use the actual visible viewport height to account for browser UI (address bar, etc.)
      const height = window.innerHeight;
      document.documentElement.style.setProperty('--vh', `${height * 0.01}px`);
    };

    updateViewportHeight();

    window.addEventListener('resize', updateViewportHeight);
    window.addEventListener('orientationchange', () => {
      // Delay for orientation change to complete
      setTimeout(updateViewportHeight, 100);
    });

    return () => {
      window.removeEventListener('resize', updateViewportHeight);
      window.removeEventListener('orientationchange', updateViewportHeight);
    };
  }, []);
}

export default function BinaryTradingPage() {
  const t = useTranslations("common");
  const locale = useLocale();
  const searchParams = useSearchParams();
  const initialSymbolParam = searchParams.get("symbol");
  const [initError, setInitError] = useState<string | null>(null);

  // Handle viewport height for tablets (fixes space under content issue)
  useViewportHeight();

  // Parse initial symbol from URL parameters (same logic as trade page)
  const parsedSymbol = useMemo(() => {
    if (initialSymbolParam && initialSymbolParam.includes("-")) {
      const [currency, pair] = initialSymbolParam.split("-");
      return `${currency}${pair}`;
    } else if (initialSymbolParam) {
      return initialSymbolParam;
    }
    return null;
  }, [initialSymbolParam]);

  // FIX 3.2: Use versioned initialization to handle race conditions
  // When parsedSymbol changes during initialization, we need to cancel the old
  // initialization and start a new one. A simple ref doesn't handle this case.
  const initializationVersionRef = useRef(0);
  const isInitializingRef = useRef(false);

  // Get user authentication status
  const { user } = useUserStore();

  // Get store state and methods
  const {
    currentSymbol,
    setCurrentSymbol: setStoreSymbol,
  } = useBinaryStore();

  // Handle symbol change with URL update
  const handleSymbolChange = (symbol: string) => {
    if (symbol && symbol !== currentSymbol) {
      setStoreSymbol(symbol);

      // Update URL with the new symbol (include locale prefix)
      const [base, quote] = symbol.includes('/')
        ? symbol.split('/')
        : [symbol.replace(/USDT$|USD$|BTC$|ETH$/, ''), symbol.replace(/^[A-Z]+/, '')];

      if (base && quote) {
        const url = `/${locale}/binary?symbol=${base}-${quote}`;
        window.history.pushState({ path: url }, "", url);
      }
    }
  };

  // Single initialization effect with improved error handling
  // FIX 3.2: Use versioned initialization pattern to handle race conditions
  useEffect(() => {
    // Increment version to invalidate any in-progress initialization
    const currentVersion = ++initializationVersionRef.current;
    let isMounted = true;

    const initializeApp = async () => {
      // Skip if already initializing (but allow if version changed)
      if (isInitializingRef.current && currentVersion === initializationVersionRef.current) {
        return;
      }
      isInitializingRef.current = true;

      try {
        setInitError(null);

        // Initialize the binary store (this will fetch only binary markets and durations)
        await initializeBinaryStore();

        // FIX 3.2: Check if this initialization is still valid (version hasn't changed)
        if (!isMounted || currentVersion !== initializationVersionRef.current) {
          return; // Stale initialization, skip setting state
        }

        // After store is initialized, check if we need to set a symbol from URL
        const store = useBinaryStore.getState();
        const { binaryMarkets: markets, currentSymbol: storeSymbol } = store;

        // If we have a parsed symbol from URL and no symbol is set in store, set it
        if (parsedSymbol && !storeSymbol && markets.length > 0) {
          const market = markets.find(m =>
            m.symbol === parsedSymbol ||
            `${m.currency}${m.pair}` === parsedSymbol
          );

          if (market) {
            const selectedSymbol = market.symbol || `${market.currency}${market.pair}`;
            setStoreSymbol(selectedSymbol);
          } else if (markets.length > 0) {
            // Fallback to first available market
            const firstMarket = markets[0];
            const fallbackSymbol = firstMarket.symbol || `${firstMarket.currency}${firstMarket.pair}`;
            setStoreSymbol(fallbackSymbol);
          }
        } else if (!storeSymbol && markets.length > 0) {
          // No URL symbol and no store symbol - set first available
          const firstMarket = markets[0];
          const fallbackSymbol = firstMarket.symbol || `${firstMarket.currency}${firstMarket.pair}`;
          setStoreSymbol(fallbackSymbol);
        }
      } catch (error) {
        console.error("Failed to initialize binary trading app:", error);
        // FIX 3.2: Only set error if this initialization is still valid
        if (isMounted && currentVersion === initializationVersionRef.current) {
          setInitError("Failed to initialize trading interface. Please refresh the page.");
        }
      } finally {
        // FIX 3.2: Only clear initializing flag if this is still the current version
        if (currentVersion === initializationVersionRef.current) {
          isInitializingRef.current = false;
        }
      }
    };

    initializeApp();

    // Cleanup function
    return () => {
      isMounted = false;

      // Always cleanup on unmount
      cleanupBinaryStore();

      // FIX 3.2: Reset initializing flag on cleanup
      isInitializingRef.current = false;
    };
  }, [parsedSymbol, setStoreSymbol]);

  // Track previous user ID to detect actual logout (not initial undefined state)
  const prevUserIdRef = useRef<string | undefined>(undefined);

  // Listen for binary settings updates from admin panel (cross-tab communication)
  useEffect(() => {
    const handleSettingsUpdate = (event: StorageEvent) => {
      if (event.key === 'binary_settings_updated') {
        // Admin saved new settings, refresh durations and settings
        const { forceRefreshDurations, forceRefreshSettings } = useBinaryStore.getState();
        forceRefreshDurations();
        forceRefreshSettings();
      }
    };

    window.addEventListener('storage', handleSettingsUpdate);
    return () => window.removeEventListener('storage', handleSettingsUpdate);
  }, []);

  // Handle user authentication changes
  useEffect(() => {
    const { fetchCompletedOrders, fetchActiveOrders } = useBinaryStore.getState();

    if (user?.id) {
      // User logged in - fetch orders if we have a symbol
      if (currentSymbol) {
        Promise.all([
          fetchCompletedOrders(),
          fetchActiveOrders(),
        ]).catch(error => {
          console.error("Failed to fetch orders after auth:", error);
        });
      }
      prevUserIdRef.current = user.id;
    } else if (prevUserIdRef.current) {
      // User actually logged out (was previously logged in) - clear user-specific data
      // Note: We don't need to reinitialize the store - just clear orders and reset balance
      useBinaryStore.setState({
        orders: [],
        completedOrders: [],
        realBalance: null,
        balance: useBinaryStore.getState().demoBalance // Reset to demo balance
      });
      prevUserIdRef.current = undefined;
    }
    // If user?.id is undefined and prevUserIdRef.current is also undefined,
    // this is initial load - don't do anything, let the main init effect handle it
  }, [user?.id, currentSymbol]);

  // Show error state if initialization failed
  if (initError) {
    return (
      <div className="min-h-screen-mobile h-screen-mobile bg-zinc-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4 p-8 bg-zinc-900 rounded-lg max-w-md text-center shadow-xl border border-zinc-800">
          <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center">
            <svg className="w-6 h-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-white">{t("initialization_error")}</h2>
          <p className="text-red-400 text-sm">{initError}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            {t("refresh_page")}
          </button>
        </div>
      </div>
    );
  }

  // Render the trading interface directly - it handles its own loading states
  // Use a fallback symbol while loading to prevent flash
  const displaySymbol = currentSymbol || "BTC/USDT";

  return (
    <div className="min-h-screen-mobile h-screen-mobile bg-zinc-950 flex flex-col overflow-hidden">
      <TradingInterface
        currentSymbol={displaySymbol}
        onSymbolChange={handleSymbolChange}
      />
    </div>
  );
}
