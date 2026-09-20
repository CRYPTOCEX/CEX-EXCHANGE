"use client";

import { m } from "framer-motion";
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
  teal: { from: "hsl(var(--primary))", via: "hsl(var(--primary) / 0.8)", to: "hsl(var(--primary))", shadow: "hsl(var(--primary) / 0.3)" },
  cyan: { from: "hsl(var(--primary))", via: "hsl(var(--primary) / 0.8)", to: "hsl(var(--primary))", shadow: "hsl(var(--primary) / 0.3)" },
  blue: { from: "hsl(var(--primary))", via: "hsl(var(--primary) / 0.8)", to: "hsl(var(--primary))", shadow: "hsl(var(--primary) / 0.3)" },
  purple: { from: "hsl(var(--primary))", via: "hsl(var(--primary) / 0.8)", to: "hsl(var(--primary))", shadow: "hsl(var(--primary) / 0.3)" },
  pink: { from: "hsl(var(--primary))", via: "hsl(var(--primary) / 0.8)", to: "hsl(var(--primary))", shadow: "hsl(var(--primary) / 0.3)" },
  red: { from: "hsl(var(--destructive))", via: "hsl(var(--destructive) / 0.8)", to: "hsl(var(--destructive))", shadow: "hsl(var(--destructive) / 0.3)" },
  orange: { from: "hsl(var(--warning))", via: "hsl(var(--warning) / 0.8)", to: "hsl(var(--warning))", shadow: "hsl(var(--warning) / 0.3)" },
  green: { from: "hsl(var(--success))", via: "hsl(var(--success) / 0.8)", to: "hsl(var(--success))", shadow: "hsl(var(--success) / 0.3)" },
  emerald: { from: "hsl(var(--success))", via: "hsl(var(--success) / 0.8)", to: "hsl(var(--success))", shadow: "hsl(var(--success) / 0.3)" },
  indigo: { from: "hsl(var(--primary))", via: "hsl(var(--primary) / 0.8)", to: "hsl(var(--primary))", shadow: "hsl(var(--primary) / 0.3)" },
  violet: { from: "hsl(var(--primary))", via: "hsl(var(--primary) / 0.8)", to: "hsl(var(--primary))", shadow: "hsl(var(--primary) / 0.3)" },
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
        return `${baseSize} rounded-2xl text-overlay-foreground font-semibold transition-all duration-300 hover:scale-105`;

      case "secondary":
        return `${baseSize} rounded-2xl bg-muted hover:bg-muted bg-muted dark:hover:bg-muted text-muted-foreground font-semibold backdrop-blur-sm`;

      case "outline":
        return `${baseSize} rounded-2xl border-2 border-border-strong border-border-strong text-muted-foreground hover:bg-muted dark:hover:bg-muted/50 hover:border-border dark:hover:border-border-strong backdrop-blur-sm`;

      case "ghost":
        return `${baseSize} rounded-2xl text-muted-foreground hover:bg-muted dark:hover:bg-muted/50`;

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
    <m.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      {content}
    </m.div>
  );
}
