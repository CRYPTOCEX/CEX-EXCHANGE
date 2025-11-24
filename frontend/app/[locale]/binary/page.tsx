"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "@/i18n/routing";
import TradingInterface from "./components/trading-interface";
import { initializeBinaryStore, cleanupBinaryStore, useBinaryStore } from "@/store/trade/use-binary-store";
import { useUserStore } from "@/store/user";
import { useSearchParams } from "next/navigation";

export default function BinaryTradingPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialSymbolParam = searchParams.get("symbol");
  
  // Set body background and ensure dark mode is applied immediately
  useEffect(() => {
    // Save original background
    const originalBackground = document.body.style.backgroundColor;
    
    // Set zinc-950 background immediately
    document.body.style.backgroundColor = '#09090b'; // zinc-950
    
    // Force dark theme class on html element to prevent light mode flash
    const htmlElement = document.documentElement;
    const originalTheme = htmlElement.classList.contains('light') ? 'light' : 'dark';
    
    // Ensure dark mode is applied if it's the current theme
    const storedTheme = localStorage.getItem('theme');
    if (storedTheme === 'dark' || (!storedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      htmlElement.classList.remove('light');
      htmlElement.classList.add('dark');
    }
    
    // Cleanup on unmount
    return () => {
      document.body.style.backgroundColor = originalBackground;
      // Don't revert theme class as it should persist based on user preference
    };
  }, []);
  
  // Parse initial symbol from URL parameters (same logic as trade page)
  let parsedSymbol: string | null = null;
  if (initialSymbolParam && initialSymbolParam.includes("-")) {
    const [currency, pair] = initialSymbolParam.split("-");
    parsedSymbol = `${currency}${pair}`;
  } else if (initialSymbolParam) {
    parsedSymbol = initialSymbolParam;
  }

  const [isInitialized, setIsInitialized] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);
  const initializationRef = useRef(false);
  const cleanupRef = useRef(false);

  // Get user authentication status
  const { user } = useUserStore();
  
  // Get store state and methods
  const { 
    currentSymbol, 
    binaryMarkets, 
    setCurrentSymbol: setStoreSymbol,
    isLoadingMarkets 
  } = useBinaryStore();

  // Handle symbol change with URL update
  const handleSymbolChange = (symbol: string) => {
    if (symbol && symbol !== currentSymbol) {
      setStoreSymbol(symbol);
      
      // Update URL with the new symbol
      const [base, quote] = symbol.includes('/') 
        ? symbol.split('/')
        : [symbol.replace(/USDT$|USD$|BTC$|ETH$/, ''), symbol.replace(/^[A-Z]+/, '')];
      
      if (base && quote) {
        const url = `/binary?symbol=${base}-${quote}`;
        window.history.pushState({ path: url }, "", url);
      }
    }
  };

  // Single initialization effect with improved error handling
  useEffect(() => {
    // Prevent duplicate initialization
    if (initializationRef.current) return;
    
    let isMounted = true;
    initializationRef.current = true;

    const initializeApp = async () => {
      try {
        setInitError(null);
        console.log("Initializing binary trading app...");
        
        // Initialize the binary store (this will fetch only binary markets and durations)
        await initializeBinaryStore();
        
        if (isMounted) {
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
          
          setIsInitialized(true);
          console.log("Binary trading app initialized successfully");
        }
      } catch (error) {
        console.error("Failed to initialize binary trading app:", error);
        if (isMounted) {
          setInitError("Failed to initialize trading interface. Please refresh the page.");
        }
      }
    };

    initializeApp();

    // Cleanup function
    return () => {
      isMounted = false;
      if (!cleanupRef.current) {
        cleanupRef.current = true;
        console.log("Cleaning up binary trading page...");
        cleanupBinaryStore();
      }
    };
  }, []); // Remove all dependencies to prevent re-initialization

  // Handle user authentication changes
  useEffect(() => {
    if (!isInitialized) return;
    
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
    } else {
      // User logged out - reinitialize without user data
      initializeBinaryStore().catch(error => {
        console.error("Failed to reinitialize store after logout:", error);
      });
    }
  }, [user?.id, isInitialized, currentSymbol]); // Depend on user, initialization, and symbol

  // Show loading state during initialization
  if (!isInitialized || !currentSymbol || isLoadingMarkets) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4 p-8 bg-zinc-900 rounded-lg max-w-md text-center shadow-xl border border-zinc-800">
          {initError ? (
            <>
              <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center">
                <svg className="w-6 h-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-white">Initialization Error</h2>
              <p className="text-red-400 text-sm">{initError}</p>
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              >
                Refresh Page
              </button>
            </>
          ) : (
            <>
              <div className="animate-spin h-12 w-12 border-3 border-blue-500 border-t-transparent rounded-full"></div>
              <h2 className="text-xl font-bold text-white">Initializing Trading Interface</h2>
              <p className="text-zinc-400 text-sm">
                Loading markets and setting up trading interface...
              </p>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen-mobile h-screen-mobile bg-zinc-950 flex flex-col overflow-hidden">
      <TradingInterface
        currentSymbol={currentSymbol}
        onSymbolChange={handleSymbolChange}
      />
    </div>
  );
}
