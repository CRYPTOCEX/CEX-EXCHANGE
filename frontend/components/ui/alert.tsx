import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const alertVariants = cva(
  "relative w-full rounded-lg border px-4 py-3 text-sm grid has-[>svg]:grid-cols-[calc(var(--spacing)*4)_1fr] grid-cols-[0_1fr] has-[>svg]:gap-x-3 gap-y-0.5 items-start [&>svg]:size-4 [&>svg]:translate-y-0.5 [&>svg]:text-current",
  {
    variants: {
      /**
       * Legacy axis — SOLID fills, kept verbatim so the 72 `destructive` call
       * sites do not move.
       *
       * Measured 2026-07-29: of 211 `<Alert>` only 74 set a variant at all
       * (72 destructive, 1 warning, 1 default) — while the codebase carried
       * **130 hand-rolled `bg-success/10` and 161 `bg-warning/10` boxes**.
       * Authors were not ignoring the semantic variants, they were avoiding
       * them: the variants paint a saturated fill and what people want for an
       * inline notice is a tint. That is what the `tone` axis below is for.
       *
       * `soft` was byte-identical to `default` and had ZERO call sites; it is
       * deleted rather than carried forward.
       */
      variant: {
        default: "bg-background text-foreground",
        /**
         * The `[&_[data-slot=alert-description]]` selectors are load-bearing.
         *
         * AlertDescription hard-codes `text-muted-foreground`, which is tuned
         * for the page background — on a saturated fill it is unreadable. In
         * dark mode `--muted-foreground` and `--destructive` are BOTH 64.9%
         * lightness, so the description text had essentially zero luminance
         * contrast against its own alert.
         *
         * The destructive variant already tried to correct this, but wrote it
         * as `data-[slot=alert-description]:…` — a variant that matches only
         * when the element carrying the class IS the description. It sits on
         * the wrapper, whose slot is "alert", so it never matched anything.
         * A descendant selector actually reaches the child, and at (0,2,0)
         * beats the child's own (0,1,0) `text-muted-foreground`.
         */
        destructive:
          "bg-destructive text-destructive-foreground [&>svg]:text-current [&_[data-slot=alert-description]]:text-destructive-foreground/90",
        success:
          "bg-success text-success-foreground [&>svg]:text-current [&_[data-slot=alert-description]]:text-success-foreground/90",
        warning:
          "bg-warning text-warning-foreground [&>svg]:text-current [&_[data-slot=alert-description]]:text-warning-foreground/90",
        info: "bg-info text-info-foreground [&>svg]:text-current [&_[data-slot=alert-description]]:text-info-foreground/90",
      },

      /**
       * Semantic colour as a TINT — the shape the codebase actually reaches
       * for. Uses the same `/10` fill and `/20` rule as the tonal Badge, and
       * the derived `--{tone}-ink` for the text, because ink on a tinted ground
       * fails AA if you use the raw token (see DESIGN-SYSTEM.md 11b).
       *
       * `tone` and `variant` are mutually exclusive; passing `tone` suppresses
       * `variant`, since both paint the same properties.
       */
      tone: {
        primary: "",
        success: "",
        warning: "",
        destructive: "",
        info: "",
        neutral: "",
      },

      appearance: { solid: "", soft: "" },
    },

    compoundVariants: [
      { tone: "primary", appearance: "soft", class: "bg-primary/10 border-primary/20 text-primary-ink [&_[data-slot=alert-description]]:text-primary-ink/90" },
      { tone: "success", appearance: "soft", class: "bg-success/10 border-success/20 text-success-ink [&_[data-slot=alert-description]]:text-success-ink/90" },
      { tone: "warning", appearance: "soft", class: "bg-warning/10 border-warning/20 text-warning-ink [&_[data-slot=alert-description]]:text-warning-ink/90" },
      { tone: "destructive", appearance: "soft", class: "bg-destructive/10 border-destructive/20 text-destructive-ink [&_[data-slot=alert-description]]:text-destructive-ink/90" },
      { tone: "info", appearance: "soft", class: "bg-info/10 border-info/20 text-info-ink [&_[data-slot=alert-description]]:text-info-ink/90" },
      { tone: "neutral", appearance: "soft", class: "bg-muted border-border text-foreground [&_[data-slot=alert-description]]:text-muted-foreground" },

      { tone: "primary", appearance: "solid", class: "bg-primary text-primary-foreground [&>svg]:text-current [&_[data-slot=alert-description]]:text-primary-foreground/90" },
      { tone: "success", appearance: "solid", class: "bg-success text-success-foreground [&>svg]:text-current [&_[data-slot=alert-description]]:text-success-foreground/90" },
      { tone: "warning", appearance: "solid", class: "bg-warning text-warning-foreground [&>svg]:text-current [&_[data-slot=alert-description]]:text-warning-foreground/90" },
      { tone: "destructive", appearance: "solid", class: "bg-destructive text-destructive-foreground [&>svg]:text-current [&_[data-slot=alert-description]]:text-destructive-foreground/90" },
      { tone: "info", appearance: "solid", class: "bg-info text-info-foreground [&>svg]:text-current [&_[data-slot=alert-description]]:text-info-foreground/90" },
      { tone: "neutral", appearance: "solid", class: "bg-muted text-foreground [&_[data-slot=alert-description]]:text-muted-foreground" },
    ],

    defaultVariants: {
      appearance: "soft",
    },
  }
);

function Alert({
  className,
  variant,
  tone,
  appearance,
  ...props
}: React.ComponentProps<"div"> & VariantProps<typeof alertVariants>) {
  // cva resolves a default when a prop is `undefined`, so `variant` cannot be
  // suppressed by passing null — it has to be omitted from the call entirely.
  const resolved = tone
    ? alertVariants({ tone, appearance })
    : alertVariants({ variant: variant ?? "default" });

  return (
    <div
      data-slot="alert"
      role="alert"
      className={cn(resolved, className)}
      {...props}
    />
  );
}

function AlertTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-title"
      className={cn(
        "col-start-2 line-clamp-1 min-h-4 font-medium tracking-tight",
        className
      )}
      {...props}
    />
  );
}

function AlertDescription({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-description"
      className={cn(
        "text-muted-foreground col-start-2 grid justify-items-start gap-1 text-sm [&_p]:leading-relaxed",
        className
      )}
      {...props}
    />
  );
}

export { Alert, AlertTitle, AlertDescription };
