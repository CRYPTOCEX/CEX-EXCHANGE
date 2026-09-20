"use client";

/**
 * The Menus studio's panel: find one menu out of thirty-four, fast.
 * ============================================================================
 *
 * WHAT THIS REPLACES, AND WHY IT IS NOT A `<select>`
 *
 * The previous menus tab was a single dropdown holding 34 options in two
 * optgroups. A dropdown is fine at six entries and a filing cabinet at
 * thirty-four: it cannot be searched (the browser's type-ahead matches the
 * START of the label only, so "stak" finds nothing under "AI …", "Copy …",
 * "Ecommerce …"), it cannot show which entries are customised beyond a bullet
 * glued to the label text, and it closes the moment you look at anything.
 *
 * So: a filter box over an always-visible list. Typing narrows; ArrowDown walks
 * the results without leaving the box; the customised entries carry their own
 * change count. Finding "Staking (admin)" is four keystrokes and one click.
 *
 * The box itself is `StudioFilter`, shared with the Pages panel — see that file
 * for why it is hand-built rather than `components/ui/input`.
 */

import * as React from "react";

import { Badge } from "@/components/ui/badge";
import {
  countMenuChanges,
  isMenuCustomised,
  type EditableMenu,
  type MenuGroupId,
} from "@/components/admin/studio/menus-catalog";
import {
  StudioFilter,
  StudioFilterEmpty,
  stepThrough,
} from "@/components/admin/studio/studio-filter";
import type { MenuOverrides } from "@/lib/chrome/menu-overrides";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";

const GROUP_LABEL: Record<MenuGroupId, string> = {
  core: "Core",
  extensions: "Extensions",
};

export function MenusList({
  menus,
  overrides,
  selectedScope,
  onSelect,
  query,
  onQueryChange,
  totalCount,
  customisedCount,
  emptyHint = "No menu matches this filter.",
  disabled = false,
}: {
  /** Already narrowed to the active section AND the query. */
  menus: readonly EditableMenu[];
  overrides: MenuOverrides;
  selectedScope: string;
  onSelect: (scope: string) => void;
  query: string;
  onQueryChange: (next: string) => void;
  /** Every editable menu in the build, for the "7 of 34" line. */
  totalCount: number;
  customisedCount: number;
  /** What an empty result means HERE — an empty section is not a bad filter. */
  emptyHint?: string;
  disabled?: boolean;
}) {
  const t = useTranslations("components");
  /**
   * One row element per scope, so a keyboard move can scroll its target into
   * view. Rows exist in the DOM whether or not they are selected, so this is
   * read in the handler that changes the selection rather than from an effect
   * chasing it afterwards.
   */
  const rowRefs = React.useRef(new Map<string, HTMLButtonElement>());

  /** Move the selection through the VISIBLE results without leaving the box. */
  const step = React.useCallback(
    (delta: -1 | 1) => {
      const next = stepThrough(menus, (menu) => menu.scope === selectedScope, delta);
      if (!next) return;
      onSelect(next.scope);
      rowRefs.current.get(next.scope)?.scrollIntoView({ block: "nearest" });
    },
    [menus, onSelect, selectedScope]
  );

  const commit = React.useCallback(() => {
    if (menus.length > 0 && !menus.some((menu) => menu.scope === selectedScope)) step(1);
  }, [menus, selectedScope, step]);

  /* Captions only earn their line when the results actually span both groups. */
  const showGroupCaptions = React.useMemo(() => {
    const first = menus[0]?.group;
    return menus.some((menu) => menu.group !== first);
  }, [menus]);

  return (
    <div className="flex min-h-0 flex-col">
      <StudioFilter
        id="menus-filter-count"
        value={query}
        onChange={onQueryChange}
        onStep={step}
        onCommit={commit}
        placeholder={`${t("filter_menus")}…`}
        label={t("filter_menus")}
      >
        {/* The two numbers an owner needs before touching anything: how much of
            the list they are looking at, and how much of it has been changed. */}
        <span className="tabular-nums">
          {menus.length === totalCount ? t("menus", { totalCount: String(totalCount) }) : t("of", { length: menus.length, totalCount: String(totalCount) })}
        </span>
        <span aria-hidden="true">·</span>
        {/* Emphasis, not the accent colour: nothing on this line is clickable,
            and primary ink in a dense tool reads as a link. */}
        <span className={cn("tabular-nums", customisedCount > 0 && "font-medium text-foreground")}>
          {customisedCount} customised
        </span>
      </StudioFilter>

      {menus.length === 0 ? (
        <StudioFilterEmpty
          query={query}
          onClear={() => onQueryChange("")}
          emptyHint={emptyHint}
          noMatchHint="No menu matches this filter."
        />
      ) : (
        <ul className="pb-4">
          {menus.map((menu, index) => {
            const selected = menu.scope === selectedScope;
            const changes = countMenuChanges(overrides[menu.scope]);
            const customised = isMenuCustomised(overrides[menu.scope]);
            const caption =
              showGroupCaptions && menu.group !== menus[index - 1]?.group
                ? GROUP_LABEL[menu.group]
                : null;

            return (
              <React.Fragment key={menu.scope}>
                {caption ? (
                  <li
                    className={cn(
                      "px-3 pb-1 pt-3 text-[10px] font-semibold uppercase tracking-wider text-subtle-foreground",
                      index > 0 && "mt-1 border-t border-border pt-3"
                    )}
                  >
                    {caption}
                  </li>
                ) : null}
                <li>
                  <button
                    type="button"
                    ref={(node) => {
                      if (node) rowRefs.current.set(menu.scope, node);
                      else rowRefs.current.delete(menu.scope);
                    }}
                    onClick={() => onSelect(menu.scope)}
                    disabled={disabled}
                    /* `aria-current`, not `aria-pressed`: this is "the one you
                       are looking at", not a toggle that stays down. */
                    aria-current={selected ? "true" : undefined}
                    className={cn(
                      "flex w-full items-center gap-2 border-s-2 py-1.5 pe-2 ps-2.5 text-start transition-colors focus-visible:outline-hidden focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50",
                      selected
                        ? "border-s-primary bg-primary/10"
                        : "border-s-transparent hover:bg-muted"
                    )}
                  >
                    <span className="min-w-0 flex-1">
                      <span className="flex min-w-0 items-center gap-1.5">
                        <span
                          className={cn(
                            "truncate text-xs font-medium",
                            selected ? "text-primary-ink" : "text-foreground"
                          )}
                        >
                          {menu.label}
                        </span>
                        <span className="shrink-0 rounded-sm bg-muted px-1 text-[10px] leading-4 text-muted-foreground">
                          {menu.surface}
                        </span>
                      </span>
                      {/* The stored key, shown because it is the thing an owner
                          reads back in an export or a support thread — and the
                          only way to tell two identically-labelled menus apart
                          if an extension id ever collides with a core one. */}
                      <span className="mt-0.5 flex min-w-0 items-center gap-1 text-[10px] text-subtle-foreground">
                        <span className="truncate font-mono">{menu.scope}</span>
                        <span aria-hidden="true">·</span>
                        <span className="shrink-0 tabular-nums">{menu.itemCount} items</span>
                      </span>
                    </span>

                    {customised ? (
                      <Badge
                        tone="primary"
                        appearance="soft"
                        size="xs"
                        className="shrink-0 tabular-nums"
                      >
                        {changes}
                        <span className="sr-only"> changes</span>
                      </Badge>
                    ) : null}
                  </button>
                </li>
              </React.Fragment>
            );
          })}
        </ul>
      )}
    </div>
  );
}
