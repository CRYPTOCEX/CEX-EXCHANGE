"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useTheme } from "next-themes";
import { motion } from "framer-motion";
import { Menu, Sun, Moon, ChevronLeft } from "lucide-react";
import type { Symbol, Order } from "@/store/trade/use-binary-store";
import {
  extractBaseCurrency,
  extractQuoteCurrency,
  useBinaryStore,
} from "@/store/trade/use-binary-store";
import MarketSelector from "./market-selector";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Link } from "@/i18n/routing";
import { useTranslations } from "next-intl";
import { useUserStore } from "@/store/user";
import { AuthHeaderControls } from "@/components/auth/auth-header-controls";

interface HeaderProps {
  balance: number;
  realBalance: number | null;
  demoBalance: number;
  netPL: number;
  activeMarkets: Array<{ symbol: Symbol; price: number; change: number }>;
  currentSymbol: Symbol;
  onSelectSymbol: (symbol: Symbol) => void;
  onAddMarket: (symbol: Symbol) => void;
  onRemoveMarket: (symbol: Symbol) => void;
  orders: Order[];
  currentPrice: number;
  isMobile?: boolean;
  tradingMode: "demo" | "real";
  onTradingModeChange: (mode: "demo" | "real") => void;
  isLoadingWallet?: boolean;
  handleMarketSelect?: (marketSymbol: string) => void;
}

interface WalletType {
  type: "real" | "practice";
  balance: number;
  name: string;
  color: string;
}

