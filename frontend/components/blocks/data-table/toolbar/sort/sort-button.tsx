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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { SortingCard } from "./sorting-card";
import { useTranslations } from "next-intl";

// Premium button styles matching other toolbar buttons
const premiumButtonClass = cn(
  "h-9 px-3",
  "rounded-lg",
  "bg-gradient-to-br from-background via-background to-muted/30",
  "border border-border/50",
  "shadow-sm shadow-black/5",
  "transition-all duration-300",
  "hover:border-primary/30 hover:shadow-md hover:shadow-primary/10"
);

export function SortButton() {
  const t = useTranslations("components_blocks");
  const sorting = useTableStore((state) => state.sorting);
  const currentSortLabel = useTableStore((state) =>
    state.getCurrentSortLabel()
  );

  const hasSorting = sorting.length > 0;

  // If no sorting, show a neutral icon
  // Otherwise use the first item to decide up/down arrow
  const getSortIcon = () => {
    if (!hasSorting) {
      return <ArrowUpDown className="h-4 w-4 shrink-0 text-muted-foreground" />;
    }
    return sorting[0].desc ? (
      <ArrowDown className="h-4 w-4 shrink-0 text-primary" />
    ) : (
      <ArrowUp className="h-4 w-4 shrink-0 text-primary" />
    );
  };

  return (
    <Popover>
      <TooltipProvider>
        <Tooltip>
          <PopoverTrigger asChild>
            <TooltipTrigger asChild>
              <motion.div
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Button
                  variant="ghost"
                  size="sm"
                  className={cn(
                    premiumButtonClass,
                    "flex items-center gap-2 md:max-w-[300px]",
                    hasSorting && "border-primary/30 bg-primary/5"
                  )}
                >
                  <motion.div
                    animate={{ rotate: hasSorting ? [0, -10, 10, 0] : 0 }}
                    transition={{ duration: 0.4, ease: "easeInOut" }}
                  >
                    {getSortIcon()}
                  </motion.div>
                  <span className={cn(
                    "hidden md:inline truncate",
                    hasSorting ? "text-primary font-medium" : "text-foreground"
                  )}>
                    {hasSorting ? `${t("sort")}: ${currentSortLabel}` : t("sort")}
                  </span>
                </Button>
              </motion.div>
            </TooltipTrigger>
          </PopoverTrigger>
          <TooltipContent className="md:hidden">
            <p>{hasSorting ? `${t("sort")}: ${currentSortLabel}` : t("sort")}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
      <PopoverContent
        align="start"
        alignOffset={-14}
        side="bottom"
        className={cn(
          "w-[320px] p-0",
          "bg-linear-to-br from-popover via-popover to-popover/95",
          "backdrop-blur-xl",
          "border border-border/50",
          "shadow-xl shadow-black/10"
        )}
      >
        <SortingCard />
      </PopoverContent>
    </Popover>
  );
}
