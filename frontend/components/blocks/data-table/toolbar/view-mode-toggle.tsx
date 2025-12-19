"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { LayoutGrid, List } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTableStore } from "../store";
import { useTranslations } from "next-intl";
import { motion } from "framer-motion";

export function ViewModeToggle() {
  const t = useTranslations("common");
  const viewMode = useTableStore((state) => state.viewMode);
  const setViewMode = useTableStore((state) => state.setViewMode);
  const canView = useTableStore((state) => state.tableConfig.canView);

  if (!canView) {
    return null;
  }

  // Hide on mobile - card view is forced automatically
  return (
    <TooltipProvider>
      <div
        className={cn(
          "hidden md:flex items-center overflow-hidden",
          "rounded-lg",
          "bg-gradient-to-br from-background via-background to-muted/30",
          "border border-border/50",
          "shadow-sm shadow-black/5"
        )}
      >
        <Tooltip>
          <TooltipTrigger asChild>
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Button
                variant="ghost"
                size="sm"
                className={cn(
                  "h-10 px-3 rounded-none border-0 relative",
                  "transition-all duration-300",
                  viewMode === "table"
                    ? "text-primary bg-primary/15"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                )}
                onClick={() => setViewMode("table")}
                aria-label={t("table_view")}
              >
                <List className="h-4 w-4" />
                {viewMode === "table" && (
                  <motion.div
                    layoutId="viewModeIndicator"
                    className="absolute bottom-0 left-1/2 -translate-x-1/2 h-0.5 w-4 bg-primary rounded-full"
                    transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                  />
                )}
              </Button>
            </motion.div>
          </TooltipTrigger>
          <TooltipContent sideOffset={8}>
            <p>{t("table_view")}</p>
          </TooltipContent>
        </Tooltip>

        <div className="w-px h-5 bg-border/50" />

        <Tooltip>
          <TooltipTrigger asChild>
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Button
                variant="ghost"
                size="sm"
                className={cn(
                  "h-10 px-3 rounded-none border-0 relative",
                  "transition-all duration-300",
                  viewMode === "card"
                    ? "text-primary bg-primary/15"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                )}
                onClick={() => setViewMode("card")}
                aria-label={t("card_view")}
              >
                <LayoutGrid className="h-4 w-4" />
                {viewMode === "card" && (
                  <motion.div
                    layoutId="viewModeIndicator"
                    className="absolute bottom-0 left-1/2 -translate-x-1/2 h-0.5 w-4 bg-primary rounded-full"
                    transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                  />
                )}
              </Button>
            </motion.div>
          </TooltipTrigger>
          <TooltipContent sideOffset={8}>
            <p>{t("card_view")}</p>
          </TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  );
}
