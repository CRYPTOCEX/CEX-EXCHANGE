import React from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Columns } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTableStore } from "../store";
import { useTranslations } from "next-intl";
import { motion } from "framer-motion";

// Premium button styles
const premiumButtonClass = cn(
  "h-10 px-3",
  "rounded-lg",
  "bg-gradient-to-br from-background via-background to-muted/30",
  "border border-border/50",
  "shadow-sm shadow-black/5",
  "transition-all duration-300",
  "hover:border-primary/30 hover:shadow-md hover:shadow-primary/10"
);

export function ColumnToggle() {
  const t = useTranslations("common");
  const tComponentsBlocks = useTranslations("components_blocks");
  const canView = useTableStore((state) => state.tableConfig.canView);
  const visibleColumns = useTableStore((state) => state.visibleColumns);
  const toggleColumnVisibility = useTableStore(
    (state) => state.toggleColumnVisibility
  );
  const columns = useTableStore((state) => state.columns);

  if (!columns || columns.length === 0 || !canView) {
    return null;
  }

  return (
    <DropdownMenu>
      <TooltipProvider>
        <Tooltip>
          <DropdownMenuTrigger asChild>
            <TooltipTrigger asChild>
              <motion.div
                whileHover={{ scale: 1.03, y: -1 }}
                whileTap={{ scale: 0.97 }}
              >
                <Button variant="ghost" size="sm" className={premiumButtonClass}>
                  <Columns className={cn("h-4 w-4 text-muted-foreground", "md:ltr:mr-2 md:rtl:ml-2")} />
                  <span className="hidden md:inline">{t("columns")}</span>
                </Button>
              </motion.div>
            </TooltipTrigger>
          </DropdownMenuTrigger>
          <TooltipContent className="md:hidden">
            <p>{t("columns")}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
      <DropdownMenuContent
        align="end"
        className={cn(
          "w-[220px]",
          "ltr:text-left rtl:text-right",
          "bg-gradient-to-br from-popover via-popover to-popover/95",
          "backdrop-blur-xl",
          "border border-border/50",
          "shadow-xl shadow-black/10"
        )}
      >
        <DropdownMenuLabel className="text-muted-foreground font-medium">
          {tComponentsBlocks("toggle_columns")}
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="bg-border/50" />
        {columns
          .filter(
            (column) =>
              column.key !== "select" &&
              column.key !== "actions" &&
              !column.expandedOnly
          )
          .map((column) => (
            <DropdownMenuCheckboxItem
              key={column.key}
              className={cn(
                "capitalize cursor-pointer",
                "rounded-md mx-1 my-0.5",
                "transition-colors duration-200",
                "hover:bg-primary/5"
              )}
              checked={visibleColumns.includes(column.key)}
              onCheckedChange={() => toggleColumnVisibility(column.key)}
            >
              {column.title}
            </DropdownMenuCheckboxItem>
          ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
