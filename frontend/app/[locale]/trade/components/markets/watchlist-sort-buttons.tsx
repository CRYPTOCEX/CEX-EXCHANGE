"use client";

import { cn } from "@/lib/utils";
import type { SortField, SortCriteria } from "./types";
import { useTranslations } from "next-intl";
import { primarySortOf, SortIcon } from "./sort-controls";

interface WatchlistSortButtonsProps {
  sortCriteria: SortCriteria;
  onSort: (field: SortField) => void;
}

/** Four hand-written copies of the same button, differing only in this word. */
const SORT_FIELDS = ["name", "price", "change", "volume"] as const;

export function WatchlistSortButtons({
  sortCriteria,
  onSort,
}: WatchlistSortButtonsProps) {
  const t = useTranslations("common");
  const primarySort = primarySortOf(sortCriteria);

  return (
    <div className="mt-2 flex flex-wrap items-center gap-2">
      {SORT_FIELDS.map((field) => {
        const applied = sortCriteria.some((c) => c.field === field);

        return (
          <button
            key={field}
            // A filled accent, not `bg-primary/20 text-primary`: accent ink on a
            // 20% accent tint measures 3.53:1 in light mode, and this is 10px
            // text. An opaque fill is also deterministic — an alpha tint
            // composites onto whatever panel it happens to land in.
            //
            // `text-primary-ink` does not rescue it either: that token is
            // derived for a /10 tint (see globals.css) and lands at 4.19 on /20.
            // The rejected recipe is the TINT, at any ink.
            className={cn(
              "flex items-center rounded-sm px-2 py-1 text-[10px] transition-colors",
              applied
                ? "bg-primary text-primary-foreground"
                : "bg-surface-3 text-muted-foreground hover:text-foreground"
            )}
            onClick={() => onSort(field)}
          >
            {t(field)}
            <SortIcon
              active={primarySort.field === field}
              direction={primarySort.direction}
            />
          </button>
        );
      })}
    </div>
  );
}
