/**
 * Fit a KPI figure to the card it is drawn in.
 * ============================================================================
 *
 * THE DEFECT THIS EXISTS FOR. `-$44,729,652.01` painted straight through the
 * right-hand border of the Fee Revenue card on /admin — measured 55px past the
 * card's content box at a 1024px viewport, 70px at 390px, and reproducible at
 * 1440px as soon as the admin assistant is pinned and takes 26rem off the page.
 *
 * Two things had to be true at once for it to escape rather than merely look
 * cramped:
 *
 *   - `StatsCard`'s root deliberately carries NO `overflow-hidden` (the
 *     sparkline's tooltip renders inside it and would be clipped), so nothing
 *     stopped the text at the border;
 *   - a KPI grid is `grid-cols-N`, which Tailwind emits as `minmax(0, 1fr)`, so
 *     the column could not grow to take the text either.
 *
 * WHY A CONTAINER QUERY. The card's width is the viewport divided by whatever
 * column count the CALL SITE chose, minus the assistant rail if that admin has
 * pinned it. Five column counts times three rail states is not a set of
 * breakpoints anyone can maintain, and `StatsCard` is not told either number.
 * `cqi` asks the card directly, which is the only source that knows.
 *
 * WHY CHARACTER COUNT IS AN HONEST MEASURE HERE, where it usually is not: this
 * figure is `font-mono tabular-nums`, so every glyph — digit, comma, currency
 * sign, minus — advances identically. Width really is proportional to length.
 *
 * This is a separate module from `stats-card.tsx` so the rule can be tested
 * without pulling framer-motion into jsdom — and because jsdom implements no
 * container queries at all, so the arithmetic is the only part a unit test can
 * reach. The rendered result was verified in a real browser instead; see
 * RED-RUNS.md P.FIT.1.
 */

/**
 * Advance width of one monospace glyph, in `em`, WITH HEADROOM.
 *
 * Geist Mono measures ~0.575em (207px for 15 characters at 24px, taken off the
 * live page). The margin covers the fallback face during a cold load, when the
 * webfont has not arrived and a system mono is standing in at a slightly wider
 * advance — the frame where a figure would otherwise briefly overflow is
 * exactly the frame nobody is watching for.
 *
 * The practical effect: a fitted figure lands at about 93% of the width it has,
 * rather than flush against the border.
 */
export const MONO_ADVANCE_EM = 0.62;

/**
 * The ceiling is `text-2xl` — the size every one of the 171 call sites renders
 * today. Because the value can only ever be CLAMPED DOWN from here, a figure
 * that already fits is untouched: this cannot restyle the product, it can only
 * rescue the cards that were already broken.
 */
export const FIGURE_MAX_REM = 1.5;

/**
 * The floor, below which a KPI has stopped being a KPI.
 *
 * It is a real floor, not a formality: with it, a long enough figure in a
 * narrow enough card still does not fit. That case is handled by
 * `overflow-wrap: anywhere` on the element, which wraps it INSIDE the card
 * instead of letting it escape. `anywhere` rather than `break-word` because
 * only `anywhere` reduces min-content width, and the figure box is `w-fit`
 * whenever it sits over a sparkline — `break-word` would leave it measuring
 * itself against the unbroken string and overflowing anyway.
 */
export const FIGURE_MIN_REM = 0.875;

/**
 * The `font-size` for a figure of `chars` characters, or `undefined` for
 * anything that must not be fitted.
 *
 * `undefined` — meaning "leave the `text-2xl` class alone" — is the answer for
 * a value that is not a figure at all. Prose ("Never", "about 2 hours") is set
 * in the interface face, where a fixed advance width does not hold; it also
 * contains spaces, so it wraps on its own and never had this problem.
 */
export function figureFontSize(chars: number): string | undefined {
  if (!Number.isFinite(chars) || chars <= 0) return undefined;
  const divisor = (chars * MONO_ADVANCE_EM).toFixed(2);
  return `clamp(${FIGURE_MIN_REM}rem, calc(100cqi / ${divisor}), ${FIGURE_MAX_REM}rem)`;
}

/**
 * The line box, pinned in ABSOLUTE units — and this is half the fix, not a
 * detail.
 *
 * `1.875rem` is exactly what `text-2xl leading-tight` produced (24px x 1.25),
 * so nothing moves on a card that was already fine. Pinning it is what stops
 * the OTHER shift this change could have introduced: a RELATIVE line height
 * shrinks with the font, so a card whose figure drops to 16px when the data
 * lands would end up ~11px shorter than its own loading placeholder — and in a
 * grid of `h-full` cards, one short card re-rags the whole row.
 */
export const FIGURE_LINE_HEIGHT = "1.875rem";
