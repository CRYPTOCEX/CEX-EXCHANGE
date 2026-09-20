"use client";

import { Search, Sparkles, Target, TrendingUp, Users } from "lucide-react";
import { useTranslations } from "next-intl";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { HeroSection } from "@/components/ui/hero-section";
import { StatsGroup } from "@/components/ui/stats-group";
import { SkeletonText } from "@/components/ui/skeleton";

/**
 * Pending state for /copy-trading/leader.
 *
 * This one HAD a shell, and every measurement in it was off:
 *
 *   hero      was  a hand-drawn `relative overflow-hidden border-b
 *                  border-border/50 pt-20` band with `container mx-auto px-4
 *                  py-12` inside
 *             is   `<HeroSection>` — a different component, with its own
 *                  padding, its own orbs and particles, and NO `pt-20`
 *   body      was  `container mx-auto px-4 py-8`
 *             is   `container mx-auto py-8` — the page has no horizontal
 *                  padding on this container, so every card was inset 16px
 *                  either side and slid outward when the data landed
 *   grid      was  `grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6`
 *             is   `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4
 *                  gap-4 md:gap-6` — a missing `sm` step, a missing `xl` step
 *                  and a gap that is wrong below `md`. On a 1400px screen the
 *                  skeleton drew 3 columns and the page drew 4.
 *   cards     was  6 × `h-64`
 *             is   8 × `h-[340px]` — the page's OWN in-component skeleton says
 *                  so, 20 lines below the grid definition
 *   filters   was  absent entirely; the page has a filter Card above the grid,
 *                  so everything below it started ~110px too high
 *
 * The card placeholders below are deliberately the same `h-[340px] rounded-2xl
 * bg-muted animate-pulse` the page renders for its own `isLoading` branch, so
 * the route boundary and the in-page pending state agree.
 */
export default function LeadersLoading() {
  const t = useTranslations("ext_copy-trading");
  const tExt = useTranslations("ext");
  const tCommon = useTranslations("common");

  return (
    /* Same bare root as the page: the wash is gone so the hero's
       `WorkspaceGround` shows through here too, and the ground does not
       appear out of nowhere at the moment the leaders arrive. */
    <div className="min-h-screen">
      <HeroSection
        badge={{
          icon: <Sparkles className="h-4 w-4" />,
          text: "Verified Leaders",
        }}
        title={t("discover_top_trading_leaders")}
        description={`${t("browse_our_curated_selection_of_verified_traders")} ${t("analyze_performance_metrics_and_find_the")}`}
        maxWidth="max-w-3xl"
      >
        {/* Real `StatsGroup`, real labels and icons; only the three figures
            wait, each inside the element that will hold it. */}
        <StatsGroup
          stats={[
            {
              icon: TrendingUp,
              label: t("avg_roi"),
              value: <SkeletonText placeholder="+00.0%" />,
              iconColor: "text-success",
              iconBgColor: "bg-success/10",
              valueColor: "text-success",
            },
            {
              icon: Target,
              label: t("top_win_rate"),
              value: <SkeletonText placeholder="00.0%" />,
              iconColor: "text-primary",
              iconBgColor: "bg-primary/10",
            },
            {
              icon: Users,
              label: tExt("active_leaders"),
              value: <SkeletonText placeholder="000" />,
              iconColor: "text-primary",
              iconBgColor: "bg-primary/10",
            },
          ]}
        />
      </HeroSection>

      {/* `container mx-auto py-8` — no `px-4`. That is the page's own box. */}
      <div className="container mx-auto py-8">
        <div className="mb-6 md:mb-8">
          <Card className="border border-border bg-card">
            <CardContent className="p-4">
              <div className="flex flex-col lg:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder={`${t("search_leaders_by_name")}…`}
                    readOnly
                    className="pl-10 h-11 bg-muted dark:bg-muted/50 border-border rounded-xl"
                  />
                </div>
                <div className="flex flex-col sm:flex-row flex-wrap gap-2 sm:gap-3">
                  <div className="w-full sm:w-[160px] h-11 rounded-xl bg-muted dark:bg-muted/50 border border-border grid items-center px-3 text-sm text-muted-foreground">
                    {tExt("trading_style")}
                  </div>
                  <div className="w-full sm:w-[160px] h-11 rounded-xl bg-muted dark:bg-muted/50 border border-border grid items-center px-3 text-sm text-muted-foreground">
                    {tCommon("risk_level")}
                  </div>
                  <div className="w-full sm:w-[150px] h-11 rounded-xl bg-muted dark:bg-muted/50 border border-border grid items-center px-3 text-sm text-muted-foreground">
                    Market
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="h-[340px] rounded-2xl bg-muted animate-pulse" />
          ))}
        </div>
      </div>
    </div>
  );
}
