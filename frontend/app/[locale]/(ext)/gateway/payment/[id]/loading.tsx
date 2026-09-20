import { Skeleton, SkeletonText } from "@/components/ui/skeleton";
import { getTranslations } from "next-intl/server";

/**
 * Pending state for /gateway/payment/[id].
 *
 * WAS: `space-y-6 pt-20`. The settled page's root is
 * `container pt-24 pb-16 space-y-6` — so the skeleton had 5rem of clearance
 * against the page's 6rem (16px out) AND no `container` at all, which meant the
 * whole detail view painted full-bleed and then snapped into a centred column.
 * It also had no `pb-16`, so the page grew 64px at the bottom on arrival.
 *
 * The header row shape is kept from the old file because it was right — a
 * 40px back button beside a two-line title block — but the two lines are now
 * measured by the text they replace instead of by hand-picked `h-6`/`h-4`
 * boxes.
 */
export default async function PaymentDetailsLoading() {
  const t = await getTranslations("common");
  return (
    <div className="container pt-24 pb-16 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10 rounded-lg" />
          <div>
            <p className="text-2xl font-bold tracking-tight">
              <SkeletonText placeholder={t("payment") + " 00000000"} />
            </p>
            <p className="text-sm text-muted-foreground">
              <SkeletonText placeholder="01 Jan 2026, 12:00" />
            </p>
          </div>
        </div>
        <Skeleton className="h-9 w-28 rounded-md" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="rounded-lg border border-border p-6 space-y-4">
            <Skeleton className="h-5 w-40" />
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  <SkeletonText placeholder="Amount" />
                </span>
                <span className="text-sm font-mono tabular-nums">
                  <SkeletonText placeholder="000.00 USD" />
                </span>
              </div>
            ))}
          </div>
          <div className="rounded-lg border border-border p-6 space-y-4">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-48 w-full rounded-md" />
          </div>
        </div>
        <div className="space-y-6">
          <div className="rounded-lg border border-border p-6 space-y-4">
            <Skeleton className="h-5 w-28" />
            <Skeleton className="h-32 w-full rounded-md" />
          </div>
          <div className="rounded-lg border border-border p-6 space-y-4">
            <Skeleton className="h-5 w-28" />
            <Skeleton className="h-32 w-full rounded-md" />
          </div>
        </div>
      </div>
    </div>
  );
}
