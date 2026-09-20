"use client";

/**
 * The filter field every studio panel puts above its list.
 * ============================================================================
 *
 * Lifted out of `menus-list` once a second panel needed the same behaviour.
 * Four things have to be true every time, and they are easy to get wrong once
 * each:
 *
 *   1. `/` and ⌘K focus it, the way every dense tool in this admin behaves —
 *      but NOT while the caret is already in a field, or the shortcut eats the
 *      slash out of a href somebody is typing into an Add-item form.
 *   2. ArrowDown/ArrowUp walk the results WITHOUT leaving the box, so finding a
 *      row is one uninterrupted gesture.
 *   3. Escape clears, and only when there is something to clear — otherwise it
 *      swallows the key from whatever dialog is actually listening.
 *   4. The count line is `aria-live`, so a filter typed by a screen-reader user
 *      reports its result instead of silently emptying the list below.
 *
 * THE FIELD IS HAND-BUILT, deliberately, and it is the same recipe as
 * `components/ui/input` — the wrapper draws the focus ring off the real control
 * via `has-[input:focus-visible]`. What it does not inherit is that primitive's
 * icon slot: that slot spaces itself with `mr-2`, a PHYSICAL margin, and this
 * app ships Arabic and Farsi where the search icon sits against the right edge
 * with the gap on its left.
 */

import * as React from "react";
import { Search, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useTranslations } from "next-intl";

export function StudioFilter({
  id,
  value,
  onChange,
  onStep,
  onCommit,
  placeholder,
  label,
  children,
}: {
  /** Ties the box to its count line for `aria-describedby`. */
  id: string;
  value: string;
  onChange: (next: string) => void;
  /** Move the selection through the visible results. */
  onStep?: (delta: -1 | 1) => void;
  /** Enter — usually "select the first result if none is selected". */
  onCommit?: () => void;
  placeholder: string;
  label: string;
  /** The count line. Rendered inside the sticky header, under the box. */
  children?: React.ReactNode;
}) {
  const t = useTranslations("components");
  const searchRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const isSlash = event.key === "/" && !event.metaKey && !event.ctrlKey && !event.altKey;
      const isFind = event.key.toLowerCase() === "k" && (event.metaKey || event.ctrlKey);
      if (!isSlash && !isFind) return;

      const target = event.target as HTMLElement | null;
      const tag = target?.tagName;
      if (
        isSlash &&
        (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || target?.isContentEditable)
      ) {
        return;
      }

      event.preventDefault();
      searchRef.current?.focus();
      searchRef.current?.select();
    };

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  const onSearchKeyDown = React.useCallback(
    (event: React.KeyboardEvent<HTMLInputElement>) => {
      if (event.key === "ArrowDown") {
        event.preventDefault();
        onStep?.(1);
      } else if (event.key === "ArrowUp") {
        event.preventDefault();
        onStep?.(-1);
      } else if (event.key === "Enter") {
        event.preventDefault();
        onCommit?.();
      } else if (event.key === "Escape" && value) {
        event.preventDefault();
        onChange("");
      }
    },
    [onChange, onCommit, onStep, value]
  );

  return (
    /* Sticky, because the whole point of the filter is to be reachable while
       you are 20 rows down the list. */
    <div className="sticky top-0 z-10 border-b border-border bg-card px-2 py-2">
      <div className="flex h-8 w-full items-center gap-1.5 rounded-md border border-input bg-background px-2 shadow-2xs transition-[color,box-shadow] has-[input:focus-visible]:border-ring has-[input:focus-visible]:ring-[3px] has-[input:focus-visible]:ring-ring/50">
        <Search className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
        <input
          ref={searchRef}
          type="text"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={onSearchKeyDown}
          placeholder={placeholder}
          aria-label={label}
          aria-describedby={id}
          spellCheck={false}
          autoComplete="off"
          className="min-w-0 flex-1 bg-transparent text-xs text-foreground outline-hidden placeholder:text-muted-foreground"
        />
        {value ? (
          <Button
            type="button"
            size="icon-xs"
            variant="ghost"
            className="-me-1 shrink-0"
            aria-label={t("clear_filter")}
            onClick={() => {
              onChange("");
              searchRef.current?.focus();
            }}
          >
            {/* `size-*`, not `h-*`/`w-*`: Button's base rule sizes any child svg
                that does NOT already carry a `size-` class, and it wins on
                specificity — `h-3 w-3` here would silently render at 4. */}
            <X className="size-3" aria-hidden="true" />
          </Button>
        ) : (
          <kbd
            className="pointer-events-none hidden select-none rounded-sm border border-border px-1 text-[10px] leading-4 text-subtle-foreground sm:block"
            aria-hidden="true"
          >
            /
          </kbd>
        )}
      </div>

      {children ? (
        <p
          id={id}
          aria-live="polite"
          className="mt-1.5 flex items-center gap-1.5 px-0.5 text-[11px] text-muted-foreground"
        >
          {children}
        </p>
      ) : null}
    </div>
  );
}

/** The "nothing matched" block, so an empty section and a bad filter read differently. */
export function StudioFilterEmpty({
  query,
  onClear,
  emptyHint,
  noMatchHint,
}: {
  query: string;
  onClear: () => void;
  /** What an empty result means when there is NO filter — not a bad search. */
  emptyHint: string;
  noMatchHint: string;
}) {
  const t = useTranslations("components");
  return (
    <div className="px-3 py-8 text-center">
      <p className="text-xs text-muted-foreground">{query ? noMatchHint : emptyHint}</p>
      {query ? (
        <Button size="2xs" variant="outline" className="mt-2" onClick={onClear}>
          {t("clear_filter")}
        </Button>
      ) : null}
    </div>
  );
}

/** Walk a list with wrap-free clamping, landing sensibly when nothing is selected. */
export function stepThrough<T>(
  items: readonly T[],
  isSelected: (item: T) => boolean,
  delta: -1 | 1
): T | null {
  if (items.length === 0) return null;
  const at = items.findIndex(isSelected);
  /* A selection that is filtered out is not "index -1 + 1 = 0" by accident:
     Down from nowhere must land on the FIRST result and Up on the last, which
     is what somebody who just typed a query expects to happen. */
  const next =
    at < 0
      ? delta === 1
        ? 0
        : items.length - 1
      : Math.min(items.length - 1, Math.max(0, at + delta));
  return items[next];
}
