"use client"

import { LucideIcon } from "lucide-react"
import { motion } from "framer-motion"
import { cn } from "@/lib/utils"
import { ResponsiveContainer, AreaChart, Area } from "recharts"

export interface SparklineData {
  value: number
}

export interface StatsCardProps {
  /** The label/title displayed below the value */
  label: string
  /** The main value to display */
  value: number | string
  /** Lucide icon component */
  icon: LucideIcon
  /** Optional change value (e.g., +5 today) */
  change?: number | string
  /** Label for the change badge (e.g., "today", "rate") */
  changeLabel?: string
  /** Optional description text displayed below the label */
  description?: string
  /** Icon color - Tailwind text color class */
  color?: string
  /** Icon background color - Tailwind bg color class */
  bgColor?: string
  /** Format value as currency */
  isCurrency?: boolean
  /** Format change as percentage */
  isPercent?: boolean
  /** Currency code for formatting (default: USD) */
  currency?: string
  /** Optional click handler */
  onClick?: () => void
  /** Optional className for the card */
  className?: string
  /** Animation delay index for staggered animations */
  index?: number
  /** Optional sparkline data - array of values to display as a mini chart */
  sparklineData?: SparklineData[] | number[]
  /** Sparkline color - defaults to accent color based on card color */
  sparklineColor?: string
}

/**
 * A premium stats card component with glassmorphism, animations, and professional design.
 */
