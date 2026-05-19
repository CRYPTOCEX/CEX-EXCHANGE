"use client";

import { motion } from "framer-motion";
import { StatsConfig, StatConfig } from "../types";
import AnimatedCounter from "./AnimatedCounter";

interface HeroStatsProps {
  config: StatsConfig;
  theme?: {
    primary?: string;
    secondary?: string;
  };
  animate?: boolean;
  loading?: boolean;
}

const layoutClasses = {
  row: "flex flex-wrap justify-center gap-3 md:gap-8",
  column: "flex flex-col gap-4",
  grid: "grid grid-cols-2 md:grid-cols-4 gap-4",
};

// Color map for common theme colors
const colorMap: Record<string, { light: string; dark: string }> = {
  primary: { light: "var(--primary)", dark: "var(--primary)" },
  secondary: { light: "var(--secondary)", dark: "var(--secondary)" },
  teal: { light: "#0d9488", dark: "#2dd4bf" },
  cyan: { light: "#0891b2", dark: "#22d3ee" },
  blue: { light: "#2563eb", dark: "#60a5fa" },
  purple: { light: "#9333ea", dark: "#c084fc" },
  pink: { light: "#db2777", dark: "#f472b6" },
  red: { light: "#dc2626", dark: "#f87171" },
  orange: { light: "#ea580c", dark: "#fb923c" },
  yellow: { light: "#ca8a04", dark: "#facc15" },
  green: { light: "#16a34a", dark: "#4ade80" },
  emerald: { light: "#059669", dark: "#34d399" },
  indigo: { light: "#4f46e5", dark: "#818cf8" },
  violet: { light: "#7c3aed", dark: "#a78bfa" },
};

export default function HeroStats({
  config,
  theme = { primary: "primary" },
  animate = true,
  loading = false,
}: HeroStatsProps) {
  const { items, layout = "row", style = "badges", className } = config;
  const colors = colorMap[theme.primary || "primary"] || colorMap.primary;

  if (loading) {
    return (
      <div className="flex gap-4">
        {[...Array(items.length || 3)].map((_, i) => (
          <div
            key={i}
            className="h-12 w-32 rounded-full bg-zinc-200 dark:bg-zinc-800 animate-pulse"
          />
        ))}
      </div>
    );
  }

  if (!items || items.length === 0) return null;

  const renderStatBadge = (stat: StatConfig, index: number) => {
    const Icon = stat.icon;

    const content = (
      <div className="flex items-center gap-1.5 px-2.5 py-1.5 md:gap-2 md:px-4 md:py-2 rounded-full bg-white/60 dark:bg-white/5 backdrop-blur-sm border border-zinc-200/80 dark:border-white/10 cursor-default">
        {Icon && (
          <Icon
            className="w-3.5 h-3.5 md:w-4 md:h-4"
            style={{ color: colors.light }}
          />
        )}
        <span className="font-bold text-sm md:text-base text-zinc-900 dark:text-white">
          {stat.animate !== false ? (
            <AnimatedCounter
              value={stat.value}
              suffix={stat.suffix}
              prefix={stat.prefix || ""}
              decimals={stat.decimals || 0}
            />
          ) : (
            <>
              {stat.prefix}
              {stat.value.toFixed(stat.decimals || 0)}
              {stat.suffix}
            </>
          )}
        </span>
        <span className="text-xs md:text-sm text-zinc-500 dark:text-zinc-400">
          {stat.label}
        </span>
      </div>
    );

    if (!animate) return <div key={index}>{content}</div>;

    return (
      <motion.div
        key={index}
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4, delay: 0.5 + index * 0.1 }}
        whileHover={{ scale: 1.05 }}
      >
        {content}
      </motion.div>
    );
  };

  const renderStatCard = (stat: StatConfig, index: number) => {
    const Icon = stat.icon;

    const content = (
      <div className="flex flex-col items-center p-6 rounded-2xl bg-white/60 dark:bg-white/5 backdrop-blur-sm border border-zinc-200/80 dark:border-white/10">
        {Icon && (
          <Icon
            className="w-8 h-8 mb-3"
            style={{ color: colors.light }}
          />
        )}
        <span className="text-3xl font-bold text-zinc-900 dark:text-white mb-1">
          {stat.animate !== false ? (
            <AnimatedCounter
              value={stat.value}
              suffix={stat.suffix}
              prefix={stat.prefix || ""}
              decimals={stat.decimals || 0}
            />
          ) : (
            <>
              {stat.prefix}
              {stat.value.toFixed(stat.decimals || 0)}
              {stat.suffix}
            </>
          )}
        </span>
        <span className="text-sm text-zinc-500 dark:text-zinc-400">
          {stat.label}
        </span>
      </div>
    );

    if (!animate) return <div key={index}>{content}</div>;

    return (
      <motion.div
        key={index}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.3 + index * 0.1 }}
        whileHover={{ scale: 1.02 }}
      >
        {content}
      </motion.div>
    );
  };

  const renderStatMinimal = (stat: StatConfig, index: number) => {
    const Icon = stat.icon;

    const content = (
      <div className="flex items-center gap-3">
        {Icon && (
          <Icon
            className="w-5 h-5"
            style={{ color: colors.light }}
          />
        )}
        <div>
          <span className="text-2xl font-bold text-zinc-900 dark:text-white">
            {stat.animate !== false ? (
              <AnimatedCounter
                value={stat.value}
                suffix={stat.suffix}
                prefix={stat.prefix || ""}
                decimals={stat.decimals || 0}
              />
            ) : (
              <>
                {stat.prefix}
                {stat.value.toFixed(stat.decimals || 0)}
                {stat.suffix}
              </>
            )}
          </span>
          <span className="ml-2 text-sm text-zinc-500 dark:text-zinc-400">
            {stat.label}
          </span>
        </div>
      </div>
    );

    if (!animate) return <div key={index}>{content}</div>;

    return (
      <motion.div
        key={index}
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.4, delay: 0.3 + index * 0.1 }}
      >
        {content}
      </motion.div>
    );
  };

  const renderStat = (stat: StatConfig, index: number) => {
    switch (style) {
      case "badges":
        return renderStatBadge(stat, index);
      case "cards":
        return renderStatCard(stat, index);
      case "minimal":
        return renderStatMinimal(stat, index);
      default:
        return renderStatBadge(stat, index);
    }
  };

  return (
    <div className={className || layoutClasses[layout]}>
      {items.map((stat, index) => renderStat(stat, index))}
    </div>
  );
}
