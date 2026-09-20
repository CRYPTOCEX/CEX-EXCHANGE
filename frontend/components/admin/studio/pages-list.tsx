"use client";

/**
 * The Pages studio's panel: pick one of the built-in pages.
 *
 * Five rows is not a findability problem, so why the filter? Because the panel
 * is the same component in every studio and an owner who has learned that `/`
 * focuses the list on the Menus screen should not discover that it does nothing
 * here. Consistency across the three screens is worth one extra row of chrome.
 */

import * as React from "react";

import { Badge } from "@/components/ui/badge";
import {
  StudioFilter,
  StudioFilterEmpty,
  stepThrough,
} from "@/components/admin/studio/studio-filter";
import {
  catalogFor,
  formatEdited,
  type AdminPage,
} from "@/components/admin/studio/pages-catalog";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";

export function PagesList({
  pages,
  selectedId,
  onSelect,
  query,
  onQueryChange,
  totalCount,
  emptyHint = "No page in this group.",
  disabled = false,
}: {
  /** Already narrowed to the active category AND the query. */
  pages: readonly AdminPage[];
  selectedId: string;
  onSelect: (id: string) => void;
  query: string;
  onQueryChange: (next: string) => void;
  totalCount: number;
  emptyHint?: string;
  disabled?: boolean;
}) {
  const t = useTranslations("components");
  const rowRefs = React.useRef(new Map<string, HTMLButtonElement>());

  const step = React.useCallback(
    (delta: -1 | 1) => {
      const next = stepThrough(pages, (p) => p.id === selectedId, delta);
      if (!next) return;
      onSelect(next.id);
      rowRefs.current.get(next.id)?.scrollIntoView({ block: "nearest" });
    },
    [onSelect, pages, selectedId]
  );

  const commit = React.useCallback(() => {
    if (pages.length > 0 && !pages.some((p) => p.id === selectedId)) step(1);
  }, [pages, selectedId, step]);

  const neverEdited = pages.filter((p) => !p.lastModified).length;

  return (
    <div className="flex min-h-0 flex-col">
      <StudioFilter
        id="pages-filter-count"
        value={query}
        onChange={onQueryChange}
        onStep={step}
        onCommit={commit}
        placeholder={`${t("filter_pages")}…`}
        label={t("filter_pages")}
      >
        <span className="tabular-nums">
          {pages.length === totalCount ? t("pages", { totalCount: String(totalCount) }) : t("of", { length: pages.length, totalCount: String(totalCount) })}
        </span>
        {neverEdited > 0 ? (
          <>
            <span aria-hidden="true">·</span>
            <span className="tabular-nums">{neverEdited} never edited</span>
          </>
        ) : null}
      </StudioFilter>

      {pages.length === 0 ? (
        <StudioFilterEmpty
          query={query}
          onClear={() => onQueryChange("")}
          emptyHint={emptyHint}
          noMatchHint="No page matches this filter."
        />
      ) : (
        <ul className="pb-4">
          {pages.map((page) => {
            const selected = page.id === selectedId;
            const entry = catalogFor(page.id);
            const Icon = entry.icon;
            return (
              <li key={page.id}>
                <button
                  type="button"
                  ref={(node) => {
                    if (node) rowRefs.current.set(page.id, node);
                    else rowRefs.current.delete(page.id);
                  }}
                  onClick={() => onSelect(page.id)}
                  disabled={disabled}
                  /* `aria-current`, not `aria-pressed`: this is "the one you are
                     looking at", not a toggle that stays down. */
                  aria-current={selected ? "true" : undefined}
                  className={cn(
                    "flex w-full items-center gap-2.5 border-s-2 py-2 pe-2 ps-2.5 text-start transition-colors focus-visible:outline-hidden focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50",
                    selected
                      ? "border-s-primary bg-primary/10"
                      : "border-s-transparent hover:bg-muted"
                  )}
                >
                  <Icon
                    className={cn(
                      "size-4 shrink-0",
                      selected ? "text-primary" : "text-muted-foreground"
                    )}
                    aria-hidden="true"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="flex min-w-0 items-center gap-1.5">
                      <span
                        className={cn(
                          "truncate text-xs font-medium",
                          selected ? "text-primary-ink" : "text-foreground"
                        )}
                      >
                        {page.name}
                      </span>
                      {/* Which editor this page gets, said before it is opened.
                          The two are genuinely different tools and an owner
                          should not have to click to find out which one. */}
                      <span className="shrink-0 rounded-sm bg-muted px-1 text-[10px] leading-4 text-muted-foreground">
                        {entry.kind === "variables" ? "sections" : "document"}
                      </span>
                    </span>
                    <span className="mt-0.5 flex min-w-0 items-center gap-1 text-[10px] text-subtle-foreground">
                      <span className="truncate font-mono">{page.path}</span>
                      <span aria-hidden="true">·</span>
                      <span className="shrink-0">{formatEdited(page.lastModified)}</span>
                    </span>
                  </span>

                  {page.status && page.status !== "active" ? (
                    <Badge tone="warning" appearance="soft" size="xs" className="shrink-0">
                      {page.status}
                    </Badge>
                  ) : null}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
