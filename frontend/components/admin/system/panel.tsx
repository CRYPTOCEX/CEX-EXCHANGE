import * as React from "react";

import { CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

/**
 * The panel language shared by the two system consoles — `admin/system/update`
 * and `admin/system/extension/[id]`.
 *
 * ===========================================================================
 * WHY IT IS A MODULE AND NOT TWO COPIES
 * ===========================================================================
 * `PanelTitle` was written to collapse FOUR different "this panel is about X"
 * treatments inside the extension console alone: a `h-10 w-10 rounded-xl
 * bg-primary/10` tile beside a `text-2xl font-bold` h2, a `h-7 w-7 rounded-sm
 * bg-surface-3` tile beside a `CardTitle`, the same tile in
 * `bg-primary/15 text-primary`, and a bare `CardTitle` with no tile at all.
 *
 * The update console is the same screen for the core product and had a fifth
 * spelling of its own (`bg-primary/15 text-primary`, brand accent on a
 * decorative square). Copying the function across would have re-created, one
 * directory over, exactly the drift it was written to end. So it lives here and
 * both import it — a duplicate has no mechanism keeping it in sync with the
 * thing it imitates.
 *
 * The Card Ledger interior contract names exactly one shape: a `h-7 w-7
 * rounded-sm` TILE carrying a `h-3.5` glyph, never a bare icon. The tile is
 * neutral — `bg-surface-3` — because R2 reserves the accent for what is
 * interactive or the one figure that matters, and a heading is neither. `tone`
 * exists for the panels where the tile is genuinely reporting a state.
 */
export function PanelTitle({
  icon: Icon,
  children,
  tone = "neutral",
}: {
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
  tone?: "neutral" | "warning" | "success" | "destructive";
}) {
  return (
    <CardTitle className="flex items-center gap-2">
      <span
        className={cn(
          "grid h-7 w-7 shrink-0 place-items-center rounded-sm",
          tone === "warning"
            ? "bg-warning/15 text-warning"
            : tone === "success"
              ? "bg-success/15 text-success"
              : tone === "destructive"
                ? "bg-destructive/15 text-destructive"
                : "bg-surface-3 text-muted-foreground"
        )}
      >
        <Icon className="h-3.5 w-3.5" />
      </span>
      {children}
    </CardTitle>
  );
}

/**
 * A key/value line. The right-hand rails on both consoles are made of these,
 * and the figure carries `font-mono tabular-nums` for the same reason the
 * Ledger stat card does: a version and an id are figures, and a proportional
 * face makes two of them stacked fail to line up.
 */
export function DataRow({
  label,
  children,
  className,
}: {
  label: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex items-baseline justify-between gap-4", className)}>
      <span className="shrink-0 text-xs font-medium text-muted-foreground">
        {label}
      </span>
      <span className="min-w-0 truncate text-right text-sm">{children}</span>
    </div>
  );
}
