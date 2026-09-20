"use client";

import { ArrowUpDown, SortAsc, SortDesc } from "lucide-react";
import type { SortCriteria, SortDirection, SortField } from "./types";

/**
 * `column-headers.tsx` and `watchlist-sort-buttons.tsx` each carried a private
 * copy of the same `primarySort` fallback and the same three-branch sort icon.
 */
export function primarySortOf(sortCriteria: SortCriteria): {
  field: SortField;
  direction: SortDirection;
} {
  return sortCriteria[0] ?? { field: "name", direction: "asc" };
}

/**
 * The active icon inherits `currentColor` rather than pinning itself to the
 * accent. It sits on a neutral ground in the column header and on a filled
 * accent chip in the watchlist — a hardcoded `text-primary` was invisible on
 * the second once that chip stopped being a 20% tint.
 */
export function SortIcon({
  active,
  direction,
}: {
  active: boolean;
  direction: SortDirection;
}) {
  if (!active) {
    return <ArrowUpDown className="ml-1 h-3 w-3 opacity-40" />;
  }

  return direction === "asc" ? (
    <SortAsc className="ml-1 h-3 w-3" />
  ) : (
    <SortDesc className="ml-1 h-3 w-3" />
  );
}
