"use client";

import React from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { DetailField, isFullWidthField } from "./detail-field";
import { getNestedValue, isFieldValueEmpty, type ResolvedViewSection } from "./utils";
import type { ViewRenderContext } from "../types/table";

interface DetailSectionProps {
  section: ResolvedViewSection;
  row: any;
  ctx: ViewRenderContext;
}

/**
 * CONTAINER queries, not viewport ones, and a static map rather than a template
 * string.
 *
 * Static because a class assembled at runtime (`sm:grid-cols-${n}`) never
 * reaches Tailwind's scanner and compiles to nothing — that is how a
 * "responsive" grid ends up permanently single-column.
 *
 * Container-scoped because the panel is now sizeable independently of the
 * window: with viewport breakpoints an `sm:grid-cols-2` grid put two cramped
 * columns inside a 400px dialog on a desktop screen, and left a 1400px dialog
 * rendering two half-width columns with the rest of the panel empty. `@md` and
 * friends measure the dialog's own scroll region (marked `@container`), so the
 * layout follows the width the table author actually chose.
 */
const GRID_COLS: Record<1 | 2 | 3 | 4, string> = {
  1: "grid-cols-1",
  2: "grid-cols-1 @md:grid-cols-2",
  3: "grid-cols-1 @md:grid-cols-2 @3xl:grid-cols-3",
  4: "grid-cols-1 @md:grid-cols-2 @3xl:grid-cols-3 @5xl:grid-cols-4",
};

const FULL_SPAN: Record<1 | 2 | 3 | 4, string> = {
  1: "col-span-1",
  2: "col-span-1 @md:col-span-2",
  3: "col-span-1 @md:col-span-2 @3xl:col-span-3",
  4: "col-span-1 @md:col-span-2 @3xl:col-span-3 @5xl:col-span-4",
};

export function DetailSection({ section, row, ctx }: DetailSectionProps) {
  const [collapsed, setCollapsed] = React.useState(section.defaultCollapsed);

  /* `hideEmpty` is honoured HERE rather than inside DetailField, because a
     field that hides itself from within still leaves its grid cell behind —
     a gap in the middle of the section. Filtering before the grid is laid out
     lets the remaining tiles close up. */
  const fields = React.useMemo(
    () =>
      section.fields.filter(
        (field) =>
          !field.config.hideEmpty ||
          !isFieldValueEmpty(
            field.column?.getValue
              ? field.column.getValue(row)
              : getNestedValue(row, field.key)
          )
      ),
    [section.fields, row]
  );

  const cols = section.columns;
  const Icon = section.icon;
  const hasHeader = Boolean(section.title);

  const body = (
    <>
      {section.render ? (
        section.render(row, ctx)
      ) : section.variant === "rows" ? (
        <div className="rounded-lg border border-border px-3">
          {fields.map((field) => (
            <DetailField key={field.key} field={field} row={row} variant="rows" />
          ))}
        </div>
      ) : (
        <div className={cn("grid gap-3", GRID_COLS[cols])}>
          {fields.map((field) => (
            <div
              key={field.key}
              className={cn("min-w-0", isFullWidthField(field, row) && FULL_SPAN[cols])}
            >
              <DetailField field={field} row={row} variant="tiles" />
            </div>
          ))}
        </div>
      )}
    </>
  );

  if (!hasHeader) {
    return <div className={cn(section.variant === "plain" && "min-w-0")}>{body}</div>;
  }

  return (
    <section className="min-w-0">
      <header
        className={cn(
          "flex items-center gap-2 mb-3",
          section.collapsible && "cursor-pointer select-none"
        )}
        onClick={section.collapsible ? () => setCollapsed((v) => !v) : undefined}
      >
        {Icon && <Icon className="h-4 w-4 text-muted-foreground shrink-0" />}
        <h3 className="text-sm font-semibold text-foreground">{section.title}</h3>
        {/* A hairline carrying the eye across the row is what separates one
            group from the next; without it stacked sections read as one list. */}
        <span className="h-px flex-1 bg-border" />
        {section.collapsible && (
          <ChevronDown
            className={cn(
              "h-4 w-4 text-muted-foreground transition-transform",
              collapsed && "-rotate-90"
            )}
          />
        )}
      </header>
      {section.description && !collapsed && (
        <p className="text-xs text-muted-foreground -mt-1 mb-3">
          {section.description}
        </p>
      )}
      {!collapsed && body}
    </section>
  );
}
