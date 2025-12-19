"use client";

import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/routing";
import { ActionButtonConfig } from "../types";

interface HeroActionsProps {
  actions: ActionButtonConfig[];
  theme?: {
    primary?: string;
    secondary?: string;
  };
  animate?: boolean;
  layout?: "row" | "column" | "responsive";
  className?: string;
}

const sizeClasses = {
  sm: "h-9 px-3 text-xs md:h-10 md:px-4 md:text-sm",
  md: "h-10 px-4 text-sm md:h-12 md:px-6 md:text-base",
  lg: "h-11 px-5 text-sm md:h-14 md:px-8 md:text-lg",
  xl: "h-12 px-6 text-base md:h-16 md:px-10 md:text-xl",
};

// Color map for gradients
const gradientMap: Record<string, { from: string; via: string; to: string; shadow: string }> = {
  teal: { from: "#0d9488", via: "#06b6d4", to: "#0d9488", shadow: "rgba(13, 148, 136, 0.3)" },
  cyan: { from: "#0891b2", via: "#14b8a6", to: "#0891b2", shadow: "rgba(8, 145, 178, 0.3)" },
  blue: { from: "#2563eb", via: "#3b82f6", to: "#2563eb", shadow: "rgba(37, 99, 235, 0.3)" },
  purple: { from: "#9333ea", via: "#a855f7", to: "#9333ea", shadow: "rgba(147, 51, 234, 0.3)" },
  pink: { from: "#db2777", via: "#ec4899", to: "#db2777", shadow: "rgba(219, 39, 119, 0.3)" },
  red: { from: "#dc2626", via: "#ef4444", to: "#dc2626", shadow: "rgba(220, 38, 38, 0.3)" },
  orange: { from: "#ea580c", via: "#f97316", to: "#ea580c", shadow: "rgba(234, 88, 12, 0.3)" },
  green: { from: "#16a34a", via: "#22c55e", to: "#16a34a", shadow: "rgba(22, 163, 74, 0.3)" },
  emerald: { from: "#059669", via: "#10b981", to: "#059669", shadow: "rgba(5, 150, 105, 0.3)" },
  indigo: { from: "#4f46e5", via: "#6366f1", to: "#4f46e5", shadow: "rgba(79, 70, 229, 0.3)" },
  violet: { from: "#7c3aed", via: "#8b5cf6", to: "#7c3aed", shadow: "rgba(124, 58, 237, 0.3)" },
};

export default function HeroActions({
  actions,
  theme = { primary: "teal", secondary: "cyan" },
  animate = true,
  layout = "responsive",
  className,
}: HeroActionsProps) {
  const primaryColors = gradientMap[theme.primary || "teal"] || gradientMap.teal;
  const secondaryColors = gradientMap[theme.secondary || "cyan"] || gradientMap.cyan;

  const getPrimaryButtonStyle = (): React.CSSProperties => ({
    backgroundImage: `linear-gradient(to right, ${primaryColors.from}, ${secondaryColors.via}, ${primaryColors.to})`,
    boxShadow: `0 25px 50px -12px ${primaryColors.shadow}`,
  });

  const getButtonClasses = (action: ActionButtonConfig) => {
    const size = action.size || "lg";
    const baseSize = sizeClasses[size];

    switch (action.variant) {
      case "primary":
        return `${baseSize} rounded-2xl text-white font-semibold transition-all duration-300 hover:scale-105`;

      case "secondary":
        return `${baseSize} rounded-2xl bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 font-semibold backdrop-blur-sm`;

      case "outline":
        return `${baseSize} rounded-2xl border-2 border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800/50 hover:border-zinc-400 dark:hover:border-zinc-600 backdrop-blur-sm`;

      case "ghost":
        return `${baseSize} rounded-2xl text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800/50`;

      default:
        return `${baseSize} rounded-2xl`;
    }
  };

  const layoutClasses = {
    row: "flex flex-row gap-4",
    column: "flex flex-col gap-4",
    responsive: "flex flex-row gap-3 md:gap-4",
  };

  const renderButton = (action: ActionButtonConfig, index: number) => {
    const Icon = action.icon;
    const buttonContent = (
      <>
        {Icon && action.iconPosition !== "right" && (
          <Icon className="hidden md:inline-block mr-2 h-5 w-5" />
        )}
        {action.text}
        {Icon && action.iconPosition === "right" && (
          <Icon className="hidden md:inline-block ml-2 h-5 w-5" />
        )}
      </>
    );

    const buttonElement = (
      <Button
        key={index}
        size="lg"
        variant={action.variant === "outline" ? "outline" : action.variant === "ghost" ? "ghost" : "default"}
        className={action.className || getButtonClasses(action)}
        style={action.variant === "primary" && !action.className ? getPrimaryButtonStyle() : undefined}
        onClick={action.onClick}
      >
        {buttonContent}
      </Button>
    );

    if (action.href) {
      if (action.external) {
        return (
          <a
            key={index}
            href={action.href}
            target="_blank"
            rel="noopener noreferrer"
          >
            {buttonElement}
          </a>
        );
      }
      return (
        <Link key={index} href={action.href}>
          {buttonElement}
        </Link>
      );
    }

    return buttonElement;
  };

  const content = (
    <div
      className={className || `${layoutClasses[layout]} justify-center mb-12`}
    >
      {actions.map((action, index) => renderButton(action, index))}
    </div>
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
