"use client";

import { ArrowUpDown, SortAsc, SortDesc } from "lucide-react";
import type { SortField, SortCriteria } from "./types";

interface ColumnHeadersProps {
  leftColumn: {
    label: string;
    sortField: SortField;
  };
  rightColumn: {
    label: string;
    sortField: SortField;
  };
  sortCriteria: SortCriteria;
  onSort: (field: SortField) => void;
}

export function ColumnHeaders({
  leftColumn,
  rightColumn,
  sortCriteria,
  onSort,
}: ColumnHeadersProps) {
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
    <div className="flex items-center justify-between p-2 border-b border-zinc-200 dark:border-zinc-800 bg-muted/50 dark:bg-zinc-900">
      <button
        className="flex items-center text-xs font-medium hover:text-primary transition-colors"
        onClick={() => onSort(leftColumn.sortField)}
      >
        <span>{leftColumn.label}</span>
        {getSortIcon(leftColumn.sortField)}
      </button>
      <button
        className="flex items-center text-xs font-medium hover:text-primary transition-colors"
        onClick={() => onSort(rightColumn.sortField)}
      >
        <span>{rightColumn.label}</span>
        {getSortIcon(rightColumn.sortField)}
      </button>
    </div>
  );
}
