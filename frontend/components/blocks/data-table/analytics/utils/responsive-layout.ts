import { ResponsiveLayout } from "../../types/analytics";
import { cn } from "@/lib/utils";

// Predefined grid column classes for Tailwind JIT
const GRID_COLS_MAP: Record<number, string> = {
  1: "grid-cols-1",
  2: "grid-cols-2",
  3: "grid-cols-3",
  4: "grid-cols-4",
  5: "grid-cols-5",
  6: "grid-cols-6",
  7: "grid-cols-7",
  8: "grid-cols-8",
  9: "grid-cols-9",
  10: "grid-cols-10",
  11: "grid-cols-11",
  12: "grid-cols-12",
};

const SM_GRID_COLS_MAP: Record<number, string> = {
  1: "sm:grid-cols-1",
  2: "sm:grid-cols-2",
  3: "sm:grid-cols-3",
  4: "sm:grid-cols-4",
  5: "sm:grid-cols-5",
  6: "sm:grid-cols-6",
  7: "sm:grid-cols-7",
  8: "sm:grid-cols-8",
  9: "sm:grid-cols-9",
  10: "sm:grid-cols-10",
  11: "sm:grid-cols-11",
  12: "sm:grid-cols-12",
};

const LG_GRID_COLS_MAP: Record<number, string> = {
  1: "lg:grid-cols-1",
  2: "lg:grid-cols-2",
  3: "lg:grid-cols-3",
  4: "lg:grid-cols-4",
  5: "lg:grid-cols-5",
  6: "lg:grid-cols-6",
  7: "lg:grid-cols-7",
  8: "lg:grid-cols-8",
  9: "lg:grid-cols-9",
  10: "lg:grid-cols-10",
  11: "lg:grid-cols-11",
  12: "lg:grid-cols-12",
};

/**
 * THE ROW COUNT IS DELIBERATELY NOT RENDERED — see `getResponsiveGridClasses`.
 *
 * `grid-rows-N` compiles to `repeat(N, minmax(0, 1fr))`, i.e. FRACTIONAL tracks
 * that absorb every pixel of free height in the container. A KPI block sits
 * beside a donut inside a `lg:auto-rows-fr` section, so its container is as tall
 * as that donut (~500px) — and a `lg:grid-rows-1` inside it handed all 500px to
 * the one row. That is the "cards are three times too tall with the number
 * floating at the top" bug on every analytics page that pairs KPIs with a pie:
 * five 190x500 columns of mostly empty card.
 *
 * Auto-placement already derives the row count from the column count and the
 * number of items, so the config's `rows` was never load-bearing — it only ever
 * stretched things. `content-start` (below) is the other half of the fix: with
 * no explicit tracks the IMPLICIT rows are auto-sized, but `align-content`
 * defaults to `stretch`, which distributes the same free space across them.
 */

// Predefined col-span classes
/* Only the `lg` spans survive — below that breakpoint a section is a single
   column, so there is nothing to span. See `getResponsiveItemClasses`. */
const LG_COL_SPAN_MAP: Record<number, string> = {
  1: "lg:col-span-1",
  2: "lg:col-span-2",
  3: "lg:col-span-3",
  4: "lg:col-span-4",
  5: "lg:col-span-5",
  6: "lg:col-span-6",
  7: "lg:col-span-7",
  8: "lg:col-span-8",
  9: "lg:col-span-9",
  10: "lg:col-span-10",
  11: "lg:col-span-11",
  12: "lg:col-span-12",
};

/**
 * `order-*` needs the same literal-map treatment the col-spans above already
 * get. It was the one property still built by interpolation
 * (`` `order-${responsive.mobile.order}` ``), and Tailwind only emits classes it
 * has seen in source — so reordering a card on mobile, tablet or desktop did
 * nothing at all while the spans beside it worked.
 */
const ORDER_MAP: Record<number, string> = {
  1: "order-1", 2: "order-2", 3: "order-3", 4: "order-4",
  5: "order-5", 6: "order-6", 7: "order-7", 8: "order-8",
  9: "order-9", 10: "order-10", 11: "order-11", 12: "order-12",
};

const SM_ORDER_MAP: Record<number, string> = {
  1: "sm:order-1", 2: "sm:order-2", 3: "sm:order-3", 4: "sm:order-4",
  5: "sm:order-5", 6: "sm:order-6", 7: "sm:order-7", 8: "sm:order-8",
  9: "sm:order-9", 10: "sm:order-10", 11: "sm:order-11", 12: "sm:order-12",
};

const LG_ORDER_MAP: Record<number, string> = {
  1: "lg:order-1", 2: "lg:order-2", 3: "lg:order-3", 4: "lg:order-4",
  5: "lg:order-5", 6: "lg:order-6", 7: "lg:order-7", 8: "lg:order-8",
  9: "lg:order-9", 10: "lg:order-10", 11: "lg:order-11", 12: "lg:order-12",
};

/**
 * Generates Tailwind CSS grid classes based on responsive layout configuration
 *
 * `content-start` is not cosmetic: a KPI block is a grid ITEM of an
 * `lg:auto-rows-fr` section, so it is stretched to the height of whatever else
 * shares its row — normally a donut card half again as tall as a row of stat
 * cards. Left at the default `align-content: stretch`, that surplus height is
 * poured into the card rows, which is what made a 176px KPI render 500px tall
 * with its figure stranded at the top. Packing the rows to the start lets each
 * card keep the height it asks for and leaves the slack at the bottom of the
 * column, where it is invisible.
 */
