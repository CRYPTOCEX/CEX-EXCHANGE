"use client";

import React, { useCallback, useMemo } from "react";
import { TableHeader, TableRow, TableHead } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ChevronUp, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTableStore } from "../store";
import { useTranslations } from "next-intl";

interface TableHeaderProps {
  columns: ColumnDefinition[];
  showActions: boolean;
}

export const TableHeaderComponent = React.memo(
  ({ columns, showActions }: TableHeaderProps) => {
    const t = useTranslations(
      "components/blocks/data-table/content/table-header"
    );
    const visibleColumns = useTableStore((state) => state.visibleColumns);
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

    // Filter out columns that are not visible or are "expandedOnly".
    const filteredColumns = useMemo(
      () =>
        columns.filter(
          (column) =>
            (visibleColumns.includes(column.key) ||
              column.key === "select" ||
              column.key === "actions") &&
            !column.expandedOnly
        ),
      [columns, visibleColumns]
    );

    return (
      <TableHeader className="bg-muted/50 rounded-lg">
        <TableRow className="border-none hover:bg-transparent">
          {/* SELECT (CHECKBOX) COLUMN */}
          {showSelectColumn && (
            <TableHead
              className={cn(
                "h-11 w-[40px] px-4",
                // If we are displaying the select column AND there's no other "first column",
                // it should be rounded on the left:
                "rounded-l-lg"
              )}
            >
              <div className="flex items-center">
                <Checkbox
                  checked={allSelected}
                  onCheckedChange={handleSelectAll}
                  aria-label="Select all"
                />
              </div>
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
                // If there's a custom sort key, maybe override the displayed title
                displayTitle = Array.isArray(config.primary.title)
                  ? config.primary.title[0]
                  : config.primary.title;
              }
            }

            const dataColumns = filteredColumns.filter((col) => col.key !== "select" && col.key !== "actions");
            const isFirstDataColumn = index === 0 && !showSelectColumn;
            const isLastDataColumn = index === dataColumns.length - 1;

            return (
              <TableHead
                key={column.key}
                className={cn(
                  "h-12 whitespace-nowrap px-4 border-none",
                  column.sortable && "cursor-pointer select-none",
                  // If there's NO select column, then the first data column should be left-rounded
                  isFirstDataColumn && "rounded-l-lg",
                  // If there's no actions column, then the last data column is right-rounded
                  isLastDataColumn && !showActions && "rounded-r-lg"
                )}
                onClick={() => column.sortable && handleSort(column)}
              >
                <Button
                  variant="ghost"
                  className={cn(
                    "flex h-8 items-center gap-2 p-0 font-medium hover:bg-transparent",
                    "ltr:flex-row rtl:flex-row-reverse"
                  )}
                >
                  <div className="flex items-center gap-2">
                    {column.icon && (
                      <column.icon className="h-4 w-4 text-muted-foreground" />
                    )}
                    <span className="ltr:text-left rtl:text-right text-foreground">
                      {displayTitle}
                    </span>
                  </div>
                  {column.sortable && (
                    <div className={cn("ltr:ml-auto rtl:mr-auto")}>
                      {sorting[0]?.id === getSortKeyForColumn(column) ? (
                        <ChevronUp
                          className={cn(
                            "h-4 w-4 shrink-0 transition-transform text-foreground",
                            sorting[0].desc ? "rotate-180" : ""
                          )}
                        />
                      ) : (
                        <ChevronsUpDown className="h-4 w-4 shrink-0 text-muted-foreground" />
                      )}
                    </div>
                  )}
                </Button>
              </TableHead>
            );
          })}

          {/* ACTIONS COLUMN */}
          {showActions && (
            <TableHead className="h-11 w-[80px] border-none rounded-r-lg">
              <div className="flex items-center justify-center">
                {t("Actions")}
              </div>
            </TableHead>
          )}
        </TableRow>
      </TableHeader>
    );
  }
);

TableHeaderComponent.displayName = "TableHeaderComponent";
