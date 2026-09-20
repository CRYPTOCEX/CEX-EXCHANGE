"use client";

import { useTranslations } from "next-intl";
import { Clock, DollarSign, Sparkles, Star, TrendingUp } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { HeroSection } from "@/components/ui/hero-section";
import { SkeletonBlock, SkeletonText } from "@/components/ui/skeleton";
import { StatsGroup } from "@/components/ui/stats-group";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

/**
 * Pending state for /forex/plan.
 *
 * WHAT DRIFTED — a bare container against a hero on a washed ground
 * ----------------------------------------------------------------
 * WAS `container mx-auto pt-20 py-10 space-y-6`. The page is
 * `min-h-screen bg-linear-to-b from-background via-muted/10 to-background
 * dark:via-surface-2/30` → full-bleed `HeroSection` (badge, two-part gradient
 * title, description and a three-stat strip) →
 * `container mx-auto py-8 pb-24`.
 *
 *  - `pt-20` is 5rem hardcoded on a wrapper the page does not have. The page's
 *    clearance comes from `HeroSection`'s default `pt-header-clear`
 *    (`--header-height` + 2rem), which follows the navbar variant — see
 *    `lib/chrome/variants.ts`. 16px short on the default bar, 2.5rem on
 *    `stacked`, and no literal can be right for both.
 *  - No wash: the page ground appeared only on resolve.
 *  - The hero is ~340px with its stats strip and was reserved by an `h-8 w-48`
 *    bar plus an `h-5` line, so the entire page began about 270px too high.
 *  - `py-10` puts 40px at top AND bottom against the page's `py-8 pb-24`
 *    (32px top, 96px bottom) — 56px short at the foot of the document.
 *  - The filter row was three loose `h-10 w-40` blocks; the page renders a
 *    `Card` with `p-6` holding a tab rail and a sort control, which is both
 *    taller and bounded by a hairline.
 *
 * `HeroSection` and `StatsGroup` are mounted rather than restated, so
 * clearance and band height cannot disagree. Every string in the hero, the two
 * tab labels and the sort caption are literals or `t()` calls and render for
 * real — including the three stat VALUES, which are constants on this page
 * ("2.5% - 30%", "24h - 6 Months") and were never data.
 */
export default function PlansLoading() {
  const t = useTranslations("ext_forex");
  const tCommon = useTranslations("common");

  return (
    /* The wash named in the note above is gone from BOTH files. It is opaque,
       so it painted over the `WorkspaceGround` the hero mounts — the ground
       still never reached the screen, on either state. Transparent now, which
       is what "the skeleton stands on the page's ground" actually requires. */
    <div className="min-h-screen">
      <HeroSection
        badge={{
          icon: <Sparkles className="h-3.5 w-3.5" />,
          text: "Investment Opportunities",
        }}
        title={t("choose_your_perfect_investment_plan")}
        description={`${t("our_professionally_managed_forex_investment_plans")} ${t("select_from_a_range_of_options")}`}
      >
        {/* All three values are CONSTANTS in `client.tsx` — no fetch is
            involved — so the strip renders complete. */}
        <StatsGroup
          stats={[
            {
              icon: DollarSign,
              label: t("min_investment"),
              value: "$100.00",
              iconColor: "text-success",
              iconBgColor: "bg-success/10",
              valueColor: "text-success",
            },
            {
              icon: TrendingUp,
              label: t("profit_range"),
              value: "2.5% - 30%",
              iconColor: "text-success",
              iconBgColor: "bg-success/10",
            },
            {
              icon: Clock,
              label: tCommon("duration"),
              value: "24h - 6 Months",
              iconColor: "text-success",
              iconBgColor: "bg-success/10",
            },
          ]}
        />
      </HeroSection>

      <div className="container mx-auto py-8 pb-24">
        <div className="mb-8">
          <Card className="border border-border bg-card/80 dark:bg-surface-2/80 backdrop-blur-sm">
            <CardContent className="p-6">
              <div className="flex flex-col gap-4">
                <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                  <Tabs defaultValue="all" className="w-full sm:w-auto">
                    <TabsList className="w-full sm:w-auto bg-muted p-1 rounded-xl">
                      <TabsTrigger
                        value="all"
                        className="flex-1 sm:flex-none rounded-lg"
                      >
                        {tCommon("all_plans")}
                      </TabsTrigger>
                      <TabsTrigger
                        value="trending"
                        className="flex-1 sm:flex-none rounded-lg"
                      >
                        <Star className="mr-2 h-4 w-4 text-warning" /> Trending
                      </TabsTrigger>
                    </TabsList>
                  </Tabs>

                  {/* The sort trigger's own box. A Radix `Select` needs a
                      value; the caption is what the page shows by default. */}
                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <span className="text-sm text-subtle-foreground whitespace-nowrap">
                      {tCommon("sort_by")}:
                    </span>
                    <div className="flex h-9 flex-1 sm:w-48 items-center rounded-xl border border-border px-3 text-sm text-muted-foreground">
                      {tCommon("sort_by")}
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Six pending plan cards in the page's own `md:grid-cols-2
            lg:grid-cols-3 gap-6`. A plan list has no knowable length, so this
            reserves the grid and its breakpoints, not the count. */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <Card key={i} className="h-full">
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-semibold leading-tight tracking-tight">
                    <SkeletonText placeholder={tCommon("plan_name")} />
                  </h3>
                  <SkeletonBlock className="h-6 w-16 rounded-full" />
                </div>
                <p className="text-sm text-muted-foreground">
                  <SkeletonText chars={72} />
                </p>
                <div className="grid grid-cols-2 gap-4 pt-2">
                  {[0, 1, 2, 3].map((row) => (
                    <div key={row}>
                      <p className="text-xs text-muted-foreground">
                        <SkeletonText placeholder={t("min_investment")} />
                      </p>
                      <p className="text-base font-medium font-mono tabular-nums">
                        <SkeletonText placeholder="$0.00" />
                      </p>
                    </div>
                  ))}
                </div>
                <SkeletonBlock className="h-10 w-full rounded-xl" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
