"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import { motion, useInView, useSpring, useTransform, useMotionValue } from "framer-motion";
import { TrendingUp, TrendingDown } from "lucide-react";
import { StatsSectionProps, StatsPreset, statsPresets } from "./types";
import { SectionBackground, SectionHeader } from "../shared";
import { paddingClasses, gapClasses, getColor, getGradient } from "../shared/types";

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

// Floating particle component
function FloatingParticle({
  delay,
  duration,
  size,
  color,
  startX,
  startY,
  xOffset,
  repeatDelay,
}: {
  delay: number;
  duration: number;
  size: number;
  color: string;
  startX: number;
  startY: number;
  xOffset: number;
  repeatDelay: number;
}) {
  return (
    <motion.div
      className="absolute rounded-full pointer-events-none"
      style={{
        width: size,
        height: size,
        background: color,
        left: `${startX}%`,
        top: `${startY}%`,
        filter: "blur(1px)",
      }}
      initial={{ opacity: 0, scale: 0 }}
      animate={{
        opacity: [0, 0.8, 0],
        scale: [0, 1, 0.5],
        y: [-20, -100],
        x: [0, xOffset],
      }}
      transition={{
        duration,
        delay,
        repeat: Infinity,
        repeatDelay,
        ease: "easeOut",
      }}
    />
  );
}

