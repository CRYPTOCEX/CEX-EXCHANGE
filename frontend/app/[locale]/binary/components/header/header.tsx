"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useTheme } from "next-themes";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, Sun, Moon, ChevronLeft, Wallet, TrendingUp, ArrowUpRight, Sparkles, ChevronDown, Maximize, Minimize, BarChart2, Settings, GraduationCap, Trophy, Target, BookOpen, HelpCircle, MoreHorizontal } from "lucide-react";
import type { Symbol, Order } from "@/store/trade/use-binary-store";
import {
  extractBaseCurrency,
  extractQuoteCurrency,
  useBinaryStore,
} from "@/store/trade/use-binary-store";
import MarketSelector from "./market-selector-desktop";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Link } from "@/i18n/routing";
import { useTranslations } from "next-intl";
import { useUserStore } from "@/store/user";
import { AuthHeaderControls } from "@/components/auth/auth-header-controls";
import { NotificationBell } from "@/components/partials/header/notification-bell";
import { useSettings } from "@/hooks/use-settings";

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
  onSettingsClick?: () => void;
  onAnalyticsClick?: () => void;
  /** Number of completed trades (for analytics badge) */
  completedTradesCount?: number;
  // Education features callbacks
  onTutorialClick?: () => void;
  onPatternLibraryClick?: () => void;
  onLeaderboardClick?: () => void;
  onChallengesClick?: () => void;
  // Overlay open states for active button styling
  isSettingsOpen?: boolean;
  isAnalyticsOpen?: boolean;
  isPatternLibraryOpen?: boolean;
  isLeaderboardOpen?: boolean;
  isChallengesOpen?: boolean;
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
  onSettingsClick,
  onAnalyticsClick,
  completedTradesCount = 0,
  onTutorialClick,
  onPatternLibraryClick,
  onLeaderboardClick,
  onChallengesClick,
  isSettingsOpen = false,
  isAnalyticsOpen = false,
  isPatternLibraryOpen = false,
  isLeaderboardOpen = false,
  isChallengesOpen = false,
}: HeaderProps) {
  // Get binary markets from store for proper symbol parsing
  const { binaryMarkets } = useBinaryStore();
  const t = useTranslations("binary_components");
  const tCommon = useTranslations("common");
  const [showBalanceMenu, setShowBalanceMenu] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  // Get user authentication state
  const user = useUserStore((state) => state.user);
  const isAuthenticated = !!user;

  // Get settings to check if practice mode is enabled
  const { settings, settingsFetched } = useSettings();
  const binaryPracticeEnabled = settings?.binaryPracticeStatus === true || settings?.binaryPracticeStatus === "true";

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
  // Default to dark mode during SSR/initial render to prevent white flash
  const darkMode = !mounted ? true : (resolvedTheme === "dark");

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

  // Force switch to real mode if practice mode is disabled
  useEffect(() => {
    // Only attempt switch after settings are loaded
    if (settingsFetched && !binaryPracticeEnabled && activeWallet === "practice") {
      handleAccountSwitch("real");
    }
  }, [settingsFetched, binaryPracticeEnabled, activeWallet, handleAccountSwitch]);

  // Debounced account switch using useRef to store timeout ID
  const debouncedAccountSwitch = useCallback((accountType: "real" | "practice") => {
    // Clear any existing timeout
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    // Set new timeout - reduced to 50ms for faster response
    debounceTimeoutRef.current = setTimeout(() => {
      handleAccountSwitch(accountType);
      debounceTimeoutRef.current = null;
    }, 50);
  }, [handleAccountSwitch]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, []);

  // Note: Wallet data is fetched by the binary store when symbol is set (see setSymbol in use-binary-store.ts)
  // No need to duplicate the fetch here - the store handles it centrally

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

  // Fullscreen toggle function
  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch((err) => {
        console.error(`Error attempting to enable fullscreen: ${err.message}`);
      });
    } else {
      document.exitFullscreen();
    }
  }, []);

  // Listen for fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  return (
    <>
      <div
        className="flex items-center h-10 min-h-10 bg-white dark:bg-black border-zinc-200 dark:border-zinc-800 border-b"
      >
        {/* Left section - Logo and back button */}
        <div className="flex items-center h-full border-r border-zinc-200 dark:border-zinc-800">
          {/* Back to home button */}
          <Link
            href="/"
            className="h-10 w-10 flex items-center justify-center hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            <ChevronLeft
              size={18}
              className="text-zinc-600 dark:text-zinc-400"
            />
          </Link>

          <div
            className="h-full px-3 flex items-center border-l border-zinc-200 dark:border-zinc-800"
          >
            <span
              className="text-sm font-bold text-[#F7941D] dark:bg-clip-text dark:text-transparent dark:bg-linear-to-r dark:from-[#F7941D] dark:to-[#FF7A00]"
            >
              {process.env.NEXT_PUBLIC_SITE_NAME || "Bicrypto"}
            </span>
          </div>
        </div>

        {/* Market selector section */}
        <div data-tutorial="market-selector" className={`flex-1 flex items-center h-full min-w-0`}>
          {!isMobile ? (
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
          ) : (
            // Mobile: Compact symbol display with dropdown for market switching
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center h-full px-3 gap-1.5 cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors min-w-0">
                  <span className="font-semibold text-sm text-zinc-900 dark:text-white truncate">
                    {extractBaseCurrency(String(currentSymbol), binaryMarkets)}/{extractQuoteCurrency(String(currentSymbol), binaryMarkets)}
                  </span>
                  <span className="text-xs text-zinc-500 dark:text-zinc-400 tabular-nums">
                    ${currentPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                  <span
                    className={`text-[10px] font-medium ${
                      (activeMarkets.find((m) => m.symbol === currentSymbol)?.change ?? 0) >= 0
                        ? "text-green-500"
                        : "text-red-500"
                    }`}
                  >
                    {(activeMarkets.find((m) => m.symbol === currentSymbol)?.change ?? 0) >= 0 ? "+" : ""}
                    {(activeMarkets.find((m) => m.symbol === currentSymbol)?.change ?? 0).toFixed(2)}%
                  </span>
                  <ChevronDown size={12} className="text-zinc-400 ml-0.5 shrink-0" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-64 p-1 bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800">
                <div className="px-2 py-1.5 mb-1">
                  <span className="text-[10px] font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wide">
                    {tCommon("active_markets")}
                  </span>
                </div>
                {activeMarkets.map((market) => {
                  const base = extractBaseCurrency(String(market.symbol), binaryMarkets);
                  const quote = extractQuoteCurrency(String(market.symbol), binaryMarkets);
                  const isActive = market.symbol === currentSymbol;
                  return (
                    <DropdownMenuItem
                      key={market.symbol}
                      onClick={() => effectiveHandleMarketSelect(String(market.symbol))}
                      className={`flex items-center justify-between px-3 py-2 text-sm cursor-pointer ${
                        isActive
                          ? "bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-white"
                          : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
                      }`}
                    >
                      <span className="font-medium">{base}/{quote}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs tabular-nums text-zinc-500">${market.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        <span className={`text-[10px] font-medium ${market.change >= 0 ? "text-green-500" : "text-red-500"}`}>
                          {market.change >= 0 ? "+" : ""}{market.change.toFixed(2)}%
                        </span>
                      </div>
                    </DropdownMenuItem>
                  );
                })}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        {/* Right section - Actions */}
        <div className="flex items-center h-full border-l border-zinc-200 dark:border-zinc-800">
          {/* Mobile: More dropdown containing all actions */}
          {isMobile && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="h-10 w-10 flex items-center justify-center border-r border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer">
                  <MoreHorizontal size={18} className="text-zinc-600 dark:text-zinc-400" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 p-1 bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800">
                {/* Education section */}
                {(onTutorialClick || onPatternLibraryClick || onLeaderboardClick || onChallengesClick) && (
                  <>
                    <div className="px-2 py-1.5 mb-1">
                      <span className="text-[10px] font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wide">
                        {t("learn_compete")}
                      </span>
                    </div>
                    {onTutorialClick && (
                      <DropdownMenuItem onClick={onTutorialClick} className="flex items-center gap-3 px-3 py-2 text-sm text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer">
                        <HelpCircle size={14} className="text-blue-500" />
                        <span>Tutorial</span>
                      </DropdownMenuItem>
                    )}
                    {onPatternLibraryClick && (
                      <DropdownMenuItem onClick={onPatternLibraryClick} className={`flex items-center gap-3 px-3 py-2 text-sm cursor-pointer ${isPatternLibraryOpen ? "text-purple-500 bg-purple-500/10" : "text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800"}`}>
                        <BookOpen size={14} className={isPatternLibraryOpen ? "text-purple-500" : "text-purple-500"} />
                        <span>{t("pattern_library")}</span>
                      </DropdownMenuItem>
                    )}
                    {onLeaderboardClick && (
                      <DropdownMenuItem onClick={onLeaderboardClick} className={`flex items-center gap-3 px-3 py-2 text-sm cursor-pointer ${isLeaderboardOpen ? "text-amber-500 bg-amber-500/10" : "text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800"}`}>
                        <Trophy size={14} className="text-amber-500" />
                        <span>Leaderboard</span>
                      </DropdownMenuItem>
                    )}
                    {onChallengesClick && tradingMode === "demo" && (
                      <DropdownMenuItem onClick={onChallengesClick} className={`flex items-center gap-3 px-3 py-2 text-sm cursor-pointer ${isChallengesOpen ? "text-green-500 bg-green-500/10" : "text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800"}`}>
                        <Target size={14} className="text-green-500" />
                        <span>Challenges</span>
                      </DropdownMenuItem>
                    )}
                    <div className="my-1 h-px bg-zinc-200 dark:bg-zinc-800" />
                  </>
                )}

                {/* Tools section */}
                <div className="px-2 py-1.5 mb-1">
                  <span className="text-[10px] font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wide">
                    Tools
                  </span>
                </div>
                {isAuthenticated && onAnalyticsClick && (
                  <DropdownMenuItem onClick={onAnalyticsClick} className={`flex items-center gap-3 px-3 py-2 text-sm cursor-pointer ${isAnalyticsOpen ? "text-blue-500 bg-blue-500/10" : "text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800"}`}>
                    <BarChart2 size={14} className="text-blue-500" />
                    <span>Analytics</span>
                    {completedTradesCount > 0 && (
                      <span className="ml-auto text-[10px] font-medium px-1.5 py-0.5 bg-blue-500 text-white rounded-full">
                        {completedTradesCount > 99 ? "99+" : completedTradesCount}
                      </span>
                    )}
                  </DropdownMenuItem>
                )}
                {onSettingsClick && (
                  <DropdownMenuItem onClick={onSettingsClick} className={`flex items-center gap-3 px-3 py-2 text-sm cursor-pointer ${isSettingsOpen ? "text-purple-500 bg-purple-500/10" : "text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800"}`}>
                    <Settings size={14} className="text-purple-500" />
                    <span>Settings</span>
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onClick={toggleTheme} className="flex items-center gap-3 px-3 py-2 text-sm text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer">
                  {darkMode ? <Sun size={14} className="text-amber-500" /> : <Moon size={14} className="text-blue-400" />}
                  <span>{darkMode ? "Light Mode" : "Dark Mode"}</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={toggleFullscreen} className="flex items-center gap-3 px-3 py-2 text-sm text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer">
                  {isFullscreen ? <Minimize size={14} className="text-zinc-500" /> : <Maximize size={14} className="text-zinc-500" />}
                  <span>{isFullscreen ? "Exit Fullscreen" : "Fullscreen"}</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          {/* Education Menu - Desktop only (mobile uses More dropdown) */}
          {/* Visibility also depends on number of active markets - more markets = earlier switch to dropdown */}
          {!isMobile && (onTutorialClick || onPatternLibraryClick || onLeaderboardClick || onChallengesClick) && (
            <>
              {/* Inline buttons for screens >= 768px (md) */}
              {/* With many markets, we progressively hide buttons at higher breakpoints */}
              <div className={`hidden items-center h-full ${
                activeMarkets.length <= 1
                  ? "md:flex" // 1 market: show from md (768px)
                  : activeMarkets.length === 2
                    ? "lg:flex" // 2 markets: show from lg (1024px)
                    : activeMarkets.length === 3
                      ? "xl:flex" // 3 markets: show from xl (1280px)
                      : "2xl:flex" // 4 markets: show from 2xl (1536px)
              }`}>
                {onTutorialClick && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <motion.button
                          onClick={onTutorialClick}
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          className="h-10 w-10 flex items-center justify-center border-r border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:text-blue-500 dark:hover:text-blue-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                        >
                          <HelpCircle size={16} />
                        </motion.button>
                      </TooltipTrigger>
                      <TooltipContent side="bottom" className="text-xs bg-white dark:bg-zinc-900 text-zinc-800 dark:text-white border-zinc-200 dark:border-zinc-800">
                        <p>Tutorial</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
                {onPatternLibraryClick && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <motion.button
                          onClick={onPatternLibraryClick}
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          className={`h-10 w-10 flex items-center justify-center border-r border-zinc-200 dark:border-zinc-800 transition-colors cursor-pointer ${
                            isPatternLibraryOpen
                              ? "text-purple-500 bg-purple-500/10 dark:bg-purple-500/20"
                              : "text-zinc-600 dark:text-zinc-400 hover:text-purple-500 dark:hover:text-purple-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                          }`}
                        >
                          <BookOpen size={16} />
                        </motion.button>
                      </TooltipTrigger>
                      <TooltipContent side="bottom" className="text-xs bg-white dark:bg-zinc-900 text-zinc-800 dark:text-white border-zinc-200 dark:border-zinc-800">
                        <p>{t("pattern_library")}</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
                {onLeaderboardClick && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <motion.button
                          onClick={onLeaderboardClick}
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          className={`h-10 w-10 flex items-center justify-center border-r border-zinc-200 dark:border-zinc-800 transition-colors cursor-pointer ${
                            isLeaderboardOpen
                              ? "text-amber-500 bg-amber-500/10 dark:bg-amber-500/20"
                              : "text-zinc-600 dark:text-zinc-400 hover:text-amber-500 dark:hover:text-amber-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                          }`}
                        >
                          <Trophy size={16} />
                        </motion.button>
                      </TooltipTrigger>
                      <TooltipContent side="bottom" className="text-xs bg-white dark:bg-zinc-900 text-zinc-800 dark:text-white border-zinc-200 dark:border-zinc-800">
                        <p>Leaderboard</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
                {onChallengesClick && tradingMode === "demo" && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <motion.button
                          onClick={onChallengesClick}
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          className={`h-10 w-10 flex items-center justify-center border-r border-zinc-200 dark:border-zinc-800 transition-colors cursor-pointer ${
                            isChallengesOpen
                              ? "text-green-500 bg-green-500/10 dark:bg-green-500/20"
                              : "text-zinc-600 dark:text-zinc-400 hover:text-green-500 dark:hover:text-green-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                          }`}
                        >
                          <Target size={16} />
                        </motion.button>
                      </TooltipTrigger>
                      <TooltipContent side="bottom" className="text-xs bg-white dark:bg-zinc-900 text-zinc-800 dark:text-white border-zinc-200 dark:border-zinc-800">
                        <p>Challenges</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
              </div>

              {/* Dropdown - shown when inline buttons are hidden */}
              {/* Inverse visibility of inline buttons based on market count */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className={`h-10 w-10 flex items-center justify-center border-r border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:text-[#F7941D] dark:hover:text-[#F7941D] hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer ${
                      activeMarkets.length <= 1
                        ? "md:hidden" // 1 market: hide dropdown from md
                        : activeMarkets.length === 2
                          ? "lg:hidden" // 2 markets: hide dropdown from lg
                          : activeMarkets.length === 3
                            ? "xl:hidden" // 3 markets: hide dropdown from xl
                            : "2xl:hidden" // 4 markets: hide dropdown from 2xl
                    }`}
                  >
                    <GraduationCap size={16} />
                  </motion.button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  className="w-56 p-2 bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 rounded-xl shadow-xl"
                >
                  <div className="px-2 py-1.5 mb-1">
                    <span className="text-xs font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wide">
                      {t("learn_compete")}
                    </span>
                  </div>

                  {onTutorialClick && (
                    <DropdownMenuItem
                      onClick={onTutorialClick}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                    >
                      <div className="p-1.5 rounded-lg bg-blue-500/10">
                        <HelpCircle size={14} className="text-blue-500" />
                      </div>
                      <div className="text-left">
                        <div className="font-medium">Tutorial</div>
                        <div className="text-xs text-zinc-400 dark:text-zinc-500">{t("learn_the_basics")}</div>
                      </div>
                    </DropdownMenuItem>
                  )}

                  {onPatternLibraryClick && (
                    <DropdownMenuItem
                      onClick={onPatternLibraryClick}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                    >
                      <div className="p-1.5 rounded-lg bg-purple-500/10">
                        <BookOpen size={14} className="text-purple-500" />
                      </div>
                      <div className="text-left">
                        <div className="font-medium">{t("pattern_library")}</div>
                        <div className="text-xs text-zinc-400 dark:text-zinc-500">{t("chart_patterns_guide")}</div>
                      </div>
                    </DropdownMenuItem>
                  )}

                  {onLeaderboardClick && (
                    <DropdownMenuItem
                      onClick={onLeaderboardClick}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                    >
                      <div className="p-1.5 rounded-lg bg-amber-500/10">
                        <Trophy size={14} className="text-amber-500" />
                      </div>
                      <div className="text-left">
                        <div className="font-medium">Leaderboard</div>
                        <div className="text-xs text-zinc-400 dark:text-zinc-500">{t("top_traders_ranking")}</div>
                      </div>
                    </DropdownMenuItem>
                  )}

                  {onChallengesClick && tradingMode === "demo" && (
                    <DropdownMenuItem
                      onClick={onChallengesClick}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                    >
                      <div className="p-1.5 rounded-lg bg-green-500/10">
                        <Target size={14} className="text-green-500" />
                      </div>
                      <div className="text-left">
                        <div className="font-medium">Challenges</div>
                        <div className="text-xs text-zinc-400 dark:text-zinc-500">{t("demo_trading_goals")}</div>
                      </div>
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          )}

          {/* Analytics button - authenticated users only, desktop only */}
          {!isMobile && isAuthenticated && onAnalyticsClick && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <motion.button
                    onClick={onAnalyticsClick}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className={`h-10 w-10 flex items-center justify-center border-r border-zinc-200 dark:border-zinc-800 transition-colors relative cursor-pointer ${
                      isAnalyticsOpen
                        ? "text-blue-500 bg-blue-500/10 dark:bg-blue-500/20"
                        : "text-zinc-600 dark:text-zinc-400 hover:text-blue-500 dark:hover:text-blue-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                    }`}
                  >
                    <BarChart2 size={16} />
                    {completedTradesCount > 0 && (
                      <span className="absolute top-0 right-0 min-w-4 h-4 flex items-center justify-center px text-[8px] font-bold bg-blue-500 text-white rounded-full shadow-sm">
                        {completedTradesCount > 99 ? "99+" : completedTradesCount}
                      </span>
                    )}
                  </motion.button>
                </TooltipTrigger>
                <TooltipContent
                  side="bottom"
                  className="text-xs bg-white dark:bg-zinc-900 text-zinc-800 dark:text-white border-zinc-200 dark:border-zinc-800"
                >
                  <p>{tCommon("analytics") || "Analytics"}{completedTradesCount > 0 ? ` (${completedTradesCount} trades)` : ""}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}

          {/* Trading Settings button - desktop only */}
          {!isMobile && onSettingsClick && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <motion.button
                    onClick={onSettingsClick}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className={`h-10 w-10 flex items-center justify-center border-r border-zinc-200 dark:border-zinc-800 transition-colors cursor-pointer ${
                      isSettingsOpen
                        ? "text-purple-500 bg-purple-500/10 dark:bg-purple-500/20"
                        : "text-zinc-600 dark:text-zinc-400 hover:text-purple-500 dark:hover:text-purple-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                    }`}
                  >
                    <Settings size={16} />
                  </motion.button>
                </TooltipTrigger>
                <TooltipContent
                  side="bottom"
                  className="text-xs bg-white dark:bg-zinc-900 text-zinc-800 dark:text-white border-zinc-200 dark:border-zinc-800"
                >
                  <p>{tCommon("trading_settings") || "Trading Settings"}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}

          {/* Theme Toggle - desktop only */}
          {!isMobile && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={toggleTheme}
                    className="h-10 w-10 flex items-center justify-center border-r transition-all duration-200 border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:text-amber-500 dark:hover:text-amber-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
                  >
                    <AnimatePresence mode="wait">
                      {darkMode ? (
                        <motion.div
                          key="sun"
                          initial={{ opacity: 0, rotate: -90, scale: 0.5 }}
                          animate={{ opacity: 1, rotate: 0, scale: 1 }}
                          exit={{ opacity: 0, rotate: 90, scale: 0.5 }}
                          transition={{ duration: 0.2 }}
                        >
                          <Sun size={16} />
                        </motion.div>
                      ) : (
                        <motion.div
                          key="moon"
                          initial={{ opacity: 0, rotate: 90, scale: 0.5 }}
                          animate={{ opacity: 1, rotate: 0, scale: 1 }}
                          exit={{ opacity: 0, rotate: -90, scale: 0.5 }}
                          transition={{ duration: 0.2 }}
                        >
                          <Moon size={16} />
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.button>
                </TooltipTrigger>
                <TooltipContent
                  side="bottom"
                  className="text-xs bg-white dark:bg-zinc-900 text-zinc-800 dark:text-white border-zinc-200 dark:border-zinc-800"
                >
                  <p>{darkMode ? "Light Mode" : "Dark Mode"}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}

          {/* Fullscreen toggle - desktop only */}
          {!isMobile && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <motion.button
                    onClick={toggleFullscreen}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="h-10 w-10 flex items-center justify-center border-r relative overflow-hidden border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                  >
                    <AnimatePresence mode="wait" initial={false}>
                      <motion.div
                        key={isFullscreen ? "minimize" : "maximize"}
                        initial={{
                          scale: 0.5,
                          opacity: 0
                        }}
                        animate={{
                          scale: 1,
                          opacity: 1
                        }}
                        exit={{
                          scale: 0.5,
                          opacity: 0
                        }}
                        transition={{
                          duration: 0.2,
                          ease: "easeInOut"
                        }}
                        className="absolute"
                      >
                        {isFullscreen ? (
                          <Minimize size={16} className="text-zinc-600 dark:text-zinc-400" />
                        ) : (
                          <Maximize size={16} className="text-zinc-600 dark:text-zinc-400" />
                        )}
                      </motion.div>
                  </AnimatePresence>
                </motion.button>
              </TooltipTrigger>
              <TooltipContent
                side="bottom"
                className="text-xs bg-white dark:bg-zinc-900 text-zinc-800 dark:text-white border-zinc-200 dark:border-zinc-800"
              >
                <p>{isFullscreen ? "Exit Fullscreen" : "Fullscreen"}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          )}

          {/* Notification Bell - only show when authenticated */}
          {isAuthenticated && <NotificationBell variant="binary" />}

          {/* Balance Display with Wallet Switching or Login Button */}
          {isAuthenticated ? (
            <DropdownMenu
              open={showBalanceMenu}
              onOpenChange={setShowBalanceMenu}
            >
              <DropdownMenuTrigger asChild>
                <button
                  data-tutorial="demo-toggle"
                  className="h-10 flex items-center gap-2 px-3 hover:bg-zinc-100 dark:hover:bg-zinc-800/80 cursor-pointer transition-all group"
                >
                  {/* Balance icon */}
                  <div className={`p-1.5 rounded-lg transition-colors ${
                    activeWallet === "real"
                      ? "bg-emerald-500/10 group-hover:bg-emerald-500/20"
                      : "bg-amber-500/10 group-hover:bg-amber-500/20"
                  }`}>
                    <Wallet size={14} className={activeWallet === "real" ? "text-emerald-500" : "text-amber-500"} />
                  </div>

                  <div className="text-right">
                    <div
                      className={`${isMobile ? "text-xs" : "text-sm"} font-bold tabular-nums ${activeWallet === "real" ? "text-emerald-500" : "text-amber-500"}`}
                    >
                      {isLoadingWallet ? (
                        <span className="inline-block w-16 h-4 bg-zinc-200 dark:bg-zinc-800 animate-pulse rounded" />
                      ) : (
                        `${currentBalance.toLocaleString("en-US", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}`
                      )}
                    </div>
                    {!isMobile && (
                      <div className="text-[9px] flex items-center justify-end gap-1 text-zinc-500">
                        <span className={`px-1.5 py-0.5 text-[8px] font-bold rounded ${
                          activeWallet === "real"
                            ? "bg-emerald-500/20 text-emerald-400"
                            : "bg-amber-500/20 text-amber-400"
                        }`}>
                          {activeWallet === "real" ? "REAL" : "DEMO"}
                        </span>
                        <span>{extractQuoteCurrency(String(currentSymbol)) || "USDT"}</span>
                      </div>
                    )}
                  </div>
                  <ChevronDown size={12} className={`transition-transform ${showBalanceMenu ? "rotate-180" : ""} text-zinc-400 dark:text-zinc-500`} />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className="w-80 p-0 gap-0 overflow-hidden bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 border rounded-2xl shadow-xl"
              >
                {/* Header */}
                <div className="bg-zinc-50 dark:bg-zinc-900">
                  <div className="p-4 pb-3">
                    <div className="flex items-center gap-3 mb-3">
                      <div className={`p-2 rounded-xl ${activeWallet === "real" ? "bg-emerald-50 dark:bg-emerald-500/10" : "bg-amber-50 dark:bg-amber-500/10"}`}>
                        <Wallet size={16} className={activeWallet === "real" ? "text-emerald-500" : "text-amber-500"} />
                      </div>
                      <div>
                        <h3 className="text-sm font-semibold text-zinc-900 dark:text-white">
                          {tCommon("wallet")}
                        </h3>
                        <p className="text-[10px] text-zinc-400 dark:text-zinc-500">
                          {t("manage_your_trading_accounts")}
                        </p>
                      </div>
                    </div>

                    {/* Account Switcher Tabs - only show if practice mode is enabled */}
                    {binaryPracticeEnabled && (
                      <div className="flex gap-1 p-1 rounded-lg bg-zinc-100 dark:bg-zinc-800">
                        <button
                          onClick={() => debouncedAccountSwitch("real")}
                          disabled={isAccountSwitching}
                          className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                            activeWallet === "real"
                              ? "bg-emerald-500 text-white"
                              : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-200/50 dark:hover:bg-zinc-700/50"
                          }`}
                        >
                          <div className={`w-1.5 h-1.5 rounded-full ${activeWallet === "real" ? "bg-white" : "bg-emerald-500"}`} />
                          {t("real_account")}
                        </button>
                        <button
                          onClick={() => debouncedAccountSwitch("practice")}
                          disabled={isAccountSwitching}
                          className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                            activeWallet === "practice"
                              ? "bg-amber-500 text-black"
                              : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-200/50 dark:hover:bg-zinc-700/50"
                          }`}
                        >
                          <div className={`w-1.5 h-1.5 rounded-full ${activeWallet === "practice" ? "bg-black" : "bg-amber-500"}`} />
                          {t("demo_account")}
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Balance Display */}
                <div className="px-4 py-4 bg-white dark:bg-zinc-900">
                  {/* Main Balance */}
                  <div className={`p-4 rounded-xl mb-3 ${
                    activeWallet === "real"
                      ? "bg-emerald-50 dark:bg-emerald-500/5 border border-emerald-100 dark:border-emerald-500/20"
                      : "bg-amber-50 dark:bg-amber-500/5 border border-amber-100 dark:border-amber-500/20"
                  }`}>
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="text-[10px] uppercase tracking-wider font-medium mb-1 text-zinc-400 dark:text-zinc-500">
                          {activeWallet === "real" ? t("real_account") : t("practice_account")}
                        </div>
                        <div className={`text-2xl font-bold tabular-nums ${activeWallet === "real" ? "text-emerald-500" : "text-amber-500"}`}>
                          {activeWallet === "real" ? (
                            isLoadingWallet || realBalance === null ? (
                              <span className="inline-block w-28 h-8 bg-zinc-200 dark:bg-zinc-800 animate-pulse rounded-lg" />
                            ) : (
                              (realBalance ?? 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                            )
                          ) : (
                            (demoBalance ?? 10000).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                          )}
                        </div>
                        <div className="text-[11px] font-medium mt-0.5 text-zinc-400 dark:text-zinc-500">
                          {extractQuoteCurrency(String(currentSymbol)) || "USDT"}
                        </div>
                      </div>
                      <button
                        onClick={(e) => e.stopPropagation()}
                        className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                          activeWallet === "real"
                            ? "bg-emerald-500 text-white hover:bg-emerald-600"
                            : "bg-amber-500 text-black hover:bg-amber-600"
                        }`}
                      >
                        <ArrowUpRight size={14} />
                        {activeWallet === "real" ? tCommon("deposit") : t("top_up")}
                      </button>
                    </div>
                  </div>

                  {/* Stats Grid */}
                  <div className="grid grid-cols-2 gap-2">
                    <div className="p-3 rounded-lg bg-zinc-50 dark:bg-zinc-800/50">
                      <div className="flex items-center gap-1.5 mb-1">
                        <TrendingUp size={11} className="text-zinc-400 dark:text-zinc-500" />
                        <span className="text-[9px] uppercase font-medium tracking-wide text-zinc-400 dark:text-zinc-500">
                          {t("in_positions")}
                        </span>
                      </div>
                      <div className="text-sm font-bold tabular-nums text-zinc-800 dark:text-white">
                        {orders
                          .filter((o) => o.status === "PENDING" && o.mode === (activeWallet === "real" ? "real" : "demo"))
                          .reduce((sum, o) => sum + o.amount, 0)
                          .toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                    </div>
                    <div className="p-3 rounded-lg bg-zinc-50 dark:bg-zinc-800/50">
                      <div className="flex items-center gap-1.5 mb-1">
                        <Sparkles size={11} className={activeWallet === "real" ? "text-emerald-500" : "text-amber-500"} />
                        <span className="text-[9px] uppercase font-medium tracking-wide text-zinc-400 dark:text-zinc-500">
                          {t("total_equity")}
                        </span>
                      </div>
                      <div className={`text-sm font-bold tabular-nums ${activeWallet === "real" ? "text-emerald-500" : "text-amber-500"}`}>
                        {activeWallet === "real" ? (
                          isLoadingWallet || realBalance === null ? (
                            <span className="inline-block w-16 h-5 bg-zinc-200 dark:bg-zinc-700 animate-pulse rounded" />
                          ) : (
                            ((realBalance ?? 0) + orders.filter((o) => o.status === "PENDING" && o.mode === "real").reduce((sum, o) => sum + o.amount, 0)).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                          )
                        ) : (
                          ((demoBalance ?? 10000) + orders.filter((o) => o.status === "PENDING" && o.mode === "demo").reduce((sum, o) => sum + o.amount, 0)).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                        )}
                      </div>
                    </div>
                  </div>
                </div>

              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            /* Auth controls for unauthenticated users */
            <AuthHeaderControls isMobile={isMobile} variant="binary" />
          )}
        </div>
      </div>

    </>
  );
}
