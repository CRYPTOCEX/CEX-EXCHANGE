import * as React from "react";
import { Loader2 } from "lucide-react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

/**
 * Spinner — the one busy indicator.
 *
 * MEASURED PROBLEM (2026-07-29): **555 `animate-spin` sites across 337 files**,
 * of which 86 were raw `<div>`/`<span>` rings and 469 were icon components.
 * Excluding lucide icons there were **69 distinct hand-rolled class
 * signatures**, in **17 sizes** and **22 colours** — including two that were
 * literally the character `⟳`, and several using a semantic colour for a plain
 * load (`border-warning` on an ecommerce category page, `border-success` on an
 * ICO launch plan) so the colour carried meaning it did not have.
 *
 * On top of that there were TWO competing primitives with nothing in common:
 *
 *   ui/loader.tsx          CSS border ring, `border-primary` (fixed colour),
 *                          named export, 16 files — all `finance/*`
 *   ui/loading-spinner.tsx lucide Loader2, inherits `currentColor`,
 *                          DEFAULT export, 9 files — all `(ext)/nft/*`
 *
 * Two shapes, two colour policies, two export styles, zero shared consumers.
 * `loader.tsx` also used `border-3`, which is not a stock Tailwind width.
 *
 * This is the single definition. It inherits `currentColor` so a spinner inside
 * a Button, a muted caption or a destructive alert is automatically the right
 * colour — which is why `tone` deliberately does NOT exist here.
 */
const spinnerVariants = cva("animate-spin shrink-0", {
  variants: {
    size: {
      xs: "size-3",
      sm: "size-4", // the measured majority (277 of 555)
      md: "size-6",
      lg: "size-8",
      xl: "size-12",
    },
  },
  defaultVariants: { size: "sm" },
});

export interface SpinnerProps
  extends Omit<React.ComponentProps<"svg">, "ref">,
    VariantProps<typeof spinnerVariants> {
  /**
   * Accessible name. A spinner with no label is invisible to assistive tech —
   * the user is told nothing while they wait. Pass `label={null}` only when an
   * adjacent element already announces the busy state.
   */
  label?: string | null;
}

const Spinner = React.forwardRef<SVGSVGElement, SpinnerProps>(
  ({ className, size, label = "Loading", ...props }, ref) => (
    <>
      <Loader2
        ref={ref}
        aria-hidden="true"
        data-slot="spinner"
        className={cn(spinnerVariants({ size }), className)}
        {...props}
      />
      {label ? <span className="sr-only">{label}</span> : null}
    </>
  )
);
Spinner.displayName = "Spinner";

export { Spinner, spinnerVariants };