export function getResponsiveGridClasses(
  responsive?: ResponsiveLayout,
  fallbackCols?: number
): string {
  const classes: string[] = ["grid", "gap-4", "content-start"];

  if (!responsive) {
    // Fallback to legacy layout
    if (fallbackCols && GRID_COLS_MAP[fallbackCols]) {
      classes.push(GRID_COLS_MAP[fallbackCols]);
    }
    return cn(classes);
  }

  // Mobile (default)
  const mobileCols = responsive.mobile?.cols ?? 1;

  if (GRID_COLS_MAP[mobileCols]) {
    classes.push(GRID_COLS_MAP[mobileCols]);
  }
  if (responsive.mobile?.hidden) {
    classes.push("hidden");
  }

  // Tablet (sm breakpoint)
  const tabletCols = responsive.tablet?.cols ?? 2;

  if (SM_GRID_COLS_MAP[tabletCols]) {
    classes.push(SM_GRID_COLS_MAP[tabletCols]);
  }
  if (responsive.tablet?.hidden) {
    classes.push("sm:hidden");
  } else if (responsive.mobile?.hidden && !responsive.tablet?.hidden) {
    classes.push("sm:grid"); // Show on tablet if hidden on mobile
  }

  // Desktop (lg breakpoint)
  const desktopCols = responsive.desktop?.cols ?? tabletCols;

  if (LG_GRID_COLS_MAP[desktopCols]) {
    classes.push(LG_GRID_COLS_MAP[desktopCols]);
  }
  if (responsive.desktop?.hidden) {
    classes.push("lg:hidden");
  } else if ((responsive.mobile?.hidden || responsive.tablet?.hidden) && !responsive.desktop?.hidden) {
    classes.push("lg:grid"); // Show on desktop if hidden on mobile/tablet
  }

  return cn(classes);
}

/**
 * Generates item-specific classes for grid positioning
 *
 * NO mobile or tablet `col-span`, and that is a pair with the single-column
 * section below `lg` in `getSectionGridClasses`. A span only means something
 * against a known column count, and the two were out of step: the section was
 * `sm:grid-cols-2` while charts declared `tablet: { span: 1 }`, so from 640px to
 * 1024px every pie sat in the left half of its row with the right half blank —
 * on the review, discount and campaign pages, and on every other paired section
 * in the admin, because span 1 is also what a config gets by omitting it.
 *
 * Below `lg` each block now owns a full row, which is the layout those spans
 * were reaching for anyway (93 of the 213 declared tablet spans already said
 * "2", i.e. "all of it"). Only the desktop span, where there is a real 3-column
 * grid to divide, is emitted.
 */
export function getResponsiveItemClasses(
  responsive?: ResponsiveLayout
): string {
  if (!responsive) return "";

  const classes: string[] = [];

  // Mobile
  if (responsive.mobile?.order && ORDER_MAP[responsive.mobile.order]) {
    classes.push(ORDER_MAP[responsive.mobile.order]);
  }
  if (responsive.mobile?.hidden) {
    classes.push("hidden");
  }

  // Tablet
  if (responsive.tablet?.order && SM_ORDER_MAP[responsive.tablet.order]) {
    classes.push(SM_ORDER_MAP[responsive.tablet.order]);
  }
  if (responsive.tablet?.hidden) {
    classes.push("sm:hidden");
  } else if (responsive.mobile?.hidden && !responsive.tablet?.hidden) {
    classes.push("sm:block");
  }

  // Desktop
  if (responsive.desktop?.span && LG_COL_SPAN_MAP[responsive.desktop.span]) {
    classes.push(LG_COL_SPAN_MAP[responsive.desktop.span]);
  }
  if (responsive.desktop?.order && LG_ORDER_MAP[responsive.desktop.order]) {
    classes.push(LG_ORDER_MAP[responsive.desktop.order]);
  }
  if (responsive.desktop?.hidden) {
    classes.push("lg:hidden");
  } else if ((responsive.mobile?.hidden || responsive.tablet?.hidden) && !responsive.desktop?.hidden) {
    classes.push("lg:block");
  }

  return cn(classes);
}

/**
 * Generates container grid classes for section rows
 *
 * One block per row until `lg`, then a 3-column grid so a grouped section can
 * run its KPIs and its chart side by side at the 2:1 ratio the configs ask for.
 *
 * The intermediate `sm:grid-cols-2` step is gone. Two columns from 640px only
 * ever worked for a section whose items both declared `tablet: { span: 1 }`;
 * the common shape — a KPI block at span 2 and a pie at span 1 — put the pie in
 * a half-width cell with nothing beside it, and a KPI block that *did* take a
 * half-width cell then squeezed its own 3-to-7 card columns into ~350px. A
 * 640-1024px viewport is not wide enough to divide twice.
 */
export function getSectionGridClasses(isArray: boolean): string {
  return cn(
    "grid gap-6",
    // Use single column for both arrays and non-arrays
    // This allows each item's responsive config to control its own layout
    "grid-cols-1",
    // On larger screens, arrays can flow into multiple columns naturally
    // Use 3-column grid to allow flexible span ratios (2:1, 1:2, etc.)
    isArray && "lg:grid-cols-3 lg:auto-rows-fr" // Equal height rows
  );
}
