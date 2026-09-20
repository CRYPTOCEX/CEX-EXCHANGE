"use client";

import { useState } from "react";
import Image from "next/image";
import {
  ChevronLeft, Wallet, Sparkles, ChevronDown, Sun, Moon, Check,
} from "lucide-react";
import { useTheme } from "next-themes";
import { useBinaryStore, type Symbol } from "@/store/trade/use-binary-store";
import { RefreshCw } from "lucide-react";
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
import { cn } from "@/lib/utils";
import { TONE_INK, TONE_TINT, ToneMark } from "../binary-ui";

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
  const tCommon = useTranslations("common");
  const { setTheme, resolvedTheme } = useTheme();

  // Get user authentication state
  const user = useUserStore((state) => state.user);
  const isAuthenticated = !!user;

  /**
   * Only the theme-toggle ICON depends on the resolved theme; every colour in
   * this header is a token now, so the component no longer waits for
   * next-themes to mount before rendering anything (it used to return `null`,
   * which meant the whole mobile header popped in after hydration).
   */
  const isDarkMode = resolvedTheme !== "light";

  // State for market selector modal
  const [showMarketSelector, setShowMarketSelector] = useState(false);

  // State for account selector dropdown
  const [showAccountSelector, setShowAccountSelector] = useState(false);

  // Use the binary store for values not provided via props
  const storeValues = useBinaryStore();
  const { resetDemoBalance } = storeValues;
  const effectiveTradingMode = tradingMode || storeValues.tradingMode;
  const effectiveSymbol = symbol || storeValues.currentSymbol;
  const effectiveCurrentPrice = currentPrice || storeValues.currentPrice;

  const isRealAccount = effectiveTradingMode === "real";
  /** REAL money is live (`success`); DEMO is a caution state (`warning`). */
  const accountTone = isRealAccount ? "success" : "warning";

  // Use the correct balance based on trading mode
  const effectiveBalance = balance || (
    isRealAccount
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

  return (
    <>
      {/* Taller mobile header with 2-row market display like desktop */}
      <div className="flex items-center h-12 min-h-12 border-b bg-background border-border">
        {/* Left section - Back button */}
        <Link
          href="/"
          className="h-12 w-10 shrink-0 flex items-center justify-center border-r border-border text-muted-foreground hover:bg-surface-3 transition-colors"
        >
          <ChevronLeft size={18} />
        </Link>

        {/* Market Selector - with icon, 2-row layout.

            THE ROW'S PRESSURE VALVE, and it has to be something. This bar is
            a fixed 390px on a phone and every other cell in it is a fixed
            width or an unabbreviatable figure: the back arrow, the theme
            toggle and the account cell are 40px each, and the balance chip is
            the number the trader came for. The symbol is the one thing here
            that reads fine abbreviated, so `min-w-0` + the `truncate` below
            make it the cell that gives up width — instead of flexbox
            shrinking the back arrow to 19px and pushing the account cell off
            the edge, which is what it did before this. */}
        <button
          type="button"
          onClick={() => setShowMarketSelector(true)}
          className="flex min-w-0 items-center gap-2 h-12 px-3 border-r border-border hover:bg-surface-3 transition-colors cursor-pointer"
        >
          {/* Currency Icon */}
          <Image
            src={`/img/crypto/${(baseCurrency || "generic").toLowerCase()}.webp`}
            alt={baseCurrency || ""}
            width={20}
            height={20}
            className="shrink-0 rounded-full"
          />
          <div className="flex min-w-0 flex-col items-start">
            <div className="flex min-w-0 items-center gap-1.5">
              <span className="truncate text-xs font-semibold text-foreground">
                {displayPair}
              </span>
              {/* Sign + mark: `text-up` at 10px is 3.0:1 in light mode. */}
              <span className="text-[10px] font-medium text-foreground inline-flex items-center gap-1">
                <ToneMark tone={priceChange >= 0 ? "up" : "down"} size={5} />
                {priceChange >= 0 ? "+" : ""}{priceChange.toFixed(2)}%
              </span>
            </div>
            {effectiveCurrentPrice > 0 && (
              <span className="text-[10px] tabular-nums text-muted-foreground">
                ${effectiveCurrentPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            )}
          </div>
        </button>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Right section. `shrink-0` so the valve above is the ONE cell
            that gives up width — without it flexbox squeezes every
            fixed cell a little, including the 40px back arrow, and the
            rightmost one off the edge entirely. */}
        <div className="flex shrink-0 items-center h-full">
          {/* Theme toggle button */}
          <button
            type="button"
            onClick={() => setTheme(isDarkMode ? "light" : "dark")}
            aria-label={isDarkMode ? tCommon("light_mode") : tCommon("dark_mode")}
            className="h-12 w-10 flex items-center justify-center border-l border-border text-muted-foreground hover:bg-surface-3 transition-colors cursor-pointer"
          >
            {isDarkMode ? <Sun size={16} /> : <Moon size={16} />}
          </button>

          {/* Balance section */}
          {isAuthenticated && (
            <DropdownMenu open={showAccountSelector} onOpenChange={setShowAccountSelector}>
              <DropdownMenuTrigger asChild>
                <button className="h-12 flex items-center gap-2 px-3 border-l border-border hover:bg-surface-3 transition-colors cursor-pointer">
                  <div className={cn("p-1", TONE_TINT[accountTone])}>
                    <Wallet size={12} className={TONE_INK[accountTone]} />
                  </div>
                  <div className="flex flex-col items-start">
                    {/* Figure on `foreground`; the mode is carried by the icon
                        hue and the written REAL/DEMO label under it. */}
                    <span className="text-xs font-bold tabular-nums leading-tight text-foreground">
                      {effectiveBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                    <span className="text-[8px] font-bold leading-tight text-muted-foreground">
                      {isRealAccount ? t("real") : tCommon("demo")}
                    </span>
                  </div>
                  <ChevronDown
                    size={10}
                    className={cn(
                      "transition-transform text-muted-foreground",
                      showAccountSelector && "rotate-180"
                    )}
                  />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="w-72 p-0 overflow-hidden bg-popover border-border"
              >
                {/* Header */}
                <div className="px-3 py-2 border-b border-border">
                  <div className="flex items-center gap-2">
                    <Wallet size={14} className={TONE_INK[accountTone]} />
                    <span className="text-xs font-semibold text-foreground">
                      {tCommon("select_account")}
                    </span>
                  </div>
                </div>

                {/* Real Account */}
                <DropdownMenuItem
                  onClick={() => handleAccountSwitch("real")}
                  className={cn(
                    "flex items-center justify-between px-3 py-3 cursor-pointer m-1",
                    isRealAccount ? "bg-success/10" : "hover:bg-surface-3"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div className="p-1.5 bg-success/10">
                      <Wallet size={14} className="text-success" />
                    </div>
                    <div>
                      <div className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                        {t("real_account")}
                      </div>
                      <div className="text-sm font-bold text-foreground tabular-nums">
                        {(storeValues.realBalance ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                    </div>
                  </div>
                  {isRealAccount && (
                    <div className="w-5 h-5 bg-success flex items-center justify-center">
                      <Check size={12} className="text-success-foreground" strokeWidth={3} />
                    </div>
                  )}
                </DropdownMenuItem>

                {/* Demo Account */}
                <DropdownMenuItem
                  onClick={() => handleAccountSwitch("demo")}
                  className={cn(
                    "flex items-center justify-between px-3 py-3 cursor-pointer m-1",
                    !isRealAccount ? "bg-warning/10" : "hover:bg-surface-3"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div className="p-1.5 bg-warning/10">
                      <Sparkles size={14} className="text-warning" />
                    </div>
                    <div>
                      <div className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                        {tCommon("demo_account")}
                      </div>
                      <div className="text-sm font-bold text-foreground tabular-nums">
                        {(storeValues.demoBalance ?? 10000).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                    </div>
                  </div>
                  {!isRealAccount && (
                    <div className="w-5 h-5 bg-warning flex items-center justify-center">
                      <Check size={12} className="text-warning-foreground" strokeWidth={3} />
                    </div>
                  )}
                </DropdownMenuItem>

                {/* Top Up Demo Balance Button - only show when in demo mode */}
                {!isRealAccount && (
                  <div className="px-3 py-2 border-t border-border">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        resetDemoBalance();
                        setShowAccountSelector(false);
                      }}
                      className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium transition-colors cursor-pointer bg-warning/10 text-foreground hover:bg-warning/20"
                    >
                      <RefreshCw size={12} className="text-warning" />
                      {t("top_up")}
                    </button>
                  </div>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          {/*
            THE ACCOUNT, last cell — the phone twin of the desktop bar's, and
            it had the same defect: `AuthHeaderControls` lived in the ELSE of a
            ternary about the WALLET, so a signed-in person on a phone had no
            route to their profile from this terminal at all.

            NO `square` HERE, unlike the desktop bar. `square` hard-codes a 40px
            tile and this bar is `h-12`, so the filled avatar would leave a 4px
            ledge of bar above and below it. The default treatment is a 36px
            round avatar, which centres cleanly in 48px.

            Padding and seam are applied only when signed IN. Signed out this
            renders a Login button that already carries its own `h-10 px-4` and
            its own `border-l` (this bar's cells each draw their LEFT seam, the
            mirror of the desktop bar's `border-r`), so a wrapper seam would
            double it and wrapper padding would stretch it.
          */}
          <div
            className={cn(
              "flex h-full shrink-0 items-center",
              /* A 40px cell, the same width as the theme and back cells, NOT a
                 padded one. Measured: at 390px this row spends 40 (back) + 40
                 (theme) + 131 (balance chip) + this, and a 52px padded version
                 ran 17px past the viewport — into an `overflow-hidden`
                 ancestor, so the avatar was clipped rather than scrollable. */
              isAuthenticated && "w-10 justify-center border-l border-border"
            )}
          >
            <AuthHeaderControls isMobile={true} variant="binary" />
          </div>
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
