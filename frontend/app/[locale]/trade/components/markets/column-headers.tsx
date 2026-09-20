"use client";

import { cn } from "@/lib/utils";
import type { SortField, SortCriteria } from "./types";
import { primarySortOf, SortIcon } from "./sort-controls";

interface Column {
  label: string;
  sortField: SortField;
}

interface ColumnHeadersProps {
  leftColumn: Column;
  rightColumn: Column;
  sortCriteria: SortCriteria;
  onSort: (field: SortField) => void;
}

export function ColumnHeaders({
  leftColumn,
  rightColumn,
  sortCriteria,
  onSort,
}: ColumnHeadersProps) {
  const primarySort = primarySortOf(sortCriteria);

  const renderColumn = (column: Column) => {
    const active = primarySort.field === column.sortField;

    return (
      <button
        className={cn(
          "flex items-center text-xs font-medium transition-colors hover:text-primary",
          active ? "text-primary" : "text-foreground"
        )}
        onClick={() => onSort(column.sortField)}
      >
        <span>{column.label}</span>
        <SortIcon active={active} direction={primarySort.direction} />
      </button>
    );
  };

  return (
    <div className="flex items-center justify-between gap-2 border-b border-border bg-surface-2 p-2">
      {renderColumn(leftColumn)}
      {renderColumn(rightColumn)}
    </div>
  );
}
