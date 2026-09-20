import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

/**
 * Badge.
 *
 * MEASURED PROBLEM (2026-07-29): 1142 <Badge> call sites, 940 of them (82%)
 * carried a className. They were not decorating the badge — they were REBUILDING
 * it, because the component offered no tonal style and no size:
 *
 *     bg-success/10 border-success/20 text-success     x17
 *     bg-warning/10 border-warning/20 text-warning     x20
 *     bg-primary/10 border-primary/20 text-primary     x17
 *     bg-primary/10 border-primary/20                  x24
 *     ... plus text-xs x284 and text-[10px] x66 for size
 *
 * Same intent, drifting values: fills at /10 and /20, borders at /20, /30 and
 * /50, ink sometimes `text-{tone}` and sometimes `text-foreground`. That drift
 * IS the inconsistency the design system exists to remove, and no amount of
 * review catches it because every individual instance looks reasonable.
 *
 * The `tone` x `appearance` axes below are those measured recipes, promoted to
 * the component with the majority values chosen as canonical (fill /10, border
 * /20 — the modal opacity in the data, not a fresh invention).
 *
 * BACK-COMPAT: the `variant` axis is untouched and `size` defaults to the exact
 * padding/text/gap the old base string hardcoded, so all 1142 existing call
 * sites render byte-identically. `tone` and `size` are purely additive.
 *
 * `tone` and `variant` are mutually exclusive — passing `tone` suppresses
 * `variant`, since both paint the same three properties and a merge would just
 * be a specificity race.
 */

const BADGE_BASE =
  // `--badge-radius-scale` is deliberately NOT `--control-radius-scale`: pill
  // badges beside square buttons is a common and intentional look, so the two
  // are separate axes. Weight and border width DO follow the control tokens —
  // a badge is a control-sized thing and reads wrong at a different weight.
  "inline-flex items-center justify-center rounded-[calc(var(--radius-md)*var(--badge-radius-scale))] border-[length:var(--control-border-width)] font-[var(--control-font-weight)] w-fit whitespace-nowrap shrink-0 [&>svg]:pointer-events-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive transition-[color,box-shadow] overflow-hidden";

