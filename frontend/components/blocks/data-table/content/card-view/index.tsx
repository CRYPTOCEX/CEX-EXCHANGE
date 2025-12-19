"use client";

import React, { useId, useRef } from "react";
import { useTableStore } from "../../store";
import { AnimatePresence, motion } from "framer-motion";
import { DataCard } from "./data-card";
import { CardViewSkeleton } from "./skeleton";
import { NoDataState } from "../../states/no-data-state";
import { ExpandedCard, CloseIcon } from "./expanded-card";
import { useOutsideClick } from "@/hooks/use-outside-click";

interface CardViewProps {
  columns: ColumnDefinition[];
  viewContent?: (row: any) => React.ReactNode;
  showActions: boolean;
}

// Premium container animation for card grid entrance
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.1,
    },
  },
};

export function CardView({ columns, viewContent, showActions }: CardViewProps) {
  const loading = useTableStore((state) => state.loading);
  const error = useTableStore((state) => state.error);
  const data = useTableStore((state) => state.data);
  const hasViewPermission = useTableStore((state) => state.hasViewPermission);
  const tableConfig = useTableStore((state) => state.tableConfig);
  const getVisibleColumns = useTableStore((state) => state.getVisibleColumns);
  const storeColumns = useTableStore((state) => state.columns);
  const visibleColumnKeys = useTableStore((state) => state.visibleColumns);
  const pageSize = useTableStore((state) => state.pageSize);

  // Expandable card state
  const [activeCard, setActiveCard] = React.useState<any | null>(null);
  const id = useId();
  const expandedRef = useRef<HTMLDivElement>(null);

  // Handle escape key to close expanded card - simplified approach like Aceternity
  React.useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setActiveCard(null);
      }
    }

    if (activeCard) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "auto";
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [activeCard]);

  // Close when clicking outside
  useOutsideClick(expandedRef, () => setActiveCard(null));

  // Check if select column should be shown
  const showSelectColumn =
    tableConfig.canCreate || tableConfig.canEdit || tableConfig.canDelete;

  // Get visible columns for cards - ignore priority filtering since cards have their own layout
  // Dependencies include storeColumns and visibleColumnKeys to ensure recalculation when table changes
  const visibleColumnsData = React.useMemo(
    () => getVisibleColumns({ ignorePriority: true }),
    [getVisibleColumns, storeColumns, visibleColumnKeys]
  );

  if (loading) {
    return <CardViewSkeleton count={pageSize} />;
  }

  if (error) {
    return (
      <div className="rounded-lg border bg-card text-card-foreground p-6">
        <NoDataState type="error" colSpan={1} isCard />
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="rounded-lg border bg-card text-card-foreground p-6">
        <NoDataState type="no-results" colSpan={1} isCard />
      </div>
    );
  }

  if (!hasViewPermission) {
    return (
      <div className="rounded-lg border bg-card text-card-foreground p-6">
        <NoDataState type="no-permission" colSpan={1} isCard />
      </div>
    );
  }

  // Cards are always expandable in card view
  const canExpand = true;

  return (
    <>
      {/* Overlay backdrop */}
      <AnimatePresence>
        {activeCard && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm h-full w-full z-[100]"
          />
        )}
      </AnimatePresence>

      {/* Expanded card modal */}
      <AnimatePresence>
        {activeCard && (
          <div className="fixed inset-0 grid place-items-center z-[110] p-4">
            <motion.button
              key={`close-button-${activeCard.id}-${id}`}
              layout
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, transition: { duration: 0.05 } }}
              className="flex absolute top-4 right-4 lg:hidden items-center justify-center bg-card rounded-full h-8 w-8 z-[120] shadow-lg border border-border"
              onClick={() => setActiveCard(null)}
            >
              <CloseIcon />
            </motion.button>
            <ExpandedCard
              ref={expandedRef}
              row={activeCard}
              columns={columns}
              visibleColumns={visibleColumnsData}
              onClose={() => setActiveCard(null)}
              layoutId={id}
              viewContent={viewContent}
              showActions={showActions}
            />
          </div>
        )}
      </AnimatePresence>

      {/* Card grid */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
      >
        {data.map((row, index) => (
          <DataCard
            key={row.id}
            row={row}
            columns={columns}
            visibleColumns={visibleColumnsData}
            index={index}
            showSelect={showSelectColumn ?? false}
            viewContent={viewContent}
            layoutId={id}
            onExpand={canExpand ? () => setActiveCard(row) : undefined}
            isActiveCard={activeCard?.id === row.id}
          />
        ))}
      </motion.div>
    </>
  );
}
