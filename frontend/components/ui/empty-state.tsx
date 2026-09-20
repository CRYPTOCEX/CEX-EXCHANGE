import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

/**
 * EmptyState — the "there is nothing here" surface.
 *
 * MEASURED PROBLEM (2026-07-29): **314 empty states in 56 distinct visual
 * treatments**. The single most common treatment was *bare text with no
 * styling at all* (146 of 314); only ~20 carried the full icon + heading +
 * body + action pattern. There was no shared primitive, so eight modules each
 * grew their own — chart-engine, blog, notifications, staking, trade markets
 * (three separate ones), and trade/pro.
 *
 * An empty state is the screen a user hits when something went wrong with
 * their expectations, so it is exactly the wrong place for the product to look
 * unfinished.
 *
 * `icon` is decorative by default (`aria-hidden` via the wrapper) because the
 * heading already carries the meaning.
 */
const emptyStateVariants = cva(
  "flex flex-col items-center justify-center text-center",
  {
    variants: {
      size: {
        sm: "gap-2 px-4 py-8",
        md: "gap-3 px-6 py-12",
        lg: "gap-4 px-6 py-20",
      },
      surface: {
        none: "",
        muted: "rounded-lg border border-dashed border-border-strong bg-muted/30",
        card: "rounded-lg border border-border bg-card",
      },
    },
    defaultVariants: { size: "md", surface: "none" },
  }
);

const ICON_SIZE = {
  sm: "size-8 [&_svg]:size-4",
  md: "size-12 [&_svg]:size-6",
  lg: "size-16 [&_svg]:size-8",
} as const;

export interface EmptyStateProps
  extends Omit<React.ComponentProps<"div">, "title">,
    VariantProps<typeof emptyStateVariants> {
  icon?: React.ReactNode;
  title: React.ReactNode;
  description?: React.ReactNode;
  /** Primary call to action — usually a <Button>. */
  action?: React.ReactNode;
}

const EmptyState = ({
  className,
  size,
  surface,
  icon,
  title,
  description,
  action,
  children,
  ...props
}: EmptyStateProps) => (
  <div
    data-slot="empty-state"
    className={cn(emptyStateVariants({ size, surface }), className)}
    {...props}
  >
    {icon ? (
      <div
        aria-hidden="true"
        className={cn(
          "flex items-center justify-center rounded-full bg-muted text-muted-foreground",
          ICON_SIZE[size ?? "md"]
        )}
      >
        {icon}
      </div>
    ) : null}

    <p className="text-base font-medium text-foreground">{title}</p>

    {description ? (
      <p className="max-w-prose text-sm text-muted-foreground">{description}</p>
    ) : null}

    {children}
    {action ? <div className="mt-1">{action}</div> : null}
  </div>
);
EmptyState.displayName = "EmptyState";

export { EmptyState, emptyStateVariants };
