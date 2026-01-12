"use client";

/**
 * Landscape Layout Component
 *
 * Optimized layout for landscape orientation on mobile:
 * - Full-width chart
 * - Collapsible mini order panel on the right
 * - Quick trade buttons
 * - Minimal UI for maximum chart visibility
 */

import { useState, useCallback, memo, ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  TrendingUp,
  TrendingDown,
  ChevronLeft,
  ChevronRight,
  Settings,
  RotateCcw,
  Maximize2,
  Minimize2,
} from "lucide-react";
import { triggerHapticFeedback } from "../../hooks/use-gestures";
import { useTranslations } from "next-intl";

// ============================================================================
// TYPES
// ============================================================================

export interface LandscapeLayoutProps {
  /** Chart component */
  chart: ReactNode;
  /** Current price display */
  currentPrice: string;
  /** Price change percentage */
  priceChange: string;
  /** Is price positive change */
  isPriceUp: boolean;
  /** Symbol being traded */
  symbol: string;
  /** Current trade amount */
  amount: string;
  /** Selected expiry */
  expiry: string;
  /** Callback for RISE trade */
  onRise: () => void;
  /** Callback for FALL trade */
  onFall: () => void;
  /** Callback for fullscreen toggle */
  onFullscreen?: () => void;
  /** Is in fullscreen mode */
  isFullscreen?: boolean;
  /** Callback to exit landscape */
  onExitLandscape?: () => void;
  /** Win rate display */
  winRate?: string;
  /** Current payout percentage */
  payout?: string;
}

// ============================================================================
// COMPONENT
// ============================================================================

