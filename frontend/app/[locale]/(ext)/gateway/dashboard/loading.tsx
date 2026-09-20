"use client";

import { Key, Settings } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton, SkeletonText } from "@/components/ui/skeleton";
import { GatewayDashboardHero } from "./components/dashboard-hero";

/**
 * Pending state for /gateway/dashboard.
 *
 * WAS: `space-y-6 pt-20` over an `h-10` bar, four `h-32` blocks in a
 * `md:grid-cols-4` and one `h-64` block.
 *
 * The settled page is `<div className="w-full">` → `<GatewayDashboardHero>` →
 * `container mx-auto space-y-6 pb-6 pt-8`. Three drifts in one class string:
 *
 *   - `pt-20` (5rem) stood in for `pt-8` (2rem) — 48px of phantom clearance —
 *     and it was applied to the ROOT, above the hero, where the page applies
 *     nothing at all;
 *   - there was no `container`, so the content ran full-bleed and then snapped
 *     into a centred column when the data landed;
 *   - the hero — badge, headline, merchant-status chip, two buttons and a
 *     seven-metric `PremiumStats` strip — was represented by a single
 *     `h-10 w-64` bar.
 *
 * NOW it IMPORTS `GatewayDashboardHero`, the same component `client.tsx`
 * renders, and hands it zeroes. A duplicate that mounts the real shell cannot
 * drift from it; one that re-describes it always does. The two header buttons
 * are static and paint for real.
 *
 * `client.tsx` also renders this file directly while it checks the merchant
 * record, which is why it is a client component.
 */
export default function GatewayDashboardLoading() {
  const tCommon = useTranslations("common");

  return (
    <div className="w-full">
      <GatewayDashboardHero
        totalPayments={0}
        totalRevenue={0}
        pendingAmount={0}
        successRate={0}
        merchantStatus="PENDING"
        rightContent={
          <div className="flex gap-2">
            <Button variant="outline">
              <Settings className="h-4 w-4 mr-2" />
              Settings
            </Button>
            <Button variant="outline">
              <Key className="h-4 w-4 mr-2" />
              {tCommon("api_keys")}
            </Button>
          </div>
        }
      />

      <div className="container mx-auto space-y-6 pb-6 pt-8">
        <Card>
          <CardContent className="p-4 space-y-3">
            {/* Recent-payment rows. The page renders each as a bordered
                `bg-surface-2` row, so the placeholder keeps the ROW rather than
                one tall grey block that later splits into rows. */}
            {[0, 1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="flex items-center gap-4 rounded-lg border border-border bg-surface-2 p-4"
              >
                <Skeleton className="h-9 w-9 rounded-lg" />
                <div className="flex-1 min-w-0">
                  <span className="font-semibold text-lg">
                    <SkeletonText placeholder="000.00 USD" />
                  </span>
                  <div className="mt-1 text-sm text-muted-foreground">
                    <SkeletonText placeholder="00000000-0000-0000" />
                  </div>
                </div>
                <Skeleton className="h-6 w-20 rounded-full" />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
