"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import {
  ChevronLeft, Wallet, Sparkles, ChevronDown, Sun, Moon
} from "lucide-react";
import { useTheme } from "next-themes";
import { useBinaryStore, type Symbol } from "@/store/trade/use-binary-store";
import { Link } from "@/i18n/routing";
import MarketSelectorModal from "./market-selector";
import { useTranslations } from "next-intl";
import { useUserStore } from "@/store/user";
import { AuthHeaderControls } from "@/components/auth/auth-header-controls";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface MobileHeaderProps {
  symbol?: Symbol;
  currentPrice?: number;
  balance?: number;
  tradingMode?: "demo" | "real";
  activeMarkets?: Array<{ symbol: Symbol; price: number; change: number }>;
  onSelectSymbol?: (symbol: Symbol) => void;
  onAddMarket?: (symbol: Symbol) => void;
  onRemoveMarket?: (symbol: Symbol) => void;
  handleMarketSelect?: (marketSymbol: string) => void;
  onTradingModeChange?: (mode: "demo" | "real") => void;
}

export function MobileHeader({
  symbol,
  currentPrice,
  balance = 0,
  tradingMode = "demo",
  activeMarkets = [],
  onSelectSymbol = () => {},
  onAddMarket = () => {},
  onRemoveMarket = () => {},
  handleMarketSelect,
  onTradingModeChange,
}: MobileHeaderProps) {
  const t = useTranslations("binary_components");
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Get user authentication state
  const user = useUserStore((state) => state.user);
  const isAuthenticated = !!user;

  useEffect(() => {
    setMounted(true);
  }, []);

  // Default to dark mode during SSR/hydration
  const isDarkMode = mounted ? resolvedTheme === "dark" : true;

  // State for market selector modal
  const [showMarketSelector, setShowMarketSelector] = useState(false);

  // State for account selector dropdown
  const [showAccountSelector, setShowAccountSelector] = useState(false);

  // Use the binary store for values not provided via props
  const storeValues = useBinaryStore();
  const effectiveTradingMode = tradingMode || storeValues.tradingMode;
  const effectiveSymbol = symbol || storeValues.currentSymbol;
  const effectiveCurrentPrice = currentPrice || storeValues.currentPrice;

  // Use the correct balance based on trading mode
  const effectiveBalance = balance || (
    effectiveTradingMode === "real"
      ? (storeValues.realBalance ?? 0)
      : (storeValues.demoBalance ?? 10000)
  );

  // Get the actual market data to find the proper currency and pair
  const getCurrentMarketInfo = () => {
    if (!effectiveSymbol || typeof effectiveSymbol !== 'string')
      return { baseCurrency: "", quoteCurrency: "", displayPair: "" };

    const market = storeValues.binaryMarkets.find((m) => {
      const marketSymbol = m.symbol || `${m.currency}${m.pair}`;
      return marketSymbol === effectiveSymbol;
    });

    if (market) {
      return {
        baseCurrency: market.currency,
        quoteCurrency: market.pair,
        displayPair: market.label || `${market.currency}/${market.pair}`,
      };
    }

    // Fallback to parsing the symbol string
    let baseCurrency = "";
    let quoteCurrency = "";

    if (effectiveSymbol.includes("/")) {
      [baseCurrency, quoteCurrency] = effectiveSymbol.split("/");
    } else if (effectiveSymbol.endsWith("USDT")) {
      baseCurrency = effectiveSymbol.slice(0, -4);
      quoteCurrency = "USDT";
    } else {
      baseCurrency = effectiveSymbol.slice(0, -4);
      quoteCurrency = effectiveSymbol.slice(-4);
    }

    return {
      baseCurrency,
      quoteCurrency,
      displayPair: `${baseCurrency}/${quoteCurrency}`,
    };
  };

  const { displayPair, baseCurrency } = getCurrentMarketInfo();

  // Handler for account switching
  const handleAccountSwitch = (mode: "demo" | "real") => {
    if (onTradingModeChange) {
      onTradingModeChange(mode);
    }
    setShowAccountSelector(false);
  };

  // Find current market change
  const currentMarket = activeMarkets.find(m => m.symbol === effectiveSymbol);
  const priceChange = currentMarket?.change ?? 0;

  // Mobile market select handler - replaces current market instead of adding
  const handleMobileMarketSelect = (marketSymbol: string) => {
    // On mobile, we replace the current market instead of adding new tabs
    if (handleMarketSelect) {
      handleMarketSelect(marketSymbol);
    }
    setShowMarketSelector(false);
  };

  if (!mounted) {
    return null;
  }

  return (
    <>
      {/* Taller mobile header with 2-row market display like desktop */}
      <div
        className={`flex items-center h-12 min-h-12 border-b ${
          isDarkMode
            ? "bg-black border-zinc-800"
            : "bg-white border-zinc-200"
        }`}
      >
        {/* Left section - Back button */}
        <Link
          href="/"
          className={`h-12 w-10 flex items-center justify-center border-r transition-colors ${
            isDarkMode
              ? "border-zinc-800 text-zinc-400 hover:bg-zinc-800"
              : "border-zinc-200 text-zinc-600 hover:bg-zinc-100"
          }`}
        >
          <ChevronLeft size={18} />
        </Link>

        {/* Market Selector - with icon, 2-row layout */}
        <button
          onClick={() => setShowMarketSelector(true)}
          className={`flex items-center gap-2 h-12 px-3 border-r transition-colors ${
            isDarkMode
              ? "border-zinc-800 hover:bg-zinc-900"
              : "border-zinc-200 hover:bg-zinc-50"
          }`}
        >
          {/* Currency Icon */}
          <Image
            src={`/img/crypto/${(baseCurrency || "generic").toLowerCase()}.webp`}
            alt={baseCurrency || ""}
            width={20}
            height={20}
            className="shrink-0 rounded-full"
          />
          <div className="flex flex-col items-start">
            <div className="flex items-center gap-1.5">
              <span className={`text-xs font-semibold ${isDarkMode ? "text-white" : "text-zinc-900"}`}>
                {displayPair}
              </span>
              <span className={`text-[10px] font-medium ${priceChange >= 0 ? "text-green-500" : "text-red-500"}`}>
                {priceChange >= 0 ? "+" : ""}{priceChange.toFixed(2)}%
              </span>
            </div>
            {effectiveCurrentPrice > 0 && (
              <span className={`text-[10px] tabular-nums ${isDarkMode ? "text-zinc-500" : "text-zinc-500"}`}>
                ${effectiveCurrentPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            )}
          </div>
        </button>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Right section */}
        <div className="flex items-center h-full">
          {/* Theme toggle button */}
          <button
            onClick={() => setTheme(isDarkMode ? "light" : "dark")}
            className={`h-12 w-10 flex items-center justify-center border-l transition-colors ${
              isDarkMode
                ? "border-zinc-800 text-zinc-400 hover:bg-zinc-800"
                : "border-zinc-200 text-zinc-600 hover:bg-zinc-100"
            }`}
          >
            {isDarkMode ? <Sun size={16} /> : <Moon size={16} />}
          </button>

          {/* Balance/Auth section */}
          {isAuthenticated ? (
            <DropdownMenu open={showAccountSelector} onOpenChange={setShowAccountSelector}>
              <DropdownMenuTrigger asChild>
                <button
                  className={`h-12 flex items-center gap-2 px-3 border-l transition-colors ${
                    isDarkMode
                      ? "border-zinc-800 hover:bg-zinc-800"
                      : "border-zinc-200 hover:bg-zinc-100"
                  }`}
                >
                  <div className={`p-1 ${
                    effectiveTradingMode === "real"
                      ? "bg-emerald-500/10"
                      : "bg-amber-500/10"
                  }`}>
                    <Wallet size={12} className={effectiveTradingMode === "real" ? "text-emerald-500" : "text-amber-500"} />
                  </div>
                  <div className="flex flex-col items-start">
                    <span className={`text-xs font-bold tabular-nums leading-tight ${
                      effectiveTradingMode === "real" ? "text-emerald-500" : "text-amber-500"
                    }`}>
                      {effectiveBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                    <span className={`text-[8px] font-bold leading-tight ${
                      effectiveTradingMode === "real"
                        ? "text-emerald-400"
                        : "text-amber-400"
                    }`}>
                      {effectiveTradingMode === "real" ? "REAL" : "DEMO"}
                    </span>
                  </div>
                  <ChevronDown size={10} className={`transition-transform ${showAccountSelector ? "rotate-180" : ""} ${isDarkMode ? "text-zinc-500" : "text-zinc-400"}`} />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className={`w-72 p-0 overflow-hidden ${
                  isDarkMode
                    ? "bg-zinc-900 border-zinc-800"
                    : "bg-white border-zinc-200"
                }`}
              >
                {/* Header */}
                <div className={`px-3 py-2 border-b ${isDarkMode ? "border-zinc-800" : "border-zinc-200"}`}>
                  <div className="flex items-center gap-2">
                    <Wallet size={14} className={effectiveTradingMode === "real" ? "text-emerald-500" : "text-amber-500"} />
                    <span className={`text-xs font-semibold ${isDarkMode ? "text-white" : "text-zinc-900"}`}>
                      {t("select_account")}
                    </span>
                  </div>
                </div>

                {/* Real Account */}
                <DropdownMenuItem
                  onClick={() => handleAccountSwitch("real")}
                  className={`flex items-center justify-between px-3 py-3 cursor-pointer m-1 ${
                    effectiveTradingMode === "real"
                      ? "bg-emerald-500/10"
                      : isDarkMode
                        ? "hover:bg-zinc-800"
                        : "hover:bg-zinc-100"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-1.5 ${isDarkMode ? "bg-emerald-500/10" : "bg-emerald-50"}`}>
                      <Wallet size={14} className="text-emerald-500" />
                    </div>
                    <div>
                      <div className={`text-[10px] font-medium uppercase tracking-wide ${isDarkMode ? "text-zinc-500" : "text-zinc-400"}`}>
                        {t("real_account")}
                      </div>
                      <div className="text-sm font-bold text-emerald-500 tabular-nums">
                        {(storeValues.realBalance ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                    </div>
                  </div>
                  {effectiveTradingMode === "real" && (
                    <div className="w-5 h-5 bg-emerald-500 flex items-center justify-center">
                      <svg width="10" height="8" viewBox="0 0 14 10" fill="none">
                        <path d="M1 5L5 9L13 1" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                  )}
                </DropdownMenuItem>

                {/* Demo Account */}
                <DropdownMenuItem
                  onClick={() => handleAccountSwitch("demo")}
                  className={`flex items-center justify-between px-3 py-3 cursor-pointer m-1 ${
                    effectiveTradingMode === "demo"
                      ? "bg-amber-500/10"
                      : isDarkMode
                        ? "hover:bg-zinc-800"
                        : "hover:bg-zinc-100"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-1.5 ${isDarkMode ? "bg-amber-500/10" : "bg-amber-50"}`}>
                      <Sparkles size={14} className="text-amber-500" />
                    </div>
                    <div>
                      <div className={`text-[10px] font-medium uppercase tracking-wide ${isDarkMode ? "text-zinc-500" : "text-zinc-400"}`}>
                        {t("demo_account")}
                      </div>
                      <div className="text-sm font-bold text-amber-500 tabular-nums">
                        {(storeValues.demoBalance ?? 10000).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                    </div>
                  </div>
                  {effectiveTradingMode === "demo" && (
                    <div className="w-5 h-5 bg-amber-500 flex items-center justify-center">
                      <svg width="10" height="8" viewBox="0 0 14 10" fill="none">
                        <path d="M1 5L5 9L13 1" stroke="black" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                  )}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            /* Auth controls for unauthenticated users */
            <AuthHeaderControls isMobile={true} variant="binary" />
          )}
        </div>
      </div>

      {/* Market Selector Modal - uses mobile replace behavior */}
      <MarketSelectorModal
        open={showMarketSelector}
        onClose={() => setShowMarketSelector(false)}
        handleMarketSelect={handleMobileMarketSelect}
        isMobile={true}
      />
    </>
  );
}

export default MobileHeader;
