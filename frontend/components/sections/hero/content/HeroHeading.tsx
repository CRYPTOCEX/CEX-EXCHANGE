"use client";

import { m } from "framer-motion";
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
  teal: { from: "hsl(var(--primary))", via: "hsl(var(--primary) / 0.8)", to: "hsl(var(--primary))" },
  cyan: { from: "hsl(var(--primary))", via: "hsl(var(--primary) / 0.8)", to: "hsl(var(--primary))" },
  blue: { from: "hsl(var(--primary))", via: "hsl(var(--primary) / 0.8)", to: "hsl(var(--primary))" },
  purple: { from: "hsl(var(--primary))", via: "hsl(var(--primary) / 0.8)", to: "hsl(var(--primary))" },
  pink: { from: "hsl(var(--primary))", via: "hsl(var(--primary) / 0.8)", to: "hsl(var(--primary))" },
  red: { from: "hsl(var(--destructive))", via: "hsl(var(--destructive) / 0.8)", to: "hsl(var(--destructive))" },
  orange: { from: "hsl(var(--warning))", via: "hsl(var(--warning) / 0.8)", to: "hsl(var(--warning))" },
  amber: { from: "hsl(var(--warning))", via: "hsl(var(--warning) / 0.8)", to: "hsl(var(--warning))" },
  yellow: { from: "hsl(var(--warning))", via: "hsl(var(--warning) / 0.8)", to: "hsl(var(--warning))" },
  green: { from: "hsl(var(--success))", via: "hsl(var(--success) / 0.8)", to: "hsl(var(--success))" },
  emerald: { from: "hsl(var(--success))", via: "hsl(var(--success) / 0.8)", to: "hsl(var(--success))" },
  indigo: { from: "hsl(var(--primary))", via: "hsl(var(--primary) / 0.8)", to: "hsl(var(--primary))" },
  violet: { from: "hsl(var(--primary))", via: "hsl(var(--primary) / 0.8)", to: "hsl(var(--primary))" },
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
      <span className="text-foreground">{text}</span>
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
    <m.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      {content}
    </m.div>
  );
}
