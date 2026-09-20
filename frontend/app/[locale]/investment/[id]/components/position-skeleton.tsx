"use client";

/**
 * A position, pending.
 *
 * NOTHING on this page is known before the fetch — the plan's name, the
 * principal, the currency, the dates, the rate and the outcome rule are all
 * properties of the record being looked up — so unlike the list surfaces there
 * is no real copy to draw. What is fixed is the geometry, and it is reserved at
 * the real radius, at rest.
 *
 * The cancel panel is deliberately NOT reserved. It renders only for an ACTIVE
 * position, and reserving 66px for a control that most settled positions will
 * never show trades one shift for another — the panel that does appear pushes
 * nothing, because it is the last block on the page.
 */

import { SkeletonBlock } from "@/components/ui/skeleton";

export function PositionSkeletonBody() {
  return (
    <>
      {/* principal header: p-4 (32) + label (14) + 2xl figure (32) */}
      <SkeletonBlock className="h-[78px] w-full rounded-lg" />
      {/* maturity panel: p-4 (32) + heading row (20) + bar (6) + 4-up facts
          (34) + the outcome block (56) + three gap-4 (48) */}
      <SkeletonBlock className="h-[196px] w-full rounded-lg" />
    </>
  );
}
