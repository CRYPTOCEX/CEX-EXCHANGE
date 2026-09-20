"use client";

import { Clock, Eye, RefreshCcw, TrendingUp, Wallet } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { StatsCard, statsCardColors } from "@/components/ui/card/stats-card";
import { Skeleton, SkeletonText } from "@/components/ui/skeleton";
import { PayoutHero } from "./components/payout-hero";

/**
 * Pending state for /gateway/payouts.
 *
 * WAS: `space-y-6 container pt-24 pb-12` over an `h-10` bar, three `h-32`
 * blocks and one `h-64` block.
 *
 * The settled page is `<div className="w-full">` → `<PayoutHero>` (whose
 * `bottomSlot` holds the three `StatsCard`s) → `container mx-auto ... pt-8`.
 * So the container was hoisted to the ROOT — boxing what is actually a
 * full-bleed hero inside a centred column — and `pt-24` (6rem) stood in for
 * `pt-8` (2rem), 64px of phantom clearance applied in the wrong place.
 *
 * The three `h-32` blocks were also the wrong object: a `StatsCard` has a
 * label, an icon tile, a figure and a description line, and its height is not
 * 128px by coincidence. `StatsCard` has a `loading` prop precisely so the card
 * keeps its own frame — see the note in `components/ui/card/stats-card.tsx`.
 *
 * NOW: the real hero (imported, so it cannot drift), the real cards with real
 * labels, icons, tones and descriptions, and pending figures.
 */
export default function PayoutsLoading() {
  const t = useTranslations("ext_gateway");
  const tCommon = useTranslations("common");
  const tExt = useTranslations("ext");

  return (
    <div className="w-full">
      <PayoutHero
        rightContent={
          <Button variant="outline">
            <RefreshCcw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        }
        bottomSlot={
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <StatsCard
              label={tCommon("available_balance")}
              value=""
              loading
              icon={Wallet}
              description={t("ready_for_payout")}
              {...statsCardColors.success}
            />
            <StatsCard
              label={t("pending_balance")}
              value=""
              loading
              icon={Clock}
              description={t("processing_payments")}
              {...statsCardColors.warning}
            />
            <StatsCard
              label={tExt("total_paid_out")}
              value=""
              loading
              icon={TrendingUp}
              description={tCommon("all_time")}
              {...statsCardColors.primary}
            />
          </div>
        }
      />

      <div className="container mx-auto space-y-6 pb-12 pt-8">
        <Card>
          <CardContent className="p-4 space-y-3">
            {[0, 1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="flex items-center justify-between p-4 rounded-lg border border-border"
              >
                <div className="flex items-center gap-4">
                  <Skeleton className="h-9 w-9 rounded-lg" />
                  <div>
                    <span className="font-medium">
                      <SkeletonText placeholder="Payout #00000000" />
                    </span>
                    <div className="mt-1 text-sm text-muted-foreground">
                      <SkeletonText placeholder={`01 ${tCommon('jan_31_jan')}` + " 2026"} />
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <p className="text-lg font-semibold font-mono tabular-nums">
                    <SkeletonText placeholder="0,000.00" />
                  </p>
                  <Button variant="ghost" size="icon">
                    <Eye className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
