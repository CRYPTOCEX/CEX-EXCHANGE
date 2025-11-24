import React from "react";
import { BadgeVariant, BadgeConfig } from "../../../types/table";
import { CellRendererProps } from "./cell-renderer-props";

// Map of Tailwind classes for each badge variant.
const variants: Record<BadgeVariant, { dot: string; badge: string }> = {
  success: {
    dot: "bg-green-500 dark:bg-green-400",
    badge:
      "bg-green-500/10 dark:bg-green-500/20 hover:bg-green-500/15 dark:hover:bg-green-500/25 text-green-700 dark:text-green-400",
  },
  destructive: {
    dot: "bg-red-500 dark:bg-red-400",
    badge:
      "bg-red-500/10 dark:bg-red-500/20 hover:bg-red-500/15 dark:hover:bg-red-500/25 text-red-700 dark:text-red-400",
  },
  warning: {
    dot: "bg-yellow-500 dark:bg-yellow-400",
    badge:
      "bg-yellow-500/10 dark:bg-yellow-500/20 hover:bg-yellow-500/15 dark:hover:bg-yellow-500/25 text-yellow-700 dark:text-yellow-400",
  },
  info: {
    dot: "bg-blue-500 dark:bg-blue-400",
    badge:
      "bg-blue-500/10 dark:bg-blue-500/20 hover:bg-blue-500/15 dark:hover:bg-blue-500/25 text-blue-700 dark:text-blue-400",
  },
  primary: {
    dot: "bg-primary dark:bg-primary",
    badge: [
      "bg-primary/10 dark:bg-primary/10",
      "hover:bg-primary/20 dark:hover:bg-primary/20",
      "text-primary-foreground text-black dark:text-white",
    ].join(" "),
  },
  secondary: {
    dot: "bg-secondary dark:bg-secondary",
    badge:
      "bg-secondary/10 dark:bg-secondary/20 hover:bg-secondary/15 dark:hover:bg-secondary/25 text-secondary-foreground",
  },
  muted: {
    dot: "bg-muted dark:bg-muted",
    badge: "bg-muted/50 hover:bg-muted/60 text-muted-foreground",
  },
  default: {
    dot: "bg-gray-500 dark:bg-gray-400",
    badge:
      "bg-gray-500/10 dark:bg-gray-500/20 hover:bg-gray-500/15 dark:hover:bg-gray-500/25 text-gray-700 dark:text-gray-400",
  },
  danger: {
    dot: "bg-red-600 dark:bg-red-500",
    badge:
      "bg-red-600/10 dark:bg-red-600/20 hover:bg-red-600/15 dark:hover:bg-red-600/25 text-red-800 dark:text-red-500",
  },
};

// A simple Badge component with base styling.
const Badge = ({
  children,
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement>) => {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium transition-colors ${className}`}
      {...props}
    >
      {children}
    </span>
  );
};

interface BadgeCellProps extends CellRendererProps<string> {
  config?: BadgeConfig;
}

// Determines the badge variant based on the status value.
const getVariantForStatus = (status: string): BadgeVariant => {
  const statusMap: Record<string, BadgeVariant> = {
    ACTIVE: "success",
    ONLINE: "success",
    VERIFIED: "success",
    COMPLETED: "success",
    INACTIVE: "muted",
    OFFLINE: "muted",
    DISABLED: "muted",
    PENDING: "warning",
    PROCESSING: "warning",
    IN_PROGRESS: "warning",
    ERROR: "destructive",
    FAILED: "destructive",
    BANNED: "destructive",
    SUSPENDED: "destructive",
    BLOCKED: "destructive",
    NEW: "info",
    DRAFT: "info",
    DEFAULT: "default",
  };
  return statusMap[status.toUpperCase()] || "default";
};

// The BadgeCell component now uses the locally defined Badge component.
export function BadgeCell({
  value,
  row,
  config = {
    variant: "default",
    withDot: true,
  },
}: BadgeCellProps) {
  const { withDot = true } = config;
  let variantKey: BadgeVariant;

  if (typeof config.variant === "function") {
    variantKey = config.variant(value);
  } else if (config.variant) {
    variantKey = config.variant;
  } else {
    variantKey = getVariantForStatus(value);
  }

  // Fallback to default variant if the computed variant key is not found
  const variant = variants[variantKey] || variants.default;

  return (
    <div className="flex items-center">
      <Badge className={variant.badge}>
        {withDot && (
          <span className={`mr-1.5 h-2 w-2 rounded-full ${variant.dot}`} />
        )}
        {value}
      </Badge>
    </div>
  );
}
