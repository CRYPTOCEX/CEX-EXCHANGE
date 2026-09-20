"use client";

import { ArrowLeft } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { SkeletonText } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/ui/status-badge";
import { Link } from "@/i18n/routing";
import { useTranslations } from "next-intl";

/**
 * Pending state for /forex/investment/[id].
 *
 * WHAT DRIFTED — 16px of clearance, and the whole two-column split
 * ---------------------------------------------------------------
 * WAS `container mx-auto pt-20 py-10`. The page is
 * `min-h-screen bg-linear-to-b from-background via-muted/10 to-background
 * dark:via-surface-2/30` → `<main className="pt-24 pb-12">` →
 * `container mx-auto`.
 *
 *  - CLEARANCE: `pt-20` (5rem) against the page's `pt-24` (6rem). This is the
 *    16px case, and it is the whole argument against literals: the same job
 *    got two different numbers from two different people, and neither follows
 *    `--header-height`. The page's own `pt-24` should itself be
 *    `pt-header-clear` — reported, since `client.tsx` is not this pass's to
 *    edit — but matching it here is what removes the jump today.
 *  - GROUND: no wash, so the page ground appeared only on resolve.
 *  - PADDING: `py-10` puts 40px at the TOP as well, on top of the `pt-20`, and
 *    40px at the bottom against the page's `pb-12` (48px).
 *  - LAYOUT: a flat `space-y-8` stack — header, 4-up stat grid, progress card,
 *    chart card, a button row — against the page's `grid lg:grid-cols-3
 *    gap-8` with a 2/1 split. From `lg` up every card was in the wrong column,
 *    so the settle was a full re-flow rather than a shift.
 *
 * `client.tsx` is already fully converted: it threads `isPending` through
 * `Loadable` and never swaps the tree. This file is that frame with the values
 * pending, so the literal headings ("Investment Status") and the back control
 * render for real.
 */
export default function InvestmentDetailLoading() {
  const t = useTranslations("ext_forex");
  const tCommon = useTranslations("common");
  const tExt = useTranslations("ext");
  return (
    <div className="min-h-screen bg-linear-to-b from-background via-muted/10 to-background dark:via-surface-2/30">
      <main className="pt-24 pb-12">
        <div className="container mx-auto">
          <div className="mb-8">
            <div className="flex flex-wrap items-center gap-4 mb-4">
              <Link href="/forex/dashboard">
                <Button
                  variant="outline"
                  size="icon"
                  className="rounded-xl border-border"
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
              </Link>
              <div className="flex-1">
                <div className="flex flex-wrap items-center gap-3 mb-1">
                  <h1 className="text-2xl md:text-3xl font-bold text-foreground">
                    <SkeletonText placeholder={tCommon("investment_plan")} />
                  </h1>
                  {/* Same call `client.tsx` makes while pending: no icon, a
                      measured label, and an undefined status so the chip lands
                      on the neutral tone — which tone it settles to IS the
                      fetch's answer. */}
                  <StatusBadge
                    icon={null}
                    appearance="solid"
                    label={<SkeletonText chars={8} />}
                  />
                </div>
                <p className="text-muted-foreground">
                  <SkeletonText placeholder={t("investment_id_00000000_ellipsis_created_on_00_jan") + " 0000"} />
                </p>
              </div>
            </div>
          </div>

          <div className="grid lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
              {/* Status card. Its 4px progress rail is chrome and renders at
                  zero fill rather than claiming a percentage. */}
              <Card className="rounded-lg border border-border bg-card overflow-hidden">
                <div className="h-1 bg-success">
                  <div className="h-full bg-card/30" style={{ width: "100%" }} />
                </div>
                <CardContent className="p-6">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div>
                      <h3 className="text-lg font-semibold text-foreground mb-1">
                        {tExt("investment_status")}
                      </h3>
                      <p className="text-muted-foreground text-sm">
                        <SkeletonText placeholder={t("your_investment_is_active_and_generating_profits")} />
                      </p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="font-medium text-foreground">
                        <SkeletonText placeholder={tCommon("in_progress")} />
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Figures card: four labelled rows, each placeholder inside the
                  real `text-2xl leading-tight` element so its height is
                  computed rather than typed. */}
              <Card className="rounded-lg border border-border bg-card">
                <CardContent className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {[0, 1, 2, 3].map((i) => (
                      <div key={i}>
                        <p className="text-xs font-medium text-muted-foreground">
                          <SkeletonText placeholder={t("amount_invested")} />
                        </p>
                        <p className="text-2xl font-semibold leading-tight tracking-tight font-mono tabular-nums">
                          <SkeletonText placeholder="$0.00" />
                        </p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Sidebar column — present in both states, so the 2/1 split is
                stable and only its contents wait. */}
            <div className="space-y-6">
              <Card className="rounded-lg border border-border bg-card">
                <CardContent className="space-y-4">
                  <h3 className="text-lg font-semibold leading-tight tracking-tight">
                    <SkeletonText placeholder={t("plan_details")} />
                  </h3>
                  {[0, 1, 2].map((i) => (
                    <div key={i} className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">
                        <SkeletonText placeholder="Duration" />
                      </span>
                      <span className="text-sm font-medium tabular-nums">
                        <SkeletonText placeholder="00 days" />
                      </span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