export function StatsCard({
  label,
  value,
  icon: Icon,
  change,
  changeLabel,
  description,
  color = "text-primary",
  bgColor = "bg-primary/10",
  isCurrency = false,
  isPercent = false,
  currency = "USD",
  onClick,
  className,
  index = 0,
  sparklineData,
  sparklineColor,
}: StatsCardProps) {
  const formatValue = () => {
    if (typeof value === "string") return value

    if (isCurrency) {
      return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency,
        notation: "compact",
        maximumFractionDigits: 1,
      }).format(value)
    }

    return new Intl.NumberFormat("en-US", {
      notation: "compact",
      maximumFractionDigits: 1,
    }).format(value)
  }

  const formatChange = () => {
    if (change === undefined || change === null) return null

    const prefix = typeof change === "number" && change > 0 ? "+" : ""
    const suffix = isPercent ? "%" : ""

    return `${prefix}${change}${suffix}${changeLabel ? ` ${changeLabel}` : ""}`
  }

  const isPositiveChange = typeof change === "number" ? change > 0 : typeof change === "string" && !change.startsWith("-")

  // Get the accent color for the bottom line based on the text color
  const getAccentLineColor = () => {
    // Extract the base color from the class (handles both "text-blue-400" and "text-blue-600 dark:text-blue-400")
    const baseColor = color.split(" ")[0].replace("text-", "").replace(/-\d+$/, "")
    const colorMap: Record<string, string> = {
      "blue": "bg-blue-500",
      "emerald": "bg-emerald-500",
      "amber": "bg-amber-500",
      "purple": "bg-purple-500",
      "red": "bg-red-500",
      "pink": "bg-pink-500",
      "cyan": "bg-cyan-500",
      "orange": "bg-orange-500",
      "zinc": "bg-zinc-500",
      "green": "bg-green-500",
      "yellow": "bg-yellow-500",
    }
    return colorMap[baseColor] || "bg-primary"
  }

  // Get the sparkline stroke color based on the text color
  const getSparklineColor = () => {
    if (sparklineColor) return sparklineColor
    // Extract the base color from the class
    const baseColor = color.split(" ")[0].replace("text-", "").replace(/-\d+$/, "")
    const colorMap: Record<string, string> = {
      "blue": "#3b82f6",
      "emerald": "#10b981",
      "amber": "#f59e0b",
      "purple": "#8b5cf6",
      "red": "#ef4444",
      "pink": "#ec4899",
      "cyan": "#06b6d4",
      "orange": "#f97316",
      "zinc": "#71717a",
      "green": "#22c55e",
      "yellow": "#eab308",
    }
    return colorMap[baseColor] || "#8b5cf6"
  }

  // Normalize sparkline data to array of {value} objects
  const normalizedSparklineData = sparklineData?.map((item) =>
    typeof item === "number" ? { value: item } : item
  )

  // Check if sparkline data has meaningful variation (skip rendering if all zeros or all same value)
  const hasSparklineData = (() => {
    if (!normalizedSparklineData || normalizedSparklineData.length <= 1) return false
    const values = normalizedSparklineData.map((item) => item.value)
    const hasNonZero = values.some((v) => v !== 0)
    if (!hasNonZero) return false
    // Check if there's actual variation (not all same value)
    const firstValue = values[0]
    const hasVariation = values.some((v) => v !== firstValue)
    return hasVariation
  })()

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{
        duration: 0.4,
        delay: index * 0.1,
        ease: [0.25, 0.46, 0.45, 0.94],
      }}
      whileHover={{
        scale: 1.02,
        transition: { duration: 0.2 }
      }}
      className={cn(
        "group relative overflow-hidden rounded-xl",
        onClick && "cursor-pointer",
        className
      )}
      onClick={onClick}
    >
      {/* Glass background - light/dark mode aware */}
      <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-white/80 to-white/60 dark:from-zinc-900/80 dark:to-zinc-950/90 backdrop-blur-xl" />

      {/* Border - light/dark mode aware */}
      <div className="absolute inset-0 rounded-xl border border-zinc-200/80 dark:border-white/8 group-hover:border-zinc-300 dark:group-hover:border-white/20 transition-colors duration-300" />

      {/* Subtle inner glow on hover */}
      <div className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-br from-zinc-100/50 dark:from-white/5 via-transparent to-transparent" />

      {/* Shadow for light mode */}
      <div className="absolute inset-0 rounded-xl shadow-sm dark:shadow-none" />

      {/* Accent color glow */}
      <div className={cn(
        "absolute -top-12 -right-12 w-24 h-24 rounded-full blur-3xl opacity-10 dark:opacity-20 group-hover:opacity-20 dark:group-hover:opacity-30 transition-opacity duration-500",
        bgColor.replace("/10", "/40")
      )} />

      {/* Sparkline as full background overlay - behind content */}
      {hasSparklineData && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: index * 0.1 + 0.2, duration: 0.6 }}
          className="absolute inset-0 pointer-events-none z-0"
        >
          <div className="absolute inset-0 flex items-end">
            <div className="w-full h-2/3">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={normalizedSparklineData}
                  margin={{ top: 0, right: 0, left: 0, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id={`sparkline-gradient-${index}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={getSparklineColor()} stopOpacity={0.15} />
                      <stop offset="100%" stopColor={getSparklineColor()} stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <Area
                    type="monotone"
                    dataKey="value"
                    stroke={getSparklineColor()}
                    strokeWidth={1}
                    strokeOpacity={0.3}
                    fill={`url(#sparkline-gradient-${index})`}
                    dot={false}
                    isAnimationActive={true}
                    animationDuration={1000}
                    animationBegin={index * 100}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </motion.div>
      )}

      {/* Content */}
      <div className="relative p-5 z-10">
        <div className="flex items-start justify-between mb-4">
          {/* Icon container with gradient background */}
          <motion.div
            initial={{ rotate: 0 }}
            whileHover={{ scale: 1.1 }}
            transition={{ type: "spring", stiffness: 400, damping: 17 }}
            className={cn(
              "relative h-11 w-11 rounded-lg flex items-center justify-center",
              "bg-gradient-to-br",
              bgColor,
              "shadow-lg"
            )}
          >
            {/* Icon glow effect */}
            <div className={cn(
              "absolute inset-0 rounded-lg blur-md opacity-50",
              bgColor
            )} />
            <Icon className={cn("relative h-5 w-5", color)} />
          </motion.div>

          {/* Change badge with animation */}
          {change !== undefined && change !== null && (
            <motion.div
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 + 0.2 }}
              className={cn(
                "px-2.5 py-1 rounded-full text-[11px] font-medium backdrop-blur-sm",
                "border transition-colors duration-300",
                isPositiveChange
                  ? "bg-emerald-500/15 dark:bg-emerald-500/10 border-emerald-500/30 dark:border-emerald-500/20 text-emerald-600 dark:text-emerald-400 group-hover:border-emerald-500/50 dark:group-hover:border-emerald-500/40"
                  : "bg-zinc-500/10 dark:bg-white/5 border-zinc-300 dark:border-white/10 text-muted-foreground group-hover:border-zinc-400 dark:group-hover:border-white/20"
              )}
            >
              {formatChange()}
            </motion.div>
          )}
        </div>

        {/* Value and label */}
        <div className="space-y-1.5">
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: index * 0.1 + 0.1 }}
            className={cn(
              "text-3xl font-bold tracking-tight",
              color
            )}
          >
            {formatValue()}
          </motion.p>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: index * 0.1 + 0.15 }}
            className="text-sm text-muted-foreground/80 font-medium"
          >
            {label}
          </motion.p>
          {description && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: index * 0.1 + 0.2 }}
              className="text-xs text-muted-foreground/60"
            >
              {description}
            </motion.p>
          )}
        </div>

      </div>

      {/* Bottom accent line - only show when no sparkline */}
      {!hasSparklineData && (
        <motion.div
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ delay: index * 0.1 + 0.3, duration: 0.5 }}
          className="absolute bottom-0 left-0 right-0 h-[2px] origin-left overflow-hidden z-10"
        >
          <div
            className={cn(
              "h-full w-full opacity-40",
              getAccentLineColor(),
              "mask-gradient-x"
            )}
            style={{
              maskImage: "linear-gradient(to right, transparent, black 20%, black 80%, transparent)",
              WebkitMaskImage: "linear-gradient(to right, transparent, black 20%, black 80%, transparent)",
            }}
          />
        </motion.div>
      )}
    </motion.div>
  )
}

