"use client";

/**
 * Pick an icon by looking at it.
 * ============================================================================
 *
 * NOT TO BE CONFUSED WITH `icon-picker.tsx`
 *
 * That one belongs to the PAGE BUILDER and speaks a different vocabulary: it
 * enumerates `lucide-react`'s barrel and stores camelCase export names
 * (`shoppingCart`), which the builder's own elements resolve directly. A menu
 * resolves through `components/ui/icon.tsx`, and `resolveIcon("shoppingCart")`
 * finds nothing there — the registry holds `ShoppingCart` and `shopping-cart`,
 * not the camelCase spelling. Pointing menus at that picker would store names
 * that render as blank space in the navbar, so the two stay separate on
 * purpose, each offering only what its own renderer can draw.
 *
 * WHY NOT THE `<select>` THE PAGE EDITOR USES
 *
 * `field-controls.tsx` picks home-page icons from a native `<select>` of 57
 * names, and its own comment explains the trade: the names are meaningful
 * English words and the live preview beside the panel shows the glyph a moment
 * later, so a list of words is enough THERE. A menu has neither half of that —
 * the vocabulary is 350 names, not 57, and the thing being decorated is a nav
 * row that is not on screen while you edit it. So this one draws the glyphs.
 *
 * WHAT IT OFFERS
 *
 * `ICON_NAMES`, derived from the icon registry itself. Anything in that list
 * resolves; anything outside it renders NOTHING at all, silently, which is the
 * one failure mode a free-text icon field guarantees eventually.
 *
 * CLEARING IS A FIRST-CLASS CHOICE
 *
 * "No icon" is the first tile, not a small link somewhere. Every item that has
 * never been given an icon is in that state, so the control has to be able to
 * put one back — and an admin who tried an icon and disliked it has no other
 * way out.
 */

import * as React from "react";
import { Check, Search, X } from "lucide-react";

import { Icon, ICON_NAMES } from "@/components/ui/icon";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";

/**
 * Split a PascalCase name into words so a search for "credit card" finds
 * `CreditCard`. Without it the box only matches the way the name is spelled,
 * which is not how anyone thinks about a picture of a card.
 */
function haystack(name: string): string {
  return `${name} ${name.replace(/([a-z0-9])([A-Z])/g, "$1 $2")}`.toLowerCase();
}

const HAYSTACKS: ReadonlyMap<string, string> = new Map(
  ICON_NAMES.map((name) => [name, haystack(name)])
);

export interface IconSelectProps {
  /** The stored name, or empty for none. */
  value?: string | null;
  onChange: (next: string) => void;
  disabled?: boolean;
  /** Rendered inside the trigger next to the glyph. Omit for a square button. */
  label?: string;
  className?: string;
  /**
   * Trigger height, as a Button size rather than a class.
   *
   * `className="h-7"` would look equivalent and is not: twMerge DELETES the
   * `h-[calc(1.75rem*var(--control-height-scale))]` the primitive sets, so the
   * control stops following the density setting every other control obeys.
   */
  size?: "2xs" | "xs" | "sm";
}

export function IconSelect({
  value,
  onChange,
  disabled,
  label,
  className,
  size = "xs",
}: IconSelectProps) {
  const t = useTranslations("common");
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");

  const current = value?.trim() || "";

  const matches = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return ICON_NAMES;
    const terms = q.split(/\s+/).filter(Boolean);
    return ICON_NAMES.filter((name) => {
      const hay = HAYSTACKS.get(name) ?? "";
      return terms.every((term) => hay.includes(term));
    });
  }, [query]);

  const choose = (next: string) => {
    onChange(next);
    setOpen(false);
    setQuery("");
  };

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        if (disabled) return;
        setOpen(next);
        if (!next) setQuery("");
      }}
    >
      <PopoverTrigger asChild>
        {/* `<Button>`, not a hand-rolled control: the primitive carries the
            height, padding, radius and focus ring as tokens, and re-typing them
            here is how a control stops following the density and radius
            settings the rest of the admin obeys. */}
        <Button
          type="button"
          variant="outline"
          size={size}
          disabled={disabled}
          aria-label={t("choose_an_icon")}
          className={cn("gap-1.5", className)}
        >
          {current ? (
            /* No `fallback`: a stored name that does not resolve must read as
               EMPTY here, because empty is exactly what the nav will draw. A
               stand-in glyph in the picker would promise a picture the site
               does not have. */
            <Icon icon={current} className="size-4 shrink-0" />
          ) : (
            <span className="size-4 shrink-0 rounded-sm border border-dashed border-border" />
          )}
          {label ? <span className="truncate">{label}</span> : null}
        </Button>
      </PopoverTrigger>

      <PopoverContent align="start" className="w-72 p-0">
        <div className="flex items-center gap-2 border-b border-border px-3 py-2">
          <Search className="size-3.5 shrink-0 text-subtle-foreground" />
          <Input
            removeWrapper
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("search_icons")}
            aria-label={t("search_icons")}
            /* No height override. `h-7` here reads as a harmless tweak and is
               not: twMerge deletes the primitive's
               `h-[calc(2.25rem*var(--control-height-scale))]`, so this one
               field would stop following the density setting the rest of the
               admin obeys. The border, ground and padding ARE dropped on
               purpose — this is an inline field in a popover header, not a
               boxed control. */
            className="border-0 bg-transparent px-0 text-xs shadow-none focus-visible:ring-0"
          />
          <span className="shrink-0 font-mono text-[10px] tabular-nums text-subtle-foreground">
            {matches.length}
          </span>
        </div>

        <div className="max-h-64 overflow-y-auto overscroll-contain p-2">
          <div className="grid grid-cols-6 gap-1">
            {/* "None" leads, so removing an icon is as easy as adding one. */}
            <button
              type="button"
              onClick={() => choose("")}
              title={t("no_icon")}
              aria-label={t("no_icon")}
              aria-pressed={!current}
              className={cn(
                "flex aspect-square items-center justify-center rounded-md ring-1 transition-colors cursor-pointer",
                !current
                  ? "bg-primary/10 text-primary-ink ring-primary/40"
                  : "text-muted-foreground ring-transparent hover:bg-muted"
              )}
            >
              <X className="size-4" />
            </button>

            {matches.map((name) => {
              const selected = name === current;
              return (
                <button
                  key={name}
                  type="button"
                  onClick={() => choose(name)}
                  title={name}
                  aria-label={name}
                  aria-pressed={selected}
                  className={cn(
                    "relative flex aspect-square items-center justify-center rounded-md ring-1 transition-colors cursor-pointer",
                    selected
                      ? "bg-primary/10 text-primary-ink ring-primary/40"
                      : "text-muted-foreground ring-transparent hover:bg-muted hover:text-foreground"
                  )}
                >
                  <Icon icon={name} className="size-4" />
                  {selected ? (
                    <Check className="absolute -end-0.5 -top-0.5 size-3 text-primary-ink" />
                  ) : null}
                </button>
              );
            })}
          </div>

          {matches.length === 0 ? (
            <p className="px-1 py-6 text-center text-xs text-subtle-foreground">
              {t("no_icon_matches")}
            </p>
          ) : null}
        </div>
      </PopoverContent>
    </Popover>
  );
}
