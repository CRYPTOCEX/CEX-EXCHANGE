/**
 * Keep a dropdown inside the room it actually has.
 *
 * ---------------------------------------------------------------------------
 * ITS OWN MODULE SO THE ARITHMETIC CAN BE TESTED WITHOUT A BROWSER
 * ---------------------------------------------------------------------------
 * This file imports nothing. The component it serves pulls in framer-motion,
 * next-intl, iconify and the whole menu config — none of which a test of "does
 * a number get clamped" should have to load, and all of which would make the
 * suite slow enough that nobody runs it.
 *
 * The measuring stays in the component, because only it can read the DOM. The
 * DECISION lives here, because that is the part that is wrong when a panel hangs
 * off the edge of the screen.
 */

export interface ClampInput {
  /** The panel's natural left edge, in viewport pixels, before any correction. */
  left: number;
  /** Its laid-out width — untransformed, so an entrance animation cannot skew it. */
  width: number;
  /**
   * The right edge of the space the panel may use.
   *
   * The BAR's right edge, not the viewport's. When the admin assistant is
   * pinned the header is narrowed to make room for it, and a panel allowed to
   * run to `window.innerWidth` would slide underneath the panel it was making
   * room for.
   */
  availableRight: number;
  /** Breathing room at either end. */
  gutter?: number;
}

/**
 * How far to move the panel horizontally. `0` when it already fits.
 *
 * ---------------------------------------------------------------------------
 * "DOES NOT FIT" IS ITS OWN CASE, TESTED FIRST
 * ---------------------------------------------------------------------------
 * A panel wider than the space overflows BOTH ends, so the two corrections
 * disagree and whichever is checked first wins by accident. Written as a plain
 * left-then-right pair, a too-wide panel that happens to START inside the gutter
 * falls through to the right-hand branch and is dragged left until its far edge
 * lands — which puts its beginning off the screen.
 *
 * On a mega menu the beginning is the category list you navigate with. Losing
 * the tail of the last column is recoverable; losing the index is not. So a
 * panel that cannot fit pins its LEFT edge and overflows to the right,
 * deliberately, rather than being dragged into uselessness.
 *
 * An earlier version guarded this with `Math.min(0, …)` on the right-hand
 * branch. That was DEAD CODE — the branch's own condition already guarantees a
 * negative result — and the two tests that claimed to cover it were both
 * returning through the left-hand branch instead. Mutating the guard away
 * changed nothing, which is how the gap was found.
 */
export function clampToBar({
  left,
  width,
  availableRight,
  gutter = 12,
}: ClampInput): number {
  const usableRight = availableRight - gutter;

  // Cannot fit however it is placed — keep the start visible.
  if (width > usableRight - gutter) return gutter - left;

  if (left < gutter) return gutter - left;
  if (left + width > usableRight) return usableRight - (left + width);
  return 0;
}
