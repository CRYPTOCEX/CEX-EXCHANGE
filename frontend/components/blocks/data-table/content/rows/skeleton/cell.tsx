import React from "react";
import { Badge } from "@/components/ui/badge";
import { SkeletonBlock, SkeletonText } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

import { BADGE_CELL_CHIP } from "../cells/badge";
import { IMAGE_CELL_SIZES } from "../cells/image";
import { CompoundCellSkeleton } from "./compound-cell";

/**
 * The pending half of one table cell.
 * ============================================================================
 *
 * WHAT THIS FILE IS FOR, AND WHAT IT USED TO GET WRONG
 * ----------------------------------------------------
 * `DataTable` renders on 96 pages, so a cell that is a few pixels off is a few
 * pixels off ten times per table on ninety-six screens. Every number below is
 * therefore taken from the renderer it stands in for — the files in
 * `../cells/` — rather than chosen to look plausible.
 *
 * Two structural bugs, both of which made the fixes below necessary:
 *
 * 1. IT DISPATCHED ON THE COLUMN KEY, NOT ON THE RENDERER.
 *    `column.key === "status"`, `=== "type"`, `=== "avatar"`, `=== "balance"`,
 *    `=== "amount"`, `=== "emailVerified"`. But `table-row-content.tsx` picks
 *    the renderer with exactly one expression:
 *
 *        renderType={column.render || { type: column.type }}
 *
 *    so a column keyed `status` with `type: "text"` and no `render` got a
 *    PILL while the loaded cell was plain text, and a column keyed
 *    `settlementStatus` carrying `render: { type: "badge" }` got a text bar
 *    while the loaded cell was a pill. The key heuristics are gone; this file
 *    now resolves the renderer with the same expression the real row uses, so
 *    the two cannot disagree by construction.
 *
 * 2. IT SIZED TEXT WITH `h-4`.
 *    The table is `text-sm` (`components/ui/table.tsx`), which is a 20px line
 *    box. `h-4` is 16px. EVERY text, number and date cell was therefore 4px
 *    short — and since the tallest cell sets the row height, a table whose
 *    rows are all text was 4px short PER ROW: 40px on a 10-row page, 100px at
 *    a page size of 25. Text now goes through `SkeletonText`, inside the same
 *    element that carries the typography, so the height is produced by the
 *    text layout instead of by a number typed here.
 *
 * `Skeleton` survives only where the real thing genuinely has no text metrics
 * — a checkbox, a switch, an avatar, an icon button — and there it copies the
 * real element's size classes verbatim (or imports them, where the renderer
 * exports them).
 */
interface CellSkeletonProps {
  column: ColumnDefinition;
  /**
   * Kept for signature compatibility with the caller. `content/index.tsx`
   * builds `columnWidths` as a constant 150 for every column, so it carries no
   * information and nothing here reads it; widths come from the character
   * counts below, which at least track the shape of the value.
   */
  width: number;
}

/*
 * A note that every measurement below leans on: the table element carries
 * `text-sm` (`components/ui/table.tsx`), and Tailwind's `text-sm` is
 * 0.875rem/1.25rem — a 20px line box. `text-xs`, used by every chip, is
 * 0.75rem/1rem — a 16px one.
 */
