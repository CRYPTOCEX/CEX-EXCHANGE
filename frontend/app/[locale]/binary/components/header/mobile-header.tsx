"use client";

import { useState } from "react";
import { Sun, Moon, ChevronDown, ChevronLeft } from "lucide-react";
import { useTheme } from "next-themes";
import { useBinaryStore, type Symbol } from "@/store/trade/use-binary-store";
import { Link } from "@/i18n/routing";
import MarketSelectorModal from "./market-selector-modal";
import { useTranslations } from "next-intl";

// Update the MobileHeaderProps interface to use the correct Symbol type
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
  // Use next-themes hook properly
  const { theme, setTheme } = useTheme();
  const isDarkMode = theme === "dark";

  // State for market selector modal
  const [showMarketSelector, setShowMarketSelector] = useState(false);

  // State for account selector modal
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

  const NEXT_PUBLIC_SITE_NAME =
    process.env.NEXT_PUBLIC_SITE_NAME || "Binary Trading";

  // Get the actual market data to find the proper currency and pair
  const getCurrentMarketInfo = () => {
    if (!effectiveSymbol || typeof effectiveSymbol !== 'string')
      return { baseCurrency: "", quoteCurrency: "", displayPair: "" };

    // Try to find the market in binaryMarkets to get the actual currency and pair
    const market = storeValues.binaryMarkets.find((m) => {
      const marketSymbol = m.symbol || `${m.currency}${m.pair}`;
      return marketSymbol === effectiveSymbol;
    });

    if (market) {
      // Use the actual currency and pair from the market data
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
      // Try to split based on common patterns
      baseCurrency = effectiveSymbol.slice(0, -4);
      quoteCurrency = effectiveSymbol.slice(-4);
    }

    return {
      baseCurrency,
      quoteCurrency,
      displayPair: `${baseCurrency}/${quoteCurrency}`,
    };
  };

  const { baseCurrency, quoteCurrency, displayPair } = getCurrentMarketInfo();

  const toggleTheme = () => {
    setTheme(isDarkMode ? "light" : "dark");
  };

  // Handler for account switching
  const handleAccountSwitch = (mode: "demo" | "real") => {
    if (onTradingModeChange) {
      onTradingModeChange(mode);
    }
    setShowAccountSelector(false);
  };

  return (
    <>
      {/* Compact Mobile header */}
      <div
        className={`flex items-center justify-between px-3 py-2 border-b transition-colors ${
          isDarkMode
            ? "bg-black border-zinc-800 text-white"
            : "bg-white border-zinc-200 text-zinc-900"
        }`}
      >
        <div className="flex items-center space-x-2">
          {/* Back to home button */}
          <Link href="/">
            <button
              className={`p-1.5 rounded-full transition-colors ${
                isDarkMode
                  ? "hover:bg-zinc-800/50 text-white"
                  : "hover:bg-zinc-100 text-zinc-900"
              }`}
            >
              <ChevronLeft size={14} />
            </button>
          </Link>

          {/* Market Selector Button - More compact */}
          <button
            onClick={() => setShowMarketSelector(true)}
            className={`flex items-center space-x-1.5 px-2 py-1.5 rounded-md transition-colors ${
              isDarkMode
                ? "bg-zinc-800/50 hover:bg-zinc-700/50 text-white"
                : "bg-zinc-100 hover:bg-zinc-200 text-zinc-900"
            }`}
          >
            <div className="flex items-center space-x-1">
              <div className="text-sm font-bold">{displayPair}</div>
              {effectiveCurrentPrice > 0 && (
                <div className="text-xs opacity-70">
                  $
                  {effectiveCurrentPrice.toFixed(2)}
                </div>
              )}
            </div>
            <ChevronDown size={14} />
          </button>
        </div>

        <div className="flex items-center space-x-1.5">
          {/* Balance - More compact - Clickable to switch accounts */}
          <button
            onClick={() => setShowAccountSelector(true)}
            className="text-xs flex items-center space-x-1 hover:opacity-80 transition-opacity"
          >
            <span className={`px-1.5 py-0.5 rounded text-[8px] font-medium ${
              effectiveTradingMode === "real"
                ? "bg-green-500/20 text-green-400"
                : "bg-orange-500/20 text-orange-400"
            }`}>
              {effectiveTradingMode === "real" ? "REAL" : "DEMO"}
            </span>
            <span className="font-bold">
              {(effectiveBalance ?? 0).toFixed(2)}
            </span>
            <ChevronDown size={12} />
          </button>

          {/* Theme Toggle - Smaller */}
          <button
            onClick={toggleTheme}
            className={`p-1.5 rounded-full transition-colors ${
              isDarkMode
                ? "hover:bg-zinc-800 text-zinc-300"
                : "hover:bg-zinc-100 text-zinc-700"
            }`}
          >
            {isDarkMode ? <Sun size={16} /> : <Moon size={16} />}
          </button>
        </div>
      </div>

      {/* Market Selector Modal */}
      {showMarketSelector && (
        <MarketSelectorModal
          onClose={() => setShowMarketSelector(false)}
          handleMarketSelect={handleMarketSelect}
        />
      )}

      {/* Account Selector Modal */}
      {showAccountSelector && (
        <div
          className="fixed inset-0 z-[9999] flex items-end justify-center bg-black/50 backdrop-blur-sm"
          onClick={() => setShowAccountSelector(false)}
        >
          <div
            className={`w-full max-w-lg rounded-t-2xl ${
              isDarkMode ? "bg-zinc-900" : "bg-white"
            } p-4 pb-6 space-y-3 shadow-2xl`}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between mb-4">
              <h3
                className={`text-lg font-semibold ${
                  isDarkMode ? "text-white" : "text-zinc-900"
                }`}
              >
                {t("select_account")}
              </h3>
              <button
                onClick={() => setShowAccountSelector(false)}
                className={`p-1 rounded-full ${
                  isDarkMode
                    ? "hover:bg-zinc-800 text-zinc-400"
                    : "hover:bg-zinc-100 text-zinc-600"
                }`}
              >
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 20 20"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M15 5L5 15M5 5L15 15"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </svg>
              </button>
            </div>

            {/* Real Account */}
            <button
              onClick={() => handleAccountSwitch("real")}
              className={`w-full p-4 rounded-lg border-2 transition-all active:scale-95 ${
                effectiveTradingMode === "real"
                  ? isDarkMode
                    ? "border-green-500/50 bg-green-500/10"
                    : "border-green-500 bg-green-50"
                  : isDarkMode
                    ? "border-zinc-800 bg-zinc-800/30 hover:border-zinc-700 active:bg-zinc-800/50"
                    : "border-zinc-200 bg-white hover:border-zinc-300 active:bg-zinc-100"
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="text-left">
                  <div
                    className={`text-sm font-medium mb-1 ${
                      isDarkMode ? "text-zinc-400" : "text-zinc-600"
                    }`}
                  >
                    {t("real_account")}
                  </div>
                  <div className="text-xl font-bold text-green-500">
                    {(storeValues.realBalance ?? 0).toFixed(2)}
                  </div>
                </div>
                {effectiveTradingMode === "real" && (
                  <div className="flex items-center justify-center w-6 h-6 rounded-full bg-green-500">
                    <svg
                      width="14"
                      height="10"
                      viewBox="0 0 14 10"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M1 5L5 9L13 1"
                        stroke="white"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </div>
                )}
              </div>
            </button>

            {/* Demo Account */}
            <button
              onClick={() => handleAccountSwitch("demo")}
              className={`w-full p-4 rounded-lg border-2 transition-all active:scale-95 ${
                effectiveTradingMode === "demo"
                  ? isDarkMode
                    ? "border-orange-500/50 bg-orange-500/10"
                    : "border-orange-500 bg-orange-50"
                  : isDarkMode
                    ? "border-zinc-800 bg-zinc-800/30 hover:border-zinc-700 active:bg-zinc-800/50"
                    : "border-zinc-200 bg-white hover:border-zinc-300 active:bg-zinc-100"
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="text-left">
                  <div
                    className={`text-sm font-medium mb-1 ${
                      isDarkMode ? "text-zinc-400" : "text-zinc-600"
                    }`}
                  >
                    {t("demo_account")}
                  </div>
                  <div className="text-xl font-bold text-orange-500">
                    {(storeValues.demoBalance ?? 10000).toFixed(2)}
                  </div>
                </div>
                {effectiveTradingMode === "demo" && (
                  <div className="flex items-center justify-center w-6 h-6 rounded-full bg-orange-500">
                    <svg
                      width="14"
                      height="10"
                      viewBox="0 0 14 10"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M1 5L5 9L13 1"
                        stroke="white"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </div>
                )}
              </div>
            </button>
          </div>
        </div>
      )}
    </>
  );
}

export default MobileHeader;
