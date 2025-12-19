"use client";

import React, { forwardRef } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { X, Sparkles, Eye, Pencil, Trash2, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTableStore } from "../../store";
import { useUserStore } from "@/store/user";
import { checkPermission } from "../../utils/permissions";
import { CellRenderer } from "../rows/cells";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/routing";
import { processEndpointLink, getPrimaryColumn, getPrimaryDisplayValue } from "../../utils/cell";

interface ExpandedCardProps {
  row: any;
  columns: ColumnDefinition[];
  visibleColumns: ColumnDefinition[];
  onClose: () => void;
  layoutId: string;
  viewContent?: (row: any) => React.ReactNode;
  showActions: boolean;
  sourceType?: "card" | "row"; // Whether this is from card view or table view
}

function getNestedValue(obj: any, key: string) {
  return key.split(".").reduce((acc, part) => acc && acc[part], obj);
}

export const CloseIcon = () => {
  return (
    <motion.svg
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.05 } }}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-4 w-4 text-foreground"
    >
      <path stroke="none" d="M0 0h24v24H0z" fill="none" />
      <path d="M18 6l-12 12" />
      <path d="M6 6l12 12" />
    </motion.svg>
  );
};

export const ExpandedCard = forwardRef<HTMLDivElement, ExpandedCardProps>(
  ({ row: initialRow, columns, visibleColumns, onClose, layoutId, viewContent, showActions, sourceType = "card" }, ref) => {
    const t = useTranslations("common");
    const tableConfig = useTableStore((state) => state.tableConfig);
    const selectedRows = useTableStore((state) => state.selectedRows);
    const hasViewPermission = useTableStore((state) => state.hasViewPermission);
    const permissions = useTableStore((state) => state.permissions);
    const handleDelete = useTableStore((state) => state.handleDelete);
    const handleRestore = useTableStore((state) => state.handleRestore);
    const handlePermanentDelete = useTableStore((state) => state.handlePermanentDelete);
    const goToEdit = useTableStore((state) => state.goToEdit);
    const setSelectedRow = useTableStore((state) => state.setSelectedRow);
    const handleView = useTableStore((state) => state.handleView);
    const user = useUserStore((state) => state.user);
    const router = useRouter();

    // Subscribe to store data to get live updates (e.g., when toggle changes)
    const storeData = useTableStore((state) => state.data);

    // Get the current row from store data, falling back to initial row if not found
    const row = React.useMemo(() => {
      const updatedRow = storeData.find((r) => r.id === initialRow.id);
      return updatedRow || initialRow;
    }, [storeData, initialRow]);

    const isSelected = selectedRows.includes(row.id);
    const isDeleted = Boolean(row.deletedAt);

    // Construct layoutId based on source type to match the origin element
    const expandedLayoutId = sourceType === "row"
      ? `row-${row.id}-${layoutId}`
      : `card-${row.id}-${layoutId}`;

    // Find primary column using shared utility
    const primaryColumn = React.useMemo(
      () => getPrimaryColumn(visibleColumns),
      [visibleColumns]
    );

    // Get primary display value with fallback to ID if value is empty
    const primaryDisplay = React.useMemo(
      () => getPrimaryDisplayValue(row, primaryColumn, getNestedValue),
      [row, primaryColumn]
    );

    // Get all columns except primary for expanded view
    const allDisplayColumns = React.useMemo(() => {
      return columns.filter(
        (col) =>
          col.key !== primaryColumn?.key &&
          col.key !== "select" &&
          col.key !== "actions"
      );
    }, [columns, primaryColumn]);

    // Action permissions
    const hasViewAction =
      !!(tableConfig.viewLink || tableConfig.onViewClick) && hasViewPermission;

    const meetsEditCondition =
      typeof tableConfig.editCondition === "function"
        ? tableConfig.editCondition(row)
        : true;

    const userHasEditPermission = checkPermission(user, permissions?.edit);
    const canEditAction =
      tableConfig.canEdit &&
      userHasEditPermission &&
      meetsEditCondition &&
      !isDeleted;

    const hasEditAction =
      tableConfig.canEdit && permissions?.edit && meetsEditCondition;

    const userHasDeletePermission = checkPermission(user, permissions?.delete);
    const hasDeleteAction = tableConfig.canDelete && userHasDeletePermission;

    const hasAnyAction = hasViewAction || hasEditAction || hasDeleteAction;

    // View link
    const viewLinkHref = tableConfig.viewLink
      ? processEndpointLink(tableConfig.viewLink, row)
      : undefined;

    // Edit link
    const editLinkHref = tableConfig.editLink
      ? processEndpointLink(tableConfig.editLink, row)
      : undefined;

    const handleViewClick = () => {
      // Close modal first to release scroll lock before navigation
      onClose();
      if (tableConfig.viewLink) {
        router.push(viewLinkHref!);
      } else if (tableConfig.onViewClick) {
        handleView(row);
      }
    };

    const handleEditClick = () => {
      // Close modal first to release scroll lock before navigation
      onClose();
      if (tableConfig.editLink) {
        router.push(editLinkHref!);
      } else if (tableConfig.onEditClick) {
        // Small delay to ensure modal unmounts and releases scroll lock
        const editClick = tableConfig.onEditClick;
        setTimeout(() => {
          editClick(row);
        }, 50);
      } else {
        // Use view-based edit - delay to ensure modal unmounts first
        setTimeout(() => {
          setSelectedRow(row);
          goToEdit(row.id);
        }, 50);
      }
    };

    const handleDeleteClick = async () => {
      await handleDelete(row);
      onClose();
    };

    const handleRestoreClick = async () => {
      await handleRestore(row);
      onClose();
    };

    const handlePermanentDeleteClick = async () => {
      await handlePermanentDelete(row);
      onClose();
    };

    return (
      <motion.div
        layoutId={expandedLayoutId}
        ref={ref}
        className={cn(
          "w-full max-w-[600px] max-h-[90vh] flex flex-col overflow-hidden",
          // Glassmorphism base
          "bg-gradient-to-br from-card via-card to-card/95",
          "backdrop-blur-xl",
          // Border with gradient
          "border border-border/50",
          // Premium shadow
          "shadow-2xl shadow-black/20 dark:shadow-black/40",
          // Rounded
          "rounded-2xl",
          // Selected state
          isSelected && "ring-2 ring-primary ring-offset-2 ring-offset-background",
          // Deleted state
          isDeleted && "opacity-70"
        )}
      >
        {/* Premium gradient overlay */}
        <motion.div layout={false} className="absolute inset-0 bg-gradient-to-br from-primary/[0.02] via-transparent to-secondary/[0.02] pointer-events-none rounded-2xl" />

        {/* Top accent line */}
        <motion.div layout={false} className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary/30 via-primary to-primary/30 rounded-t-2xl" />

        {/* Header */}
        <motion.div layout={false} className="relative p-6 pb-4 border-b border-border/30">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3 flex-1 min-w-0">
              {/* Primary content */}
              <div className="flex-1 min-w-0">
                {primaryDisplay.useIdFallback ? (
                  <span className="text-lg font-semibold text-foreground break-all">
                    #{row.id}
                  </span>
                ) : (
                  <CellRenderer
                    renderType={primaryDisplay.column?.render || { type: primaryDisplay.column?.type }}
                    value={primaryDisplay.value}
                    row={row}
                    cropText={false}
                  />
                )}
              </div>
            </div>

            <motion.div
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
            >
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-full hover:bg-muted"
                onClick={onClose}
              >
                <X className="h-4 w-4" />
              </Button>
            </motion.div>
          </div>

          {/* Selected badge */}
          {isSelected && (
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="absolute top-4 left-4 flex items-center gap-1 px-2 py-1 rounded-full bg-primary/10 border border-primary/30"
            >
              <Sparkles className="h-3 w-3 text-primary" />
              <span className="text-xs font-medium text-primary">{t("selected")}</span>
            </motion.div>
          )}
        </motion.div>

        {/* Scrollable content */}
        <motion.div layout={false} className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* All columns in a grid */}
          {allDisplayColumns.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {allDisplayColumns.map((column, colIndex) => {
                // Extract the nested value for all columns
                // Compound columns will receive the nested object (e.g., row.agent or row.user)
                const cellValue = getNestedValue(row, column.key);

                return (
                  <div
                    key={column.key}
                    className={cn(
                      "relative p-4 rounded-xl min-w-0",
                      "bg-muted/30 dark:bg-muted/20",
                      "border border-border/30",
                      "transition-all duration-200",
                      "hover:bg-muted/50 hover:border-border/50"
                    )}
                  >
                    {sourceType === "card" ? (
                      <motion.p
                        layoutId={`field-label-${column.key}-${row.id}-${layoutId}`}
                        className="text-xs font-medium uppercase tracking-wider text-muted-foreground/70 mb-2"
                      >
                        {column.title}
                      </motion.p>
                    ) : (
                      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground/70 mb-2">
                        {column.title}
                      </p>
                    )}
                    {sourceType === "row" && !visibleColumns.find(vc => vc.key === column.key) ? (
                      // For row source: if column is not visible in row, don't use layoutId (fade in instead of morph)
                      <div className="text-sm font-medium">
                        <CellRenderer
                          renderType={column.render || { type: column.type }}
                          value={cellValue}
                          row={row}
                          cropText={false}
                          breakText={true}
                        />
                      </div>
                    ) : (
                      // For card source or visible columns: use layoutId to morph
                      <motion.div
                        layoutId={`field-value-${column.key}-${row.id}-${layoutId}`}
                        className="text-sm font-medium"
                      >
                        <CellRenderer
                          renderType={column.render || { type: column.type }}
                          value={cellValue}
                          row={row}
                          cropText={false}
                          breakText={true}
                        />
                      </motion.div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Custom view content */}
          {viewContent && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent mb-4" />
              <div className="p-4 rounded-xl bg-muted/20 border border-border/20">
                {viewContent(row)}
              </div>
            </motion.div>
          )}
        </motion.div>

        {/* Footer with action buttons */}
        <motion.div layout={false} className="relative p-4 border-t border-border/30">
          <div className="flex items-center justify-between gap-2">
            {/* Action buttons on the left */}
            <div className="flex items-center gap-2 flex-wrap">
              {showActions && hasAnyAction && (
                <>
                  {/* View Action */}
                  {hasViewAction && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-2"
                      onClick={handleViewClick}
                    >
                      <Eye className="h-4 w-4" />
                      {t("view")}
                    </Button>
                  )}

                  {/* Edit Action */}
                  {hasEditAction && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-2"
                      disabled={!canEditAction}
                      onClick={handleEditClick}
                    >
                      <Pencil className="h-4 w-4" />
                      {t("edit")}
                    </Button>
                  )}

                  {/* Delete / Restore Actions */}
                  {hasDeleteAction && (
                    isDeleted ? (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-2"
                          onClick={handleRestoreClick}
                        >
                          <RotateCcw className="h-4 w-4" />
                          {t("restore")}
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          className="gap-2"
                          onClick={handlePermanentDeleteClick}
                        >
                          <Trash2 className="h-4 w-4" />
                          {t("permanent_delete")}
                        </Button>
                      </>
                    ) : (
                      <Button
                        variant="destructive"
                        size="sm"
                        className="gap-2"
                        onClick={handleDeleteClick}
                      >
                        <Trash2 className="h-4 w-4" />
                        {t("delete")}
                      </Button>
                    )
                  )}
                </>
              )}

              {/* Custom expanded buttons */}
              {tableConfig.expandedButtons && tableConfig.expandedButtons(row)}
            </div>

            {/* Close button on the right */}
            <motion.div
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Button
                variant="outline"
                size="sm"
                onClick={onClose}
                className="px-6"
              >
                {t("close")}
              </Button>
            </motion.div>
          </div>
        </motion.div>
      </motion.div>
    );
  }
);

ExpandedCard.displayName = "ExpandedCard";
