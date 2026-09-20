"use client";

import { useMemo, useCallback, useState, useEffect } from "react";
import { useTheme } from "next-themes";
import dynamic from "next/dynamic";
import { TradingViewChart } from "@/components/blocks/tradingview-chart";
import { useTradingViewLoader } from "@/components/blocks/tradingview-chart/script-loader";
import type { Symbol, TimeFrame } from "@/store/trade/use-binary-store";
import { useBinaryStore } from "@/store/trade/use-binary-store";
import { useConfigStore } from "@/store/config";
import { useUserStore } from "@/store/user";
import type { MarketMetadata } from "@/lib/precision-utils";
import { useTranslations } from "next-intl";
import { calculateNextExpiryTime } from "@/utils/time-sync";
import { getProfitPercentageForType } from "@/types/binary-trading";

// ============================================================================
// CHART ENGINE DYNAMIC IMPORT
// Chart Engine is an optional addon - determined at build time
// When not installed, we import from a stub that always exists
// ============================================================================

// Check if chart engine addon is installed (set at build time in next.config.js)
const HAS_CHART_ENGINE = process.env.NEXT_PUBLIC_HAS_CHART_ENGINE === "true";

/**
 * The chart panel while the engine chunk is still arriving.
 *
 * `loading: () => null` rendered NOTHING for the whole download, and the chunk
 * this waits on is ~1.2 MB — so on a cold cache or a slow connection the panel
 * that dominates the trading screen was blank, with no spinner and no text, for
 * as long as that took. Blank is the one state a user cannot distinguish from
 * broken, and it is the same panel that shows a spinner while the TradingView
 * script loads, so the two waiting states also disagreed with each other.
 *
 * Deliberately NOT the chart engine's own skeleton components: they would ship
 * inside the very chunk being waited on, so they cannot paint until the wait is
 * over. This has to be markup that is already in the page, which means a few
 * duplicated lines here. It matches the TradingView waiting state below
 * verbatim so the panel looks the same whichever engine it is waiting for.
 *
 * `useTranslations` is not available at module scope, so the label is looked up
 * inside the component. Both keys already exist in `components_blocks`; nothing
 * new is added to the catalogues.
 */
function ChartEngineLoading() {
  const t = useTranslations("components_blocks");
  return (
    <div className="w-full h-full flex-1 min-h-0 flex items-center justify-center bg-card">
      <div className="text-center px-4">
        <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4" />
        <p className="text-sm text-muted-foreground">{t("loading_data")}…</p>
      </div>
    </div>
  );
}

// Dynamically import chart engine from stub location
// When addon is installed, next.config.js aliases this to the real module
// When not installed, the stub returns a null component
const ChartEngineDynamic = dynamic(
  () => import("@/lib/stubs/chart-engine-stub").then((mod) => mod.default),
  {
    ssr: false,
    loading: () => <ChartEngineLoading />,
  }
);

// Define the BinaryOrder type locally to avoid import errors when chart-engine doesn't exist
// Supports all order types: RISE_FALL, HIGHER_LOWER, TOUCH_NO_TOUCH, CALL_PUT, TURBO
type OrderSide = "RISE" | "FALL" | "HIGHER" | "LOWER" | "TOUCH" | "NO_TOUCH" | "CALL" | "PUT" | "UP" | "DOWN";
type BinaryOrderType = "RISE_FALL" | "HIGHER_LOWER" | "TOUCH_NO_TOUCH" | "CALL_PUT" | "TURBO";

export interface BinaryOrder {
  id: string;
  symbol: string;
  side: OrderSide;
  amount: number;
  entryPrice: number;
  entryTime: number;
  expiryTime: number;
  closePrice?: number;
  status: "PENDING" | "WIN" | "LOSS";
  profit?: number;
  profitPercentage?: number;
  isDemo: boolean;
  // Type-specific fields
  type?: BinaryOrderType;
  barrier?: number;          // For HIGHER_LOWER, TOUCH_NO_TOUCH, TURBO
  strikePrice?: number;      // For CALL_PUT
  payoutPerPoint?: number;   // For TURBO, CALL_PUT
}

