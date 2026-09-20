import * as React from "react";
import { Slot, Slottable } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";
import { LoaderCircle } from "lucide-react";

/**
 * Button.
 *
 * MEASURED PROBLEM (2026-07-29): 2638 <Button> call sites, 1728 (65%) carrying a
 * className. What they were reaching for was not decoration — it was API the
 * component did not expose:
 *
 *   w-full                      x321   -> no `fullWidth`
 *   h-8 w-8 / h-6 w-6 / h-7 w-7 x162   -> icon sizes that exist but are named
 *                                         off the text scale, so people
 *                                         hand-rolled instead of finding them
 *   h-7 text-xs / h-8 text-xs   x 73   -> NO size changes the text size; every
 *                                         size is `text-sm` from the base
 *   bg-success hover:bg-success x 21   -> no success tone (and that `hover:` is
 *                                         a no-op: same colour as the resting
 *                                         state, so the button looks dead)
 *   rounded-xl / rounded-full   x185   -> `rounded` only offered `full`
 *   text-white                  x 70   -> untokenized ink an admin theme cannot
 *                                         reach
 *
 * BACK-COMPAT: every pre-existing size keeps its exact height/padding, so the
 * 2638 call sites render unchanged. `tone`, `fullWidth`, `iconOnly`, the new
 * `2xs`/`xl` steps and the widened `rounded` axis are additive. The two
 * deliberate changes are called out at their definitions.
 */

