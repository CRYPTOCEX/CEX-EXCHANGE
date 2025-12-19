"use client";

import { motion } from "framer-motion";
import { HeadingConfig } from "../types";

interface HeroHeadingProps {
  config: HeadingConfig;
  theme?: {
    primary?: string;
    secondary?: string;
  };
  animate?: boolean;
}

const sizeClasses = {
  sm: "text-3xl md:text-4xl lg:text-5xl",
  md: "text-4xl md:text-5xl lg:text-6xl",
  lg: "text-5xl md:text-6xl lg:text-7xl",
  xl: "text-6xl md:text-7xl lg:text-8xl",
};

// Color map for gradients
const gradientMap: Record<string, { from: string; via: string; to: string }> = {
  teal: { from: "#0d9488", via: "#06b6d4", to: "#0d9488" },
  cyan: { from: "#0891b2", via: "#14b8a6", to: "#0891b2" },
  blue: { from: "#2563eb", via: "#3b82f6", to: "#2563eb" },
  purple: { from: "#9333ea", via: "#a855f7", to: "#9333ea" },
  pink: { from: "#db2777", via: "#ec4899", to: "#db2777" },
  red: { from: "#dc2626", via: "#ef4444", to: "#dc2626" },
  orange: { from: "#ea580c", via: "#f97316", to: "#ea580c" },
  amber: { from: "#d97706", via: "#f59e0b", to: "#d97706" },
  yellow: { from: "#ca8a04", via: "#eab308", to: "#ca8a04" },
  green: { from: "#16a34a", via: "#22c55e", to: "#16a34a" },
  emerald: { from: "#059669", via: "#10b981", to: "#059669" },
  indigo: { from: "#4f46e5", via: "#6366f1", to: "#4f46e5" },
  violet: { from: "#7c3aed", via: "#8b5cf6", to: "#7c3aed" },
};

export default function HeroHeading({
  config,
  theme = { primary: "teal", secondary: "cyan" },
  animate = true,
}: HeroHeadingProps) {
  const {
    text,
    highlightedText,
    highlightPosition = "after",
    highlightGradient,
    size = "lg",
    className,
  } = config;

  // Get gradient colors based on theme
  const primaryColors = gradientMap[theme.primary || "teal"] || gradientMap.teal;
  const secondaryColors = gradientMap[theme.secondary || "cyan"] || gradientMap.cyan;

  const defaultGradientStyle = {
    backgroundImage: `linear-gradient(to right, ${primaryColors.from}, ${secondaryColors.via}, ${primaryColors.to})`,
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
    backgroundClip: "text",
  } as React.CSSProperties;

  const headingContent = () => {
    const regularText = (
      <span className="text-zinc-900 dark:text-white">{text}</span>
    );

    const highlightText = highlightedText && (
      <span
        className={highlightGradient || undefined}
        style={!highlightGradient ? defaultGradientStyle : undefined}
      >
        {highlightedText}
      </span>
    );

    if (!highlightedText) return regularText;

    switch (highlightPosition) {
      case "before":
        return (
          <>
            {highlightText}
            <br />
            {regularText}
          </>
        );
      case "after":
        return (
          <>
            {regularText}
            <br />
            {highlightText}
          </>
        );
      case "inline":
        return (
          <>
            {regularText} {highlightText}
          </>
        );
      default:
        return regularText;
    }
  };

  const content = (
    <h1
      className={
        className ||
        `${sizeClasses[size]} font-bold tracking-tight mb-6`
      }
    >
      {headingContent()}
    </h1>
  );

  if (!animate) return content;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      {content}
    </motion.div>
  );
}
