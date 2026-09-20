"use client";

import React, { useState } from "react";
import { cn } from "@/lib/utils";
import { FilterButton } from "./filter-button";
import { SortButton } from "./sort/sort-button";
import { ShowDeletedButton } from "./show-deleted-button";
import { ColumnToggle } from "./column-toggle";
import { ViewModeToggle } from "./view-mode-toggle";
import { SelectedItemsActions } from "./selected-items-actions";
import { DataTableFilters } from "./filters";
import { m, AnimatePresence } from "framer-motion";

/* The button row mounts plain. It used to stagger five items in from
   `y: -8, scale: 0.95` at 50ms apart behind a 100ms lead — so Sort, Show
   Deleted, Columns and the view toggle each arrived after the table below them
   had already drawn, and the row visibly assembled itself. The filter panel
   below KEEPS its animation: that one is opened by a click and animates height,
   which is a real reveal rather than an entrance. */

// Premium filter panel animation
const filterPanelVariants = {
  hidden: {
    opacity: 0,
    height: 0,
    y: -10,
  },
  visible: {
    opacity: 1,
    height: "auto",
    y: 0,
    transition: {
      height: { duration: 0.35, ease: [0.04, 0.62, 0.23, 0.98] as const },
      opacity: { duration: 0.25, delay: 0.1 },
      y: { duration: 0.35, ease: [0.22, 1, 0.36, 1] as const },
    },
  },
  exit: {
    opacity: 0,
    height: 0,
    y: -5,
    transition: {
      opacity: { duration: 0.15 },
      height: { duration: 0.25, ease: [0.04, 0.62, 0.23, 0.98] as const },
      y: { duration: 0.2 },
    },
  },
};

interface TableToolbarProps {
  columns: ColumnDefinition[];
}

export function TableToolbar({ columns }: TableToolbarProps) {
  const [showFilters, setShowFilters] = useState(false);

  return (
    <div className="space-y-2 sm:space-y-4">
      <div
        className={cn(
          "flex flex-col gap-2 sm:gap-4 sm:flex-row sm:items-center sm:justify-between",
          "sm:ltr:flex-row sm:rtl:flex-row-reverse"
        )}
      >
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
          <FilterButton
            showFilters={showFilters}
            setShowFilters={setShowFilters}
          />
          <SortButton />
          <ShowDeletedButton />
          <ColumnToggle />
          <ViewModeToggle />
        </div>
        <SelectedItemsActions />
      </div>
      <AnimatePresence>
        {showFilters && (
          <m.div
            variants={filterPanelVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            style={{ overflow: "hidden" }}
          >
            <DataTableFilters />
          </m.div>
        )}
      </AnimatePresence>
    </div>
  );
}
