import React from "react";
import { BadgeVariant, BadgeConfig } from "../../../types/table";
import { CellRendererProps } from "./cell-renderer-props";
import type { BadgeTone } from "@/components/ui/badge";
import { statusTone } from "@/lib/status-tone";

// Map of Tailwind classes for each badge variant.
const variants: Record<BadgeVariant, { dot: string; badge: string }> = {
  success: {
    dot: "bg-success",
    badge:
      "bg-success/10 dark:bg-success/20 hover:bg-success/15 dark:hover:bg-success/25 text-success-ink",
  },
  destructive: {
    dot: "bg-destructive",
    badge:
      "bg-destructive/10 dark:bg-destructive/20 hover:bg-destructive/15 dark:hover:bg-destructive/25 text-destructive-ink",
  },
  warning: {
    dot: "bg-warning",
    badge:
      "bg-warning/10 dark:bg-warning/20 hover:bg-warning/15 dark:hover:bg-warning/25 text-warning-ink",
  },
  // `info` used to paint `--primary`, so the variant NAMED info was the brand
  // colour and an admin retheming `--info` moved nothing. globals.css states
  // info is a deliberately distinct hue from primary — this honours it.
  info: {
    dot: "bg-info",
    badge:
      "bg-info/10 dark:bg-info/20 hover:bg-info/15 dark:hover:bg-info/25 text-info-ink",
  },
  // Was `bg-primary/10` + `text-primary-foreground`. `--primary-foreground` is
  // white in light mode, so this was white ink on a 10%-primary tint over a
  // white card — invisible in every admin table that used it. The ink must be
  // the tone, not the tone's ON-FILL pairing.
  primary: {
    dot: "bg-primary",
    badge:
      "bg-primary/10 dark:bg-primary/20 hover:bg-primary/15 dark:hover:bg-primary/25 text-primary-ink",
  },
  // Same class of bug: `--secondary` is a near-background SURFACE token, so
  // `text-secondary-foreground` on `bg-secondary/10` is ink-on-its-own-ground.
  secondary: {
    dot: "bg-muted-foreground",
    badge:
      "bg-muted dark:bg-muted/60 hover:bg-muted/80 text-foreground",
  },
  muted: {
    dot: "bg-muted",
    badge: "bg-muted/50 hover:bg-muted/60 text-muted-foreground",
  },
  default: {
    dot: "bg-muted",
    badge:
      "bg-muted/10 dark:bg-muted/20 hover:bg-muted/15 dark:hover:bg-muted/25 text-muted-foreground",
  },
  danger: {
    dot: "bg-destructive",
    badge:
      "bg-destructive/10 dark:bg-destructive/20 hover:bg-destructive/15 dark:hover:bg-destructive/25 text-destructive-ink",
  },
};

/**
 * The chip's GEOMETRY, exported so the pending state can reserve the exact box
 * instead of guessing at it.
 *
 * The guess it replaces was `h-6 w-16 rounded-full` in
 * `../skeleton/cell.tsx` — 24px tall. This chip is 20px: `py-0.5` (2+2) around
 * a `text-xs` line box (16px), no border. So every badge column painted a
 * skeleton 4px taller than the badge that landed in it, on ten rows at once —
 * 40px of table that settles upward the moment the fetch resolves.
 *
 * It is a const and not just a class attribute because the only durable fix is
 * for there to be ONE copy of the padding/type scale. Change `py-0.5` to
 * `py-1` here and the skeleton follows on its own.
 */
export const BADGE_CELL_CHIP =
  "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium transition-colors";

// A simple Badge component with base styling.
const Badge = ({
  children,
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement>) => {
  return (
    <span className={`${BADGE_CELL_CHIP} ${className}`} {...props}>
      {children}
    </span>
  );
};

interface BadgeCellProps extends CellRendererProps<any> {
  config?: BadgeConfig;
}

/** `BadgeTone` (the platform vocabulary) -> this cell's local variant names. */
const TONE_TO_VARIANT: Record<BadgeTone, BadgeVariant> = {
  success: "success",
  warning: "warning",
  destructive: "destructive",
  info: "info",
  primary: "primary",
  secondary: "secondary",
  neutral: "muted",
};

/**
 * Determines the badge variant for a status.
 *
 * This used to be a PRIVATE 18-entry status map living inside the shared
 * data-table — a 240th status mapper, in the one primitive every admin table
 * renders through. It disagreed with `lib/status-tone.ts` on five statuses:
 * `OFFLINE` and `DISABLED` were muted here and destructive centrally,
 * `PROCESSING` and `IN_PROGRESS` were warning here and info centrally, and
 * `DRAFT` was info here and neutral centrally. So the same record could show a
 * different hue in a table than on its own detail page.
 *
 * It also resolved against the DISPLAY value — the label after the options
 * lookup and translation — so in any non-English locale the map missed on every
 * row and the whole column fell back to grey. It now takes the raw value.
 */
const getVariantForStatus = (status: string, domain?: string): BadgeVariant =>
  TONE_TO_VARIANT[statusTone(status, domain)];

// The BadgeCell component now uses the locally defined Badge component.
export function BadgeCell({
  value,
  row,
  config = {
    variant: "default",
    withDot: true,
  },
}: BadgeCellProps) {
  const { withDot = true, labels, options } = config;
  let variantKey: BadgeVariant;
  let displayValue: string;

  // A nullable badge column (an investment with no `result` yet, an order with
  // no outcome) fell through to `String(value)` below and rendered a badge
  // whose LABEL was the literal text "null" — styled, dotted, and looking like
  // a real status. Absence is not a status: render the same muted placeholder
  // the other cell types use. Tested with `== null` on purpose so that boolean
  // `false` and numeric `0`, both legitimate values, still render.
  if (value == null || value === "") {
    return <span className="text-muted-foreground">—</span>;
  }

  // Handle boolean values with optional custom labels
  if (typeof value === "boolean") {
    if (labels && typeof labels === "object") {
      displayValue = value ? (labels.true || "Active") : (labels.false || "Inactive");
    } else {
      // Default labels for boolean values
      displayValue = value ? "Active" : "Inactive";
    }
  } else if (options && Array.isArray(options)) {
    // Look up label from options array for select-type columns
    // Normalize both values by removing underscores and comparing case-insensitively
    // This handles cases where DB has "STAKINGREWARD" but options has "STAKING_REWARD"
    const normalizeValue = (v: string | number | boolean) => String(v)?.toUpperCase().replace(/_/g, "");
    const normalizedValue = normalizeValue(String(value));
    const matchedOption = options.find(
      (opt) => opt.value === String(value) || normalizeValue(opt.value) === normalizedValue
    );
    displayValue = matchedOption?.label || String(value);
  } else {
    // For non-boolean values, convert to string
    displayValue = String(value);
  }

  if (typeof config.variant === "function") {
    variantKey = config.variant(value);
  } else if (config.variant) {
    variantKey = config.variant;
  } else {
    // The RAW value, not `displayValue` — the latter has already been through
    // the options lookup and translation, so matching on it made the hue
    // depend on the active locale.
    variantKey = getVariantForStatus(String(value), config.domain);
  }

  // Fallback to default variant if the computed variant key is not found
  const variant = variants[variantKey] || variants.default;

  return (
    <div className="flex items-center">
      <Badge className={variant.badge}>
        {withDot && (
          <span className={`mr-1.5 h-2 w-2 rounded-full ${variant.dot}`} />
        )}
        {displayValue}
      </Badge>
    </div>
  );
}
