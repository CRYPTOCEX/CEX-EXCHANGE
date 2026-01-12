"use client";

import { useEffect, useRef, useCallback, useMemo } from "react";
import type { Symbol, TimeFrame, OrderSide } from "@/store/trade/use-binary-store";
import ChartSwitcher from "@/components/blocks/chart-switcher";

// Chart order type that combines both active and completed orders
// Supports all order types: RISE_FALL, HIGHER_LOWER, TOUCH_NO_TOUCH, CALL_PUT, TURBO
type BinaryOrderType = "RISE_FALL" | "HIGHER_LOWER" | "TOUCH_NO_TOUCH" | "CALL_PUT" | "TURBO";

interface ChartOrder {
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
  isDemo?: boolean;
  // Type-specific fields
  type?: BinaryOrderType;
  barrier?: number;          // For HIGHER_LOWER, TOUCH_NO_TOUCH, TURBO
  strikePrice?: number;      // For CALL_PUT
  payoutPerPoint?: number;   // For TURBO, CALL_PUT
}

interface ChartContainerProps {
  symbol: Symbol;
  timeFrame?: TimeFrame;
  orders?: ChartOrder[];
  expiryMinutes?: number;
  showExpiry?: boolean;
  timeframeDurations?: Array<{ value: TimeFrame; label: string }>;
  onChartContextReady?: (context: any) => void;
  positions?: any[];
  isMarketSwitching?: boolean;
  isMobile?: boolean;
  onPriceUpdate?: (price: number) => void;
  currency?: string; // Currency for displaying amounts (e.g., "USDT", "USD")
  // Limit order alert integration
  defaultOrderAmount?: number;
  onPlaceOrder?: (side: "RISE" | "FALL", amount: number, expiryMinutes: number) => Promise<boolean>;
  // External notification settings - opens parent's settings overlay instead of internal panel
  onOpenNotificationSettings?: () => void;
  // Callback to close parent overlays when opening chart's internal overlays
  onCloseParentOverlays?: () => void;
  // When true, closes all internal chart overlays (used when parent overlays open)
  closeInternalOverlays?: boolean;
}

export function ChartContainer({
  symbol,
  timeFrame = "1m",
  orders = [],
  expiryMinutes = 5,
  showExpiry = true,
  timeframeDurations,
  onChartContextReady,
  positions = [],
  isMarketSwitching = false,
  isMobile = false,
  onPriceUpdate,
  currency = "USD",
  defaultOrderAmount,
  onPlaceOrder,
  onOpenNotificationSettings,
  onCloseParentOverlays,
  closeInternalOverlays = false,
}: ChartContainerProps) {
  // Refs for cleanup and optimization
  const isMountedRef = useRef(true);
  const chartContextRef = useRef<any>(null);

  // Memoized chart props to prevent unnecessary re-renders
  const chartProps = useMemo(() => ({
    symbol,
    timeFrame,
    orders: orders.filter((order) => order.symbol === symbol),
    expiryMinutes,
    showExpiry,
    timeframeDurations,
    positions,
    isMarketSwitching,
    marketType: "spot" as const,
    isBinaryContext: true, // Enable binary chart type selection from settings
    currency, // Pass currency for order tooltips
    defaultOrderAmount, // Default amount for limit order alerts
    onPlaceOrder, // Callback to place orders from alert triggers
    isMobile, // Enable mobile touch gestures
    onOpenNotificationSettings, // Open parent settings overlay for notifications
    onCloseParentOverlays, // Close parent overlays when opening chart's internal overlays
    closeInternalOverlays, // Close chart overlays when parent overlays open
  }), [symbol, timeFrame, orders, expiryMinutes, showExpiry, timeframeDurations, positions, isMarketSwitching, currency, defaultOrderAmount, onPlaceOrder, isMobile, onOpenNotificationSettings, onCloseParentOverlays, closeInternalOverlays]);

  // Optimized chart context handler with proper cleanup
  const handleChartContextReady = useCallback((context: any) => {
    if (!isMountedRef.current) return;

    chartContextRef.current = context;

    // Extract price if available and notify parent
    if (context && typeof context.currentPrice === "number" && context.currentPrice > 0) {
      if (onPriceUpdate) {
        onPriceUpdate(context.currentPrice);
      }
    }

    // Call the original callback if provided
    if (onChartContextReady) {
      onChartContextReady(context);
    }
  }, [onPriceUpdate, onChartContextReady]);

  // Component lifecycle management
  useEffect(() => {
    isMountedRef.current = true;

    return () => {
      isMountedRef.current = false;
      chartContextRef.current = null;
    };
  }, []);

  // Render chart directly - ChartSwitcher and individual charts handle their own loading states
  return (
    <div data-tutorial="chart-area" className={`w-full h-full ${isMobile ? "z-0" : ""}`} style={{ position: "relative", width: "100%", height: "100%" }}>
      <div className="absolute inset-0">
        <ChartSwitcher
          {...chartProps}
          onChartContextReady={handleChartContextReady}
          onPriceUpdate={onPriceUpdate}
        />
      </div>
    </div>
  );
}

export default ChartContainer;
