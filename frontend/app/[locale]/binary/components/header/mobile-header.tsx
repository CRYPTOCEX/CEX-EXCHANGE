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
}: MobileHeaderProps) {
  const t = useTranslations("binary/components/header/mobile-header");
  // Use next-themes hook properly
  const { theme, setTheme } = useTheme();
  const isDarkMode = theme === "dark";

  // State for market selector modal
  const [showMarketSelector, setShowMarketSelector] = useState(false);

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

          {/* Trading Mode Badge - Smaller */}
          <div
            className={`px-1.5 py-0.5 text-xs rounded-full ${
              effectiveTradingMode === "demo"
                ? "bg-blue-500/20 text-blue-400"
                : "bg-green-500/20 text-green-400"
            }`}
          >
            {effectiveTradingMode === "demo" ? "Demo" : "Real"}
          </div>
        </div>

        <div className="flex items-center space-x-1.5">
          {/* Balance - More compact */}
          <div className="text-xs flex items-center space-x-1">
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
          </div>

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
    </>
  );
}

export default MobileHeader;
