"use client";

import React, { useState } from "react";
import { cn } from "@/lib/utils";
import { FilterButton } from "./filter-button";
import { SortButton } from "./sort/sort-button";
import { ShowDeletedButton } from "./show-deleted-button";
import { ColumnToggle } from "./column-toggle";
import { SelectedItemsActions } from "./selected-items-actions";
import { DataTableFilters } from "./filters";
import { motion, AnimatePresence } from "framer-motion";

interface TableToolbarProps {
  columns: ColumnDefinition[];
}

export function TableToolbar({ columns }: TableToolbarProps) {
  const [showFilters, setShowFilters] = useState(false);

  return (
    <div className="space-y-4">
      <div
        className={cn(
          "flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between",
          "sm:ltr:flex-row sm:rtl:flex-row-reverse"
        )}
      >
        <div className="flex flex-wrap items-center gap-2">
          <FilterButton
            showFilters={showFilters}
            setShowFilters={setShowFilters}
          />
          <SortButton />
          <ShowDeletedButton />
          <ColumnToggle />
        </div>
        <SelectedItemsActions />
      </div>
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
          >
            <DataTableFilters />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
