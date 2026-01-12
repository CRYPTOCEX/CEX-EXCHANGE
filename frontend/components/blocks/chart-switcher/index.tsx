"use client";

import { useMemo, useCallback, useState, useEffect } from "react";
import { useTheme } from "next-themes";
import dynamic from "next/dynamic";
import { TradingViewChart } from "@/components/blocks/tradingview-chart";
import { useTradingViewLoader } from "@/components/blocks/tradingview-chart/script-loader";
import type { Symbol, TimeFrame } from "@/store/trade/use-binary-store";
import { useBinaryStore } from "@/store/trade/use-binary-store";
import { useConfigStore } from "@/store/config";
import type { MarketMetadata } from "@/lib/precision-utils";
import { useTranslations } from "next-intl";
import { calculateNextExpiryTime } from "@/utils/time-sync";

// ============================================================================
// CHART ENGINE DYNAMIC IMPORT
// Chart Engine is an optional addon - determined at build time
// When not installed, we import from a stub that always exists
// ============================================================================

// Check if chart engine addon is installed (set at build time in next.config.js)
const HAS_CHART_ENGINE = process.env.NEXT_PUBLIC_HAS_CHART_ENGINE === "true";

// Dynamically import chart engine from stub location
// When addon is installed, next.config.js aliases this to the real module
// When not installed, the stub returns a null component
const ChartEngineDynamic = dynamic(
  () => import("@/lib/stubs/chart-engine-stub").then((mod) => mod.default),
  {
    ssr: false,
    loading: () => null,
  }
);

// Define the BinaryOrder type locally to avoid import errors when chart-engine doesn't exist
// Supports all order types: RISE_FALL, HIGHER_LOWER, TOUCH_NO_TOUCH, CALL_PUT, TURBO
type OrderSide = "RISE" | "FALL" | "HIGHER" | "LOWER" | "TOUCH" | "NO_TOUCH" | "CALL" | "PUT" | "UP" | "DOWN";
type BinaryOrderType = "RISE_FALL" | "HIGHER_LOWER" | "TOUCH_NO_TOUCH" | "CALL_PUT" | "TURBO";

interface BinaryOrder {
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

interface SpotOrder {
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

// Trading mode type
type TradingMode = "binary" | "spot" | "futures";

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
  orders?: any[];
  expiryMinutes?: number;
  showExpiry?: boolean;
  timeframeDurations?: Array<{ value: TimeFrame; label: string }>;
  positions?: any[];
  isMarketSwitching?: boolean;
  onChartContextReady?: (context: any) => void;
  marketType?: "spot" | "eco" | "futures";
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
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function ChartSwitcher({
  symbol,
  timeFrame,
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
}: ChartSwitcherProps) {

  // Determine trading mode based on context
  const tradingMode: TradingMode = useMemo(() => {
    if (isBinaryContext) return "binary";
    if (isFuturesContext) return "futures";
    if (isSpotContext) return "spot";
    // Default based on marketType
    if (marketType === "futures") return "futures";
    return "spot";
  }, [isBinaryContext, isFuturesContext, isSpotContext, marketType]);
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
    // For spot/futures, check system settings for chart engine preference
    if (isSpotContext || isFuturesContext) {
      // spotChartEngine values: "TRADINGVIEW" or "CHART_ENGINE"
      const chartEngine = spotChartEngine || "TRADINGVIEW";
      return chartEngine === "CHART_ENGINE";
    }
    return false;
  }, [isBinaryContext, isSpotContext, isFuturesContext, binaryChartType, spotChartEngine]);

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
      <div className="w-full h-full flex-1 min-h-0 flex items-center justify-center bg-white dark:bg-zinc-950">
        <div className="text-center px-4">
          <div className="animate-spin h-8 w-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">{t("loading_chart_settings_ellipsis")}</p>
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
        tradingMode={tradingMode}
        marketType={marketType}
        // Theme - passed from parent to ensure proper re-render on theme change
        theme={chartTheme}
        // Binary trading props
        orders={binaryOrders}
        expiryMinutes={expiryMinutes}
        showExpiry={showExpiry}
        // Spot/Futures trading props
        spotOrders={spotOrders}
        showSpotOrders={showSpotOrders}
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
      <div className="w-full h-full flex-1 min-h-0 flex items-center justify-center bg-white dark:bg-zinc-950">
        <div className="text-center px-4">
          <div className="animate-spin h-8 w-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">{t("loading_tradingview_chart_ellipsis")}</p>
        </div>
      </div>
    );
  }

  // Show error state if TradingView failed to load
  if (tradingViewError) {
    return (
      <div className="w-full h-full flex-1 min-h-0 flex items-center justify-center bg-white dark:bg-zinc-950">
        <div className="text-center px-4">
          <p className="text-red-500 text-sm mb-2">{t("failed_to_load_tradingview")}</p>
          <p className="text-xs text-zinc-600 dark:text-zinc-400">{tradingViewError.message}</p>
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