export default function Header({
  balance,
  realBalance,
  demoBalance,
  netPL,
  activeMarkets,
  currentSymbol,
  onSelectSymbol,
  onAddMarket,
  onRemoveMarket,
  orders,
  currentPrice,
  isMobile = false,
  tradingMode,
  onTradingModeChange,
  isLoadingWallet = false,
  handleMarketSelect = undefined,
}: HeaderProps) {
  // Get binary markets from store for proper symbol parsing
  const { binaryMarkets } = useBinaryStore();
  const t = useTranslations("binary/components/header/header");
  const [showBalanceMenu, setShowBalanceMenu] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [mounted, setMounted] = useState(false);
  
  // Get user authentication state
  const user = useUserStore((state) => state.user);
  const isAuthenticated = !!user;

  // Use next-themes hook
  const { theme, setTheme, resolvedTheme } = useTheme();

  // Handle mounting state to avoid hydration mismatch
  useEffect(() => {
    setMounted(true);
    
    // Ensure theme consistency on mount
    if (typeof window !== 'undefined') {
      const htmlElement = document.documentElement;
      const currentTheme = resolvedTheme || theme;
      
      // Apply the correct theme class
      if (currentTheme === 'dark') {
        htmlElement.classList.remove('light');
        htmlElement.classList.add('dark');
      } else if (currentTheme === 'light') {
        htmlElement.classList.remove('dark');
        htmlElement.classList.add('light');
      }
    }
  }, [theme, resolvedTheme]);

  // Determine dark mode based on resolved theme (handles system theme)
  const darkMode = mounted && (resolvedTheme === "dark");

  // Wallet data
  const wallets: WalletType[] = [
    {
      type: "real",
      balance: realBalance ?? 0, // Use actual real balance from API
      name: "REAL ACCOUNT",
      color: "text-green-500",
    },
    {
      type: "practice",
      balance: demoBalance ?? 10000, // Ensure demo balance has a fallback
      name: "PRACTICE ACCOUNT",
      color: "text-[#F7941D]",
    },
  ];

  const [activeWallet, setActiveWallet] = useState<"real" | "practice">(
    tradingMode === "real" ? "real" : "practice"
  );
  const [isAccountSwitching, setIsAccountSwitching] = useState(false);

  // Ref to store timeout ID for debouncing
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Get current wallet with safe fallback
  const currentWallet = wallets.find((w) => w.type === activeWallet);
  // Use the correct balance based on active wallet type
  const currentBalance = activeWallet === "real" 
    ? (realBalance ?? 0) 
    : (demoBalance ?? 10000);

  // Sync activeWallet with tradingMode prop changes
  useEffect(() => {
    setActiveWallet(tradingMode === "real" ? "real" : "practice");
  }, [tradingMode]);

  // Debounced handler for account switching to prevent rapid clicking issues
  const handleAccountSwitch = useCallback((accountType: "real" | "practice") => {
    if (activeWallet === accountType || isAccountSwitching) return; // Prevent duplicate calls and rapid switching
    
    setIsAccountSwitching(true);
    setActiveWallet(accountType);
    onTradingModeChange(accountType === "real" ? "real" : "demo");
    
    // Reset switching state after a short delay
    setTimeout(() => {
      setIsAccountSwitching(false);
    }, 500);
  }, [activeWallet, onTradingModeChange, isAccountSwitching]);

  // Debounced account switch using useRef to store timeout ID
  const debouncedAccountSwitch = useCallback((accountType: "real" | "practice") => {
    // Clear any existing timeout
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }
    
    // Set new timeout
    debounceTimeoutRef.current = setTimeout(() => {
      handleAccountSwitch(accountType);
      debounceTimeoutRef.current = null;
    }, 300);
  }, [handleAccountSwitch]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, []);

  // Force wallet fetch when component mounts and current symbol changes - with stability checks
  useEffect(() => {
    // Only fetch wallet data if user is authenticated
    if (!isAuthenticated) {
      return;
    }

    console.log(
      `[Header] Component mounted/symbol changed - tradingMode: ${tradingMode}, realBalance: ${realBalance}, currentSymbol: ${currentSymbol}`
    );

    // Only fetch if we have a valid symbol and no real balance, and avoid redundant calls
    if (currentSymbol && realBalance === null && !isLoadingWallet) {
      // Extract quote currency and fetch wallet data
      const quoteCurrency = currentSymbol.includes("/")
        ? currentSymbol.split("/")[1]
        : currentSymbol.includes("-")
          ? currentSymbol.split("-")[1]
          : "USDT"; // fallback

      console.log(
        `[Header] Forcing wallet fetch for currency: ${quoteCurrency}`
      );

      // Call the API directly as a test - but don't trigger state updates that cause infinite loops
      fetch(`/api/finance/wallet/SPOT/${quoteCurrency}`)
        .then((response) => response.json())
        .then((data) => {
          console.log(`[Header] Direct API call result:`, data);
          // Don't update state here to avoid infinite loops
        })
        .catch((error) => {
          console.error(`[Header] Direct API call error:`, error);
        });
    }
  }, [currentSymbol, isAuthenticated]); // Added isAuthenticated to dependencies

  // Use the handleMarketSelect prop if provided, otherwise fall back to onSelectSymbol
  const effectiveHandleMarketSelect = handleMarketSelect || ((marketSymbol: string) => {
    if (marketSymbol !== currentSymbol) {
      onSelectSymbol(marketSymbol as Symbol);
    }
  });

  // Toggle theme function with proper synchronization
  const toggleTheme = useCallback(() => {
    const newTheme = resolvedTheme === "dark" ? "light" : "dark";
    setTheme(newTheme);
    
    // Immediately apply the theme class to prevent delay
    if (typeof window !== 'undefined') {
      const htmlElement = document.documentElement;
      if (newTheme === 'dark') {
        htmlElement.classList.remove('light');
        htmlElement.classList.add('dark');
      } else {
        htmlElement.classList.remove('dark');
        htmlElement.classList.add('light');
      }
    }
  }, [resolvedTheme, setTheme]);

  return (
    <>
      <motion.div
        className={`flex items-center justify-between px-2 py-1 ${
          darkMode
            ? "bg-black border-zinc-800/50"
            : "bg-gradient-to-r from-white to-zinc-50 border-zinc-200"
        } border-b backdrop-blur-sm`}
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <div className="flex items-center">
          {/* Back to home button */}
          <Link href="/">
            <motion.button
              className={`p-1.5 mr-2 rounded-full ${darkMode ? "hover:bg-zinc-800/30" : "hover:bg-zinc-100"} transition-colors`}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <ChevronLeft
                size={16}
                className={darkMode ? "text-white" : "text-zinc-700"}
              />
            </motion.button>
          </Link>

          <motion.div
            className="text-base font-bold mr-2 flex items-center"
            whileHover={{ scale: 1.02 }}
          >
            <span
              className={`${darkMode ? "bg-clip-text text-transparent bg-gradient-to-r from-[#F7941D] to-[#FF7A00]" : "text-[#F7941D]"}`}
            >
              {process.env.NEXT_PUBLIC_SITE_NAME || "Bicrypto"}
            </span>
          </motion.div>

          {/* Show market selector on desktop, hide on mobile */}
          {!isMobile ? (
            <div className="flex items-center">
              <MarketSelector
                onAddMarket={onAddMarket}
                activeMarkets={activeMarkets}
                currentSymbol={currentSymbol}
                onSelectSymbol={onSelectSymbol}
                onRemoveMarket={onRemoveMarket}
                orders={orders}
                currentPrice={currentPrice}
                handleMarketSelect={effectiveHandleMarketSelect}
              />
            </div>
          ) : (
            // Mobile: Show just current symbol price
            <div
              className={`flex items-center ${darkMode ? "bg-zinc-900" : "bg-white"} px-1.5 py-0.5 rounded-md border ${darkMode ? "border-zinc-800/50" : "border-zinc-200"}`}
            >
              <span className="font-medium mr-1 text-sm">
                {extractBaseCurrency(String(currentSymbol), binaryMarkets)}/
                {extractQuoteCurrency(String(currentSymbol), binaryMarkets)}
              </span>
              <span className="text-sm">{currentPrice.toFixed(2)}</span>
              <span
                className={`ml-1 text-xs ${
                  (activeMarkets.find((m) => m.symbol === currentSymbol)
                    ?.change ?? 0) >= 0
                    ? "text-green-500"
                    : "text-red-500"
                }`}
              >
                {(activeMarkets.find((m) => m.symbol === currentSymbol)
                  ?.change ?? 0) >= 0
                  ? "+"
                  : ""}
                {(
                  activeMarkets.find((m) => m.symbol === currentSymbol)
                    ?.change ?? 0
                ).toFixed(2)}
                %
              </span>
            </div>
          )}
        </div>

        <div className="flex items-center space-x-1.5">
          {/* Mobile menu button */}
          {isMobile && (
            <button
              onClick={() => setShowMobileMenu(!showMobileMenu)}
              className={`p-1 rounded-full ${darkMode ? "hover:bg-zinc-800/30" : "hover:bg-zinc-100"} transition-colors`}
            >
              <Menu
                size={16}
                className={darkMode ? "text-white" : "text-zinc-700"}
              />
            </button>
          )}


          {/* Dark/Light mode toggle */}
          <div className="flex items-center">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <motion.button
                    onClick={toggleTheme}
                    className={`p-2 rounded-md ${
                      darkMode
                        ? "bg-zinc-800 text-zinc-200 hover:bg-zinc-700"
                        : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200"
                    } transition-colors`}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    {darkMode ? <Sun size={18} /> : <Moon size={18} />}
                  </motion.button>
                </TooltipTrigger>
                <TooltipContent
                  side="bottom"
                  className={`text-xs ${darkMode ? "bg-zinc-900 text-white border-zinc-800" : "bg-white text-zinc-800 border-zinc-200"}`}
                >
                  <p>{darkMode ? "Light Mode" : "Dark Mode"}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>

          {/* Balance Display with Wallet Switching or Login Button */}
          {isAuthenticated ? (
            <DropdownMenu
              open={showBalanceMenu}
              onOpenChange={setShowBalanceMenu}
            >
              <DropdownMenuTrigger asChild>
                <motion.div
                  className={`flex items-center ${
                    darkMode ? "bg-zinc-900" : "bg-white"
                  } ${isMobile ? "px-1.5 py-0.5" : "px-2 py-1"} rounded-lg border ${
                    darkMode ? "border-zinc-800/50" : "border-zinc-200"
                  } cursor-pointer transition-colors`}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <div className={`${isMobile ? "mr-0.5" : "mr-1.5"}`}>
                    <motion.div
                      className={`${isMobile ? "text-xs" : "text-base"} font-bold ${activeWallet === "real" ? "text-green-500" : "text-[#F7941D]"}`}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      key={currentBalance}
                    >
                      {isLoadingWallet ? (
                        <span
                          className={`inline-block w-16 h-4 ${darkMode ? "bg-zinc-800" : "bg-zinc-100"} animate-pulse rounded`}
                        ></span>
                      ) : (
                        `${currentBalance.toLocaleString("en-US", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}`
                      )}
                    </motion.div>
                    {!isMobile && (
                      <motion.div
                        className={`text-[9px] flex items-center space-x-1 ${darkMode ? "text-zinc-400" : "text-zinc-500"}`}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                      >
                        <span className={`px-1.5 py-0.5 rounded text-[8px] font-medium ${
                          activeWallet === "real" 
                            ? "bg-green-500/20 text-green-400" 
                            : "bg-orange-500/20 text-orange-400"
                        }`}>
                          {activeWallet === "real" ? "REAL" : "DEMO"}
                        </span>
                        <span>{extractQuoteCurrency(String(currentSymbol)) || "USDT"}</span>
                      </motion.div>
                    )}
                  </div>
                  <svg
                    width="8"
                    height="5"
                    viewBox="0 0 10 6"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    className={darkMode ? "text-zinc-400" : "text-zinc-500"}
                  >
                    <path
                      d="M1 1L5 5L9 1"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </motion.div>
              </DropdownMenuTrigger>
            <DropdownMenuContent
              className={`w-72 ${
                darkMode
                  ? "bg-black/95 backdrop-blur-md border-zinc-800 text-white"
                  : "bg-white shadow-lg border-zinc-200 text-zinc-800"
              } p-0 rounded-lg`}
            >
              <div
                className={`p-3 border-b ${darkMode ? "border-zinc-800" : "border-zinc-100"}`}
              >
                <h4
                  className={`text-base font-medium ${darkMode ? "text-white" : "text-zinc-800"}`}
                >
                  {t("account_balance")}
                </h4>
              </div>

              {/* Wallet Selection */}
              <div
                className={`divide-y ${darkMode ? "divide-zinc-800/70" : "divide-zinc-100"}`}
              >
                {/* REAL ACCOUNT */}
                <div
                  className={`p-3 ${activeWallet === "real" ? (darkMode ? "bg-zinc-900/30" : "bg-zinc-50") : ""} ${
                    darkMode ? "hover:bg-zinc-900/20" : "hover:bg-zinc-50"
                  } cursor-pointer transition-colors`}
                  onClick={() => debouncedAccountSwitch("real")}
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <div
                        className={`text-sm font-medium ${darkMode ? "text-zinc-300" : "text-zinc-600"}`}
                      >
                        {t("real_account")}
                      </div>
                      <div className="text-xl font-bold text-green-500">
                        {isLoadingWallet || realBalance === null ? (
                          <span
                            className={`inline-block w-20 h-6 ${darkMode ? "bg-zinc-800" : "bg-zinc-100"} animate-pulse rounded`}
                          ></span>
                        ) : (
                          `${(realBalance ?? 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                        )}
                      </div>
                    </div>
                    <div className="flex space-x-1.5">
                      <button
                        className={`${
                          darkMode
                            ? "bg-zinc-800 hover:bg-zinc-700"
                            : "bg-zinc-100 hover:bg-zinc-200"
                        } py-1.5 px-3 rounded text-sm min-w-[80px] text-center transition-colors`}
                      >
                        {t("Deposit")}
                      </button>
                    </div>
                  </div>
                </div>

                {/* PRACTICE ACCOUNT */}
                <div
                  className={`p-3 ${
                    activeWallet === "practice"
                      ? darkMode
                        ? "bg-zinc-900/30"
                        : "bg-zinc-50"
                      : ""
                  } ${darkMode ? "hover:bg-zinc-900/20" : "hover:bg-zinc-50"} cursor-pointer transition-colors`}
                  onClick={() => debouncedAccountSwitch("practice")}
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <div
                        className={`text-sm font-medium ${darkMode ? "text-zinc-300" : "text-zinc-600"}`}
                      >
                        {t("practice_account")}
                      </div>
                      <div className="text-xl font-bold text-[#F7941D]">
                        {(demoBalance ?? 10000).toLocaleString("en-US", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </div>
                    </div>
                    <div className="flex space-x-1.5">
                      <button
                        className={`${
                          darkMode
                            ? "bg-zinc-800 hover:bg-zinc-700"
                            : "bg-zinc-100 hover:bg-zinc-200"
                        } py-1.5 px-3 rounded text-sm min-w-[80px] text-center transition-colors`}
                      >
                        {t("top_up")}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Balance Details for active wallet */}
              {activeWallet === "practice" && !isAccountSwitching && (
                <div
                  key="practice-details"
                  className={`p-3 border-t ${darkMode ? "border-zinc-800" : "border-zinc-100"}`}
                >
                  <div className="flex justify-between items-center mb-2">
                    <span
                      className={`text-xs ${darkMode ? "text-zinc-400" : "text-zinc-500"}`}
                    >
                      {t("available")}
                    </span>
                    <span
                      className={`text-sm font-medium ${darkMode ? "text-white" : "text-zinc-800"}`}
                    >
                      {(demoBalance ?? 10000).toLocaleString("en-US", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </span>
                  </div>
                  <div className="flex justify-between items-center mb-2">
                    <span
                      className={`text-xs ${darkMode ? "text-zinc-400" : "text-zinc-500"}`}
                    >
                      {t("in_positions")}
                    </span>
                    <span
                      className={`text-sm font-medium ${darkMode ? "text-white" : "text-zinc-800"}`}
                    >
                      {orders
                        .filter(
                          (o) => o.status === "PENDING" && o.mode === "demo"
                        )
                        .reduce((sum, o) => sum + o.amount, 0)
                        .toLocaleString("en-US", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                    </span>
                  </div>
                  <div
                    className={`flex justify-between items-center pt-2 border-t ${darkMode ? "border-[#2A2E39]" : "border-zinc-100"}`}
                  >
                    <span
                      className={`text-xs ${darkMode ? "text-zinc-400" : "text-zinc-500"}`}
                    >
                      {t("total_equity")}
                    </span>
                    <span className="text-sm font-medium text-[#F7941D]">
                      {(
                        (demoBalance ?? 10000) +
                        orders
                          .filter(
                            (o) => o.status === "PENDING" && o.mode === "demo"
                          )
                          .reduce((sum, o) => sum + o.amount, 0)
                      ).toLocaleString("en-US", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </span>
                  </div>
                </div>
              )}

              {/* Real account details */}
              {activeWallet === "real" && !isAccountSwitching && (
                <div
                  key="real-details"
                  className={`p-3 border-t ${darkMode ? "border-zinc-800" : "border-zinc-100"}`}
                >
                  <div className="flex justify-between items-center mb-2">
                    <span
                      className={`text-xs ${darkMode ? "text-zinc-400" : "text-zinc-500"}`}
                    >
                      {t("available")}
                    </span>
                    <span
                      className={`text-sm font-medium ${darkMode ? "text-white" : "text-zinc-800"}`}
                    >
                      {isLoadingWallet || realBalance === null ? (
                        <span
                          className={`inline-block w-14 h-3.5 ${darkMode ? "bg-zinc-800" : "bg-zinc-100"} animate-pulse rounded`}
                        ></span>
                      ) : (
                        `${(realBalance ?? 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                      )}
                    </span>
                  </div>
                  <div className="flex justify-between items-center mb-2">
                    <span
                      className={`text-xs ${darkMode ? "text-zinc-400" : "text-zinc-500"}`}
                    >
                      {t("in_positions")}
                    </span>
                    <span
                      className={`text-sm font-medium ${darkMode ? "text-white" : "text-zinc-800"}`}
                    >
                      {orders
                        .filter(
                          (o) => o.status === "PENDING" && o.mode === "real"
                        )
                        .reduce((sum, o) => sum + o.amount, 0)
                        .toLocaleString("en-US", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                    </span>
                  </div>
                  <div
                    className={`flex justify-between items-center pt-2 border-t ${darkMode ? "border-zinc-800" : "border-zinc-100"}`}
                  >
                    <span
                      className={`text-xs ${darkMode ? "text-zinc-400" : "text-zinc-500"}`}
                    >
                      {t("total_equity")}
                    </span>
                    <span className="text-sm font-medium text-green-500">
                      {isLoadingWallet || realBalance === null ? (
                        <span
                          className={`inline-block w-14 h-3.5 ${darkMode ? "bg-[#2A2E39]" : "bg-zinc-100"} animate-pulse rounded`}
                        ></span>
                      ) : (
                        `${((realBalance ?? 0) + orders.filter((o) => o.status === "PENDING" && o.mode === "real").reduce((sum, o) => sum + o.amount, 0)).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                      )}
                    </span>
                  </div>
                </div>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
          ) : (
            /* Auth controls for unauthenticated users */
            <AuthHeaderControls isMobile={isMobile} />
          )}
        </div>
      </motion.div>

    </>
  );
}