export interface StatsGridProps {
  /** Array of stats to display */
  stats: StatsCardProps[]
  /** Number of columns on different breakpoints */
  columns?: {
    default?: number
    sm?: number
    md?: number
    lg?: number
    xl?: number
  }
  /** Optional className for the grid container */
  className?: string
}

/**
 * A grid layout for multiple StatsCard components with staggered animations.
 */
export function StatsGrid({
  stats,
  columns = { default: 2, md: 3, lg: 5 },
  className,
}: StatsGridProps) {
  const getGridCols = () => {
    const cols: string[] = []

    if (columns.default) cols.push(`grid-cols-${columns.default}`)
    if (columns.sm) cols.push(`sm:grid-cols-${columns.sm}`)
    if (columns.md) cols.push(`md:grid-cols-${columns.md}`)
    if (columns.lg) cols.push(`lg:grid-cols-${columns.lg}`)
    if (columns.xl) cols.push(`xl:grid-cols-${columns.xl}`)

    return cols.join(" ")
  }

  return (
    <div className={cn("grid gap-4", getGridCols(), className)}>
      {stats.map((stat, index) => (
        <StatsCard key={stat.label + index} {...stat} index={index} />
      ))}
    </div>
  )
}

// Pre-defined color schemes for common use cases - with light/dark mode support
export const statsCardColors = {
  blue: { color: "text-blue-600 dark:text-blue-400", bgColor: "bg-blue-500/15 dark:bg-blue-500/10" },
  green: { color: "text-emerald-600 dark:text-emerald-400", bgColor: "bg-emerald-500/15 dark:bg-emerald-500/10" },
  amber: { color: "text-amber-600 dark:text-amber-400", bgColor: "bg-amber-500/15 dark:bg-amber-500/10" },
  purple: { color: "text-purple-600 dark:text-purple-400", bgColor: "bg-purple-500/15 dark:bg-purple-500/10" },
  red: { color: "text-red-600 dark:text-red-400", bgColor: "bg-red-500/15 dark:bg-red-500/10" },
  pink: { color: "text-pink-600 dark:text-pink-400", bgColor: "bg-pink-500/15 dark:bg-pink-500/10" },
  cyan: { color: "text-cyan-600 dark:text-cyan-400", bgColor: "bg-cyan-500/15 dark:bg-cyan-500/10" },
  orange: { color: "text-orange-600 dark:text-orange-400", bgColor: "bg-orange-500/15 dark:bg-orange-500/10" },
  zinc: { color: "text-zinc-600 dark:text-zinc-400", bgColor: "bg-zinc-500/15 dark:bg-zinc-500/10" },
}
