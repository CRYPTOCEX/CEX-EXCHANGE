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

// Predefined grid row classes
const GRID_ROWS_MAP: Record<number, string> = {
  1: "grid-rows-1",
  2: "grid-rows-2",
  3: "grid-rows-3",
  4: "grid-rows-4",
  5: "grid-rows-5",
  6: "grid-rows-6",
  7: "grid-rows-7",
  8: "grid-rows-8",
  9: "grid-rows-9",
  10: "grid-rows-10",
};

const SM_GRID_ROWS_MAP: Record<number, string> = {
  1: "sm:grid-rows-1",
  2: "sm:grid-rows-2",
  3: "sm:grid-rows-3",
  4: "sm:grid-rows-4",
  5: "sm:grid-rows-5",
  6: "sm:grid-rows-6",
  7: "sm:grid-rows-7",
  8: "sm:grid-rows-8",
  9: "sm:grid-rows-9",
  10: "sm:grid-rows-10",
};

const LG_GRID_ROWS_MAP: Record<number, string> = {
  1: "lg:grid-rows-1",
  2: "lg:grid-rows-2",
  3: "lg:grid-rows-3",
  4: "lg:grid-rows-4",
  5: "lg:grid-rows-5",
  6: "lg:grid-rows-6",
  7: "lg:grid-rows-7",
  8: "lg:grid-rows-8",
  9: "lg:grid-rows-9",
  10: "lg:grid-rows-10",
};

// Predefined col-span classes
const COL_SPAN_MAP: Record<number, string> = {
  1: "col-span-1",
  2: "col-span-2",
  3: "col-span-3",
  4: "col-span-4",
  5: "col-span-5",
  6: "col-span-6",
  7: "col-span-7",
  8: "col-span-8",
  9: "col-span-9",
  10: "col-span-10",
  11: "col-span-11",
  12: "col-span-12",
};

const SM_COL_SPAN_MAP: Record<number, string> = {
  1: "sm:col-span-1",
  2: "sm:col-span-2",
  3: "sm:col-span-3",
  4: "sm:col-span-4",
  5: "sm:col-span-5",
  6: "sm:col-span-6",
  7: "sm:col-span-7",
  8: "sm:col-span-8",
  9: "sm:col-span-9",
  10: "sm:col-span-10",
  11: "sm:col-span-11",
  12: "sm:col-span-12",
};

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
 * Generates Tailwind CSS grid classes based on responsive layout configuration
 */
export function getResponsiveGridClasses(
  responsive?: ResponsiveLayout,
  fallbackCols?: number,
  fallbackRows?: number
): string {
  const classes: string[] = ["grid", "gap-4"];

  if (!responsive) {
    // Fallback to legacy layout
    if (fallbackCols && GRID_COLS_MAP[fallbackCols]) {
      classes.push(GRID_COLS_MAP[fallbackCols]);
    }
    if (fallbackRows && GRID_ROWS_MAP[fallbackRows]) {
      classes.push(GRID_ROWS_MAP[fallbackRows]);
    }
    return cn(classes);
  }

  // Mobile (default)
  const mobileCols = responsive.mobile?.cols ?? 1;
  const mobileRows = responsive.mobile?.rows;

  if (GRID_COLS_MAP[mobileCols]) {
    classes.push(GRID_COLS_MAP[mobileCols]);
  }
  if (mobileRows && GRID_ROWS_MAP[mobileRows]) {
    classes.push(GRID_ROWS_MAP[mobileRows]);
  }
  if (responsive.mobile?.hidden) {
    classes.push("hidden");
  }

  // Tablet (sm breakpoint)
  const tabletCols = responsive.tablet?.cols ?? 2;
  const tabletRows = responsive.tablet?.rows;

  if (SM_GRID_COLS_MAP[tabletCols]) {
    classes.push(SM_GRID_COLS_MAP[tabletCols]);
  }
  if (tabletRows && SM_GRID_ROWS_MAP[tabletRows]) {
    classes.push(SM_GRID_ROWS_MAP[tabletRows]);
  }
  if (responsive.tablet?.hidden) {
    classes.push("sm:hidden");
  } else if (responsive.mobile?.hidden && !responsive.tablet?.hidden) {
    classes.push("sm:grid"); // Show on tablet if hidden on mobile
  }

  // Desktop (lg breakpoint)
  const desktopCols = responsive.desktop?.cols ?? tabletCols;
  const desktopRows = responsive.desktop?.rows;

  if (LG_GRID_COLS_MAP[desktopCols]) {
    classes.push(LG_GRID_COLS_MAP[desktopCols]);
  }
  if (desktopRows && LG_GRID_ROWS_MAP[desktopRows]) {
    classes.push(LG_GRID_ROWS_MAP[desktopRows]);
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
 */
export function getResponsiveItemClasses(
  responsive?: ResponsiveLayout
): string {
  if (!responsive) return "";

  const classes: string[] = [];

  // Mobile
  if (responsive.mobile?.span && responsive.mobile.span > 1 && COL_SPAN_MAP[responsive.mobile.span]) {
    classes.push(COL_SPAN_MAP[responsive.mobile.span]);
  }
  if (responsive.mobile?.order) {
    classes.push(`order-${responsive.mobile.order}`);
  }
  if (responsive.mobile?.hidden) {
    classes.push("hidden");
  }

  // Tablet
  if (responsive.tablet?.span && SM_COL_SPAN_MAP[responsive.tablet.span]) {
    classes.push(SM_COL_SPAN_MAP[responsive.tablet.span]);
  }
  if (responsive.tablet?.order) {
    classes.push(`sm:order-${responsive.tablet.order}`);
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
  if (responsive.desktop?.order) {
    classes.push(`lg:order-${responsive.desktop.order}`);
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
 * FIXED: Use single column layout to respect individual item responsive configs
 */
export function getSectionGridClasses(isArray: boolean): string {
  return cn(
    "grid gap-6",
    // Use single column for both arrays and non-arrays
    // This allows each item's responsive config to control its own layout
    "grid-cols-1",
    // On larger screens, arrays can flow into multiple columns naturally
    // Use 3-column grid to allow flexible span ratios (2:1, 1:2, etc.)
    isArray && "sm:grid-cols-2 lg:grid-cols-3 lg:auto-rows-fr" // Equal height rows
  );
}
