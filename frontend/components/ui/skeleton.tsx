import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * The raw placeholder block. Sized by the CALLER.
 *
 * Reach for this only when the thing being awaited genuinely has no text
 * metrics of its own — an avatar, a chart plot area, a map tile. For anything
 * that resolves into TEXT, use `Loadable`/`SkeletonText` below instead: a
 * hand-written `h-8 w-24` beside a `text-2xl leading-tight` figure is a guess,
 * and it was wrong by 2px in the one place this repo already used it (see
 * `stats-card.tsx`). Guesses do not survive a typography change either — the
 * class stays `h-8` forever while the figure it stands in for moves.
 */
function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      className={cn("bg-muted animate-pulse rounded-md", className)}
      {...props}
    />
  );
}

/**
 * A placeholder measured BY THE TEXT IT REPLACES, not by a hardcoded box.
 * ============================================================================
 *
 * THE MECHANISM
 * -------------
 * It renders the placeholder string for real, in the real place, at
 * `visibility: hidden` — so the browser lays it out with the inherited font,
 * size, weight and line-height — then paints the pulse over that box with an
 * absolutely-positioned overlay.
 *
 * The height is therefore not approximated, it is COMPUTED, by the same text
 * layout that will run on the real value a moment later. That is what makes it
 * pixel-exact, and it is also what makes it survive redesign: change the figure
 * from `text-2xl` to `text-3xl` and the skeleton follows on its own, because it
 * is inside the element carrying the class. There is no second copy of the
 * typography to keep in sync — which is the failure mode of every hand-written
 * `loading.tsx` in this app.
 *
 * WIDTH IS EXACT ON FIGURES, APPROXIMATE ON PROSE
 * -----------------------------------------------
 * Every figure in this product is `font-mono tabular-nums` (rule R4, enforced
 * by `StatsCard`), and under tabular figures each digit is the same advance
 * width — so a placeholder with the same character count as the real value is
 * exactly as wide, to the pixel. Prose is proportional, so `chars` there
 * reserves an average, not an identity.
 *
 * That asymmetry is fine and deliberate: vertical shift is what CLS measures
 * and what users see as the page "jumping". A label whose width settles by a
 * few pixels inside its own line box moves nothing below it.
 *
 * ACCESSIBILITY
 * -------------
 * `visibility: hidden` removes the placeholder from the accessibility tree, so
 * nothing announces the fake string. The wrapper carries `aria-busy` so a
 * screen reader can tell the region is still resolving.
 */
export interface SkeletonTextProps extends React.ComponentProps<"span"> {
  /**
   * The string whose box to reserve. Prefer a REAL-SHAPED value — "12,345",
   * "0.00%", "Loading name" — because the box is only as honest as this string.
   *
   * When omitted, `chars` builds one out of zeroes.
   */
  placeholder?: string;
  /**
   * Character count to reserve, when there is no representative string to give.
   * Ignored if `placeholder` is set. Defaults to 6.
   */
  chars?: number;
  /** Corner radius of the pulse overlay. Defaults to the `sm` step. */
  radius?: string;
}

export function SkeletonText({
  placeholder,
  chars = 6,
  radius = "rounded-sm",
  className,
  ...props
}: SkeletonTextProps) {
  /* "0" and not a space: a run of spaces collapses to a single advance in
     normal white-space handling, so a space-built placeholder reserves one
     character no matter what `chars` says. */
  const text = placeholder ?? "0".repeat(Math.max(1, chars));

  return (
    <span
      data-slot="skeleton-text"
      aria-busy="true"
      /*
        PLAIN INLINE — not `inline-block`, and this is the one detail the whole
        primitive rests on.

        `inline-block` was the obvious spelling and it is measurably wrong: an
        inline-block sits on the baseline as an atomic box, so the line box has
        to grow to clear its descender space. Measured against the real text it
        stands in for, that made every placeholder taller — 31.41px against
        30px at `text-2xl`, and 52.14px against 48px at `text-4xl`, because the
        error scales with the font. A skeleton that is 4px too tall is not a
        smaller version of the right answer; it is the same layout jump the
        hardcoded `h-8` produced, arrived at more expensively.

        A plain inline box wrapping text contributes exactly what the text
        would contribute, because it IS text as far as line layout is
        concerned. Zero effect on the line box, at every size, with no lookup
        table of line-heights.
      */
      className={cn("relative", className)}
      {...props}
    >
      {/* The ruler. Hidden, but laid out — this is the whole trick. */}
      <span className="invisible" aria-hidden="true">
        {text}
      </span>
      {/*
        Absolutely positioned against the inline box above. For an inline
        containing block that box is the CONTENT area — ascent plus descent,
        i.e. roughly the glyph box — rather than the full line box, so the
        pulse already reads as a text-height bar and needs no manual trim. That
        is a happy consequence of dropping `inline-block`, not a coincidence:
        the same change that fixed the height also removed the reason for the
        fudge factor that used to be here.
      */}
      <span
        aria-hidden="true"
        className={cn("absolute inset-0 animate-pulse bg-muted", radius)}
      />
    </span>
  );
}

/**
 * Swap a VALUE for a text-measured placeholder while it loads. The chrome
 * around it — label, icon, border, padding — never unmounts.
 *
 * ```tsx
 * <p className="text-2xl font-mono tabular-nums">
 *   <Loadable loading={isLoading} placeholder="12,345">{stats.users}</Loadable>
 * </p>
 * ```
 *
 * This is the shape every page in this app should converge on. The alternative
 * the codebase uses today — `if (isLoading) return <PageSkeleton/>` — replaces
 * the entire subtree, which guarantees a full reflow at the exact moment the
 * user is looking at it, and needs a second hand-maintained copy of the layout
 * to do it.
 */
export interface LoadableProps extends SkeletonTextProps {
  loading: boolean;
  children?: React.ReactNode;
}

export function Loadable({ loading, children, ...skeleton }: LoadableProps) {
  if (!loading) return <>{children}</>;
  return <SkeletonText {...skeleton} />;
}

/**
 * Reserve a block that has no text metrics — an avatar, a thumbnail, a chart.
 *
 * Unlike `SkeletonText` this one CANNOT measure itself, so the caller must
 * give it the same sizing classes the real element carries. Pass them as the
 * same string used on the real node (`"h-11 w-11 rounded-full"`), not as a
 * separately-invented approximation, or this is just the old guess with a new
 * name.
 */
export function SkeletonBlock(props: React.ComponentProps<"div">) {
  return <Skeleton data-slot="skeleton-block" {...props} />;
}

export { Skeleton };
