import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * The route-transition frame for the support centre.
 *
 * It moved up from `ticket/` when the list and the hub merged. That matters
 * beyond tidiness: `loading.tsx` is a boundary for its segment AND everything
 * nested under it, so leaving it at `ticket/` would make it the fallback for
 * `ticket/[id]` too — and a conversation would flash a list skeleton, complete
 * with a masthead and header clearance it does not have, before drawing as a
 * full-viewport app. (`ticket/[id]/loading.tsx` exists for the same reason.)
 *
 * It has to be the SAME frame the page settles into, or the boundary resolving
 * is itself a layout jump: the masthead band, the bucket bar with its two
 * filters, then one bordered surface holding six hairline-separated rows at the
 * row's real height. The page's own in-component pending rows pick up from
 * here, so the customer sees one continuous shape rather than two different
 * loading screens.
 *
 * Deliberately NOT `"use client"` and deliberately free of `t()` calls: a
 * transition frame that has to boot the i18n runtime before it can draw is a
 * frame that arrives late, and every string on it would be replaced a moment
 * later anyway.
 */
export default function Loading() {
  return (
    <div>
      {/* The masthead supplies its own header clearance and bottom padding. */}
      <div className="border-border bg-card/70 border-b backdrop-blur-sm">
        <div className="container mx-auto w-full px-4 pt-header-clear pb-8">
          <div className="divide-border divide-y">
            <div className="flex gap-3 pb-3">
              <Skeleton className="h-3 w-36" />
              <Skeleton className="h-3 w-28" />
              <Skeleton className="h-3 w-32" />
            </div>
            <div className="flex flex-col gap-4 pt-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="space-y-2">
                <Skeleton className="h-8 w-56" />
                <Skeleton className="h-4 w-80 max-w-full" />
              </div>
              <Skeleton className="h-9 w-32 shrink-0 rounded-md" />
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto w-full space-y-6 px-4 py-8">
        {/* bucket bar + the two filters */}
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <Skeleton className="h-9 w-full rounded-md lg:w-[26rem]" />
          <div className="flex flex-col gap-2 sm:flex-row">
            <Skeleton className="h-9 w-full sm:w-64" />
            <Skeleton className="h-9 w-full sm:w-40" />
          </div>
        </div>

        <Card padding="none" className="overflow-hidden">
          <div className="divide-border divide-y">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center gap-3 px-4 py-3.5">
                <span className="bg-border w-[3px] shrink-0 self-stretch rounded-full" />
                <div className="min-w-0 flex-1 space-y-2">
                  <Skeleton className="h-4 w-56 max-w-full" />
                  <Skeleton className="h-3 w-80 max-w-full" />
                </div>
                <Skeleton className="hidden h-3 w-20 shrink-0 sm:block" />
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
