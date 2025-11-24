"use client";

import type React from "react";
import { useEffect, useRef } from "react";
import {
  Grid,
  LineChart,
  CandlestickChart,
  BarChart3,
  AreaChart,
} from "lucide-react";
import { useChart } from "../../../context/chart-context";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { useTheme } from "next-themes";
import { useTranslations } from "next-intl";

export const SettingsPanel: React.FC = () => {
  const t = useTranslations(
    "components/blocks/advanced-chart/canvas/render/toolbar/settings-panel"
  );
  const {
    chartType,
    setChartType,
    showGrid,
    toggleGrid,
    setShowSettingsPanel,
    showVolume,
    toggleVolume,
  } = useChart();
  const panelRef = useRef<HTMLDivElement>(null);
  const { theme } = useTheme();
  const isDark = theme === "dark";

  // Handle click outside to close panel
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        panelRef.current &&
        !panelRef.current.contains(event.target as Node)
      ) {
        setShowSettingsPanel(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [setShowSettingsPanel]);

  // Theme-aware panel classes
  const panelClasses = cn(
    "absolute left-16 top-[120px] w-[280px] backdrop-blur-md border rounded-lg shadow-xl z-50",
    isDark ? "bg-black/90 border-zinc-800" : "bg-white/95 border-zinc-200"
  );

  // Theme-aware section header classes
  const sectionHeaderClasses = cn(
    "text-xs font-medium backdrop-blur-sm p-2 rounded-md flex items-center gap-1.5",
    isDark ? "bg-black/50 text-zinc-300" : "bg-zinc-100/50 text-zinc-700"
  );

  return (
    <motion.div
      ref={panelRef}
      className={panelClasses}
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -10 }}
      transition={{ duration: 0.2 }}
    >
      <div className="p-3 space-y-3">
        {/* Chart Type */}
        <div className="space-y-2">
          <h4 className={sectionHeaderClasses}>
            <LineChart size={14} className="text-green-400" />
            {t("chart_type")}
          </h4>
          <div className="grid grid-cols-2 gap-2">
            <ChartTypeButton
              type="candlestick"
              label="Candlestick"
              icon={<CandlestickChart size={16} />}
              isActive={chartType === "candlestick"}
              onClick={() => setChartType("candlestick")}
              isDark={isDark}
            />
            <ChartTypeButton
              type="line"
              label="Line"
              icon={<LineChart size={16} />}
              isActive={chartType === "line"}
              onClick={() => setChartType("line")}
              isDark={isDark}
            />
            <ChartTypeButton
              type="bar"
              label="Bar"
              icon={<BarChart3 size={16} />}
              isActive={chartType === "bar"}
              onClick={() => setChartType("bar")}
              isDark={isDark}
            />
            <ChartTypeButton
              type="area"
              label="Area"
              icon={<AreaChart size={16} />}
              isActive={chartType === "area"}
              onClick={() => setChartType("area")}
              isDark={isDark}
            />
          </div>
        </div>

        {/* Display Options */}
        <div className="space-y-2">
          <h4 className={sectionHeaderClasses}>{t("display_options")}</h4>
          <div className="space-y-2">
            <ToggleOption
              label="Show Grid"
              icon={
                <Grid
                  size={16}
                  className={isDark ? "text-gray-400" : "text-gray-500"}
                />
              }
              isActive={showGrid}
              onToggle={toggleGrid}
              isDark={isDark}
            />

            <ToggleOption
              label="Show Volume"
              icon={<BarChart3 size={16} className="text-blue-400" />}
              isActive={showVolume}
              onToggle={toggleVolume}
              isDark={isDark}
            />
          </div>
        </div>
      </div>
    </motion.div>
  );
};

// Chart Type Button Component
interface ChartTypeButtonProps {
  type: string;
  label: string;
  icon: React.ReactNode;
  isActive: boolean;
  onClick: () => void;
  isDark: boolean;
}

const ChartTypeButton = ({
  type,
  label,
  icon,
  isActive,
  onClick,
  isDark,
}: ChartTypeButtonProps) => (
  <motion.button
    className={cn(
      "flex flex-col items-center justify-center gap-1 p-2 rounded-md transition-all backdrop-blur-sm",
      isActive
        ? "bg-green-600 text-white"
        : isDark
          ? "bg-black/70 border border-zinc-800/50 text-zinc-300 hover:border-zinc-700/70"
          : "bg-zinc-100/30 border border-zinc-200/50 text-zinc-700 hover:border-zinc-300/70"
    )}
    onClick={onClick}
    whileHover={{ scale: 1.03 }}
    whileTap={{ scale: 0.97 }}
  >
    {icon}
    <span className="text-xs font-medium">{label}</span>
  </motion.button>
);

// Toggle Option Component
interface ToggleOptionProps {
  label: string;
  icon: React.ReactNode;
  isActive: boolean;
  onToggle: () => void;
  isDark: boolean;
}

const ToggleOption = ({
  label,
  icon,
  isActive,
  onToggle,
  isDark,
}: ToggleOptionProps) => (
  <div
    className={cn(
      "flex items-center justify-between p-2 backdrop-blur-sm border hover:border-opacity-70 rounded-md cursor-pointer",
      isDark
        ? "bg-black/70 border-zinc-800/50 hover:border-zinc-700/70"
        : "bg-zinc-100/30 border-zinc-200/50 hover:border-zinc-300/70"
    )}
    onClick={onToggle}
  >
    <div className="flex items-center gap-2">
      {icon}
      <span
        className={cn("text-xs", isDark ? "text-zinc-200" : "text-zinc-700")}
      >
        {label}
      </span>
    </div>
    <div
      className={cn(
        "w-9 h-4 rounded-full relative",
        isDark ? "bg-zinc-800" : "bg-zinc-200"
      )}
    >
      <div
        className={cn(
          "absolute top-0.5 w-3 h-3 rounded-full transition-all duration-200",
          isActive
            ? "right-0.5 bg-green-500"
            : isDark
              ? "left-0.5 bg-zinc-600"
              : "left-0.5 bg-zinc-400"
        )}
      />
    </div>
  </div>
);

export default SettingsPanel;
