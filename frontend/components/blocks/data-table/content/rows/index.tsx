"use client";

import React from "react";
import { useTableStore } from "../../store";
import { TableRow } from "@/components/ui/table";
import { ExpandedContent } from "./view/expanded-content";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { TableRowContent } from "./table-row-content";

interface TableRowsProps {
  columns: ColumnDefinition[];
  viewContent?: (row: any) => React.ReactNode;
  showActions: boolean;
}

export function TableRows({
  columns,
  viewContent,
  showActions,
}: TableRowsProps) {
  const data = useTableStore((state) => state.data);
  const visibleColumns = useTableStore((state) => state.visibleColumns);
  const tableConfig = useTableStore((state) => state.tableConfig);
  const canView = tableConfig.canView;

  const [expandedRows, setExpandedRows] = React.useState<
    Record<string, boolean>
  >({});

  const toggleExpandedRow = React.useCallback((rowId: string) => {
    setExpandedRows((prev) => ({ ...prev, [rowId]: !prev[rowId] }));
  }, []);

  return (
    <>
      {data.map((row) => (
        <React.Fragment key={row.id}>
          <TableRow className="h-2 border-0" />
          <motion.tr
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className={cn(
              "hover:bg-muted/50 relative border-0",
              canView && !(tableConfig.viewLink || tableConfig.onViewClick)
                ? "cursor-pointer"
                : "cursor-default",
              expandedRows[row.id] ? "bg-muted/50 rounded-t-lg" : "rounded-lg"
            )}
            onClick={(e) => {
              if (!canView || tableConfig.viewLink || tableConfig.onViewClick)
                return;
              const target = e.target as HTMLElement;
              const isCheckboxOrAction =
                target.closest("[data-prevent-expand]") ||
                target.closest('[role="checkbox"]') ||
                target.closest('[role="menuitem"]') ||
                target.closest("button");
              if (!isCheckboxOrAction) {
                toggleExpandedRow(row.id);
              }
            }}
          >
            <TableRowContent
              row={row}
              columns={columns}
              isExpanded={expandedRows[row.id]}
              showActions={showActions}
            />
          </motion.tr>
          <AnimatePresence initial={false} mode="wait">
            {expandedRows[row.id] && (
              <motion.tr
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="bg-muted/50 relative border-0 rounded-b-lg"
              >
                <td
                  colSpan={visibleColumns.length + 2}
                  className="p-0 rounded-b-lg border-0"
                >
                  <motion.div
                    initial={{ height: 0 }}
                    animate={{
                      height: "auto",
                      transition: {
                        height: {
                          duration: 0.3,
                          ease: [0.04, 0.62, 0.23, 0.98],
                        },
                      },
                    }}
                    exit={{
                      height: 0,
                      transition: {
                        height: {
                          duration: 0.3,
                          ease: [0.04, 0.62, 0.23, 0.98],
                        },
                      },
                    }}
                    style={{ overflow: "hidden" }}
                    className="rounded-b-lg"
                  >
                    <div className="relative z-10 rounded-b-lg">
                      <ExpandedContent
                        row={row}
                        columnDefs={columns}
                        visibleColumns={visibleColumns}
                        viewContent={viewContent}
                      />
                    </div>
                  </motion.div>
                </td>
              </motion.tr>
            )}
          </AnimatePresence>
        </React.Fragment>
      ))}
    </>
  );
}
