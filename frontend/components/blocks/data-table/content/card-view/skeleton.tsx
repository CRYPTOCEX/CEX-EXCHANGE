"use client";

import React from "react";
import { m } from "framer-motion";
import { useTranslations } from "next-intl";

import { SkeletonBlock, SkeletonText } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

import { getPrimaryColumn } from "../../utils/cell";
import { CellSkeleton } from "../rows/skeleton/cell";

/**
 * The pending state of ONE card — `./data-card.tsx` with its values replaced.
 * ============================================================================
 *
 * WHAT THIS REPLACED
 * ------------------
 * `CardViewSkeleton` used to be a free-standing grid of invented cards, and it
 * had drifted from `DataCard` in ways that no amount of care would have caught,
 * because nothing tied the two files together:
 *
 *  * IT DREW AN ACTIONS BUTTON. `h-8 w-8` in the header, plus its `gap-3`.
 *    `DataCard` has no actions button at all — card view puts row operations in
 *    the expanded dialog. 44px of header width reserved for a control that does
 *    not exist, on every card.
 *
 *  * IT DREW A "SHOW MORE" BAR. `h-9 w-full` plus the `space-y-3` above it:
 *    48px of card height that never resolves into anything. What `DataCard`
 *    actually renders there is a centred `+N more` PILL — `px-2 py-1
 *    text-[10px]` inside a `pt-1` row, about 27px — and only when there are
 *    hidden columns. Cards therefore shrank by 48px (no hidden columns) or 21px
 *    (some) the instant the data landed, times however many rows fit the
 *    viewport.
 *
 *  * IT ALWAYS DREW FOUR TILES. The real count is
 *    `min(availableColumns.length, 4)` — and that is a function of the COLUMN
 *    CONFIG, which is known before the fetch starts. A two-column table
 *    reserved two tiles it would never fill, i.e. one whole 61px tile row.
 *
 *  * ITS TILES WERE 7px SHORT EACH. Label `h-2.5 + mb-1.5` = 16px against the
 *    real `text-[10px]` line box plus `mb-1` = 19px; value `h-4` = 16px against
 *    a `text-sm` 20px line box. Two tile rows, so 14px per card.
 *
 *  * ITS AVATAR WAS `h-11 w-11` (44px). The primary slot renders a real
 *    `CellRenderer`, and for the compound column it almost always is, that
 *    avatar is 48px.
 *
 * WHAT IT DOES NOW
 * ----------------
 * It renders `DataCard`'s chrome — same wrapper, same padding, same tile grid
 * — and asks the SAME config questions `DataCard` asks, so the tile count, the
 * tile LABELS and the `+N more` count are not placeholders at all: they are the
 * final values, rendered immediately, because the column config is already in
 * hand. Only the cell values wait, and they wait through `CellSkeleton`, which
 * is the same dispatch the loaded card renders through.
 */

/* No entrance variants here either — the pending card and the loaded card both
   mount at rest, which is the whole point of the two sharing a shape. The
   shimmer stays: it is a "still working" signal, not an arrival. */

const shimmerVariants = {
  initial: { x: "-100%" },
  animate: {
    x: "100%",
    transition: {
      repeat: Infinity,
      duration: 1.5,
      ease: "linear" as const,
    },
  },
};

interface DataCardSkeletonProps {
  /** The full column list — same prop `DataCard` receives. */
  columns: ColumnDefinition[];
  /** The visible subset, same as `DataCard`. */
  visibleColumns: ColumnDefinition[];
  showSelect: boolean;
}

export function DataCardSkeleton({
  columns,
  visibleColumns,
  showSelect,
}: DataCardSkeletonProps) {
  const t = useTranslations("common");

  /* The next four blocks are `DataCard`'s own derivations, unchanged. They read
     ONLY the column config, never a row, which is exactly why the pending card
     can be the right shape instead of a plausible one. */
  const primaryColumn = React.useMemo(
    () => getPrimaryColumn(visibleColumns),
    [visibleColumns]
  );

  const availableColumns = React.useMemo(
    () =>
      visibleColumns.filter(
        (col) =>
          col.key !== primaryColumn?.key &&
          !col.expandedOnly &&
          col.key !== "select" &&
          col.key !== "actions"
      ),
    [visibleColumns, primaryColumn]
  );

  const displayColumns = React.useMemo(
    () => availableColumns.slice(0, 4),
    [availableColumns]
  );

  const hiddenColumns = React.useMemo(() => {
    const extraVisibleColumns = availableColumns.slice(4);
    const expandedOnlyColumns = columns.filter(
      (col) => col.expandedOnly && col.key !== "select" && col.key !== "actions"
    );
    return [...extraVisibleColumns, ...expandedOnlyColumns];
  }, [columns, availableColumns]);

  return (
    <div>
      <div
        className={cn(
          /* Verbatim from `data-card.tsx`'s resting state — the hover, selected
             and deleted modifiers are the only ones dropped, and none of them
             changes the box. */
          "group relative overflow-hidden rounded-xl transition-all duration-500",
          "bg-card",
          "backdrop-blur-xl",
          "border border-border/80 dark:border-border/50",
          "shadow-md shadow-shadow/10 dark:shadow-lg dark:shadow-shadow/20"
        )}
      >
        {/* Same overlay the loaded card carries. Absolute; no layout effect. */}
        <div className="absolute inset-0 bg-linear-to-br from-primary/[0.03] via-transparent to-secondary/[0.03] pointer-events-none" />

        {/* The one thing the pending card adds: a sweep saying "still working". */}
        <m.div
          className="absolute inset-0 bg-linear-to-r from-transparent via-surface-3 to-transparent pointer-events-none"
          variants={shimmerVariants}
          initial="initial"
          animate="animate"
        />

        {/* Card Header */}
        <div className="relative p-4 pb-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3 flex-1 min-w-0">
              {showSelect && (
                <div className="pt-1">
                  {/* `<Checkbox />` at its default `md`: `size-4 rounded-md`.
                      The old bar was `h-4 w-4 rounded` and sat OUTSIDE the
                      `pt-1` the real one is nested in, so it rode 4px high. */}
                  <SkeletonBlock className="size-4 rounded-md" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="truncate">
                  {primaryColumn ? (
                    <CellSkeleton column={primaryColumn} width={0} />
                  ) : (
                    /* `DataCard`'s id fallback: `text-sm font-semibold`. */
                    <span className="text-sm font-semibold text-foreground">
                      <SkeletonText placeholder={`${t("ec22deb0")}…`} />
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Card Content */}
        <div className="relative px-4 pb-4 space-y-3">
          {displayColumns.length > 0 && (
            <div className="grid grid-cols-2 gap-3">
              {displayColumns.map((column) => (
                <div
                  key={column.key}
                  className={cn(
                    "relative p-2.5 rounded-lg min-w-0",
                    "bg-card",
                    "border border-border",
                    "transition-colors duration-200"
                  )}
                >
                  {/* NOT a placeholder. The tile label is `column.title`, which
                      is config — it is knowable before the request is made, so
                      withholding it would only guarantee it moves later. */}
                  <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground mb-1">
                    {column.title}
                  </p>
                  <div className="text-sm font-medium truncate">
                    <CellSkeleton column={column} width={0} />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Also not a placeholder: the hidden-column count is derived from the
              config, so the real pill renders with the real number. */}
          {hiddenColumns.length > 0 && (
            <div className="flex items-center justify-center pt-1">
              <span className="px-2 py-1 rounded-full bg-primary/10 text-primary-ink text-[10px] font-medium">
                +{hiddenColumns.length} {t("more")}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