// Define SpotOrder type for spot/futures trading
type SpotOrderSide = "BUY" | "SELL";
type SpotOrderType = "MARKET" | "LIMIT" | "STOP" | "STOP_LIMIT";
type SpotOrderStatus = "OPEN" | "FILLED" | "PARTIALLY_FILLED" | "CANCELLED" | "EXPIRED" | "REJECTED";

export interface SpotOrder {
  id: string;
  symbol: string;
  side: SpotOrderSide;
  type: SpotOrderType;
  amount: number;
  price: number;
  filledAmount?: number;
  filledPrice?: number;
  status: SpotOrderStatus;
  createdAt: number;
  filledAt?: number;
  stopPrice?: number;
  takeProfitPrice?: number;
  stopLossPrice?: number;
  isDemo?: boolean;
  fee?: number;
  total?: number;
}

// Trading mode type. Structurally duplicated from the chart-engine addon
// rather than imported, because the addon may not be installed — keep the
// two in step by hand.
type TradingMode = "binary" | "spot" | "futures" | "algo";

// ============================================================================
// CHART ENGINE - OPTIONAL ADDON
// Chart Engine is loaded dynamically at runtime only if the addon is installed
// ============================================================================

// ============================================================================
// COMPONENT PROPS
// ============================================================================

interface ChartSwitcherProps {
  symbol: Symbol;
  timeFrame: TimeFrame;
  /**
   * The timeframes the market can be charted at. Forwarded to the chart
   * engine, which offers only these, steps over the rest when zooming and
   * clamps a persisted choice into the set. Absent = every timeframe. Not
   * forwarded to TradingView, whose own datafeed decides what it can serve.
   */
  timeFrames?: TimeFrame[];
  orders?: any[];
  expiryMinutes?: number;
  showExpiry?: boolean;
  timeframeDurations?: Array<{ value: TimeFrame; label: string }>;
  positions?: any[];
  isMarketSwitching?: boolean;
  onChartContextReady?: (context: any) => void;
  // Kept in step with the chart-engine's own MarketType union
  // (components/(ext)/chart-engine/types/index.ts). This prop is forwarded
  // straight through, so a value the engine accepts but this narrower copy does
  // not is a compile error at the call site rather than here — which is how
  // `forex` came to be missing from use-mtf-data.ts's endpoint chain while every
  // other copy had it.
  marketType?: "spot" | "eco" | "futures" | "forex" | "dex";
  onPriceUpdate?: (price: number) => void;
  metadata?: MarketMetadata;
  isBinaryContext?: boolean; // When true, uses binaryChartType setting (CHART_ENGINE or TRADINGVIEW)
  currency?: string; // Currency for displaying amounts (e.g., "USD", "EUR")
  // Limit order alert integration
  defaultOrderAmount?: number; // Default amount for limit orders attached to alerts
  onPlaceOrder?: (side: "RISE" | "FALL", amount: number, expiryMinutes: number) => Promise<boolean>;
  // Mobile support
  isMobile?: boolean; // Enable mobile-specific touch gestures
  // External notification settings - opens parent's settings overlay instead of internal panel
  onOpenNotificationSettings?: () => void;
  // Callback to close parent overlays when opening chart's internal overlays
  onCloseParentOverlays?: () => void;
  // When true, closes all internal chart overlays (used when parent overlays open)
  closeInternalOverlays?: boolean;
  // Spot/Futures trading context
  isSpotContext?: boolean; // When true, uses spotSettings.chartType
  isFuturesContext?: boolean; // When true, uses futuresSettings.chartType
  spotOrders?: SpotOrder[]; // Spot/Futures orders to display
  showSpotOrders?: boolean; // Whether to display spot orders
  onPlaceSpotOrder?: (side: SpotOrderSide, type: SpotOrderType, amount: number, price?: number) => Promise<boolean>;
  // Algorithmic (trading-bot) context
  isAlgoContext?: boolean; // When true, renders the bot cockpit
  algoState?: any; // One bot's chart state (see trading-bot chart-state endpoint)
  showAlgoLayers?: boolean;
  /*
    FIVE verbs, not four. `close` was missing.

    The bot cockpit inside the chart engine offers `close` — flatten every open
    position at market — whenever the bot holds inventory (`algo/bot-panel.tsx`
    adds it to the action list and puts it behind a confirm), and the engine's
    own `AlgoControlAction` has always included it. This prop type listed only
    the four LIFECYCLE verbs, so it disagreed with the component it forwards to.

    Nothing broke at runtime, because the handler this receives
    (`useBotTerminal.control`) does implement `close` and routes it to
    `/close-position`. What broke was the type contract in both directions: a
    correct handler was rejected, and a handler that genuinely could not flatten
    a position would have been accepted. The mismatch was invisible until
    `frontend/tsconfig.json` started resolving the engine's real declarations
    instead of the `FC<any>` stub.

    Spelled out rather than imported from the addon on purpose — this file must
    still type-check on an install where the chart engine is not present.
  */
  onBotControl?: (action: "start" | "pause" | "resume" | "stop" | "close") => Promise<boolean>;
  onBotRefresh?: () => void;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function ChartSwitcher({
  symbol,
  timeFrame,
  timeFrames,
  orders = [],
  expiryMinutes = 5,
  showExpiry = true,
  timeframeDurations,
  positions,
  isMarketSwitching = false,
  onChartContextReady,
  marketType = "spot",
  onPriceUpdate,
  metadata,
  isBinaryContext = false,
  currency = "USD",
  defaultOrderAmount,
  onPlaceOrder,
  isMobile = false,
  onOpenNotificationSettings,
  onCloseParentOverlays,
  closeInternalOverlays = false,
  // Spot/Futures context props
  isSpotContext = false,
  isFuturesContext = false,
  spotOrders = [],
  showSpotOrders = true,
  onPlaceSpotOrder,
  isAlgoContext = false,
  algoState = null,
  showAlgoLayers = true,
  onBotControl,
  onBotRefresh,
}: ChartSwitcherProps) {

  // Determine trading mode based on context
  const tradingMode: TradingMode = useMemo(() => {
    // Checked first: a bot terminal is also viewing an ecosystem spot market,
    // so it would otherwise be captured by isSpotContext and lose its cockpit.
    if (isAlgoContext) return "algo";
    if (isBinaryContext) return "binary";
    if (isFuturesContext) return "futures";
    if (isSpotContext) return "spot";
    // Default based on marketType
    if (marketType === "futures") return "futures";
    return "spot";
  }, [
    isAlgoContext,
    isBinaryContext,
    isFuturesContext,
    isSpotContext,
    marketType,
  ]);
  const t = useTranslations("components_blocks");

  // Theme handling - pass theme as prop to chart-engine like TradingView does
  // This ensures the chart re-renders correctly when theme changes
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  // Only use resolved theme after mount to avoid hydration mismatch
  const chartTheme: "dark" | "light" = mounted && resolvedTheme ? (resolvedTheme === "dark" ? "dark" : "light") : "dark";
  const { isLoaded: isTradingViewLoaded, isLoading: isTradingViewLoading, error: tradingViewError } = useTradingViewLoader();

  // Get binary chart type setting from the binary store
  // Use a specific selector to only subscribe to chartType changes, not the entire settings object
  // This prevents re-renders when other settings change but chartType stays the same
  const binaryChartType = useBinaryStore((state) => state.binarySettings?.display?.chartType);
  // Only subscribe to whether settings have been loaded (not null), NOT to isLoadingSettings
  // This prevents chart remount during the 30-second settings refresh cycle
  const binarySettingsLoaded = useBinaryStore((state) => state.binarySettings !== null);

  // Get system settings for spot trading chart configuration
  // Use specific selector to only subscribe to spotChartEngine changes, not the entire settings object
  const spotChartEngine = useConfigStore((state) => state.settings?.spotChartEngine);

  /* Undefined while signed out or still hydrating, which is exactly what the
     engine wants: it then uses the unscoped keys every earlier build wrote, so
     nothing already saved is orphaned. */
  const workspaceId = useUserStore((state) => state.user?.id);

  /*
    THE PAYOUT THE STRATEGY BACKTESTER SETTLES AT.

    `runStrategyBacktest` settles a winning binary trade at `stake * payout` and
    fell back to a hardcoded 0.85 because nothing ever passed one. A platform
    paying 70% therefore had its strategies backtested at 85% - which flips the
    sign of the edge on any strategy between those two break-evens, and the
    panel showed the result as this platform's own equity curve.

    Resolved here rather than inside the addon because it is the binary store
    that knows it, and the addon must not import the host's stores. It is
    per-duration AND per-order-type, so both selections are read; an unresolved
    one leaves it undefined and the addon keeps its own default.
  */
  const binaryDurations = useBinaryStore((state) => state.binaryDurations);
  const selectedExpiryMinutes = useBinaryStore((state) => state.selectedExpiryMinutes);
  const selectedOrderType = useBinaryStore((state) => state.selectedOrderType);
  const payoutPercent = useMemo(() => {
    if (!isBinaryContext) return undefined;
    const duration = binaryDurations.find(
      (d) => d.duration === selectedExpiryMinutes
    );
    if (!duration) return undefined;
    const percent = getProfitPercentageForType(duration, selectedOrderType);
    return Number.isFinite(percent) && percent > 0 ? percent : undefined;
  }, [isBinaryContext, binaryDurations, selectedExpiryMinutes, selectedOrderType]);
  const systemSettingsFetched = useConfigStore((state) => state.settingsFetched);

  // Chart Engine availability is determined at build time via env var
  // No need for runtime detection - webpack aliases handle it
  const isChartEngineAvailable = HAS_CHART_ENGINE;

  // CRITICAL: All hooks must be called BEFORE any conditional returns
  // This ensures hooks are called in the same order on every render

  // Memoize callbacks to prevent re-renders from prop changes
  const handleBinaryChartReady = useCallback(() => {
    if (onChartContextReady) {
      onChartContextReady({ type: "chart-engine", symbol });
    }
  }, [onChartContextReady, symbol]);

  // Empty handler - stable reference
  const handleTimeFrameChange = useCallback(() => {
    // Handle timeframe change if needed
  }, []);

  // Memoize the callbacks object to prevent re-renders
  const binaryCallbacks = useMemo(() => ({
    onReady: handleBinaryChartReady,
    onPriceUpdate: onPriceUpdate,
    onTimeFrameChange: handleTimeFrameChange,
  }), [handleBinaryChartReady, onPriceUpdate, handleTimeFrameChange]);

  // Memoize binary orders conversion
  // Preserves all order sides (RISE, FALL, HIGHER, LOWER, TOUCH, NO_TOUCH, CALL, PUT, UP, DOWN)
  // and type-specific fields (barrier, strikePrice, payoutPerPoint)
  const binaryOrders = useMemo((): BinaryOrder[] => {
    return orders.map((order) => ({
      id: order.id || String(Date.now()),
      symbol: order.symbol || symbol,
      side: order.side || "RISE", // Preserve original side, default to RISE if missing
      amount: order.amount || 0,
      entryPrice: order.entryPrice || order.price || 0,
      entryTime: order.entryTime || order.createdAt || Date.now(),
      expiryTime: order.expiryTime || order.closedAt || calculateNextExpiryTime(expiryMinutes).getTime(),
      closePrice: order.closePrice,
      status: order.status || "PENDING",
      profit: order.profit,
      profitPercentage: order.profitPercentage,
      isDemo: Boolean(order.isDemo),
      // Type-specific fields for different order types
      type: order.type,
      barrier: order.barrier,
      strikePrice: order.strikePrice,
      payoutPerPoint: order.payoutPerPoint,
    }));
  }, [orders, symbol, expiryMinutes]);

  // Determine if we should use Chart Engine based on context and settings
  // IMPORTANT: This must be called BEFORE any conditional returns to follow React hooks rules
  // For binary context: use binaryChartType (already extracted via selector)
  // For spot/futures context: use spotChartEngine (already extracted via selector)
  const shouldUseChartEngine = useMemo(() => {
    if (isBinaryContext) {
      // Use typed chartType from display settings (already extracted via specific selector)
      // Default to TRADINGVIEW if not set (safer fallback - always works without addon)
      const chartType = binaryChartType || "TRADINGVIEW";
      return chartType === "CHART_ENGINE";
    }
    // The bot cockpit exists only in the chart engine — TradingView cannot draw
    // a strategy's ladder — so algo mode never consults the operator's
    // preference. If the addon is missing the caller falls back to TradingView
    // below and simply loses the overlays, which is the honest degradation.
    if (isAlgoContext) return true;
    /*
      DEX IS NOT A PREFERENCE, AND FALLING THROUGH HERE DREW THE WRONG MARKET.

      Every branch above and below this one asks which renderer the operator
      prefers, because both can draw the market in question. For an on-chain
      pair only one can: candles come from `/api/dex/chart`, built from swap
      events on a specific pool on a specific chain, and TradingView has no DEX
      datafeed at all. Its own component says so in the comment beside its
      `marketType` prop — and then asserts "the Swap terminal uses the
      chart-engine renderer, not this one", which is exactly what was NOT
      happening.

      The Swap terminal passes `marketType="dex"` and none of the four context
      flags, so this hook fell through to `return false` and the terminal was
      hardcoded to TradingView no matter what `spotChartEngine` said. Worse than
      blank: TradingView's datafeed switch has no `dex` case either, so a pair
      like WETH/USDC was resolved against `/api/exchange/chart` — a CENTRALISED
      exchange feed for a token pair the user is trading in a pool. The chart
      then shows a real, moving, plausible price for a DIFFERENT MARKET than the
      one the swap executes against, and any pair the CEX does not list simply
      renders nothing.

      So DEX takes the algo treatment rather than the spot treatment: always the
      engine. The difference is what happens when the addon is absent, and it
      cannot be algo's — see the refusal below.
    */
    if (marketType === "dex") return true;
    // For spot/futures, check system settings for chart engine preference
    if (isSpotContext || isFuturesContext) {
      // spotChartEngine values: "TRADINGVIEW" or "CHART_ENGINE"
      const chartEngine = spotChartEngine || "TRADINGVIEW";
      return chartEngine === "CHART_ENGINE";
    }
    return false;
  }, [
    isAlgoContext,
    isBinaryContext,
    isSpotContext,
    isFuturesContext,
    binaryChartType,
    spotChartEngine,
  ]);

  // Wait for settings to be fetched before deciding which chart to load
  // CRITICAL: Only wait for INITIAL settings load, NOT refreshes
  // We check if settings have ever been loaded (!binarySettingsLoaded), not if they're currently loading
  // This prevents the chart from unmounting during the 30-second settings refresh cycle
  // For binary context, wait for binary settings to be loaded (not null)
  // For spot/futures, wait for system settings to be fetched
  const isWaitingForSettings = isBinaryContext
    ? !binarySettingsLoaded  // Only check if settings exist, NOT if refreshing
    : (isSpotContext || isFuturesContext) && !systemSettingsFetched;
  if (isWaitingForSettings) {
    return (
      <div className="w-full h-full flex-1 min-h-0 flex items-center justify-center bg-card">
        <div className="text-center px-4">
          <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-sm text-muted-foreground">{t("loading_chart_settings")}…</p>
        </div>
      </div>
    );
  }

  // If Chart Engine should be used AND is available (determined at build time)
  if (shouldUseChartEngine && isChartEngineAvailable) {
    // Get price precision from market metadata for chart display
    const priceDecimals = metadata?.precision?.price ?? 2;

    return (
      <ChartEngineDynamic
        key={`chart-engine-${symbol}-${tradingMode}-${marketType}`}
        symbol={symbol}
        timeFrame={timeFrame}
        timeFrames={timeFrames}
        tradingMode={tradingMode}
        marketType={marketType}
        // Theme - passed from parent to ensure proper re-render on theme change
        theme={chartTheme}
        // Binary trading props
        orders={binaryOrders}
        expiryMinutes={expiryMinutes}
        showExpiry={showExpiry}
        payoutPercent={payoutPercent}
        /* WHOSE WORKSPACE THIS IS. The chart persists drawings, indicators,
           templates, alerts and favourites in localStorage, and it used fixed
           keys - so on a shared machine the second account to sign in opened the
           chart onto the first one's markup. Resolved here because the user
           store is the host's, and the addon must not import it. */
        workspaceId={workspaceId}
        // Spot/Futures trading props
        spotOrders={spotOrders}
        showSpotOrders={showSpotOrders}
        // Algorithmic trading props
        algoState={algoState}
        showAlgoLayers={showAlgoLayers}
        onBotControl={onBotControl}
        onBotRefresh={onBotRefresh}
        // Common props
        isMarketSwitching={isMarketSwitching}
        currency={currency}
        decimals={priceDecimals}
        callbacks={binaryCallbacks}
        defaultOrderAmount={defaultOrderAmount}
        onPlaceOrder={onPlaceOrder}
        onPlaceSpotOrder={onPlaceSpotOrder}
        isMobile={isMobile}
        onOpenNotificationSettings={onOpenNotificationSettings}
        onCloseParentOverlays={onCloseParentOverlays}
        closeInternalOverlays={closeInternalOverlays}
      />
    );
  }

  /*
    A DEX PAIR MUST NOT FALL BACK TO TRADINGVIEW. It has to say so instead.

    Everywhere else the fallback is honest degradation: the market is the same,
    the drawing is just less capable. For an on-chain pair it is not — the
    fallback resolves the symbol against a centralised exchange feed and draws a
    DIFFERENT MARKET at a different price, which is worse than drawing nothing
    because it looks correct. A user comparing that line against their quote has
    no way to tell the two apart.

    Placed BEFORE the shared warning below so the dex case never reaches the
    fall-through, and stated as an operator action rather than a stack trace.
  */
  if (marketType === "dex" && !isChartEngineAvailable) {
    return (
      <div className="w-full h-full flex-1 min-h-0 flex items-center justify-center bg-card">
        <div className="text-center px-6 max-w-sm">
          <p className="text-sm text-muted-foreground">
            {t("dex_chart_requires_chart_engine")}
          </p>
        </div>
      </div>
    );
  }

  // If Chart Engine is selected but addon is not available, show warning and fall back to TradingView
  if (shouldUseChartEngine && !isChartEngineAvailable) {
    if (typeof window !== "undefined" && !(window as any).__chartEngineWarningShown) {
      console.warn(
        "[ChartSwitcher] Chart Engine addon not installed. Falling back to TradingView. " +
        "To use Chart Engine, install the chart-engine addon in components/(ext)/chart-engine"
      );
      (window as any).__chartEngineWarningShown = true;
    }
  }
  // Fall through to TradingView

  // TradingView chart for spot/futures trading (always) and binary (when selected or fallback)
  // Show loading while TradingView script is loading
  if (isTradingViewLoading || (!isTradingViewLoaded && !tradingViewError)) {
    return (
      <div className="w-full h-full flex-1 min-h-0 flex items-center justify-center bg-card">
        <div className="text-center px-4">
          <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-sm text-muted-foreground">{t("loading_tradingview_chart")}…</p>
        </div>
      </div>
    );
  }

  // Show error state if TradingView failed to load
  if (tradingViewError) {
    return (
      <div className="w-full h-full flex-1 min-h-0 flex items-center justify-center bg-card">
        <div className="text-center px-4">
          <p className="text-destructive text-sm mb-2">{t("failed_to_load_tradingview")}</p>
          <p className="text-xs text-muted-foreground">{tradingViewError.message}</p>
        </div>
      </div>
    );
  }

  // TradingView is loaded and ready
  return (
    <TradingViewChart
      key={`tradingview-${symbol}-${marketType}`}
      symbol={symbol}
      timeFrame={timeFrame}
      orders={orders}
      expiryMinutes={expiryMinutes}
      showExpiry={showExpiry}
      onChartContextReady={onChartContextReady}
      marketType={marketType}
      onPriceUpdate={onPriceUpdate}
      metadata={metadata}
      isMarketSwitching={isMarketSwitching}
    />
  );
}
