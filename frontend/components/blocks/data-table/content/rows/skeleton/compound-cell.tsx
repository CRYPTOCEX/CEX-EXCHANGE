import React from "react";
import { SkeletonBlock, SkeletonText } from "@/components/ui/skeleton";
import { CompoundConfig } from "../../../types/table";
import { cn } from "@/lib/utils";

import { IMAGE_CELL_SIZES } from "../cells/image";

interface CompoundCellSkeletonProps {
  config: CompoundConfig;
}

/**
 * The pending half of `../cells/compound.tsx`.
 * ============================================================================
 *
 * A compound cell is the widest and tallest thing in most admin tables — an
 * avatar beside a name, a subtitle and a metadata strip — so it is usually the
 * cell that decides the row height. It was also the closest skeleton in this
 * repo already: it wrapped its bars in fixed-height rows instead of letting
 * them stack, which is the right idea. The rows just carried the wrong numbers.
 *
 * WHAT WAS WRONG, IN PIXELS
 * -------------------------
 *  * PRIMARY ROW: reserved `h-6` (24px). The real row is
 *    `<span className="font-medium truncate">` at the table's inherited
 *    `text-sm`, which is a 20px line box. 4px too tall, on every row of every
 *    table with a compound column — the most common column type in the admin.
 *
 *  * SECONDARY ICON: `h-3.5 w-3.5` (14px) against the real `h-4 w-4` (16px).
 *    2px of width, and it could not set the row height because the 20px line
 *    box next to it is taller.
 *
 *  * PRIMARY ROW RENDERED UNCONDITIONALLY. `CompoundCell` renders it only when
 *    the primary value resolves, and skips the whole block when the config has
 *    no `primary` at all. An image-plus-metadata column reserved a name row it
 *    was never going to draw.
 *
 *  * METADATA SEPARATOR was `border-l border-border/50`; the real one is a
 *    plain `border-l`. Colour only, but it is the sort of drift that makes a
 *    skeleton stop looking like the thing it stands in for.
 *
 * The three rows are now built out of the SAME elements the real cell uses,
 * with `SkeletonText` inside them, so their heights are computed by the text
 * layout rather than restated here. The fixed `h-6`/`h-5`/`h-4` wrappers are
 * gone with them — they were the second copy of the type scale.
 */
export function CompoundCellSkeleton({ config }: CompoundCellSkeletonProps) {
  const hasMetadata = Boolean(config?.metadata && config.metadata.length > 0);
  const isGateway = config?.image?.size === "gateway";

  return (
    <div className="flex items-center gap-3 min-w-[200px]">
      {config?.image && (
        <div className="shrink-0">
          {isGateway ? (
            /* Real: `GatewayImage` -> `w-30 h-18 ... rounded border` (120x72).
               `border` is on the real box too; it is inside the border box, so
               it costs no height — it is here so the pending chip has the same
               edge the logo plate does. */
            <SkeletonBlock className="w-30 h-18 rounded border" />
          ) : (
            /* Real: `<div className="min-w-12 min-h-12">` around an `ImageCell`
               pinned to `size="sm"` — note CompoundCell HARDCODES `sm`, so this
               is 48px whatever `config.image.size` says. */
            <div className="min-w-12 min-h-12">
              <SkeletonBlock
                className={cn(IMAGE_CELL_SIZES.sm, "rounded-full")}
              />
            </div>
          )}
        </div>
      )}

      <div className="flex-1">
        {/* Primary — `font-medium` at the table's `text-sm`: a 20px line box. */}
        {config?.primary && (
          <div className="flex items-center gap-1">
            {config.primary.icon && (
              <SkeletonBlock className="h-4 w-4 shrink-0 rounded-sm" />
            )}
            <span className="font-medium truncate">
              <SkeletonText chars={18} />
            </span>
          </div>
        )}

        {/* Secondary — `text-sm text-muted-foreground`, also a 20px line box. */}
        {config?.secondary && (
          <div className="flex items-center gap-1">
            {config.secondary.icon && (
              <SkeletonBlock className="h-4 w-4 shrink-0 rounded-sm" />
            )}
            <span className="text-sm text-muted-foreground truncate">
              <SkeletonText chars={24} />
            </span>
          </div>
        )}

        {/* Metadata — `text-xs`, a 16px line box, offset by `mt-1`. The real
            container is `flex flex-wrap`, so a narrow column can wrap this
            strip onto a second line; that depends on the resolved strings, so
            one line is reserved and any wrap settles. */}
        {hasMetadata && (
          <div className="flex flex-wrap gap-2 mt-1">
            {config.metadata?.map((item, index) => (
              <div
                key={index}
                className={cn(
                  "flex items-center gap-1 text-xs",
                  index > 0 && "border-l pl-2"
                )}
              >
                {item.icon && (
                  <SkeletonBlock className="h-3 w-3 shrink-0 rounded-sm" />
                )}
                <span>
                  <SkeletonText chars={8} />
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
