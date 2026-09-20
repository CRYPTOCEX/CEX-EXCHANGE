"use client";

/**
 * The portfolio, pending.
 *
 * It reserves the REAL geometry at the REAL radius, and it draws AT REST — no
 * entrance animation and no offset, because an entrance IS the shift a skeleton
 * exists to prevent.
 *
 * ONE currency row, because that is what almost every account has; TWO position
 * cards, because a portfolio with none shows an empty panel instead and a
 * portfolio with twenty is not made calmer by twenty grey rectangles.
 *
 * The strip renders its own pending state (`PortfolioStrip loading`), so the
 * labels and the notes under each cell are REAL TEXT here — only the figures
 * are unknown. Static copy in a skeleton is not a placeholder.
 */

import { SkeletonBlock } from "@/components/ui/skeleton";
import { PortfolioStrip } from "./portfolio-strip";

export function PortfolioSkeletonBody() {
  return (
    <>
      <PortfolioStrip buckets={[]} unbucketed={0} loading />

      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-subtle-foreground">
            Running
          </h2>
        </div>
        <div className="flex flex-col gap-3">
          {/* 148px is the settled height of a `PositionCard`: p-4 (32) + the
              title/principal block (52) + the clock block (34) + the footer row
              (16) + two gap-3 (24). */}
          <SkeletonBlock className="h-[148px] w-full rounded-lg" />
          <SkeletonBlock className="h-[148px] w-full rounded-lg" />
        </div>
      </section>
    </>
  );
}
