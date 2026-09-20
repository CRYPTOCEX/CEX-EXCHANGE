"use client";

import { useTranslations } from "next-intl";

import { Skeleton, SkeletonText } from "@/components/ui/skeleton";

/**
 * Pending state for /forex/account/[id]/deposit.
 *
 * Also rendered directly by `client.tsx` (`if (isPending) return
 * <DepositLoading/>`), so it is a component on two paths.
 *
 * WHAT DRIFTED — no container at all, and the wrong ground
 * -------------------------------------------------------
 * WAS `min-h-screen bg-background text-foreground pt-20 p-6`. The page is
 * `min-h-screen bg-linear-to-b from-background via-muted/10 to-background
 * dark:via-surface-2/30` → `<main className="container mx-auto pt-20 pb-24">`.
 *
 *  - NO `container`: the pending state ran FULL BLEED, so the stepper and the
 *    option cards spanned the whole viewport and then snapped inwards to the
 *    container's max-width on resolve. On a wide screen that is several
 *    hundred pixels of sideways movement — the largest mismatch on this route.
 *  - GROUND: flat `bg-background` against the forex wash, so the whole
 *    viewport changed colour on arrival.
 *  - `p-6` put 24px of padding on all four sides, including a second helping
 *    on top of the `pt-20`, against the page's `pb-24` (96px) at the foot.
 *  - `mb-4` under the header against the page's `mb-8`.
 *  - The heading and its subtitle were grey bars: the heading is a `t()` call
 *    and only the broker name inside the subtitle comes from the fetch, which
 *    is exactly what `client.tsx` already expresses with one `Loadable`.
 *
 * NOTE — the page's own `pt-20` is a literal that should be `pt-header-clear`
 * so it follows the navbar variant (`lib/chrome/variants.ts`). Matching it
 * here removes today's jump; changing it belongs in `client.tsx` and is
 * reported rather than done from this side.
 */
export default function DepositLoading() {
  const t = useTranslations("ext");
  const tCommon = useTranslations("common");

  return (
    <div className="min-h-screen bg-linear-to-b from-background via-muted/10 to-background dark:via-surface-2/30">
      <main className="container mx-auto pt-20 pb-24">
        {/* Header — the title is static; only the broker name waits. */}
        <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-foreground">
              {t("deposit_funds")}
            </h1>
            <p className="text-muted-foreground mt-2">
              {tCommon("add_funds_to_your")}{" "}
              <SkeletonText placeholder="BrokerServer" /> {tCommon("account")}
              <SkeletonText placeholder="12345678" />
            </p>
          </div>
          <Skeleton className="h-10 w-40 bg-muted rounded-md" />
        </div>

      {/* Progress bar */}
      <Skeleton className="h-1 w-full bg-muted mb-10" />

      <div className="flex gap-10">
        {/* Left side - Vertical stepper */}
        <div className="w-64">
          <div className="relative">
            {/* Step 1 */}
            <div className="flex items-start mb-16">
              <div className="relative">
                <Skeleton className="h-10 w-10 rounded-full bg-muted" />
                <div className="absolute top-10 left-5 w-[2px] h-16 bg-muted"></div>
              </div>
              <div className="ml-4">
                <Skeleton className="h-5 w-24 bg-muted mb-2" />
                <Skeleton className="h-4 w-40 bg-muted" />
              </div>
            </div>

            {/* Step 2 */}
            <div className="flex items-start mb-16">
              <div className="relative">
                <Skeleton className="h-10 w-10 rounded-full bg-muted" />
                <div className="absolute top-10 left-5 w-[2px] h-16 bg-muted"></div>
              </div>
              <div className="ml-4">
                <Skeleton className="h-5 w-24 bg-muted mb-2" />
                <Skeleton className="h-4 w-40 bg-muted" />
              </div>
            </div>

            {/* Step 3 */}
            <div className="flex items-start mb-16">
              <div className="relative">
                <Skeleton className="h-10 w-10 rounded-full bg-muted" />
                <div className="absolute top-10 left-5 w-[2px] h-16 bg-muted"></div>
              </div>
              <div className="ml-4">
                <Skeleton className="h-5 w-24 bg-muted mb-2" />
                <Skeleton className="h-4 w-40 bg-muted" />
              </div>
            </div>

            {/* Step 4 */}
            <div className="flex items-start">
              <Skeleton className="h-10 w-10 rounded-full bg-muted" />
              <div className="ml-4">
                <Skeleton className="h-5 w-24 bg-muted mb-2" />
                <Skeleton className="h-4 w-40 bg-muted" />
              </div>
            </div>
          </div>
        </div>

        {/* Right side - Content */}
        <div className="flex-1">
          <div className="border border-border rounded-lg p-6 bg-surface-2/50">
            <Skeleton className="h-7 w-48 bg-muted mb-3" />
            <Skeleton className="h-5 w-72 bg-muted mb-8" />

            {/* Option 1 */}
            <div className="border border-border rounded-lg p-4 mb-4 hover:bg-muted/30">
              <div className="flex items-center">
                <Skeleton className="h-8 w-8 bg-muted rounded mr-4" />
                <div>
                  <Skeleton className="h-5 w-32 bg-muted mb-2" />
                  <Skeleton className="h-4 w-56 bg-muted" />
                </div>
              </div>
            </div>

            {/* Option 2 */}
            <div className="border border-border rounded-lg p-4 hover:bg-muted/30">
              <div className="flex items-center">
                <Skeleton className="h-8 w-8 bg-muted rounded mr-4" />
                <div>
                  <Skeleton className="h-5 w-32 bg-muted mb-2" />
                  <Skeleton className="h-4 w-56 bg-muted" />
                </div>
              </div>
            </div>
          </div>

          {/* Next button */}
          <div className="flex justify-end mt-6">
            <Skeleton className="h-10 w-24 bg-muted rounded-md" />
          </div>
        </div>
      </div>
      </main>
    </div>
  );
}
