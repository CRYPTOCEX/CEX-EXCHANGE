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
import { motion, AnimatePresence } from "framer-motion";

// Premium staggered entrance for toolbar buttons
const toolbarContainerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.1,
    },
  },
};

const toolbarItemVariants = {
  hidden: { opacity: 0, y: -8, scale: 0.95 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 0.3,
      ease: [0.22, 1, 0.36, 1] as const,
    },
  },
};

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
      <motion.div
        variants={toolbarContainerVariants}
        initial="hidden"
        animate="visible"
        className={cn(
          "flex flex-col gap-2 sm:gap-4 sm:flex-row sm:items-center sm:justify-between",
          "sm:ltr:flex-row sm:rtl:flex-row-reverse"
        )}
      >
        <motion.div
          variants={toolbarContainerVariants}
          className="flex flex-wrap items-center gap-1.5 sm:gap-2"
        >
          <motion.div variants={toolbarItemVariants}>
            <FilterButton
              showFilters={showFilters}
              setShowFilters={setShowFilters}
            />
          </motion.div>
          <motion.div variants={toolbarItemVariants}>
            <SortButton />
          </motion.div>
          <motion.div variants={toolbarItemVariants}>
            <ShowDeletedButton />
          </motion.div>
          <motion.div variants={toolbarItemVariants}>
            <ColumnToggle />
          </motion.div>
          <motion.div variants={toolbarItemVariants}>
            <ViewModeToggle />
          </motion.div>
        </motion.div>
        <motion.div variants={toolbarItemVariants}>
          <SelectedItemsActions />
        </motion.div>
      </motion.div>
      <AnimatePresence>
        {showFilters && (
          <motion.div
            variants={filterPanelVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            style={{ overflow: "hidden" }}
          >
            <DataTableFilters />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
