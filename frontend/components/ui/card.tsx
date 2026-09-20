import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

/**
 * The card surface.
 *
 * The variants below are not invented — each one is the most common override
 * measured across the 1,467 `<Card>` call sites plus the ~2,997 hand-rolled
 * card surfaces in the app. Before this existed, 803 of those call sites (55%)
 * carried a className that re-specified the surface, which is how the codebase
 * ended up with 165 distinct radius/border/shadow combinations for what is
 * conceptually one thing.
 *
 * What each variant replaces, with the measured counts it was derived from:
 *   ghost     <- 124x `border-0`, 16x `bg-transparent`
 *   outline   <- 56x `border-2`, 32x `border-border-strong`
 *   dashed    <- 18x `border-dashed`
 *   muted     <- 12x `bg-muted/30`
 *   glass     <- 27x `bg-card/50`, 24x `bg-card/80`, 41x `backdrop-blur-sm`
 *   tone=*    <- 43x `border-l-4` paired with a status colour
 *   interactive <- 358 tokens of ad-hoc hover/transition (hover:shadow-xl vs
 *                  -lg vs -md vs -2xl, duration-300 vs -200, ...)
 *
 * Radius is `rounded-lg` — `var(--radius)`, the radius the design system
 * names. It was `rounded-md`, which resolves to `calc(var(--radius) - 2px)`
 * = 2px, so the primitive did not follow its own spec and every author who
 * wanted the documented 4px had to override it.
 */
const cardVariants = cva("text-card-foreground", {
  variants: {
    variant: {
      default: "rounded-lg border-[length:var(--card-border-width)] border-border bg-card",
      /** Recessed — for a card nested inside another card. */
      muted: "rounded-lg border-[length:var(--card-border-width)] border-border bg-muted/30",
      /** No border. The surface still reads because `--card` is one step
          lighter than `--background` in both themes (design system R3). */
      ghost: "rounded-lg bg-card",
      /** Border-led, no fill — sits directly on the page ground. */
      outline: "rounded-lg border-[length:var(--card-border-width)] border-border-strong bg-transparent",
      /** Empty states and drop targets. */
      dashed: "rounded-lg border-[length:var(--card-border-width)] border-dashed border-border-strong bg-transparent",
      /**
       * The explicit opt-out from Ledger, for a surface that genuinely floats
       * above the page rather than sitting in it. Keep it rare: a black shadow
       * on a 6.7%-lightness card reads as almost nothing, so in dark mode this
       * degrades to `default` and the elevation you asked for is not there.
       * Prefer moving the surface up the ramp (`--surface-2`) instead.
       */
      // The only variant with elevation, so it is the only one the strength
      // token can reach. `--card-shadow-strength: 0` makes it flat — which is a
      // real request, and the honest way to grant it, since the alternative
      // (an owner asking for "flat" and getting a shadow anyway) is the bug.
      elevated:
        "rounded-lg border-[length:var(--card-border-width)] border-border bg-card shadow-md shadow-shadow/[calc(0.1*var(--card-shadow-strength))]",
      /** Translucent — only over an image or a coloured band, never on flat ground. */
      glass: "rounded-lg border-[length:var(--card-border-width)] border-border/50 bg-card/80 backdrop-blur-xl",
    },
    /**
     * A status rail on the leading edge. `border-l-*` is physical-direction,
     * so this is `border-s-*` instead and follows RTL — the 43 hand-rolled
     * `border-l-4` rails did not, and pinned the rail to the right-hand side
     * of the card in Arabic and Farsi.
     */
    tone: {
      none: "",
      primary: "border-s-4 border-s-primary",
      success: "border-s-4 border-s-success",
      warning: "border-s-4 border-s-warning",
      destructive: "border-s-4 border-s-destructive",
      info: "border-s-4 border-s-info",
    },
    /**
     * One hover treatment for every clickable card. Transitions only
     * colour — never `transition-all`, which was used 75 times and animates
     * layout properties, and never a translate or scale, which
     * `prefers-reduced-motion` cannot reach from a CSS utility.
     *
     * The hover shadow is gone. Ledger has no elevation to raise a card TO, and
     * a shadow that appears on hover is the one piece of elevation a dark theme
     * renders least: the feedback would have been visible in light mode and
     * absent in dark. Strengthening the border says the same thing in both.
     */
    /**
     * A card that responds to the pointer.
     *
     * THE FOCUS RING ONLY PAINTS IF YOU MAKE THE CARD FOCUSABLE. `Card` renders
     * a plain `<div>`, and a div is not in the tab order, so `focus-visible:*`
     * below can never match on its own — it is live only because `Card` spreads
     * `...props`, letting a caller pass `tabIndex={0}` (and `role="button"`,
     * and a key handler). Setting `interactive` and stopping there gives you the
     * hover affordance and NO keyboard affordance, which is the accessibility
     * bug this variant looks like it is preventing.
     *
     * Two correct shapes:
     *   - the card IS the control: pass `tabIndex={0} role="button"` + onKeyDown
     *     (see `StatsCard`, which does exactly this for its 171 call sites);
     *   - the card is INSIDE a control: put the `<button>` outside and drop
     *     `interactive`, so the ring lands on the thing that actually focuses.
     */
    interactive: {
      true: "cursor-pointer transition-[color,background-color,border-color] duration-200 hover:border-border-strong focus-visible:outline-hidden focus-visible:ring-[3px] focus-visible:ring-ring/50",
      false: "",
    },
    /** Padding for cards used WITHOUT the Header/Content sub-parts. */
    // Multiplied, not replaced — `--card-padding-scale` moves all four steps
    // together and keeps sm < md < lg < xl. A flat padding token would have
    // collapsed this ramp onto one value and thrown away the distinction the
    // 673 measured overrides exist to express.
    padding: {
      none: "",
      sm: "p-[calc(0.75rem*var(--card-padding-scale))]",
      md: "p-[calc(1rem*var(--card-padding-scale))]",
      lg: "p-[calc(1.25rem*var(--card-padding-scale))]",
      xl: "p-[calc(1.5rem*var(--card-padding-scale))]",
    },
  },
  defaultVariants: {
    variant: "default",
    tone: "none",
    interactive: false,
    padding: "none",
  },
});

