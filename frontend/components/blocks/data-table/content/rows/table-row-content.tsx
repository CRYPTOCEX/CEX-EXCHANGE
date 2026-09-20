"use client";

import React from "react";
import { useTableStore } from "../../store";
import { useMediaQuery } from "@/hooks/use-media-query";
import { TableCell } from "@/components/ui/table";
import { RowActions } from "./actions";
import { CellRenderer } from "./cells";
import { Checkbox } from "@/components/ui/checkbox";
import { getCellClasses, getCellContentClasses } from "../../utils/cell";
import { useTranslations } from "next-intl";

interface TableRowContentProps {
  row: any;
  columns: ColumnDefinition[];
  isExpanded: boolean;
  showActions: boolean;
}

function getNestedValue(obj: any, key: string) {
  return key.split(".").reduce((acc, part) => acc && acc[part], obj);
}

export const TableRowContent = React.memo(
  ({ row, columns, isExpanded, showActions }: TableRowContentProps) => {
    const t = useTranslations("common");
    const selectedRows = useTableStore((state) => state.selectedRows);
    const toggleRowSelection = useTableStore(
      (state) => state.toggleRowSelection
    );
    const visibleColumns = useTableStore((state) => state.visibleColumns);
    const storeColumns = useTableStore((state) => state.columns);
    const tableConfig = useTableStore((state) => state.tableConfig);
    const getVisibleColumns = useTableStore((state) => state.getVisibleColumns);

    // Same breakpoints the header watches, so both recompute on the same resize.
    const isDesktop = useMediaQuery("(min-width: 1024px)");
    const isTablet = useMediaQuery("(min-width: 768px)");

    // Determine if the select column should be displayed. Custom bulk actions
    // also enable selection even on otherwise read-only tables.
    const showSelectColumn = Boolean(
      tableConfig.canCreate ||
        tableConfig.canEdit ||
        tableConfig.canDelete ||
        tableConfig.bulkActions?.length
    );

    /* Exactly the keys the header emits a <th> for — priority filtering
       included. Filtering by `visibleColumns` alone (as this did) ignores the
       priority rule the header applies below desktop width: on a tablet the
       header dropped `priority > 3` columns while the row still emitted their
       cells, so every cell after the first dropped one sat under the wrong
       heading and the row ran past the last <th>.

       The prop array is what gets filtered, not the store's — `setColumns`
       receives this very array, so order and identity match, and this keeps
       the column type the props declare. */
    const renderedColumns = React.useMemo(() => {
      const headerKeys = new Set(getVisibleColumns().map((col) => col.key));
      return columns.filter((column) => headerKeys.has(column.key));
    }, [columns, getVisibleColumns, storeColumns, visibleColumns, isDesktop, isTablet]);

    // Get all columns that will appear in expanded view
    const allColumnsForExpanded = React.useMemo(() => {
      return columns.filter(
        (col) => col.key !== "select" && col.key !== "actions"
      );
    }, [columns]);

    return (
      <>
        {showSelectColumn && (
          <TableCell
            className={getCellClasses("select", isExpanded)}
            data-prevent-expand={true}
          >
            <div className={getCellContentClasses(false)}>
              <Checkbox
                checked={selectedRows.includes(row.id)}
                onCheckedChange={() => toggleRowSelection(row.id)}
                aria-label={t("select_row", { id: String(row.id) })}
              />
            </div>
          </TableCell>
        )}
        {renderedColumns.map((column) => {
          const cellValue = getNestedValue(row, column.key);

          return (
            <TableCell
              key={`${row.id}-${column.key}`}
              className={getCellClasses(column.key, isExpanded)}
            >
              {/* Plain div, deliberately. Every cell used to be a
                    layout-projected `motion.div` sharing a `field-value-*`
                    layoutId with the expanded dialog's tile. That meant a
                    ~200x20 cell morphing to/from a ~270x90 tile: framer scales
                    the box and only inverse-corrects motion children that carry
                    their own `layout`, so the text, badges and thumbnails inside
                    were raw-stretched for the whole trip. It also mounted a
                    projection node per cell for EVERY row (not just the open
                    one), so a 10x6 table put 60 nodes in the layout group and
                  re-measured them on every layout pass. */}
              <div className={getCellContentClasses(column.key === "actions")}>
                <CellRenderer
                  renderType={column.render || { type: column.type }}
                  value={cellValue}
                  row={row}
                  cropText={true}
                  breakText={column.type === "textarea"}
                />
              </div>
            </TableCell>
          );
        })}
        {showActions && (
          <TableCell
            className={getCellClasses("actions", isExpanded)}
            data-prevent-expand={true}
          >
            <div className={getCellContentClasses(true)}>
              <RowActions row={row} />
            </div>
          </TableCell>
        )}
      </>
    );
  }
);

TableRowContent.displayName = "TableRowContent";
