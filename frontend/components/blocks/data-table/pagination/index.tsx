"use client";

import React from "react";
import { PaginationSizeSelector } from "./pagination-size-selector";
import { PaginationInfo } from "./pagination-info";
import { PaginationControls } from "./pagination-controls";
import { cn } from "@/lib/utils";

/* The pagination bar is the LAST thing on the page, so its old
   `y: 8` + 100ms-delayed stagger was the most visible part of the slide-up:
   the bar settled after the rows above it had finished. It mounts in place now.
   The page NUMBERS still animate on change (see ./pagination-info) — that is a
   value transition, not an entrance. */

export function TablePagination() {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-xl mt-4",
        // Premium glassmorphism
        "bg-linear-to-r from-muted/30 via-muted/20 to-muted/30",
        "backdrop-blur-sm",
        // Premium border
        "border border-border/30",
        // Premium shadow
        "shadow-sm shadow-shadow/5"
      )}
    >
      {/* Top accent line */}
      <div className="absolute top-0 left-0 right-0 h-px bg-linear-to-r from-transparent via-primary/10 to-transparent" />

      <div
        className={cn(
          "flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-0 px-4 py-3",
          "sm:ltr:flex-row sm:rtl:flex-row-reverse"
        )}
      >
        {/* Size selector - hidden on very small screens to save space */}
        <div className="hidden sm:flex items-center space-x-4 lg:space-x-6">
          <PaginationSizeSelector />
        </div>
        {/* Page info and controls - always visible, centered on mobile */}
        <div className="flex items-center space-x-3 sm:space-x-4 lg:space-x-6">
          <PaginationInfo />
          <PaginationControls />
        </div>
      </div>
    </div>
  );
}