export const LandscapeLayout = memo(function LandscapeLayout({
  chart,
  currentPrice,
  priceChange,
  isPriceUp,
  symbol,
  amount,
  expiry,
  onRise,
  onFall,
  onFullscreen,
  isFullscreen,
  onExitLandscape,
  winRate = "0%",
  payout = "85%",
}: LandscapeLayoutProps) {
  const t = useTranslations("common");
  const [isPanelExpanded, setIsPanelExpanded] = useState(true);

  const togglePanel = useCallback(() => {
    triggerHapticFeedback("light");
    setIsPanelExpanded((prev) => !prev);
  }, []);

  const handleRise = useCallback(() => {
    triggerHapticFeedback("medium");
    onRise();
  }, [onRise]);

  const handleFall = useCallback(() => {
    triggerHapticFeedback("medium");
    onFall();
  }, [onFall]);

  return (
    <div className="fixed inset-0 bg-zinc-950 flex">
      {/* Chart Area */}
      <div className="flex-1 relative">
        {chart}

        {/* Top info bar - minimal */}
        <div className="absolute top-2 left-2 right-2 flex items-center justify-between pointer-events-none">
          <div className="pointer-events-auto flex items-center gap-3">
            {/* Symbol & Price */}
            <div className="bg-zinc-900/90 backdrop-blur-sm rounded-lg px-3 py-1.5">
              <div className="text-[10px] text-zinc-500">{symbol}</div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-white">{currentPrice}</span>
                <span className={`text-[10px] font-medium ${isPriceUp ? "text-emerald-500" : "text-red-500"}`}>
                  {priceChange}
                </span>
              </div>
            </div>

            {/* Win Rate */}
            <div className="bg-zinc-900/90 backdrop-blur-sm rounded-lg px-3 py-1.5">
              <div className="text-[10px] text-zinc-500">{t("win_rate")}</div>
              <div className="text-sm font-semibold text-white">{winRate}</div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="pointer-events-auto flex items-center gap-1">
            {onExitLandscape && (
              <button
                onClick={onExitLandscape}
                className="p-2 bg-zinc-900/90 backdrop-blur-sm rounded-lg text-zinc-400 hover:text-white transition-colors"
              >
                <RotateCcw size={16} />
              </button>
            )}
            {onFullscreen && (
              <button
                onClick={onFullscreen}
                className="p-2 bg-zinc-900/90 backdrop-blur-sm rounded-lg text-zinc-400 hover:text-white transition-colors"
              >
                {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Collapsible Panel Toggle */}
      <button
        onClick={togglePanel}
        className="absolute right-0 top-1/2 -translate-y-1/2 z-10 p-1 bg-zinc-800 rounded-l-lg text-zinc-400 hover:text-white transition-colors"
        style={{ right: isPanelExpanded ? "120px" : "0" }}
      >
        {isPanelExpanded ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
      </button>

      {/* Side Panel */}
      <AnimatePresence>
        {isPanelExpanded && (
          <motion.div
            className="w-[120px] bg-zinc-900 border-l border-zinc-800 flex flex-col"
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 120, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
          >
            {/* Trade Info */}
            <div className="p-2 border-b border-zinc-800 space-y-1">
              <div className="flex items-center justify-between text-[10px]">
                <span className="text-zinc-500">Amount</span>
                <span className="text-white font-medium">${amount}</span>
              </div>
              <div className="flex items-center justify-between text-[10px]">
                <span className="text-zinc-500">Expiry</span>
                <span className="text-white font-medium">{expiry}</span>
              </div>
              <div className="flex items-center justify-between text-[10px]">
                <span className="text-zinc-500">Payout</span>
                <span className="text-emerald-500 font-medium">{payout}</span>
              </div>
            </div>

            {/* Trade Buttons */}
            <div className="flex-1 flex flex-col gap-2 p-2">
              <button
                onClick={handleRise}
                className="flex-1 flex flex-col items-center justify-center gap-1 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 rounded-lg text-white font-semibold transition-colors active:scale-[0.98]"
              >
                <TrendingUp size={20} />
                <span className="text-xs">RISE</span>
              </button>

              <button
                onClick={handleFall}
                className="flex-1 flex flex-col items-center justify-center gap-1 bg-red-600 hover:bg-red-500 active:bg-red-700 rounded-lg text-white font-semibold transition-colors active:scale-[0.98]"
              >
                <TrendingDown size={20} />
                <span className="text-xs">FALL</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Collapsed Quick Trade - shown when panel is hidden */}
      <AnimatePresence>
        {!isPanelExpanded && (
          <motion.div
            className="absolute bottom-4 right-4 flex gap-2"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
          >
            <button
              onClick={handleRise}
              className="w-14 h-14 flex items-center justify-center bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 rounded-full text-white shadow-lg transition-all active:scale-95"
            >
              <TrendingUp size={24} />
            </button>
            <button
              onClick={handleFall}
              className="w-14 h-14 flex items-center justify-center bg-red-600 hover:bg-red-500 active:bg-red-700 rounded-full text-white shadow-lg transition-all active:scale-95"
            >
              <TrendingDown size={24} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});

// ============================================================================
// LANDSCAPE FULLSCREEN CHART
// ============================================================================

export interface LandscapeFullscreenChartProps {
  chart: ReactNode;
  symbol: string;
  currentPrice: string;
  priceChange: string;
  isPriceUp: boolean;
  onExit: () => void;
}

export const LandscapeFullscreenChart = memo(function LandscapeFullscreenChart({
  chart,
  symbol,
  currentPrice,
  priceChange,
  isPriceUp,
  onExit,
}: LandscapeFullscreenChartProps) {
  return (
    <div className="fixed inset-0 bg-zinc-950 z-50">
      {/* Chart fills everything */}
      <div className="absolute inset-0">{chart}</div>

      {/* Minimal overlay info */}
      <div className="absolute top-2 left-2 bg-zinc-900/80 backdrop-blur-sm rounded-lg px-3 py-1.5">
        <div className="text-[10px] text-zinc-500">{symbol}</div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-white">{currentPrice}</span>
          <span className={`text-[10px] font-medium ${isPriceUp ? "text-emerald-500" : "text-red-500"}`}>
            {priceChange}
          </span>
        </div>
      </div>

      {/* Exit button */}
      <button
        onClick={onExit}
        className="absolute top-2 right-2 p-2.5 bg-zinc-900/80 backdrop-blur-sm rounded-lg text-zinc-400 hover:text-white transition-colors active:scale-95"
      >
        <Minimize2 size={18} />
      </button>
    </div>
  );
});

export default LandscapeLayout;
