"use client";

import React from "react";
import { PaginationSizeSelector } from "./pagination-size-selector";
import { PaginationInfo } from "./pagination-info";
import { PaginationControls } from "./pagination-controls";
import { cn } from "@/lib/utils";

export function TablePagination() {
  return (
    <div
      className={cn(
        "flex items-center justify-between px-3",
        "ltr:flex-row rtl:flex-row-reverse"
      )}
    >
      <div className="flex items-center space-x-6 lg:space-x-8">
        <PaginationSizeSelector />
      </div>
      <div className="flex items-center space-x-6 lg:space-x-8">
        <PaginationInfo />
        <PaginationControls />
      </div>
    </div>
  );
}
