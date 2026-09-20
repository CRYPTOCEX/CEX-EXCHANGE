"use client";

import {
  Activity,
  BarChart3,
  LineChart,
  PieChart,
  Target,
  TrendingUp,
  Trophy,
  Users,
  Wallet,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatsCard, statsCardColors } from "@/components/ui/card/stats-card";
import { ChartCard } from "@/components/ui/chart/chart-card";
import { HeroSection } from "@/components/ui/hero-section";
import { Skeleton, SkeletonText } from "@/components/ui/skeleton";

const periodOptions = [
  { value: "24h", label: "24H" },
  { value: "7d", label: "7D" },
  { value: "30d", label: "30D" },
  { value: "90d", label: "90D" },
  { value: "1y", label: "1Y" },
  { value: "all", label: "All" },
];

/**
 * Pending state for /copy-trading/analytics.
 *
 * WHAT IT WAS
 * -----------
 *   <div className="min-h-screen flex items-center justify-center pt-20 ...">
 *     <Loader2 className="h-10 w-10 animate-spin" />
 *   </div>
 *
 * A centred spinner in a full-viewport flex box. It reserved NOTHING: not the
 * hero, not the six-up stats row, not the two chart cards. 100% of this page's
 * layout arrived as shift, and it did so in a `min-h-screen` box, so the
 * document height changed too.
 *
 * The `pt-20` was doubly wrong — the settled page has no top padding at all.
 * Its root is `min-h-screen` and nothing else, and `HeroSection` supplies its
 * own clearance. So the spinner sat 5rem lower
 * than anything the page would ever paint there.
 *
 * WHAT IT IS NOW
 * --------------
 * The page's own frame, with the values pending. The hero is the REAL
 * `HeroSection` with the real badge, title and description, so the tallest,
 * most attention-grabbing block on the page is correct on the first frame and
 * never moves. The six stats tiles are real `StatsCard`s with their real
 * labels, icons and tones, passed `loading` — the card measures its own figure
 * (`SkeletonText`), which is exactly as tall as the number that replaces it.
 *
 * The grid is `grid-cols-2 lg:grid-cols-3 xl:grid-cols-6`, copied from the
 * page. The old file had no grid at all; the nearest sibling skeletons in this
 * folder that DID have one wrote `md:grid-cols-4`, which is a breakpoint this
 * page does not use and a column count it never has.
 *
 * NOTE: `client.tsx` imports this file and renders it as its own `isLoading`
 * branch, so this is not only the route boundary — it is the in-page pending
 * state too. That is why it is a client component and calls the same
 * `useTranslations` namespaces the page does: the strings are then identical by
 * construction. The better shape is for `client.tsx` to stop swapping trees and
 * pass `loading` down to these same cards (SKELETONS.md, "Conversions"); that
 * is a page-file change and is not mine to make.
 */
export default function AnalyticsLoading() {
  const t = useTranslations("ext_copy-trading");
  const tExt = useTranslations("ext");
  const tCommon = useTranslations("common");

  return (
    /* Bare `min-h-screen`, matching the page. The wash this root used to carry
       sat on top of the `WorkspaceGround` that `HeroSection` mounts underneath
       it — and the page's root is now bare too, so the ground is already there
       on the first frame instead of popping in when the data lands. */
    <div className="min-h-screen">
      {/* The real hero — badge, headline and description are literals/`t()`
          calls, so there is nothing here to wait for. */}
      <HeroSection
        badge={{
          icon: <BarChart3 className="h-3.5 w-3.5" />,
          text: "Performance Analytics",
        }}
        title={t("your_trading_analytics")}
        description={t("track_your_copy_trading_performance_with")}
        layout="split"
        rightContentAlign="end"
        rightContent={
          <div className="flex gap-1 bg-muted dark:bg-muted/50 p-1 rounded-xl">
            {periodOptions.map((opt) => (
              <Button
                key={opt.value}
                variant="ghost"
                size="sm"
                className={`rounded-lg px-4 ${
                  opt.value === "30d" ? "bg-card" : ""
                }`}
              >
                {opt.label}
              </Button>
            ))}
          </div>
        }
      />

      <div className="container mx-auto px-4 py-8">
        {/* Six tiles, same breakpoints as the page. Labels, icons and tones are
            static; only the figures wait, and each waits inside the card that
            will hold it. */}
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-8">
          <StatsCard
            label={tExt("total_allocated")}
            value=""
            loading
            icon={Wallet}
            {...statsCardColors.primary}
          />
          <StatsCard
            label={tCommon("total_profit")}
            value=""
            loading
            icon={TrendingUp}
            {...statsCardColors.primary}
          />
          <StatsCard
            label={t("overall_roi")}
            value=""
            loading
            icon={Target}
            {...statsCardColors.primary}
          />
          <StatsCard
            label="Active"
            value=""
            loading
            icon={Users}
            {...statsCardColors.primary}
          />
          <StatsCard
            label={tCommon("total_trades")}
            value=""
            loading
            icon={Activity}
            {...statsCardColors.warning}
          />
          <StatsCard
            label={tCommon("win_rate")}
            value=""
            loading
            icon={Trophy}
            {...statsCardColors.primary}
          />
        </div>

        {/* Charts row. `ChartCard` fixes its own height (240), so the shell is
            the shape-preserver and only the plot area is a placeholder — see
            SKELETONS.md, "Charts". */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <ChartCard
            title={t("profit_over_time")}
            icon={LineChart}
            {...statsCardColors.primary}
            height={240}
            className="h-full"
            loading
          >
            <Skeleton className="h-full w-full rounded-lg" />
          </ChartCard>

          <Card className="h-full">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-lg">
                <PieChart className="h-5 w-5 text-primary" />
                {tCommon("trade_distribution")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <h4 className="text-sm font-medium text-subtle-foreground mb-4">
                    {t("by_side")}
                  </h4>
                  <div className="space-y-4">
                    <div className="p-4 rounded-xl bg-success/5 dark:bg-success/20">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="font-medium text-success">Buy</span>
                      </div>
                      <div className="text-2xl font-semibold leading-tight tracking-tight text-foreground font-mono tabular-nums">
                        <SkeletonText placeholder="000" />
                      </div>
                      <div className="text-sm text-success">
                        <SkeletonText placeholder="+0,000.00 USDT" />
                      </div>
                    </div>
                    <div className="p-4 rounded-xl bg-destructive/5 dark:bg-destructive/20">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="font-medium text-destructive">Sell</span>
                      </div>
                      <div className="text-2xl font-semibold leading-tight tracking-tight text-foreground font-mono tabular-nums">
                        <SkeletonText placeholder="000" />
                      </div>
                      <div className="text-sm text-destructive">
                        <SkeletonText placeholder="+0,000.00 USDT" />
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-medium text-subtle-foreground mb-4">
                    {t("top_symbols")}
                  </h4>
                  {/* Five rows: the page slices `bySymbol` to 5, so this is the
                      page's own cap, not a guessed row count. */}
                  <div className="space-y-3">
                    {[0, 1, 2, 3, 4].map((i) => (
                      <div key={i} className="flex items-center justify-between">
                        <span className="text-sm font-medium">
                          <SkeletonText placeholder="BTCUSDT" />
                        </span>
                        <span className="text-sm font-mono tabular-nums text-muted-foreground">
                          <SkeletonText placeholder="00" />
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