export interface CardProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof cardVariants> {}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant, tone, interactive, padding, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        cardVariants({ variant, tone, interactive, padding }),
        className
      )}
      {...props}
    />
  )
);
Card.displayName = "Card";

/**
 * Section padding, shared by Header / Content / Footer so a card cannot end up
 * with a 24px header above 16px content.
 *
 * `xl` reproduces the previous hardcoded `p-6` exactly, so this is additive —
 * no existing card moves. The point of the scale is that the 673 measured
 * padding overrides on `CardContent` alone (p-4 142x, p-6 135x, p-5 53x, p-8
 * 20x, p-3 12x, ...) become one named prop instead of arbitrary class strings.
 */
const SECTION_PADDING = {
  none: "p-0",
  sm: "p-[calc(0.75rem*var(--card-padding-scale))]",
  md: "p-[calc(1rem*var(--card-padding-scale))]",
  lg: "p-[calc(1.25rem*var(--card-padding-scale))]",
  xl: "p-[calc(1.5rem*var(--card-padding-scale))]",
} as const;

/**
 * Content and Footer drop their top padding because a Header is assumed to sit
 * above them and already supplies it.
 *
 * When there is no Header the card loses its top padding, which is why 105 call
 * sites add `pt-6` back by hand. The tempting fix is `first:pt-6` — restore it
 * only when the section is the first child — but that is a specificity trap:
 * `.first\:pt-6:first-child` is (0,2,0) and outranks a caller's plain `.p-0`
 * (0,1,0), so it would silently add 24px of top padding to the 29 cards that
 * deliberately set `padding="none"`. Any variant of that rule (`[&:not(...)]`,
 * a parent-scoped `[&>*+*]`) has the same problem: an automatic rule that beats
 * an explicit one is worse than the gap it closes.
 *
 * So this stays byte-identical to the previous hardcoded behaviour, and a
 * headerless card asks for `padding="xl"` on the Content plus `pt-6`, exactly
 * as before. The scale below is the addition; nothing existing moves.
 */
const SECTION_PADDING_TOPLESS = {
  none: "p-0",
  sm: "p-[calc(0.75rem*var(--card-padding-scale))] pt-0",
  md: "p-[calc(1rem*var(--card-padding-scale))] pt-0",
  lg: "p-[calc(1.25rem*var(--card-padding-scale))] pt-0",
  xl: "p-[calc(1.5rem*var(--card-padding-scale))] pt-0",
} as const;

type SectionPadding = keyof typeof SECTION_PADDING;

interface CardSectionProps extends React.HTMLAttributes<HTMLDivElement> {
  padding?: SectionPadding;
}

const CardHeader = React.forwardRef<HTMLDivElement, CardSectionProps>(
  ({ className, padding = "xl", ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "flex flex-col space-y-1.5",
        SECTION_PADDING[padding],
        className
      )}
      {...props}
    />
  )
);
CardHeader.displayName = "CardHeader";

const CardTitle = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("font-semibold leading-none tracking-tight", className)}
    {...props}
  />
));
CardTitle.displayName = "CardTitle";

const CardDescription = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
));
CardDescription.displayName = "CardDescription";

const CardContent = React.forwardRef<HTMLDivElement, CardSectionProps>(
  ({ className, padding = "xl", ...props }, ref) => (
    <div
      ref={ref}
      className={cn(SECTION_PADDING_TOPLESS[padding], className)}
      {...props}
    />
  )
);
CardContent.displayName = "CardContent";

const CardFooter = React.forwardRef<HTMLDivElement, CardSectionProps>(
  ({ className, padding = "xl", ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "flex items-center",
        SECTION_PADDING_TOPLESS[padding],
        className
      )}
      {...props}
    />
  )
);
CardFooter.displayName = "CardFooter";

export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardDescription,
  CardContent,
  cardVariants,
};