export const badgeVariants = cva(BADGE_BASE, {
  variants: {
    /** Legacy axis. Kept verbatim so existing call sites do not move. */
    variant: {
      default:
        "border-transparent bg-primary text-primary-foreground [a&]:hover:bg-primary/90",
      primary:
        "border-transparent bg-primary text-primary-foreground [a&]:hover:bg-primary/90",
      secondary:
        "border-transparent bg-secondary text-secondary-foreground [a&]:hover:bg-secondary/90",
      soft: "border-transparent bg-secondary text-secondary-foreground [a&]:hover:bg-secondary/90",
      muted:
        "border-transparent bg-muted text-muted-foreground [a&]:hover:bg-muted/90",
      destructive:
        // `text-white` on `bg-destructive` measures 3.28:1 in dark — below AA
        // for a 12px label, in a primitive used across the whole app.
        // `--destructive-foreground` is the ink the system pairs with this
        // fill and clears it in both themes.
        "border-transparent bg-destructive text-destructive-foreground [a&]:hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40",
      outline:
        "text-foreground [a&]:hover:bg-accent [a&]:hover:text-accent-foreground",
      success:
        "border-transparent bg-success text-success-foreground [a&]:hover:bg-success/90",
      warning:
        "border-transparent bg-warning text-warning-foreground [a&]:hover:bg-warning/90",
      info: "border-transparent bg-info text-info-foreground [a&]:hover:bg-info/90",
    },

    /**
     * Semantic colour. Pair with `appearance` to choose how it is painted.
     * `neutral` is the "no status" tone — the grey chip.
     */
    tone: {
      primary: "",
      secondary: "",
      success: "",
      warning: "",
      destructive: "",
      info: "",
      neutral: "",
    },

    /** How `tone` is painted. Ignored unless `tone` is set. */
    appearance: {
      solid: "",
      soft: "",
      outline: "",
      ghost: "",
    },

    /**
     * `sm` reproduces the old hardcoded base exactly (`px-2 py-0.5 text-xs
     * gap-1 [&>svg:not([class*='size-']):not([class*='h-'])]:size-3`), so it is the default and nothing shifts.
     */
    size: {
      xs: "px-1.5 py-0 text-[10px] gap-0.5 [&>svg:not([class*='size-']):not([class*='h-'])]:size-2.5",
      sm: "px-2 py-0.5 text-xs gap-1 [&>svg:not([class*='size-']):not([class*='h-'])]:size-3",
      md: "px-2.5 py-0.5 text-sm gap-1.5 [&>svg:not([class*='size-']):not([class*='h-'])]:size-3.5",
      lg: "px-3 py-1 text-sm gap-1.5 [&>svg:not([class*='size-']):not([class*='h-'])]:size-4",
    },
  },

  compoundVariants: [
    // ---- solid: token fill + its paired foreground -------------------------
    { tone: "primary", appearance: "solid", class: "border-transparent bg-primary text-primary-foreground [a&]:hover:bg-primary/90" },
    { tone: "secondary", appearance: "solid", class: "border-transparent bg-secondary text-secondary-foreground [a&]:hover:bg-secondary/90" },
    { tone: "success", appearance: "solid", class: "border-transparent bg-success text-success-foreground [a&]:hover:bg-success/90" },
    { tone: "warning", appearance: "solid", class: "border-transparent bg-warning text-warning-foreground [a&]:hover:bg-warning/90" },
    { tone: "destructive", appearance: "solid", class: "border-transparent bg-destructive text-destructive-foreground [a&]:hover:bg-destructive/90" },
    { tone: "info", appearance: "solid", class: "border-transparent bg-info text-info-foreground [a&]:hover:bg-info/90" },
    { tone: "neutral", appearance: "solid", class: "border-transparent bg-muted text-foreground [a&]:hover:bg-muted/90" },

    // ---- soft: the measured majority recipe — fill /10, border /20 ---------
    //
    // THE HOVER STEP IS /15, AND IT MATCHES `components/ui/button.tsx`.
    // These two primitives sit side by side on nearly every screen, so a soft
    // badge and a soft button that lifted by different amounts read as two
    // different systems. They now step identically: rest /10, hover /15.
    //
    // Why /15 and not the /20 this used to be: `text-{tone}-ink` is calibrated
    // for a /10 tint (globals.css) and each extra 5% of tint spends ~0.3 of the
    // ratio, so /20 put every soft badge at 4.05-4.27:1 on hover — below AA, on
    // small text, in a primitive used app-wide.
    //
    // Does "transient" excuse it? No. WCAG 1.4.3 has no exemption for hover:
    // unlike a focus flash, a hover state persists for exactly as long as the
    // pointer rests on the element, which is precisely when someone is reading
    // it — and on touch it can stick after the tap. A state you can read in is
    // a state that has to be readable. What transience DOES buy is the choice
    // of /15 over /10: /15 clears AA on card, surface-2 and background and
    // misses only on surface-3 (primary 4.49, destructive 4.38, i.e. within 3%
    // of the floor), and a hover step of zero would make the affordance
    // disappear. That is the trade globals.css already blessed as "the ceiling
    // for a HOVER step", and it is the step `data-table/.../cells/badge.tsx`
    // has always used.
    //
    // Note `[a&]:` — this hover only ever applied to badges rendered as an
    // anchor (`asChild` over a <Link>). The plain <span> badge has no hover
    // state at all, which is why the defect went unseen for so long.
    { tone: "primary", appearance: "soft", class: "bg-primary/10 border-primary/20 text-primary-ink [a&]:hover:bg-primary/15" },
    { tone: "secondary", appearance: "soft", class: "bg-secondary border-transparent text-secondary-foreground [a&]:hover:bg-secondary/80" },
    { tone: "success", appearance: "soft", class: "bg-success/10 border-success/20 text-success-ink [a&]:hover:bg-success/15" },
    { tone: "warning", appearance: "soft", class: "bg-warning/10 border-warning/20 text-warning-ink [a&]:hover:bg-warning/15" },
    { tone: "destructive", appearance: "soft", class: "bg-destructive/10 border-destructive/20 text-destructive-ink [a&]:hover:bg-destructive/15" },
    { tone: "info", appearance: "soft", class: "bg-info/10 border-info/20 text-info-ink [a&]:hover:bg-info/15" },
    { tone: "neutral", appearance: "soft", class: "bg-muted border-transparent text-muted-foreground [a&]:hover:bg-muted/80" },

    // ---- outline: no fill, tone-tinted rule -------------------------------
    { tone: "primary", appearance: "outline", class: "bg-transparent border-primary/30 text-primary-ink [a&]:hover:bg-primary/10" },
    { tone: "secondary", appearance: "outline", class: "bg-transparent border-border-strong text-secondary-foreground [a&]:hover:bg-secondary" },
    { tone: "success", appearance: "outline", class: "bg-transparent border-success/30 text-success-ink [a&]:hover:bg-success/10" },
    { tone: "warning", appearance: "outline", class: "bg-transparent border-warning/30 text-warning-ink [a&]:hover:bg-warning/10" },
    { tone: "destructive", appearance: "outline", class: "bg-transparent border-destructive/30 text-destructive-ink [a&]:hover:bg-destructive/10" },
    { tone: "info", appearance: "outline", class: "bg-transparent border-info/30 text-info-ink [a&]:hover:bg-info/10" },
    { tone: "neutral", appearance: "outline", class: "bg-transparent border-border-strong text-foreground [a&]:hover:bg-accent" },

    // ---- ghost: ink only ---------------------------------------------------
    { tone: "primary", appearance: "ghost", class: "bg-transparent border-transparent text-primary-ink [a&]:hover:bg-primary/10" },
    { tone: "secondary", appearance: "ghost", class: "bg-transparent border-transparent text-secondary-foreground [a&]:hover:bg-secondary" },
    { tone: "success", appearance: "ghost", class: "bg-transparent border-transparent text-success-ink [a&]:hover:bg-success/10" },
    { tone: "warning", appearance: "ghost", class: "bg-transparent border-transparent text-warning-ink [a&]:hover:bg-warning/10" },
    { tone: "destructive", appearance: "ghost", class: "bg-transparent border-transparent text-destructive-ink [a&]:hover:bg-destructive/10" },
    { tone: "info", appearance: "ghost", class: "bg-transparent border-transparent text-info-ink [a&]:hover:bg-info/10" },
    { tone: "neutral", appearance: "ghost", class: "bg-transparent border-transparent text-muted-foreground [a&]:hover:bg-accent" },
  ],

  defaultVariants: {
    size: "sm",
    appearance: "soft",
  },
});

export type BadgeTone = NonNullable<VariantProps<typeof badgeVariants>["tone"]>;
export type BadgeAppearance = NonNullable<
  VariantProps<typeof badgeVariants>["appearance"]
>;

interface BadgeProps
  extends React.ComponentProps<"span">,
    VariantProps<typeof badgeVariants> {
  asChild?: boolean;
}

const Badge = ({
  className,
  variant,
  tone,
  appearance,
  size,
  asChild = false,
  ...props
}: BadgeProps) => {
  const Comp = asChild ? Slot : "span";

  // cva resolves a default when a prop is `undefined`, so `variant` cannot be
  // suppressed by passing null — it has to be omitted from the call entirely.
  // Without this, `<Badge tone="success" />` would paint the default primary
  // fill underneath the tone classes and win or lose on source order.
  const resolved = tone
    ? badgeVariants({ tone, appearance, size })
    : badgeVariants({ variant: variant ?? "default", size });

  return <Comp data-slot="badge" className={cn(resolved, className)} {...props} />;
};

export { Badge };
