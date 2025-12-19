"use client";

import React, { useCallback, useMemo } from "react";
import { TableHeader, TableRow, TableHead } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ChevronUp, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTableStore } from "../store";
import { useTranslations } from "next-intl";
import { useMediaQuery } from "@/hooks/use-media-query";
import { motion } from "framer-motion";

// Premium header animation variants
const headerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      duration: 0.3,
      ease: [0.22, 1, 0.36, 1],
    },
  },
};

// Sort icon animation variants
const sortIconVariants = {
  inactive: { scale: 1, opacity: 0.5 },
  active: { scale: 1.1, opacity: 1 },
};

interface TableHeaderProps {
  columns: ColumnDefinition[];
  showActions: boolean;
}

export const TableHeaderComponent = React.memo(
  ({ columns, showActions }: TableHeaderProps) => {
    const t = useTranslations("common");
    const getVisibleColumns = useTableStore((state) => state.getVisibleColumns);
    const sorting = useTableStore((state) => state.sorting);
    const handleSort = useTableStore((state) => state.handleSort);
    const getSortKeyForColumn = useTableStore(
      (state) => state.getSortKeyForColumn
    );
    const selectAllRows = useTableStore((state) => state.selectAllRows);
    const deselectAllRows = useTableStore((state) => state.deselectAllRows);
    const data = useTableStore((state) => state.data);
    const selectedRows = useTableStore((state) => state.selectedRows);
    const tableConfig = useTableStore((state) => state.tableConfig);

    // Track screen size changes for responsive column filtering
    const isDesktop = useMediaQuery("(min-width: 1024px)");
    const isTablet = useMediaQuery("(min-width: 768px)");

    // Only show the select column if at least one action is allowed
    const showSelectColumn =
      tableConfig.canCreate || tableConfig.canEdit || tableConfig.canDelete;

    const allSelected = useMemo(() => {
      return data && data.length > 0 && selectedRows.length === data.length;
    }, [data, selectedRows]);

    const handleSelectAll = useCallback(() => {
      if (allSelected) {
        deselectAllRows();
      } else {
        selectAllRows();
      }
    }, [allSelected, selectAllRows, deselectAllRows]);

    // Use getVisibleColumns which respects priority-based filtering for mobile
    // Re-calculates when screen size changes
    const filteredColumns = useMemo(
      () => getVisibleColumns(),
      [getVisibleColumns, isDesktop, isTablet]
    );

    return (
      <TableHeader
        className={cn(
          "rounded-xl",
          // Premium glassmorphism header
          "bg-gradient-to-r from-muted/60 via-muted/40 to-muted/60",
          "backdrop-blur-sm",
          // Use box-shadow for top accent instead of div
          "shadow-[inset_0_1px_0_0_hsl(var(--primary)/0.1)]"
        )}
      >
        <TableRow className="border-none hover:bg-transparent">
          {/* SELECT (CHECKBOX) COLUMN - Fixed width to prevent layout shift */}
          {showSelectColumn && (
            <TableHead
              className={cn(
                "h-12 px-2 sm:px-4",
                "w-[40px] min-w-[40px] max-w-[40px] sm:w-[48px] sm:min-w-[48px] sm:max-w-[48px]",
                "rounded-l-xl"
              )}
            >
              <motion.div
                className="flex items-center"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Checkbox
                  checked={allSelected}
                  onCheckedChange={handleSelectAll}
                  aria-label={t("select_all")}
                  className={cn(
                    "transition-all duration-200",
                    allSelected && "border-primary bg-primary"
                  )}
                />
              </motion.div>
            </TableHead>
          )}

          {/* NORMAL COLUMNS */}
          {filteredColumns
            .filter((column) => column.key !== "select" && column.key !== "actions")
            .map((column, index) => {

            let displayTitle = column.title;
            if (
              column.type === "compound" &&
              column.render?.type === "compound"
            ) {
              const config = column.render.config;
              if (config?.primary?.sortKey) {
                displayTitle = Array.isArray(config.primary.title)
                  ? config.primary.title[0]
                  : config.primary.title;
              }
            }

            const translatedTitle = displayTitle || "";
            const dataColumns = filteredColumns.filter((col) => col.key !== "select" && col.key !== "actions");
            const isFirstDataColumn = index === 0 && !showSelectColumn;
            const isLastDataColumn = index === dataColumns.length - 1;
            const isActive = sorting[0]?.id === getSortKeyForColumn(column);

            return (
              <TableHead
                key={column.key}
                className={cn(
                  "h-12 whitespace-nowrap px-4 border-none",
                  "transition-colors duration-200",
                  column.sortable && "cursor-pointer select-none hover:bg-primary/5",
                  isFirstDataColumn && "rounded-l-xl",
                  isLastDataColumn && !showActions && "rounded-r-xl",
                  isActive && "bg-primary/5"
                )}
                onClick={() => column.sortable && handleSort(column)}
              >
                <Button
                  variant="ghost"
                  className={cn(
                    "flex h-8 items-center gap-2 p-0 font-medium hover:bg-transparent",
                    "ltr:flex-row rtl:flex-row-reverse",
                    "group"
                  )}
                >
                  <div className="flex items-center gap-2">
                    {column.icon && (
                      <column.icon className={cn(
                        "h-4 w-4 transition-colors duration-200",
                        isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
                      )} />
                    )}
                    <span className={cn(
                      "ltr:text-left rtl:text-right transition-colors duration-200",
                      isActive ? "text-primary font-semibold" : "text-foreground"
                    )}>
                      {translatedTitle}
                    </span>
                  </div>
                  {column.sortable && (
                    <motion.div
                      className="ltr:ml-auto rtl:mr-auto"
                      variants={sortIconVariants}
                      animate={isActive ? "active" : "inactive"}
                      transition={{ duration: 0.2 }}
                    >
                      {isActive ? (
                        <motion.div
                          animate={{ rotate: sorting[0].desc ? 180 : 0 }}
                          transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                        >
                          <ChevronUp className="h-4 w-4 shrink-0 text-primary" />
                        </motion.div>
                      ) : (
                        <ChevronsUpDown className="h-4 w-4 shrink-0 text-muted-foreground group-hover:text-foreground transition-colors" />
                      )}
                    </motion.div>
                  )}
                </Button>
              </TableHead>
            );
          })}

          {/* ACTIONS COLUMN */}
          {showActions && (
            <TableHead className={cn(
              "h-12 w-[80px] border-none rounded-r-xl",
              "text-muted-foreground font-medium"
            )}>
              <div className="flex items-center justify-center">
                {t("actions")}
              </div>
            </TableHead>
          )}
        </TableRow>
      </TableHeader>
    );
  }
);

TableHeaderComponent.displayName = "TableHeaderComponent";
