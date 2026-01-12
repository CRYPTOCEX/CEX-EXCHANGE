"use client";

/**
 * Analytics Overlay Component
 *
 * Full-screen overlay for displaying the analytics dashboard.
 * Replaces the modal version for a better UX.
 */

import { memo, useEffect, useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, BarChart2, RefreshCw, TrendingUp, TrendingDown, Activity } from "lucide-react";
import { AnalyticsDashboard } from "../analytics";
import { useBinaryStore } from "@/store/trade/use-binary-store";
import { useTranslations } from "next-intl";

// ============================================================================
// TYPES
// ============================================================================

interface AnalyticsOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  theme?: "dark" | "light";
  /** When true, disables enter/exit animations for instant overlay switching on mobile */
  isMobile?: boolean;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const AnalyticsOverlay = memo(function AnalyticsOverlay({
  isOpen,
  onClose,
  theme = "dark",
  isMobile = false,
}: AnalyticsOverlayProps) {
  const t = useTranslations("binary_components");
  const tCommon = useTranslations("common");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { fetchCompletedOrders, completedOrders } = useBinaryStore();

  // Handle escape key
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Refresh data
  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await fetchCompletedOrders();
    } finally {
      setTimeout(() => setIsRefreshing(false), 500);
    }
  };

  const subtitleClass = theme === "dark" ? "text-zinc-400" : "text-zinc-600";

  // Calculate quick stats
  const stats = useMemo(() => {
    if (completedOrders.length === 0) return { wins: 0, losses: 0, winRate: 0 };
    const wins = completedOrders.filter((o: any) => o.pnl > 0).length;
    const losses = completedOrders.filter((o: any) => o.pnl < 0).length;
    const winRate = completedOrders.length > 0 ? (wins / completedOrders.length) * 100 : 0;
    return { wins, losses, winRate };
  }, [completedOrders]);

  // On mobile, skip animations for instant overlay switching
  if (!isOpen) return null;

  // Wrapper component - use div on mobile (no animation), motion.div on desktop
  const Wrapper = isMobile ? 'div' : motion.div;
  const wrapperProps = isMobile ? {} : {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
    transition: { duration: 0.2 },
  };

  const BackdropWrapper = isMobile ? 'div' : motion.div;
  const backdropProps = isMobile ? {} : {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
  };

  const PanelWrapper = isMobile ? 'div' : motion.div;
  const panelProps = isMobile ? {} : {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
    transition: { duration: 0.15 },
  };

  const content = (
    <Wrapper
      {...wrapperProps}
      className="absolute inset-0 z-50 flex"
    >
      {/* Backdrop */}
      <BackdropWrapper
        {...backdropProps}
        className={`absolute inset-0 ${theme === "dark" ? "bg-black/70" : "bg-black/40"} backdrop-blur-sm`}
        onClick={onClose}
      />

      {/* Analytics Panel - Full width to fill chart area */}
      <PanelWrapper
        {...panelProps}
        className={`relative h-full w-full flex flex-col ${
          theme === "dark" ? "bg-zinc-900" : "bg-white"
        } shadow-2xl`}
      >
            {/* Header */}
            <div className={`flex items-center justify-between px-6 py-4 border-b ${
              theme === "dark" ? "border-zinc-800/50" : "border-gray-200/50"
            }`}>
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-xl ${theme === "dark" ? "bg-emerald-500/10" : "bg-emerald-50"}`}>
                  <BarChart2 size={20} className="text-emerald-500" />
                </div>
                <div>
                  <h2 className={`text-lg font-semibold ${theme === "dark" ? "text-white" : "text-zinc-900"}`}>
                    {tCommon("trading_analytics")}
                  </h2>
                  <p className={`text-xs ${theme === "dark" ? "text-zinc-500" : "text-gray-500"}`}>
                    {t("analyze_your_trading_performance")}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {/* Refresh button */}
                <button
                  onClick={handleRefresh}
                  disabled={isRefreshing}
                  className={`p-2 rounded-lg ${
                    theme === "dark"
                      ? "hover:bg-zinc-700/50"
                      : "hover:bg-gray-100"
                  } transition-colors disabled:opacity-50`}
                >
                  <RefreshCw
                    size={18}
                    className={`${subtitleClass} ${isRefreshing ? "animate-spin" : ""}`}
                  />
                </button>
                {/* Close button */}
                <button
                  onClick={onClose}
                  className={`p-2 rounded-lg transition-colors ${
                    theme === "dark" ? "hover:bg-zinc-700/50 text-zinc-400" : "hover:bg-gray-100 text-gray-500"
                  }`}
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Stats bar */}
            <div className={`px-6 py-2.5 border-b ${theme === "dark" ? "border-zinc-800/50 bg-zinc-800/50" : "border-gray-200/50 bg-gray-50"}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-5 text-[11px]">
                  <div className="flex items-center gap-1.5">
                    <Activity size={12} className="text-blue-500" />
                    <span className={subtitleClass}>{completedOrders.length} Trades</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <TrendingUp size={12} className="text-emerald-500" />
                    <span className={subtitleClass}>{stats.wins} Wins</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <TrendingDown size={12} className="text-red-500" />
                    <span className={subtitleClass}>{stats.losses} Losses</span>
                  </div>
                </div>
                <span className={`text-[10px] font-medium ${
                  stats.winRate >= 50 ? "text-emerald-500" : stats.winRate > 0 ? "text-red-500" : theme === "dark" ? "text-zinc-600" : "text-gray-300"
                }`}>
                  {stats.winRate.toFixed(1)}% Win Rate
                </span>
              </div>
            </div>

            {/* Analytics Dashboard - Takes full remaining height, with tabs shown separately */}
            <div className="flex-1 overflow-hidden">
              <AnalyticsDashboard
                theme={theme}
                className="h-full"
                hideHeader={true}
              />
            </div>
      </PanelWrapper>
    </Wrapper>
  );

  // On mobile, skip AnimatePresence to avoid exit animation delay
  if (isMobile) {
    return content;
  }

  return (
    <AnimatePresence>
      {isOpen && content}
    </AnimatePresence>
  );
});

export default AnalyticsOverlay;
