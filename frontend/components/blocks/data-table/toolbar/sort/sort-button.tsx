"use client";

import React from "react";
import { useTableStore } from "../../store";
import { Button } from "@/components/ui/button";
import { ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";
import { SortingCard } from "./sorting-card";

export function SortButton() {
  const sorting = useTableStore((state) => state.sorting);
  const currentSortLabel = useTableStore((state) =>
    state.getCurrentSortLabel()
  );

  // If no sorting, show a neutral icon
  // Otherwise use the first item to decide up/down arrow
  const getSortIcon = () => {
    if (!sorting.length) {
      return <ArrowUpDown className="h-4 w-4 shrink-0" />;
    }
    return sorting[0].desc ? (
      <ArrowDown className="h-4 w-4 shrink-0" />
    ) : (
      <ArrowUp className="h-4 w-4 shrink-0" />
    );
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <motion.div whileTap={{ scale: 0.95 }}>
          <Button
            variant="outline"
            size="sm"
            className={cn(
              sorting.length > 0 ? "bg-accent" : "",
              "flex items-center gap-2 max-w-[300px]"
            )}
          >
            <div className="flex items-center gap-2 min-w-0">
              {getSortIcon()}
              <span className="truncate">
                {sorting.length > 0 ? `Sort: ${currentSortLabel}` : "Sort"}
              </span>
            </div>
          </Button>
        </motion.div>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        alignOffset={-14}
        side="bottom"
        className="w-[320px] p-0"
      >
        <SortingCard />
      </PopoverContent>
    </Popover>
  );
}
