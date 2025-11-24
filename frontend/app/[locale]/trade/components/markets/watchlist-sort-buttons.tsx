"use client";

import { cn } from "@/lib/utils";
import { ArrowUpDown, SortAsc, SortDesc } from "lucide-react";
import type { SortField, SortCriteria } from "./types";
import { useTranslations } from "next-intl";

interface WatchlistSortButtonsProps {
  sortCriteria: SortCriteria;
  onSort: (field: SortField) => void;
}

export function WatchlistSortButtons({
  sortCriteria,
  onSort,
}: WatchlistSortButtonsProps) {
  const t = useTranslations("trade/components/markets/watchlist-sort-buttons");
  // Get the primary sort field and direction
  const primarySort = sortCriteria[0] || { field: "name", direction: "asc" };

  // Render sort indicator for column headers
  const getSortIcon = (field: SortField) => {
    const isActive = primarySort.field === field;

    if (!isActive) {
      return <ArrowUpDown className="h-3 w-3 ml-1 opacity-40" />;
    }

    return primarySort.direction === "asc" ? (
      <SortAsc className="h-3 w-3 ml-1 text-primary" />
    ) : (
      <SortDesc className="h-3 w-3 ml-1 text-primary" />
    );
  };

  return (
    <div className="flex items-center mt-2 space-x-2 flex-wrap">
      <button
        className={cn(
          "text-[10px] px-2 py-1 rounded-sm",
          sortCriteria.some((c) => c.field === "name")
            ? "bg-primary/20 text-primary"
            : "bg-muted dark:bg-zinc-800"
        )}
        onClick={() => onSort("name")}
      >
        {t("Name")}
        {getSortIcon("name")}
      </button>
      <button
        className={cn(
          "text-[10px] px-2 py-1 rounded-sm",
          sortCriteria.some((c) => c.field === "price")
            ? "bg-primary/20 text-primary"
            : "bg-muted dark:bg-zinc-800"
        )}
        onClick={() => onSort("price")}
      >
        {t("Price")}
        {getSortIcon("price")}
      </button>
      <button
        className={cn(
          "text-[10px] px-2 py-1 rounded-sm",
          sortCriteria.some((c) => c.field === "change")
            ? "bg-primary/20 text-primary"
            : "bg-muted dark:bg-zinc-800"
        )}
        onClick={() => onSort("change")}
      >
        {t("Change")}
        {getSortIcon("change")}
      </button>
      <button
        className={cn(
          "text-[10px] px-2 py-1 rounded-sm",
          sortCriteria.some((c) => c.field === "volume")
            ? "bg-primary/20 text-primary"
            : "bg-muted dark:bg-zinc-800"
        )}
        onClick={() => onSort("volume")}
      >
        {t("Volume")}
        {getSortIcon("volume")}
      </button>
    </div>
  );
}
