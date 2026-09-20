"use client";

import { useEffect, useRef, useState } from "react";
import { m, useInView, useSpring, useTransform } from "framer-motion";
import { TrendingUp, TrendingDown } from "lucide-react";
import { StatsSectionProps, StatsPreset, statsPresets } from "./types";
import { SectionBackground, SectionHeader } from "../shared";
import { paddingClasses, gapClasses, getColor, withAlpha } from "../shared/types";

interface StatsSectionComponentProps extends StatsSectionProps {
  preset?: StatsPreset;
  loading?: boolean;
}

const columnsClasses = {
  2: "grid-cols-1 md:grid-cols-2",
  3: "grid-cols-1 md:grid-cols-3",
  4: "grid-cols-2 md:grid-cols-4",
  5: "grid-cols-2 md:grid-cols-3 lg:grid-cols-5",
  6: "grid-cols-2 md:grid-cols-3 lg:grid-cols-6",
};

// Animated counter with spring physics
function AnimatedCounter({
  value,
  decimals = 0,
  prefix = "",
  suffix = "",
}: {
  value: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-50px" });
  const spring = useSpring(0, { damping: 30, stiffness: 80, restDelta: 0.001 });
  const display = useTransform(spring, (current) => current.toFixed(decimals));
  const [displayValue, setDisplayValue] = useState("0");

  useEffect(() => {
    if (isInView) {
      spring.set(value);
    }
  }, [isInView, value, spring]);

  useEffect(() => {
    return display.on("change", (latest) => {
      setDisplayValue(latest);
    });
  }, [display]);

  return (
    <span ref={ref} className="tabular-nums">
      {prefix}
      {displayValue}
      {suffix}
    </span>
  );
}

/**
 * Ledger stat card.
 *
 * Was a 3D-tilting glass panel: a blurred gradient glow, a radial wash, six
 * animated particles, a corner accent and a decorative underline, all stacked
 * behind the one thing anybody reads — the number. None of that carried
 * information, and every layer of it was a second place the theme had to be
 * kept in sync. What is left is the flat ledger shell, with colour only on the
 * icon tile and the trend, which are the two marks that actually mean something.
 */
function StatCard({
  icon: Icon,
  value,
  prefix = "",
  suffix = "",
  decimals = 0,
  label,
  description,
  index,
  accentColor,
  animate,
  showTrend,
  trend,
  showDescription,
}: {
  icon?: React.ElementType;
  value: number | string;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  label: string;
  description?: string;
  index: number;
  accentColor: string;
  animate?: boolean;
  showTrend?: boolean;
  trend?: { direction: "up" | "down"; value: number; label?: string };
  showDescription?: boolean;
}) {
  const isNumeric = typeof value === "number";

  return (
    <m.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
      className="h-full rounded-lg border border-border bg-card p-4"
    >
      {Icon && (
        <div
          className="w-12 h-12 mb-4 rounded-lg flex items-center justify-center"
          style={{ background: withAlpha(accentColor, 0.12) }}
        >
          <Icon
            className="w-6 h-6"
            strokeWidth={1.5}
            style={{ color: accentColor }}
          />
        </div>
      )}

      <div className="mb-2">
        <span className="font-mono tabular-nums text-4xl md:text-5xl font-bold text-foreground">
          {isNumeric && animate !== false ? (
            <AnimatedCounter
              value={value as number}
              decimals={decimals}
              prefix={prefix}
              suffix={suffix}
            />
          ) : (
            <>
              {prefix}
              {value}
              {suffix}
            </>
          )}
        </span>
      </div>

      <h3 className="text-base font-semibold text-foreground mb-1">{label}</h3>

      {showDescription && description && (
        <p className="text-sm text-subtle-foreground leading-relaxed">{description}</p>
      )}

      {showTrend && trend && (
        <div
          className={`flex items-center gap-1 mt-2 text-sm font-medium ${
            trend.direction === "up"
              ? "text-up"
              : "text-down"
          }`}
        >
          {trend.direction === "up" ? (
            <TrendingUp className="w-4 h-4" />
          ) : (
            <TrendingDown className="w-4 h-4" />
          )}
          <span className="font-mono tabular-nums">
            {trend.value > 0 ? "+" : ""}
            {trend.value}%
          </span>
          {trend.label && (
            <span className="text-subtle-foreground">{trend.label}</span>
          )}
        </div>
      )}
    </m.div>
  );
}

export default function StatsSection({
  header,
  stats,
  layout,
  background,
  animation = { enabled: true },
  theme = { primary: "teal", secondary: "cyan" },
  className = "",
  preset,
  id,
}: StatsSectionComponentProps) {
  const presetConfig = preset ? statsPresets[preset] : null;
  const finalLayout = { ...presetConfig?.layout, ...layout };

  const {
    variant = "grid",
    columns = 4,
    gap = "lg",
    cardStyle = "default",
    iconStyle = "gradient",
    showIcon = true,
    showDescription = true,
    showTrend = false,
    size = "md",
  } = finalLayout;

  /**
   * Stat tiles, all in the accent.
   *
   * Same story as ProcessSection: the six-slot chart ramp indexed by tile
   * position. Four stats about ONE platform are not four categories — they are
   * four numbers, each already labelled and iconed — so cycling a categorical
   * scale over them was decoration wearing a data-encoding costume, and it put
   * four extra hues on every landing page that renders this section.
   *
   * One accent for every tile, and it now tints the icon tile only — never the
   * figure, which stays `text-foreground`.
   */
  const primaryColor = getColor(theme.primary || "teal");

  if (variant === "banner") {
    return (
      <section
        id={id}
        className={`relative ${paddingClasses.md} overflow-hidden ${className}`}
      >
        {background && <SectionBackground config={background} theme={theme} />}

        <div className="container mx-auto relative z-10">
          <div className={`grid ${columnsClasses[columns]} ${gapClasses[gap]} items-center`}>
            {stats.map((stat, idx) => (
              <StatCard
                key={stat.id || idx}
                icon={showIcon ? stat.icon : undefined}
                value={stat.value}
                prefix={stat.prefix}
                suffix={stat.suffix}
                decimals={stat.decimals}
                label={stat.label}
                description={stat.description}
                index={idx}
                accentColor={primaryColor}
                animate={stat.animate}
                showTrend={showTrend}
                trend={stat.trend}
                showDescription={showDescription}
              />
            ))}
          </div>
        </div>
      </section>
    );
  }

  // Check if we should use transparent background
  const hasTransparentBg = background?.variant === "transparent" || className?.includes("bg-transparent");
  const bgClass = hasTransparentBg ? "" : "bg-muted";

  return (
    <section
      id={id}
      className={`relative ${paddingClasses.lg} overflow-hidden ${bgClass} ${className}`}
    >
      {background && background.variant !== "transparent" && <SectionBackground config={background} theme={theme} />}

      <div className="container mx-auto relative z-10">
        {header && <SectionHeader config={header} theme={theme} animate={animation.enabled} />}

        <div className={`grid ${columnsClasses[columns]} ${gapClasses[gap]} max-w-6xl mx-auto`}>
          {stats.map((stat, idx) => (
            <StatCard
              key={stat.id || idx}
              icon={showIcon ? stat.icon : undefined}
              value={stat.value}
              prefix={stat.prefix}
              suffix={stat.suffix}
              decimals={stat.decimals}
              label={stat.label}
              description={stat.description}
              index={idx}
              accentColor={primaryColor}
              animate={stat.animate}
              showTrend={showTrend}
              trend={stat.trend}
              showDescription={showDescription}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
