import { Skeleton, SkeletonText } from "@/components/ui/skeleton";
import { getTranslations } from "next-intl/server";

/**
 * Pending state for /gateway/payment.
 *
 * WAS: `min-h-screen flex items-center justify-center pt-20` + a `Loader2`.
 *
 * This route roots a bare `<DataTable>`, which owns its own frame and its own
 * row skeletons — so the route-level file is normally dead weight and the other
 * six DataTable-only routes in this sweep had theirs deleted. This one CANNOT
 * be deleted: `client.tsx:11` imports it and renders it while it checks whether
 * the visitor is a registered merchant, so it is a live component.
 *
 * What it stood in for is the DataTable's DEFAULT (non-hero) header — this call
 * site passes no `design` prop — which is
 *   `flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between`
 * with an `h1 text-2xl sm:text-3xl` title and a description beneath, inside the
 * table's `space-y-4` stack. The spinner reserved none of that, invented a
 * `min-h-screen` box the table does not create, and added 5rem of clearance the
 * table does not have.
 *
 * The title and description are literals at the call site, so they render for
 * real here. Only the rows wait.
 *
 * PAGE-FILE NOTE (not mine to change): `client.tsx` swaps its whole tree on
 * `checkingMerchant`, which is the `if (isLoading) return <PageSkeleton/>`
 * shape SKELETONS.md asks callers to stop using. The merchant check could
 * render the table's frame and gate only the body.
 */
export default async function GatewayPaymentLoading() {
  const t = await getTranslations("ext_gateway");
  const tCommon = await getTranslations("common");
  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            {tCommon("transaction_history")}
          </h1>
          <p className="text-sm text-muted-foreground">
            {t("view_and_manage_all_your_payment_transactions")}
          </p>
        </div>
        <Skeleton className="h-10 w-40 rounded-md" />
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-2">
        <Skeleton className="h-10 flex-1 rounded-md" />
        <Skeleton className="h-10 w-24 rounded-md" />
      </div>

      {/* 12 rows: the call site passes `pageSize={12}`, so this is the table's
          own page size and not a guess (SKELETONS.md, "Lists and grids"). */}
      <div className="rounded-lg border border-border">
        {Array.from({ length: 12 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center justify-between gap-4 border-b border-border p-4 last:border-b-0"
          >
            <span className="text-sm font-mono tabular-nums">
              <SkeletonText placeholder="00000000" />
            </span>
            <span className="text-sm font-mono tabular-nums">
              <SkeletonText placeholder="000.00 USD" />
            </span>
            <span className="text-sm text-muted-foreground">
              <SkeletonText placeholder="01 Jan 2026" />
            </span>
            <Skeleton className="h-6 w-20 rounded-full" />
          </div>
        ))}
      </div>
    </div>
  );
}
