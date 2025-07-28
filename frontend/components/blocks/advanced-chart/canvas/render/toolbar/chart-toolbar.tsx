"use client";

import type React from "react";
import { useState, useRef, useEffect } from "react";
import { BarChart2, Settings } from "lucide-react";
import { useChart } from "../../../context/chart-context";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { useTheme } from "next-themes";
import { TimeFrame } from "@/store/trade/use-binary-store";
import { useTranslations } from "next-intl";

// Fix the props interface to match what's being passed from ChartCanvas
interface ChartToolbarProps {
  symbol: string;
  onTimeframeClick: () => void;
  onIndicatorsClick: () => void;
  onSettingsClick: () => void;
}

// Update the component to use the chart context for timeFrame and other values
export const ChartToolbar: React.FC<ChartToolbarProps> = ({
  symbol,
  onTimeframeClick,
  onIndicatorsClick,
  onSettingsClick,
}) => {
  const t = useTranslations(
    "components/blocks/advanced-chart/canvas/render/toolbar/chart-toolbar"
  );
  const context = useChart();
  const timeFrame = context.timeFrame;
  const onTimeFrameChange = context.onTimeFrameChange;
  const indicators = context.indicators || [];
  // Use type assertion to access timeframeDurations
  const timeframeDurations = (context as any).timeframeDurations;

  const [showTimeframeMenu, setShowTimeframeMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  // Change the ref type to match the element it's attached to
  const buttonRef = useRef<HTMLButtonElement>(null);
  const { theme } = useTheme();
  const isDark = theme === "dark";

  // Count active indicators
  const activeIndicatorsCount = indicators.filter((ind) => ind.visible).length;

  // Format timeframe for display
  const formatTimeframe = (tf: string) => {
    if (!tf) return "1m";
    return tf;
  };

  // Available timeframes
  const availableTimeframes = timeframeDurations || [
    { value: "1m", label: "1m" },
    { value: "5m", label: "5m" },
    { value: "15m", label: "15m" },
    { value: "30m", label: "30m" },
    { value: "1h", label: "1h" },
    { value: "4h", label: "4h" },
    { value: "1d", label: "1d" },
    { value: "1w", label: "1w" },
  ];

  const handleTimeframeChange = (newTimeframe: TimeFrame) => {
            // Only log in development mode
        if (process.env.NODE_ENV === 'development') {
          console.log("🕒 Changing timeframe to:", newTimeframe);
        }

    if (onTimeFrameChange) {
      // Call the context's timeframe change handler
      onTimeFrameChange(newTimeframe);

      // Also notify parent component
      if (onTimeframeClick) {
        onTimeframeClick();
      }

      // Ensure we refresh data after timeframe change
      if (context.refreshData) {
        setTimeout(() => {
          // Only log in development mode
          if (process.env.NODE_ENV === 'development') {
            console.log("🔄 Refreshing data after timeframe change");
          }
          context.refreshData();
        }, 100);
      }
    }

    setShowTimeframeMenu(false);
  };

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        menuRef.current &&
        buttonRef.current &&
        !menuRef.current.contains(event.target as Node) &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setShowTimeframeMenu(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Theme-aware button classes
  const buttonClasses = cn(
    "w-8 h-8 flex items-center justify-center border backdrop-blur-md rounded-md transition-all duration-200 cursor-pointer",
    isDark
      ? "border-[#2A2E39]/70 bg-black/60 hover:bg-black/80 hover:border-[#2A2E39] text-zinc-200 hover:text-white"
      : "border-zinc-300 bg-white/80 hover:bg-zinc-100/90 hover:border-zinc-400 text-zinc-700 hover:text-zinc-900 shadow-sm hover:shadow-md"
  );

  // Theme-aware menu classes
  const menuClasses = cn(
    "absolute left-14 top-0 w-[220px] p-3 backdrop-blur-md border shadow-xl rounded-lg z-50 overflow-hidden",
    isDark
      ? "bg-black/95 border-zinc-800 text-white"
      : "bg-white/95 border-zinc-200 text-zinc-800"
  );

  // Theme-aware timeframe grid item classes
  const getTimeframeItemClasses = (isActive: boolean) =>
    cn(
      "flex items-center justify-center p-1.5 rounded text-xs font-medium transition-all cursor-pointer hover:scale-105",
      isActive
        ? "bg-green-600 text-white shadow-md hover:bg-green-500"
        : isDark
          ? "bg-zinc-900 text-zinc-300 hover:bg-zinc-800 hover:text-white border border-zinc-800 hover:border-zinc-700"
          : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200 hover:text-zinc-900 border border-zinc-200 hover:border-zinc-300"
    );

  return (
    <>
      {/* Left floating toolbar - transparent buttons */}
      <div className="absolute left-4 top-1/4 flex flex-col space-y-3 z-10">
        {/* Timeframe button with popover */}
        <div className="relative">
          <button
            ref={buttonRef}
            onClick={() => {
              setShowTimeframeMenu(!showTimeframeMenu);
              if (showTimeframeMenu && onTimeframeClick) {
                onTimeframeClick();
              }
            }}
            className={buttonClasses}
          >
            <span className="text-xs font-medium">
              {formatTimeframe(timeFrame)}
            </span>
          </button>

          {/* Timeframe popover with animation - adjust positioning */}
          <AnimatePresence>
            {showTimeframeMenu && (
              <motion.div
                ref={menuRef}
                initial={{ opacity: 0, scale: 0.9, x: -10 }}
                animate={{ opacity: 1, scale: 1, x: 0 }}
                exit={{ opacity: 0, scale: 0.9, x: -10 }}
                transition={{
                  duration: 0.2,
                  type: "spring",
                  stiffness: 300,
                  damping: 25,
                }}
                className={menuClasses}
                style={{
                  boxShadow: isDark
                    ? "0 10px 25px -5px rgba(0, 0, 0, 0.8), 0 8px 10px -6px rgba(0, 0, 0, 0.6)"
                    : "0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)",
                }}
              >
                <div
                  className={cn(
                    "mb-2 pb-2 border-b",
                    isDark ? "border-zinc-800" : "border-zinc-200"
                  )}
                >
                  <h3
                    className={cn(
                      "text-xs font-medium",
                      isDark ? "text-zinc-400" : "text-zinc-500"
                    )}
                  >
                    {t("select_timeframe")}
                  </h3>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {availableTimeframes.map((tf) => (
                    <motion.div
                      key={tf.value}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      className={getTimeframeItemClasses(
                        timeFrame === tf.value
                      )}
                      onClick={() =>
                        handleTimeframeChange(tf.value as TimeFrame)
                      }
                    >
                      {tf.label}
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Indicators button with count */}
        <div className="relative">
          <button onClick={onIndicatorsClick} className={buttonClasses}>
            <BarChart2 size={18} />
            {activeIndicatorsCount > 0 && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-orange-500 flex items-center justify-center text-white text-xs font-medium shadow-md"
              >
                {activeIndicatorsCount}
              </motion.div>
            )}
          </button>
        </div>

        {/* Settings button */}
        <button onClick={onSettingsClick} className={buttonClasses}>
          <Settings size={18} />
        </button>
      </div>
    </>
  );
};

export default ChartToolbar;
