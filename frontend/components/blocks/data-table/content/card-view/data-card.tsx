"use client";

import React from "react";
import { motion } from "framer-motion";
import { Checkbox } from "@/components/ui/checkbox";
import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTableStore } from "../../store";
import { CellRenderer } from "../rows/cells";
import { useTranslations } from "next-intl";
import { getPrimaryColumn, getPrimaryDisplayValue } from "../../utils/cell";

interface DataCardProps {
  row: any;
  columns: ColumnDefinition[];
  visibleColumns: ColumnDefinition[];
  index: number;
  showSelect: boolean;
  viewContent?: (row: any) => React.ReactNode;
  layoutId?: string;
  onExpand?: () => void;
  isActiveCard?: boolean;
}

// Shimmer animation for premium effect
const shimmerVariants = {
  initial: { x: "-100%", opacity: 0 },
  hover: {
    x: "100%",
    opacity: 1,
    transition: { duration: 0.8, ease: "easeInOut" as const },
  },
};

function getNestedValue(obj: any, key: string) {
  return key.split(".").reduce((acc, part) => acc && acc[part], obj);
}

export function DataCard({
  row,
  columns,
  visibleColumns,
  index,
  showSelect,
  viewContent,
  layoutId,
  onExpand,
  isActiveCard,
}: DataCardProps) {
  const t = useTranslations("common");
  const selectedRows = useTableStore((state) => state.selectedRows);
  const toggleRowSelection = useTableStore((state) => state.toggleRowSelection);
  const tableConfig = useTableStore((state) => state.tableConfig);

  const [isHovered, setIsHovered] = React.useState(false);

  // Reset hover state when card becomes active/inactive (modal open/close)
  React.useEffect(() => {
    if (isActiveCard) {
      setIsHovered(false);
    }
  }, [isActiveCard]);

  // Check if modal expand is available
  const hasModalExpand = Boolean(onExpand);

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

  // Get all available columns for card (excluding primary, select, actions)
  const availableColumns = React.useMemo(() => {
    return visibleColumns.filter(
      (col) =>
        col.key !== primaryColumn?.key &&
        !col.expandedOnly &&
        col.key !== "select" &&
        col.key !== "actions"
    );
  }, [visibleColumns, primaryColumn]);

  // Display up to 4 columns in the card preview
  const displayColumns = React.useMemo(() => {
    return availableColumns.slice(0, 4);
  }, [availableColumns]);

  // Hidden columns are columns beyond the first 4 that would show in expanded view
  const hiddenColumns = React.useMemo(() => {
    // Columns from visibleColumns that aren't displayed (beyond the 4 limit)
    const extraVisibleColumns = availableColumns.slice(4);

    // Also include expandedOnly columns and columns not in visibleColumns
    const expandedOnlyColumns = columns.filter(
      (col) => col.expandedOnly && col.key !== "select" && col.key !== "actions"
    );

    return [...extraVisibleColumns, ...expandedOnlyColumns];
  }, [columns, availableColumns]);

  const isSelected = selectedRows.includes(row.id);
  const isDeleted = Boolean(row.deletedAt);

  const handleCardClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    const isInteractive =
      target.closest("[data-prevent-expand]") ||
      target.closest('[role="checkbox"]') ||
      target.closest('[role="menuitem"]') ||
      target.closest("button");

    if (isInteractive) return;

    // If we have a modal expand function, use it (always in card view)
    if (hasModalExpand && onExpand) {
      onExpand();
    }
  };

  return (
    <motion.div
      layoutId={`card-${row.id}-${layoutId}`}
      onClick={handleCardClick}
      custom={index}
      initial={{ opacity: 0, y: 30, scale: 0.9, rotateX: -10 }}
      animate={{
        opacity: 1,
        y: 0,
        scale: isHovered ? 1.02 : 1,
        rotateX: 0,
        transition: {
          delay: index * 0.08,
          duration: 0.5,
          ease: [0.22, 1, 0.36, 1],
          scale: { duration: 0.2 }
        },
      }}
      exit={{
        opacity: 0,
        scale: 0.9,
        y: -20,
        transition: { duration: 0.2 },
      }}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      style={{ perspective: 1000 }}
      className={cn(
        isActiveCard && "pointer-events-none opacity-0",
        isSelected && "m-1" // Add margin when selected for better spacing
      )}
    >
      <div
        className={cn(
          "group relative overflow-hidden rounded-xl transition-all duration-500",
          // Glassmorphism base - enhanced for light mode only
          "bg-gradient-to-br from-card via-card to-card/95 dark:from-card/95 dark:via-card dark:to-card/90",
          "backdrop-blur-xl",
          // Enhanced border for light mode, original for dark mode
          "border border-border/80 dark:border-border/50",
          // Enhanced shadow for light mode, original for dark mode
          "shadow-md shadow-black/10 dark:shadow-lg dark:shadow-black/20",
          // Hover states - enhanced for light mode only
          hasModalExpand &&
            "cursor-pointer hover:shadow-xl hover:shadow-primary/15 hover:border-primary/50 dark:hover:shadow-2xl dark:hover:shadow-primary/20 dark:hover:border-primary/30",
          // Selected state with glow
          isSelected &&
            "ring-2 ring-primary ring-offset-2 ring-offset-background shadow-lg shadow-primary/25",
          // Deleted state
          isDeleted && "opacity-50 grayscale"
        )}
      >
        {/* Premium gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.03] via-transparent to-secondary/[0.03] pointer-events-none" />

        {/* Animated shimmer effect on hover */}
        <motion.div
          className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent pointer-events-none"
          variants={shimmerVariants}
          initial="initial"
          animate={isHovered ? "hover" : "initial"}
        />

        {/* Top accent line */}
        <div
          className={cn(
            "absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-primary/50 to-transparent",
            "opacity-0 transition-opacity duration-300",
            (isHovered || isSelected) && "opacity-100"
          )}
        />

        {/* Card Header */}
        <div className="relative p-4 pb-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3 flex-1 min-w-0">
              {showSelect && (
                <div data-prevent-expand className="pt-1">
                  <motion.div
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => toggleRowSelection(row.id)}
                      aria-label={`Select row ${row.id}`}
                      className={cn(
                        "transition-all duration-200",
                        isSelected && "border-primary bg-primary"
                      )}
                    />
                  </motion.div>
                </div>
              )}
              {/* Primary content (compound column or first column) */}
              <div className="flex-1 min-w-0">
                <div className="truncate">
                  {primaryDisplay.useIdFallback ? (
                    <span className="text-sm font-semibold text-foreground">
                      #
                      {typeof row.id === "string" && row.id.length > 8
                        ? row.id.substring(0, 8) + "..."
                        : row.id}
                    </span>
                  ) : (
                    <CellRenderer
                      renderType={
                        primaryDisplay.column?.render || {
                          type: primaryDisplay.column?.type,
                        }
                      }
                      value={primaryDisplay.value}
                      row={row}
                      cropText={true}
                    />
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Card Content */}
        <div className="relative px-4 pb-4 space-y-3">
          {/* Display columns grid with premium styling */}
          {displayColumns.length > 0 && (
            <div className="grid grid-cols-2 gap-3">
              {displayColumns.map((column, colIndex) => (
                <motion.div
                  key={column.key}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 + colIndex * 0.05 }}
                  className={cn(
                    "relative p-2.5 rounded-lg min-w-0",
                    "bg-muted/50 dark:bg-muted/20",
                    "border border-border/50 dark:border-border/30",
                    "transition-all duration-200",
                    "hover:bg-muted/70 dark:hover:bg-muted/30 hover:border-border/70 dark:hover:border-border/50"
                  )}
                >
                  <motion.p
                    layoutId={`field-label-${column.key}-${row.id}-${layoutId}`}
                    className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/70 mb-1"
                  >
                    {column.title}
                  </motion.p>
                  <motion.div
                    layoutId={`field-value-${column.key}-${row.id}-${layoutId}`}
                    className="text-sm font-medium truncate"
                  >
                    <CellRenderer
                      renderType={column.render || { type: column.type }}
                      value={getNestedValue(row, column.key)}
                      row={row}
                      cropText={true}
                    />
                  </motion.div>
                </motion.div>
              ))}
            </div>
          )}

          {/* Show hidden columns count indicator */}
          {hiddenColumns.length > 0 && (
            <div className="flex items-center justify-center pt-1">
              <span className="px-2 py-1 rounded-full bg-primary/10 text-primary text-[10px] font-medium">
                +{hiddenColumns.length} {t("more")}
              </span>
            </div>
          )}
        </div>

        {/* Bottom gradient fade */}
        <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-card/80 to-transparent pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

        {/* Corner sparkle for selected items */}
        {isSelected && (
          <motion.div
            initial={{ scale: 0, rotate: -45 }}
            animate={{ scale: 1, rotate: 0 }}
            className="absolute top-2 right-2"
          >
            <Sparkles className="h-4 w-4 text-primary" />
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}
