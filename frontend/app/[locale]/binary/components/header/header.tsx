"use client";

/**
 * Binary terminal top bar.
 *
 * Colour note: this bar used to carry SEVEN accents — blue analytics, purple
 * settings/patterns, amber leaderboard/theme, green challenges, emerald real
 * balance, amber demo balance and a hardcoded `#F7941D` brand orange. Six of
 * them meant the same thing ("this button is interactive / this overlay is
 * open"), so they are `primary`. The two that carry real meaning are the
 * account modes: REAL is `success`, DEMO/practice is `warning`, and both ship
 * with a written REAL/DEMO chip so the state never rests on hue alone.
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { useTheme } from "next-themes";
import { m, AnimatePresence } from "framer-motion";
import { Sun, Moon, ChevronLeft, Wallet, TrendingUp, ArrowUpRight, Sparkles, ChevronDown, Maximize, Minimize, BarChart2, Settings, GraduationCap, Trophy, Target, BookOpen, HelpCircle, MoreHorizontal } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { Symbol, Order } from "@/store/trade/use-binary-store";
import {
  extractBaseCurrency,
  extractQuoteCurrency,
  useBinaryStore,
} from "@/store/trade/use-binary-store";
import MarketSelector from "./market-selector-desktop";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Link, withCurrentLocale } from "@/i18n/routing";
import { useTranslations } from "next-intl";
import { useUserStore } from "@/store/user";
import { AuthHeaderControls } from "@/components/auth/auth-header-controls";
import { NotificationBell } from "@/components/partials/header/notification-bell";
import { Skeleton } from "@/components/ui/skeleton";
import { useSettings } from "@/hooks/use-settings";
import { cn } from "@/lib/utils";
import {
  CountBadge,
  HeaderIconButton,
  MenuSectionLabel,
  TONE_INK,
  TONE_TINT,
  ToneMark,
} from "../binary-ui";

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

/** One row of the mobile "More" / desktop "Learn & compete" dropdowns. */
function MenuRow({
  icon: Icon,
  label,
  hint,
  active = false,
  onClick,
  trailing,
}: {
  icon: LucideIcon;
  label: string;
  hint?: string;
  active?: boolean;
  onClick?: () => void;
  trailing?: React.ReactNode;
}) {
  return (
    <DropdownMenuItem
      onClick={onClick}
      className={cn(
        "flex items-center gap-3 px-3 py-2 text-sm cursor-pointer rounded-lg",
        active
          ? "bg-primary/10 text-foreground"
          : "text-foreground hover:bg-surface-3"
      )}
    >
      {hint ? (
        <div className="p-1.5 rounded-lg bg-primary/10">
          <Icon size={14} className="text-primary" />
        </div>
      ) : (
        <Icon size={14} className={active ? "text-primary" : "text-muted-foreground"} />
      )}
      <div className="text-left">
        <div className="font-medium">{label}</div>
        {hint ? <div className="text-xs text-muted-foreground">{hint}</div> : null}
      </div>
      {trailing ? <div className="ml-auto">{trailing}</div> : null}
    </DropdownMenuItem>
  );
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
  const { binaryMarkets, resetDemoBalance } = useBinaryStore();
  const t = useTranslations("binary_components");
  const tCommon = useTranslations("common");
  const [showBalanceMenu, setShowBalanceMenu] = useState(false);
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

  /**
   * Which icon the theme toggle shows. This is the ONE place the resolved
   * theme is still needed — every colour below is a token, so nothing else
   * branches on it. Defaults to dark before mount so the swap does not flash.
   */
  const darkMode = !mounted ? true : (resolvedTheme === "dark");

  const [activeWallet, setActiveWallet] = useState<"real" | "practice">(
    tradingMode === "real" ? "real" : "practice"
  );
  const [isAccountSwitching, setIsAccountSwitching] = useState(false);

  // Ref to store timeout ID for debouncing
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const isRealAccount = activeWallet === "real";
  /** REAL money is live (`success`); PRACTICE is a caution state (`warning`). */
  const accountTone = isRealAccount ? "success" : "warning";

  // Use the correct balance based on active wallet type
  const currentBalance = isRealAccount
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

  const hasEducation =
    !!(onTutorialClick || onPatternLibraryClick || onLeaderboardClick || onChallengesClick);

  // With more markets on screen, the inline education buttons give way to the
  // dropdown at progressively wider breakpoints.
  const inlineEducationVisibility =
    activeMarkets.length <= 1
      ? "md:flex"
      : activeMarkets.length === 2
        ? "lg:flex"
        : activeMarkets.length === 3
          ? "xl:flex"
          : "2xl:flex";
  const educationDropdownVisibility =
    activeMarkets.length <= 1
      ? "md:hidden"
      : activeMarkets.length === 2
        ? "lg:hidden"
        : activeMarkets.length === 3
          ? "xl:hidden"
          : "2xl:hidden";

  const currentChange =
    activeMarkets.find((m) => m.symbol === currentSymbol)?.change ?? 0;

  return (
    <div className="flex items-center h-10 min-h-10 bg-background border-border border-b">
      {/* Left section - Logo and back button */}
      <div className="flex items-center h-full border-r border-border">
        {/* Back to home button */}
        <Link
          href="/"
          className="h-10 w-10 flex items-center justify-center hover:bg-surface-3 transition-colors cursor-pointer"
        >
          <ChevronLeft size={18} className="text-muted-foreground" />
        </Link>

        <div className="h-full px-3 flex items-center border-l border-border">
          {/* The brand mark was a hardcoded `#F7941D`, plus a dark-only orange
              gradient. It is the product's accent, which is `primary`. */}
          <span className="text-sm font-bold text-primary">
            {process.env.NEXT_PUBLIC_SITE_NAME || tCommon("bicrypto")}
          </span>
        </div>
      </div>

      {/* Market selector section */}
      <div data-tutorial="market-selector" className="flex-1 flex items-center h-full min-w-0">
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
              <button className="flex items-center h-full px-3 gap-1.5 cursor-pointer hover:bg-surface-3 transition-colors min-w-0">
                <span className="font-semibold text-sm text-foreground truncate">
                  {extractBaseCurrency(String(currentSymbol), binaryMarkets)}/{extractQuoteCurrency(String(currentSymbol), binaryMarkets)}
                </span>
                <span className="text-xs text-muted-foreground tabular-nums">
                  ${currentPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
                {/* The +/- sign is the second channel on every change figure. */}
                <span className="text-[10px] font-medium text-foreground inline-flex items-center gap-1">
                  <ToneMark tone={currentChange >= 0 ? "up" : "down"} size={5} />
                  {currentChange >= 0 ? "+" : ""}
                  {currentChange.toFixed(2)}%
                </span>
                <ChevronDown size={12} className="text-muted-foreground ml-0.5 shrink-0" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-64 p-1 bg-popover border-border">
              <MenuSectionLabel>{tCommon("active_markets")}</MenuSectionLabel>
              {activeMarkets.map((market) => {
                const base = extractBaseCurrency(String(market.symbol), binaryMarkets);
                const quote = extractQuoteCurrency(String(market.symbol), binaryMarkets);
                const isActive = market.symbol === currentSymbol;
                return (
                  <DropdownMenuItem
                    key={market.symbol}
                    onClick={() => effectiveHandleMarketSelect(String(market.symbol))}
                    className={cn(
                      "flex items-center justify-between px-3 py-2 text-sm cursor-pointer",
                      isActive
                        ? "bg-primary/10 text-foreground"
                        : "text-muted-foreground hover:bg-surface-3"
                    )}
                  >
                    <span className="font-medium">{base}/{quote}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs tabular-nums text-muted-foreground">
                        ${market.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                      <span className="text-[10px] font-medium text-foreground inline-flex items-center gap-1">
                        <ToneMark tone={market.change >= 0 ? "up" : "down"} size={5} />
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
      <div className="flex items-center h-full border-l border-border">
        {/* Mobile: More dropdown containing all actions */}
        {isMobile && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="h-10 w-10 flex items-center justify-center border-r border-border text-muted-foreground hover:bg-surface-3 transition-colors cursor-pointer">
                <MoreHorizontal size={18} />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 p-1 bg-popover border-border">
              {/* Education section */}
              {hasEducation && (
                <>
                  <MenuSectionLabel>{t("learn_compete")}</MenuSectionLabel>
                  {onTutorialClick && (
                    <MenuRow icon={HelpCircle} label="Tutorial" onClick={onTutorialClick} />
                  )}
                  {onPatternLibraryClick && (
                    <MenuRow
                      icon={BookOpen}
                      label={tCommon("pattern_library")}
                      active={isPatternLibraryOpen}
                      onClick={onPatternLibraryClick}
                    />
                  )}
                  {onLeaderboardClick && (
                    <MenuRow
                      icon={Trophy}
                      label="Leaderboard"
                      active={isLeaderboardOpen}
                      onClick={onLeaderboardClick}
                    />
                  )}
                  {onChallengesClick && tradingMode === "demo" && (
                    <MenuRow
                      icon={Target}
                      label="Challenges"
                      active={isChallengesOpen}
                      onClick={onChallengesClick}
                    />
                  )}
                  <div className="my-1 h-px bg-border" />
                </>
              )}

              {/* Tools section */}
              <MenuSectionLabel>Tools</MenuSectionLabel>
              {isAuthenticated && onAnalyticsClick && (
                <MenuRow
                  icon={BarChart2}
                  label="Analytics"
                  active={isAnalyticsOpen}
                  onClick={onAnalyticsClick}
                  trailing={<CountBadge count={completedTradesCount} />}
                />
              )}
              {onSettingsClick && (
                <MenuRow
                  icon={Settings}
                  label="Settings"
                  active={isSettingsOpen}
                  onClick={onSettingsClick}
                />
              )}
              <MenuRow
                icon={darkMode ? Sun : Moon}
                label={darkMode ? tCommon("light_mode") : tCommon("dark_mode")}
                onClick={toggleTheme}
              />
              <MenuRow
                icon={isFullscreen ? Minimize : Maximize}
                label={isFullscreen ? tCommon("exit_fullscreen") : tCommon("fullscreen")}
                onClick={toggleFullscreen}
              />
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        {/* Education Menu - Desktop only (mobile uses More dropdown) */}
        {!isMobile && hasEducation && (
          <>
            {/* Inline buttons; hidden at narrow widths in favour of the dropdown */}
            <div className={cn("hidden items-center h-full", inlineEducationVisibility)}>
              {onTutorialClick && (
                <HeaderIconButton
                  icon={HelpCircle}
                  label="Tutorial"
                  tooltip="Tutorial"
                  onClick={onTutorialClick}
                />
              )}
              {onPatternLibraryClick && (
                <HeaderIconButton
                  icon={BookOpen}
                  label={tCommon("pattern_library")}
                  tooltip={tCommon("pattern_library")}
                  onClick={onPatternLibraryClick}
                  active={isPatternLibraryOpen}
                />
              )}
              {onLeaderboardClick && (
                <HeaderIconButton
                  icon={Trophy}
                  label="Leaderboard"
                  tooltip="Leaderboard"
                  onClick={onLeaderboardClick}
                  active={isLeaderboardOpen}
                />
              )}
              {onChallengesClick && tradingMode === "demo" && (
                <HeaderIconButton
                  icon={Target}
                  label="Challenges"
                  tooltip="Challenges"
                  onClick={onChallengesClick}
                  active={isChallengesOpen}
                />
              )}
            </div>

            {/* Dropdown - shown when inline buttons are hidden */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <m.button
                  type="button"
                  aria-label={t("learn_compete")}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className={cn(
                    "h-10 w-10 flex items-center justify-center border-r border-border",
                    "text-muted-foreground hover:text-primary hover:bg-surface-3 transition-colors cursor-pointer",
                    educationDropdownVisibility
                  )}
                >
                  <GraduationCap size={16} />
                </m.button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="w-56 p-2 bg-popover border-border rounded-xl shadow-xl"
              >
                <MenuSectionLabel>{t("learn_compete")}</MenuSectionLabel>

                {onTutorialClick && (
                  <MenuRow
                    icon={HelpCircle}
                    label="Tutorial"
                    hint={t("learn_the_basics")}
                    onClick={onTutorialClick}
                  />
                )}
                {onPatternLibraryClick && (
                  <MenuRow
                    icon={BookOpen}
                    label={tCommon("pattern_library")}
                    hint={t("chart_patterns_guide")}
                    onClick={onPatternLibraryClick}
                  />
                )}
                {onLeaderboardClick && (
                  <MenuRow
                    icon={Trophy}
                    label="Leaderboard"
                    hint={t("top_traders_ranking")}
                    onClick={onLeaderboardClick}
                  />
                )}
                {onChallengesClick && tradingMode === "demo" && (
                  <MenuRow
                    icon={Target}
                    label="Challenges"
                    hint={t("demo_trading_goals")}
                    onClick={onChallengesClick}
                  />
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </>
        )}

        {/* Analytics button - authenticated users only, desktop only */}
        {!isMobile && isAuthenticated && onAnalyticsClick && (
          <HeaderIconButton
            icon={BarChart2}
            label={tCommon("analytics") || tCommon("analytics")}
            tooltip={`${tCommon("analytics") || tCommon("analytics")}${completedTradesCount > 0 ? t("trades", { completedTradesCount: String(completedTradesCount) }) : ""}`}
            onClick={onAnalyticsClick}
            active={isAnalyticsOpen}
          >
            <CountBadge
              count={completedTradesCount}
              className="absolute top-0 right-0 shadow-sm"
            />
          </HeaderIconButton>
        )}

        {/* Trading Settings button - desktop only */}
        {!isMobile && onSettingsClick && (
          <HeaderIconButton
            icon={Settings}
            label={tCommon("trading_settings") || tCommon("trading_settings")}
            tooltip={tCommon("trading_settings") || tCommon("trading_settings")}
            onClick={onSettingsClick}
            active={isSettingsOpen}
          />
        )}

        {/* Theme Toggle - desktop only */}
        {!isMobile && (
          <HeaderIconButton
            label={darkMode ? tCommon("light_mode") : tCommon("dark_mode")}
            tooltip={darkMode ? tCommon("light_mode") : tCommon("dark_mode")}
            onClick={toggleTheme}
          >
            <AnimatePresence mode="wait">
              {darkMode ? (
                <m.div
                  key="sun"
                  initial={{ opacity: 0, rotate: -90, scale: 0.5 }}
                  animate={{ opacity: 1, rotate: 0, scale: 1 }}
                  exit={{ opacity: 0, rotate: 90, scale: 0.5 }}
                  transition={{ duration: 0.2 }}
                >
                  <Sun size={16} />
                </m.div>
              ) : (
                <m.div
                  key="moon"
                  initial={{ opacity: 0, rotate: 90, scale: 0.5 }}
                  animate={{ opacity: 1, rotate: 0, scale: 1 }}
                  exit={{ opacity: 0, rotate: -90, scale: 0.5 }}
                  transition={{ duration: 0.2 }}
                >
                  <Moon size={16} />
                </m.div>
              )}
            </AnimatePresence>
          </HeaderIconButton>
        )}

        {/* Fullscreen toggle - desktop only */}
        {!isMobile && (
          <HeaderIconButton
            label={isFullscreen ? tCommon("exit_fullscreen") : tCommon("fullscreen")}
            tooltip={isFullscreen ? tCommon("exit_fullscreen") : tCommon("fullscreen")}
            onClick={toggleFullscreen}
            className="overflow-hidden"
          >
            <AnimatePresence mode="wait" initial={false}>
              <m.div
                key={isFullscreen ? "minimize" : "maximize"}
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.5, opacity: 0 }}
                transition={{ duration: 0.2, ease: "easeInOut" }}
                className="absolute"
              >
                {isFullscreen ? <Minimize size={16} /> : <Maximize size={16} />}
              </m.div>
            </AnimatePresence>
          </HeaderIconButton>
        )}

        {/* Notification Bell - only show when authenticated */}
        {isAuthenticated && <NotificationBell variant="binary" />}

        {/* Balance Display with Wallet Switching */}
        {isAuthenticated && (
          <DropdownMenu open={showBalanceMenu} onOpenChange={setShowBalanceMenu}>
            <DropdownMenuTrigger asChild>
              <button
                data-tutorial="demo-toggle"
                className="h-10 flex items-center gap-2 px-3 hover:bg-surface-3 cursor-pointer transition-all group"
              >
                {/* Balance icon — the hue lives here and on the REAL/DEMO chip;
                    the figure stays on `foreground`, because `text-success` at
                    14px measures 3.4:1 on this ground in light mode. */}
                <div
                  className={cn(
                    "p-1.5 rounded-lg transition-colors",
                    TONE_TINT[accountTone]
                  )}
                >
                  <Wallet size={14} className={TONE_INK[accountTone]} />
                </div>

                <div className="text-right">
                  <div
                    className={cn(
                      "font-bold tabular-nums text-foreground",
                      isMobile ? "text-xs" : "text-sm"
                    )}
                  >
                    {isLoadingWallet ? (
                      <Skeleton className="inline-block w-16 h-4" />
                    ) : (
                      `${currentBalance.toLocaleString("en-US", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}`
                    )}
                  </div>
                  {!isMobile && (
                    <div className="text-[9px] flex items-center justify-end gap-1 text-muted-foreground">
                      <span
                        className={cn(
                          "px-1.5 py-0.5 text-[8px] font-bold rounded text-foreground",
                          isRealAccount ? "bg-success/20" : "bg-warning/20"
                        )}
                      >
                        {isRealAccount ? t("real") : tCommon("demo")}
                      </span>
                      <span>{extractQuoteCurrency(String(currentSymbol)) || "USDT"}</span>
                    </div>
                  )}
                </div>
                <ChevronDown
                  size={12}
                  className={cn(
                    "transition-transform text-muted-foreground",
                    showBalanceMenu && "rotate-180"
                  )}
                />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-80 p-0 gap-0 overflow-hidden bg-popover border-border border rounded-2xl shadow-xl">
              {/* Header */}
              <div className="p-4 pb-3">
                <div className="flex items-center gap-3 mb-3">
                  <div className={cn("p-2 rounded-xl", TONE_TINT[accountTone])}>
                    <Wallet size={16} className={TONE_INK[accountTone]} />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-foreground">
                      {tCommon("wallet")}
                    </h3>
                    <p className="text-[10px] text-muted-foreground">
                      {t("manage_your_trading_accounts")}
                    </p>
                  </div>
                </div>

                {/* Account Switcher Tabs - only show if practice mode is enabled */}
                {binaryPracticeEnabled && (
                  <div className="flex gap-1 p-1 rounded-lg bg-surface-3">
                    <button
                      type="button"
                      onClick={() => debouncedAccountSwitch("real")}
                      disabled={isAccountSwitching}
                      aria-pressed={isRealAccount}
                      className={cn(
                        "flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-md text-xs font-semibold transition-all cursor-pointer",
                        isRealAccount
                          ? "bg-success text-success-foreground"
                          : "text-muted-foreground hover:text-foreground hover:bg-surface-2"
                      )}
                    >
                      <span
                        aria-hidden
                        className={cn(
                          "w-1.5 h-1.5 rounded-full",
                          isRealAccount ? "bg-success-foreground" : "bg-success"
                        )}
                      />
                      {t("real_account")}
                    </button>
                    <button
                      type="button"
                      onClick={() => debouncedAccountSwitch("practice")}
                      disabled={isAccountSwitching}
                      aria-pressed={!isRealAccount}
                      className={cn(
                        "flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-md text-xs font-semibold transition-all cursor-pointer",
                        !isRealAccount
                          ? "bg-warning text-warning-foreground"
                          : "text-muted-foreground hover:text-foreground hover:bg-surface-2"
                      )}
                    >
                      <span
                        aria-hidden
                        className={cn(
                          "w-1.5 h-1.5 rounded-full",
                          !isRealAccount ? "bg-warning-foreground" : "bg-warning"
                        )}
                      />
                      {tCommon("demo_account")}
                    </button>
                  </div>
                )}
              </div>

              {/* Balance Display */}
              <div className="px-4 py-4">
                {/* Main Balance */}
                <div
                  className={cn(
                    "p-4 rounded-xl mb-3 border",
                    isRealAccount
                      ? "bg-success/5 border-success/20"
                      : "bg-warning/5 border-warning/20"
                  )}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="text-[10px] uppercase tracking-wider font-medium mb-1 text-muted-foreground">
                        {isRealAccount ? t("real_account") : t("practice_account")}
                      </div>
                      <div className="text-2xl font-bold tabular-nums text-foreground">
                        {isRealAccount ? (
                          isLoadingWallet || realBalance === null ? (
                            <Skeleton className="inline-block w-28 h-8 rounded-lg" />
                          ) : (
                            (realBalance ?? 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                          )
                        ) : (
                          (demoBalance ?? 10000).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                        )}
                      </div>
                      <div className="text-[11px] font-medium mt-0.5 text-muted-foreground">
                        {extractQuoteCurrency(String(currentSymbol)) || "USDT"}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (!isRealAccount) {
                          // Reset demo balance to default (10000)
                          resetDemoBalance();
                        } else {
                          // For real wallet, navigate to deposit page
                          window.location.href = withCurrentLocale("/finance/deposit");
                        }
                      }}
                      className={cn(
                        "flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer",
                        isRealAccount
                          ? "bg-success text-success-foreground hover:bg-success/90"
                          : "bg-warning text-warning-foreground hover:bg-warning/90"
                      )}
                    >
                      <ArrowUpRight size={14} />
                      {isRealAccount ? tCommon("deposit") : t("top_up")}
                    </button>
                  </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="p-3 rounded-lg bg-surface-3">
                    <div className="flex items-center gap-1.5 mb-1">
                      <TrendingUp size={11} className="text-muted-foreground" />
                      <span className="text-[9px] uppercase font-medium tracking-wide text-muted-foreground">
                        {t("in_positions")}
                      </span>
                    </div>
                    <div className="text-sm font-bold tabular-nums text-foreground">
                      {orders
                        .filter((o) => o.status === "PENDING" && o.mode === (isRealAccount ? "real" : "demo"))
                        .reduce((sum, o) => sum + o.amount, 0)
                        .toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                  </div>
                  <div className="p-3 rounded-lg bg-surface-3">
                    <div className="flex items-center gap-1.5 mb-1">
                      <Sparkles size={11} className={TONE_INK[accountTone]} />
                      <span className="text-[9px] uppercase font-medium tracking-wide text-muted-foreground">
                        {t("total_equity")}
                      </span>
                    </div>
                    <div className="text-sm font-bold tabular-nums text-foreground">
                      {isRealAccount ? (
                        isLoadingWallet || realBalance === null ? (
                          <Skeleton className="inline-block w-16 h-5" />
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
        )}

        {/*
          THE ACCOUNT, last cell in the bar.

          `/binary` is chromeless — `conditional-layout-provider.tsx` lists it,
          so there is no `SiteHeader` above this route and this bar is the ONLY
          chrome on the page. `AuthHeaderControls` used to sit in the ELSE arm
          of the ternary above, which is a ternary about the WALLET, and the
          effect was that the account control rendered for exactly the people
          who do not have an account yet. Signed in, the avatar never mounted:
          no profile, no wallet, no security settings, no sign-out, from a
          terminal a person can sit in front of all day.

          It is a both-states control — signed in it is `ProfileInfo`'s avatar
          opening the shared `ProfileMenuPanel`, signed out it is Log in / Sign
          up plus the modal — so it belongs OUTSIDE the ternary, BESIDE the
          balance chip rather than instead of it.

          `square` is the flat 40px square-cornered cell the rest of this
          cluster is built from; the default variant is a rounded island with a
          gap around it, which is the shape this bar exists to avoid.
        */}
        <div
          className={cn(
            /* The seam is drawn HERE only when signed in. The balance chip
               above is borderless, so without this the avatar would butt
               straight against the figure. Signed out that chip is gone and
               the preceding `HeaderIconButton` has already terminated the run
               with its own `border-r`, so drawing one here too would put 2px
               in a bar whose entire design is one-hairline seams.

               `[&_button]:border-l-0` kills the leading border the signed-out
               branch draws for itself below 768px, for the same reason. Its
               `border-r` — the seam BETWEEN Log in and Sign up — is a real
               seam and survives. */
            "flex h-full items-center [&_button]:border-l-0",
            isAuthenticated && "border-l border-border"
          )}
        >
          <AuthHeaderControls isMobile={isMobile} variant="binary" square />
        </div>
      </div>
    </div>
  );
}