export function CellSkeleton({ column }: CellSkeletonProps) {
  /* ---- the two synthetic columns, injected by ./index.tsx ---------------- */

  // Real: `<Checkbox />` at its default `md` size — `size-4 rounded-md`
  // (components/ui/checkbox.tsx). The old spelling was `h-4 w-4 rounded`,
  // i.e. a 4px corner against the checkbox's 6px one. Same box, wrong shape.
  if (column.key === "select") {
    return <SkeletonBlock className="size-4 rounded-md" />;
  }

  // Real: `<Button variant="ghost" className="h-8 w-8 p-0">` holding a
  // `h-4 w-4` MoreHorizontal (../actions/index.tsx). 32x32 was already right;
  // the radius was not — Button's base is `rounded-md` (6px), not `rounded-lg`
  // (8px).
  if (column.key === "actions") {
    return <SkeletonBlock className="h-8 w-8 rounded-md" />;
  }

  /* ---- resolve the renderer exactly as the real row does ----------------- */

  const renderType: any = column.render || { type: column.type };

  /* A `render` given as a FUNCTION returns arbitrary JSX, so there is nothing
     to measure. Fall through to the text box rather than inventing a shape. */
  const kind: string | undefined =
    typeof renderType === "function" ? undefined : renderType?.type;

  switch (kind) {
    /* ---------------------------------------------------------------- image */
    // Real: `<ImageCell size={render.size ?? "md"}>` -> a `Lightbox` whose box
    // is `IMAGE_CELL_SIZES[size]` + `rounded-full`. The size classes are
    // imported rather than restated: this used to say `w-11 h-11` (44px)
    // against a 64px default, 20px short in both axes on the element that
    // usually SETS the row height.
    case "image": {
      const size = (renderType.size ?? "md") as keyof typeof IMAGE_CELL_SIZES;
      return (
        <SkeletonBlock
          className={cn(IMAGE_CELL_SIZES[size] ?? IMAGE_CELL_SIZES.md, "rounded-full")}
        />
      );
    }

    /* ------------------------------------------------------------- compound */
    case "compound":
      return <CompoundCellSkeleton config={renderType.config} />;

    /* --------------------------------------------------------------- toggle */
    // Real: `<Switch />` — `h-5 w-9 ... rounded-full` (components/ui/switch.tsx).
    // The one branch that was already exact. Note it does NOT get the
    // `flex items-center` wrapper it used to have: `ToggleCell` returns the
    // Switch bare, and the cell's own content div is already a flex row.
    case "toggle":
      return <SkeletonBlock className="h-5 w-9 rounded-full" />;

    /* -------------------------------------------------------------- boolean */
    // Real: `BooleanCell`. Two shapes, and the config says which:
    //   * with `labels` -> a plain `<span>` of text, 20px.
    //   * without      -> `<Badge>` + a `h-4 w-4` icon + "Yes"/"No", which is
    //                     22px (1px border + 2px py-0.5 + 16px text-xs line +
    //                     2px + 1px) and about 68px wide.
    // This branch used to render the SWITCH box (20x36) for both, so the badge
    // form was 2px short and ~32px narrow.
    case "boolean": {
      if (renderType.labels) {
        return (
          <span>
            <SkeletonText chars={6} />
          </span>
        );
      }
      return (
        <div className="flex items-center">
          <Badge className="bg-muted/60 font-medium">
            {/* the Check/X, `mr-1.5 h-4 w-4` in the real cell */}
            <span className="mr-1.5 h-4 w-4 shrink-0 rounded-sm bg-muted-foreground/20" />
            <SkeletonText chars={3} />
          </Badge>
        </div>
      );
    }

    /* ---------------------------------------------------------------- badge */
    // Real: `BadgeCell` -> `<div className="flex items-center">` wrapping the
    // local chip, whose geometry is now imported (`BADGE_CELL_CHIP`) instead of
    // approximated. 20px tall, against the 24px `h-6` this used to reserve.
    // `withDot` defaults to true in `BadgeCell`, so the 8px dot plus its 6px
    // margin is part of the box whenever the config does not switch it off.
    case "badge": {
      const withDot = renderType.config?.withDot ?? true;
      return (
        <div className="flex items-center">
          <span className={cn(BADGE_CELL_CHIP, "bg-muted/60")}>
            {withDot && (
              <span className="mr-1.5 h-2 w-2 shrink-0 rounded-full bg-muted-foreground/30" />
            )}
            <SkeletonText chars={7} />
          </span>
        </div>
      );
    }

    /* ----------------------------------------------------------------- tags */
    // Real: `TagsCell` -> `flex items-center gap-1 overflow-hidden` holding
    // `<Badge variant="soft">` chips. Rendering the REAL Badge is what makes
    // this exact: the chips are 22px (bordered, `px-2 py-0.5 text-xs`), where
    // the old `h-5 rounded-full` bars were 20px AND the wrong shape — the ui
    // Badge is `rounded-md`, not a pill. The container gap was `gap-1.5`
    // against the real `gap-1`.
    //
    // Two chips, not `maxDisplay`: the real count is `min(value.length,
    // maxDisplay)` and the value is what we are waiting for. Height is
    // identical either way, and width is the axis the doc lets settle.
    case "tags":
    case "multiselect":
      return (
        <div className="flex items-center gap-1 overflow-hidden">
          {[6, 5].map((chars, i) => (
            <Badge key={i} variant="soft" className="whitespace-nowrap">
              <SkeletonText chars={chars} />
            </Badge>
          ))}
        </div>
      );

    /* --------------------------------------------------------- customFields */
    // Real: `CustomFieldsCell` -> `flex flex-wrap items-center gap-1.5` of
    // `<Badge variant="secondary" className="text-xs font-normal">`.
    case "customFields":
      return (
        <div className="flex flex-wrap items-center gap-1.5">
          {[7, 5].map((chars, i) => (
            <Badge key={i} variant="secondary" className="text-xs font-normal">
              <SkeletonText chars={chars} />
            </Badge>
          ))}
        </div>
      );

    /* --------------------------------------------------------------- rating */
    // Real: five `h-4 w-4` lucide stars in a `flex items-center`, no gap —
    // 80x16. The old default text bar happened to be `h-4 w-20`, which is the
    // same box by coincidence; stating it makes it survive a change to either.
    case "rating":
      return (
        <div className="flex items-center">
          {[0, 1, 2, 3, 4].map((i) => (
            <SkeletonBlock key={i} className="h-4 w-4 rounded-sm" />
          ))}
        </div>
      );

    /* ----------------------------------------------------------------- date */
    // Real: `DateCell` -> a Radix `TooltipTrigger` (a bare `<button>`, which
    // preflight strips to `font: inherit; padding: 0; border: 0`) wrapping a
    // plain `<span>` of relative time. As a flex item the button is blockified,
    // so the box is exactly the 20px line box the span produces — which is what
    // a `<span>` here produces too. The old `h-4` was 16px.
    case "date":
      return (
        <span>
          <SkeletonText placeholder="about 2 months ago" />
        </span>
      );

    /* ------------------------------------------------------------------ age */
    // Real: `AgeCell` -> the same tooltip trigger around
    // `inline-flex items-center gap-1.5 tabular-nums`, holding an optional
    // `h-3.5 w-3.5` warning icon and a short duration ("3d 4h").
    case "age":
      return (
        <span className="inline-flex items-center gap-1.5 tabular-nums">
          <SkeletonText placeholder="12h 30m" />
        </span>
      );

    /* --------------------------------------------------------------- number */
    // Real: `NumberCell` -> `<span className="font-mono">`. Keeping the
    // `font-mono` on the wrapper is not cosmetic: under tabular figures every
    // digit has the same advance, so a placeholder with the value's character
    // count is exactly as wide as the value — the one case where the width is
    // an identity and not an average.
    case "number":
      return (
        <span className="font-mono">
          <SkeletonText chars={8} />
        </span>
      );

    /* ----------------------------------------------------------------- link */
    // Real: `<Link className="text-primary hover:underline">` — an inline
    // anchor, so a 20px line box like any other text.
    case "link":
      return (
        <span className="text-primary">
          <SkeletonText chars={16} />
        </span>
      );

    /* ----------------------------------------------- text and everything else
       `text`, `textarea`, `select`, `custom`, `email`, `url`, an unset `type`,
       and a `render` given as a function all resolve to `TextCell` or to
       something unknowable. `TextCell` is `<span className="truncate">`, so
       that is the element the placeholder goes inside.

       `textarea` cells can wrap to several lines once `breakText` is on; the
       line count is a property of the value, so one line is reserved and the
       rest settles. */
    default:
      return (
        <span className="truncate">
          <SkeletonText chars={12} />
        </span>
      );
  }
}