const buttonVariants = cva(
  // `transition-[color,box-shadow]` did NOT include background-color, so every
  // variant's `hover:bg-*` snapped instead of easing — the one transition a
  // button actually needs. Border is included for the same reason on `outline`.
  // GEOMETRY IS A TOKEN — plans/COMPONENT-SYSTEM.md. `rounded-md` and
  // `font-medium` became the two control tokens; both resolve to exactly what
  // they replaced (var(--radius-md) x 1, and 500), so this is a no-op until an
  // owner moves a slider. Every `h-*`/`px-*`/`w-*` in the size ramp below is
  // multiplied rather than replaced, which is what keeps the ten steps in
  // proportion instead of collapsing them onto one height.
  "inline-flex cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-[calc(var(--radius-md)*var(--control-radius-scale))] text-sm font-[var(--control-font-weight)] transition-[color,background-color,border-color,box-shadow] duration-200 disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-hidden focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow-2xs hover:bg-primary/90",
        destructive:
          "bg-destructive text-destructive-foreground shadow-2xs hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40",
        outline:
          "border-[length:var(--control-border-width)] border-input bg-background shadow-2xs hover:bg-accent hover:text-accent-foreground",
        secondary:
          "bg-secondary text-secondary-foreground shadow-2xs hover:bg-secondary/80",
        soft: "bg-secondary text-secondary-foreground shadow-2xs hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
        // Was `bg-white/30 text-white border-white/20` — a WHITE pane carrying
        // WHITE ink. Measured on its three real call sites (all over a primary
        // ground): 3.04:1 light / 2.19:1 dark, and hover made it WORSE (2.55 /
        // 1.94) because it raised the fill toward the ink. The border was
        // 1.13-1.20:1 — invisible. On a card ground it was 1.00:1.
        //
        // A glass button belongs over a photograph or a scrim, so the fill must
        // DARKEN what is behind it and the ink stays light: that is exactly the
        // `--overlay` / `--overlay-foreground` pair, both fixed across themes
        // because the ground is media, not the page. Now ~9:1 on any ground.
        glass:
          "bg-overlay/40 text-overlay-foreground shadow-2xs hover:bg-overlay/55 backdrop-blur-lg border-[length:var(--control-border-width)] border-overlay-foreground/25",
      },

      /**
       * Semantic colour, composed with `variant` (which supplies the shape:
       * solid / outline / ghost / soft). `<Button variant="outline"
       * tone="destructive">` is an outlined destructive button.
       *
       * Composition works because `cn()` runs twMerge and cva emits compound
       * classes AFTER variant classes, so the tone wins the conflict cleanly
       * rather than by source-order luck.
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

      size: {
        // `2xs` and `xl` are new — they name the two heights that were most
        // often hand-rolled (h-7 x93, h-12 x63).
        // Each step is its own rem value times the scale, so h-7/h-8/h-9/... stay
        // one step apart at any setting. `rounded-md` is dropped from the steps
        // that carried it — the base now supplies the tokenised radius, and a
        // literal here would outrank it and pin those sizes square.
        //
        // `3xs` names h-6, and it is not a new HEIGHT — `icon-xs` below has been
        // 1.5rem all along. The scale simply had no TEXT step there, so a dense
        // control that wanted a 24px labelled button had to write `h-6 px-2` by
        // hand, and twMerge then deleted the tokenised height the primitive was
        // setting. That is the whole of the "component token killed at call
        // site" defect: the button stops tracking --control-height-scale, so an
        // operator who raises the platform's control size gets every control
        // BUT these. Same padding and text as `2xs`, one step shorter.
        "3xs": "h-[calc(1.5rem*var(--control-height-scale))] px-[calc(0.5rem*var(--control-padding-scale))] text-xs",
        "2xs": "h-[calc(1.75rem*var(--control-height-scale))] px-[calc(0.5rem*var(--control-padding-scale))] text-xs",
        // Only deliberate size change: `xs` gains `text-xs`. It is h-8, and
        // `h-8 text-xs` was written 26 times by hand while `size="xs"` was used
        // twice — the pairing people actually want at this height.
        xs: "h-[calc(2rem*var(--control-height-scale))] px-[calc(0.5rem*var(--control-padding-scale))] text-xs",
        sm: "h-[calc(2.25rem*var(--control-height-scale))] px-[calc(0.75rem*var(--control-padding-scale))]",
        default: "h-[calc(2.5rem*var(--control-height-scale))] px-[calc(1rem*var(--control-padding-scale))] py-2",
        md: "h-[calc(2.5rem*var(--control-height-scale))] px-[calc(1rem*var(--control-padding-scale))]",
        lg: "h-[calc(2.75rem*var(--control-height-scale))] px-[calc(2rem*var(--control-padding-scale))]",
        xl: "h-[calc(3rem*var(--control-height-scale))] px-[calc(2rem*var(--control-padding-scale))] text-base",
        // Legacy icon steps. Kept because 359 + 5 + 2 call sites name them, but
        // note they sit one step BELOW the text scale (`icon-xs` is h-6 while
        // `xs` is h-8). Prefer `iconOnly` on a normal size for new code — it
        // keeps the icon button the same height as the text button beside it.
        // Square, so width takes the HEIGHT scale — a padding change must not
        // turn an icon button into a rectangle.
        icon: "h-[calc(2.5rem*var(--control-height-scale))] w-[calc(2.5rem*var(--control-height-scale))]",
        "icon-sm": "h-[calc(2rem*var(--control-height-scale))] w-[calc(2rem*var(--control-height-scale))]",
        "icon-xs": "h-[calc(1.5rem*var(--control-height-scale))] w-[calc(1.5rem*var(--control-height-scale))]",
      },

      rounded: {
        none: "rounded-none",
        sm: "rounded-sm",
        md: "rounded-md",
        lg: "rounded-lg",
        xl: "rounded-xl",
        full: "rounded-full",
      },

      /** Square, padding-free box sized from `size`. Replaces `h-8 w-8` etc. */
      iconOnly: { true: "px-0 py-0", false: "" },

      /** Replaces the 321 hand-written `w-full`. */
      fullWidth: { true: "w-full", false: "" },
    },

    compoundVariants: [
      // ---- iconOnly: square at every step of the TEXT scale ---------------
      // Width mirrors the step's HEIGHT and therefore takes the height scale.
      // Using the padding scale here would let a roomier setting stretch every
      // icon button into a rectangle, which is the one thing "square" means.
      { iconOnly: true, size: "3xs", class: "w-[calc(1.5rem*var(--control-height-scale))]" },
      { iconOnly: true, size: "2xs", class: "w-[calc(1.75rem*var(--control-height-scale))]" },
      { iconOnly: true, size: "xs", class: "w-[calc(2rem*var(--control-height-scale))]" },
      { iconOnly: true, size: "sm", class: "w-[calc(2.25rem*var(--control-height-scale))]" },
      { iconOnly: true, size: "default", class: "w-[calc(2.5rem*var(--control-height-scale))]" },
      { iconOnly: true, size: "md", class: "w-[calc(2.5rem*var(--control-height-scale))]" },
      { iconOnly: true, size: "lg", class: "w-[calc(2.75rem*var(--control-height-scale))]" },
      { iconOnly: true, size: "xl", class: "w-[calc(3rem*var(--control-height-scale))]" },

      // ---- tone x solid ----------------------------------------------------
      { tone: "primary", variant: "default", class: "bg-primary text-primary-foreground hover:bg-primary/90" },
      { tone: "secondary", variant: "default", class: "bg-secondary text-secondary-foreground hover:bg-secondary/80" },
      { tone: "success", variant: "default", class: "bg-success text-success-foreground hover:bg-success/90" },
      { tone: "warning", variant: "default", class: "bg-warning text-warning-foreground hover:bg-warning/90" },
      { tone: "destructive", variant: "default", class: "bg-destructive text-destructive-foreground hover:bg-destructive/90" },
      { tone: "info", variant: "default", class: "bg-info text-info-foreground hover:bg-info/90" },
      { tone: "neutral", variant: "default", class: "bg-muted text-foreground hover:bg-muted/80" },

      // ---- tone x outline --------------------------------------------------
      { tone: "primary", variant: "outline", class: "border-primary/30 text-primary-ink hover:bg-primary/10 hover:text-primary-ink" },
      { tone: "secondary", variant: "outline", class: "border-border-strong text-secondary-foreground hover:bg-secondary hover:text-secondary-foreground" },
      { tone: "success", variant: "outline", class: "border-success/30 text-success-ink hover:bg-success/10 hover:text-success-ink" },
      { tone: "warning", variant: "outline", class: "border-warning/30 text-warning-ink hover:bg-warning/10 hover:text-warning-ink" },
      { tone: "destructive", variant: "outline", class: "border-destructive/30 text-destructive-ink hover:bg-destructive/10 hover:text-destructive-ink" },
      { tone: "info", variant: "outline", class: "border-info/30 text-info-ink hover:bg-info/10 hover:text-info-ink" },
      { tone: "neutral", variant: "outline", class: "border-border-strong text-foreground hover:bg-accent hover:text-accent-foreground" },

      // ---- tone x ghost ----------------------------------------------------
      { tone: "primary", variant: "ghost", class: "text-primary-ink hover:bg-primary/10 hover:text-primary-ink" },
      { tone: "secondary", variant: "ghost", class: "text-secondary-foreground hover:bg-secondary hover:text-secondary-foreground" },
      { tone: "success", variant: "ghost", class: "text-success-ink hover:bg-success/10 hover:text-success-ink" },
      { tone: "warning", variant: "ghost", class: "text-warning-ink hover:bg-warning/10 hover:text-warning-ink" },
      { tone: "destructive", variant: "ghost", class: "text-destructive-ink hover:bg-destructive/10 hover:text-destructive-ink" },
      { tone: "info", variant: "ghost", class: "text-info-ink hover:bg-info/10 hover:text-info-ink" },
      { tone: "neutral", variant: "ghost", class: "text-muted-foreground hover:bg-accent hover:text-accent-foreground" },

      // ---- tone x soft (tinted fill, tone ink) -----------------------------
      // Rest /10, hover /15 — the same step `components/ui/badge.tsx` uses, and
      // the reasoning for it (including why a transient state still owes AA)
      // is written out once, above the soft compounds in that file.
      { tone: "primary", variant: "soft", class: "bg-primary/10 text-primary-ink hover:bg-primary/15" },
      { tone: "secondary", variant: "soft", class: "bg-secondary text-secondary-foreground hover:bg-secondary/80" },
      { tone: "success", variant: "soft", class: "bg-success/10 text-success-ink hover:bg-success/15" },
      { tone: "warning", variant: "soft", class: "bg-warning/10 text-warning-ink hover:bg-warning/15" },
      { tone: "destructive", variant: "soft", class: "bg-destructive/10 text-destructive-ink hover:bg-destructive/15" },
      { tone: "info", variant: "soft", class: "bg-info/10 text-info-ink hover:bg-info/15" },
      { tone: "neutral", variant: "soft", class: "bg-muted text-muted-foreground hover:bg-muted/80" },

      // ---- tone x link -----------------------------------------------------
      { tone: "success", variant: "link", class: "text-success-ink" },
      { tone: "warning", variant: "link", class: "text-warning-ink" },
      { tone: "destructive", variant: "link", class: "text-destructive-ink" },
      { tone: "info", variant: "link", class: "text-info-ink" },
      { tone: "neutral", variant: "link", class: "text-foreground" },
    ],

    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ComponentProps<"button">,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  loading?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant,
      tone,
      size,
      rounded,
      iconOnly,
      fullWidth,
      asChild = false,
      loading,
      disabled,
      children,
      ...props
    },
    ref
  ) => {
    const Comp = asChild ? Slot : "button";
    const isDisabled = Boolean(disabled || loading);

    // `asChild` hands the button's styling to the child element (almost always
    // a <Link>). Wrapping the content in a <span> would make Slot target that
    // span instead — the child would then be a plain inline element nested
    // inside the styled box, losing the flex row, the gap and the icon sizing,
    // which is what made icon+label links render as two stacked lines.
    // <Slottable> tells Slot which child is the real element, so the classes
    // land on the link itself and the spinner is merged into its children.
    return (
      <Comp
        data-slot="button"
        className={cn(
          buttonVariants({
            variant,
            tone,
            size,
            rounded,
            iconOnly,
            fullWidth,
            className,
          })
        )}
        ref={ref}
        // `disabled` is not a valid attribute on an anchor, so the asChild form
        // expresses the state the accessible way instead.
        disabled={asChild ? undefined : isDisabled}
        aria-disabled={asChild && isDisabled ? true : undefined}
        // A button that swaps its label for a spinner changes content without
        // telling assistive tech; `aria-busy` is how that is announced.
        aria-busy={loading || undefined}
        {...props}
      >
        {/* The spinner is a LOCAL glyph, bundled with the app. It must never come
            from a runtime icon service: the one control that exists to say "this
            is working" would then wait on a third-party round trip to appear, and
            behind a firewall would never appear at all, leaving the button
            looking inert. */}
        {loading && <LoaderCircle className="animate-spin size-4" />}
        {asChild ? <Slottable>{children}</Slottable> : children}
      </Comp>
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