// Premium stat card with 3D effects
function StatCard({
  icon: Icon,
  value,
  prefix = "",
  suffix = "",
  decimals = 0,
  label,
  description,
  index,
  gradient,
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
  gradient: { from: string; to: string };
  accentColor: string;
  animate?: boolean;
  showTrend?: boolean;
  trend?: { direction: "up" | "down"; value: number; label?: string };
  showDescription?: boolean;
}) {
  const cardRef = useRef<HTMLDivElement>(null);
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const rotateX = useTransform(mouseY, [-0.5, 0.5], [8, -8]);
  const rotateY = useTransform(mouseX, [-0.5, 0.5], [-8, 8]);

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    mouseX.set((e.clientX - centerX) / rect.width);
    mouseY.set((e.clientY - centerY) / rect.height);
  };

  const handleMouseLeave = () => {
    mouseX.set(0);
    mouseY.set(0);
  };

  // Generate particles for this card - using deterministic values based on index to avoid hydration mismatch
  const particles = useMemo(() => {
    // Seeded pseudo-random function for deterministic values
    const seededRandom = (seed: number) => {
      const x = Math.sin(seed * 9999) * 10000;
      return x - Math.floor(x);
    };

    // Round to 2 decimal places to ensure server/client consistency
    const round = (n: number) => Math.round(n * 100) / 100;

    return Array.from({ length: 6 }, (_, i) => {
      const seed = index * 100 + i;
      return {
        id: i,
        delay: round(i * 0.5 + index * 0.2),
        duration: round(2 + seededRandom(seed) * 1),
        size: round(3 + seededRandom(seed + 1) * 4),
        color: `${accentColor}${Math.floor(seededRandom(seed + 2) * 40 + 30).toString(16)}`,
        startX: round(20 + seededRandom(seed + 3) * 60),
        startY: round(70 + seededRandom(seed + 4) * 20),
        xOffset: round(seededRandom(seed + 5) * 40 - 20),
        repeatDelay: round(seededRandom(seed + 6) * 2),
      };
    });
  }, [index, accentColor]);

  const isNumeric = typeof value === "number";

  return (
    <motion.div
      ref={cardRef}
      initial={{ opacity: 0, y: 50, scale: 0.9 }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{
        duration: 0.6,
        delay: index * 0.15,
        type: "spring",
        stiffness: 100,
      }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{
        rotateX,
        rotateY,
        transformPerspective: 1200,
        transformStyle: "preserve-3d",
      }}
      className="relative group"
    >
      {/* Glow effect */}
      <motion.div
        className="absolute -inset-1 rounded-[28px] opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-xl"
        style={{
          background: `linear-gradient(135deg, ${gradient.from}40, ${gradient.to}40)`,
        }}
      />

      {/* Card */}
      <div
        className="relative h-full rounded-2xl p-6 overflow-hidden border border-zinc-200 dark:border-zinc-800/50 backdrop-blur-xl bg-white dark:bg-zinc-900/90"
        style={{
          boxShadow: `0 15px 40px -10px rgba(0,0,0,0.1)`,
        }}
      >
        {/* Gradient overlay */}
        <div
          className="absolute inset-0 opacity-10"
          style={{
            background: `radial-gradient(ellipse at 30% 0%, ${gradient.from}30 0%, transparent 60%)`,
          }}
        />

        {/* Floating particles */}
        {particles.map((p) => (
          <FloatingParticle key={p.id} {...p} />
        ))}

        {/* Content */}
        <div className="relative z-10">
          {/* Icon container with animated glow */}
          {Icon && (
            <motion.div
              className="relative w-12 h-12 mb-5"
              whileHover={{ scale: 1.1 }}
              transition={{ type: "spring", stiffness: 400 }}
            >
              <div
                className="absolute inset-0 rounded-xl blur-lg opacity-40 dark:opacity-50"
                style={{
                  background: `linear-gradient(135deg, ${gradient.from}, ${gradient.to})`,
                }}
              />
              <div
                className="relative w-full h-full rounded-xl flex items-center justify-center"
                style={{
                  background: `linear-gradient(135deg, ${gradient.from}, ${gradient.to})`,
                  boxShadow: `0 6px 24px ${accentColor}30`,
                }}
              >
                <Icon className="w-6 h-6 text-white" strokeWidth={1.5} />
              </div>
            </motion.div>
          )}

          {/* Value with animated counter */}
          <div className="mb-2">
            <span className="text-4xl md:text-5xl font-bold text-zinc-900 dark:text-white">
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

          {/* Label */}
          <h3 className="text-base font-semibold text-zinc-900 dark:text-white mb-1">{label}</h3>

          {/* Description */}
          {showDescription && description && (
            <p className="text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">{description}</p>
          )}

          {/* Trend indicator */}
          {showTrend && trend && (
            <div
              className={`flex items-center gap-1 mt-2 text-sm font-medium ${
                trend.direction === "up"
                  ? "text-green-600 dark:text-green-400"
                  : "text-red-600 dark:text-red-400"
              }`}
            >
              {trend.direction === "up" ? (
                <TrendingUp className="w-4 h-4" />
              ) : (
                <TrendingDown className="w-4 h-4" />
              )}
              <span>
                {trend.value > 0 ? "+" : ""}
                {trend.value}%
              </span>
              {trend.label && (
                <span className="text-zinc-500 dark:text-zinc-400">{trend.label}</span>
              )}
            </div>
          )}

          {/* Decorative line */}
          <motion.div
            className="absolute bottom-0 left-8 right-8 h-px"
            style={{
              background: `linear-gradient(90deg, transparent, ${accentColor}30, transparent)`,
            }}
            initial={{ scaleX: 0 }}
            whileInView={{ scaleX: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.3 + index * 0.1 }}
          />
        </div>

        {/* Corner accent */}
        <div
          className="absolute top-0 right-0 w-32 h-32 opacity-20"
          style={{
            background: `radial-gradient(circle at 100% 0%, ${gradient.to}40, transparent 70%)`,
          }}
        />
      </div>
    </motion.div>
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

  const primaryColor = getColor(theme.primary || "teal");
  const gradient = getGradient(theme.primary || "teal");

  // Gradient colors for different stats
  const gradientColors = [
    { from: "#14b8a6", to: "#10b981" }, // teal-emerald
    { from: "#06b6d4", to: "#0ea5e9" }, // cyan-sky
    { from: "#8b5cf6", to: "#a855f7" }, // violet-purple
    { from: "#f59e0b", to: "#f97316" }, // amber-orange
    { from: "#ec4899", to: "#f43f5e" }, // pink-rose
    { from: "#3b82f6", to: "#6366f1" }, // blue-indigo
  ];

  if (variant === "banner") {
    return (
      <section
        id={id}
        className={`relative ${paddingClasses.md} overflow-hidden ${className}`}
      >
        {background && <SectionBackground config={background} theme={theme} />}

        <div className="container mx-auto relative z-10">
          <div className={`grid ${columnsClasses[columns]} ${gapClasses[gap]} items-center`}>
            {stats.map((stat, idx) => {
              const statGradient = gradientColors[idx % gradientColors.length];
              return (
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
                  gradient={statGradient}
                  accentColor={statGradient.from}
                  animate={stat.animate}
                  showTrend={showTrend}
                  trend={stat.trend}
                  showDescription={showDescription}
                />
              );
            })}
          </div>
        </div>
      </section>
    );
  }

  // Check if we should use transparent background
  const hasTransparentBg = background?.variant === "transparent" || className?.includes("bg-transparent");
  const bgClass = hasTransparentBg ? "" : "bg-zinc-50 dark:bg-zinc-950";

  return (
    <section
      id={id}
      className={`relative ${paddingClasses.lg} overflow-hidden ${bgClass} ${className}`}
    >
      {background && background.variant !== "transparent" && <SectionBackground config={background} theme={theme} />}

      <div className="container mx-auto relative z-10">
        {header && <SectionHeader config={header} theme={theme} animate={animation.enabled} />}

        <div className={`grid ${columnsClasses[columns]} ${gapClasses[gap]} max-w-6xl mx-auto`}>
          {stats.map((stat, idx) => {
            const statGradient = gradientColors[idx % gradientColors.length];
            return (
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
                gradient={statGradient}
                accentColor={statGradient.from}
                animate={stat.animate}
                showTrend={showTrend}
                trend={stat.trend}
                showDescription={showDescription}
              />
            );
          })}
        </div>
      </div>
    </section>
  );
}
