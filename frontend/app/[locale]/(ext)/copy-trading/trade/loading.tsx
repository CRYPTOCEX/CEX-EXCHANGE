"use client";

import { Activity, BarChart3, Search, Target, TrendingUp, Zap } from "lucide-react";
import { useTranslations } from "next-intl";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { StatsCard, statsCardColors } from "@/components/ui/card/stats-card";
import { HeroSection } from "@/components/ui/hero-section";
import { SkeletonText } from "@/components/ui/skeleton";

/**
 * Pending state for /copy-trading/trade.
 *
 * WAS: a centred `Loader2` in `min-h-screen ... pt-20`. It reserved nothing and
 * invented 5rem of top padding the settled page does not have — the real root
 * is `min-h-screen` on its own, and `HeroSection` supplies its own clearance.
 *
 * NOW: hero + `container mx-auto px-4 py-8` + the four-up summary row at the
 * page's own breakpoints (`grid-cols-2 lg:grid-cols-4` — NOT the
 * `md:grid-cols-4` several sibling skeletons in this extension use) + the
 * filter bar, which is entirely static and had no business waiting.
 *
 * The Total Profit tile is a hand-built `Card` rather than a `StatsCard`
 * because the page builds it by hand: the figure there is coloured by direction
 * of money and `StatsCard` deliberately pins its figure to `--foreground`.
 * Copying the anatomy, not the component, is what keeps the box the same.
 */
export default function TradeHistoryLoading() {
  const t = useTranslations("ext_copy-trading");
  const tExt = useTranslations("ext");
  const tCommon = useTranslations("common");

  return (
    /* Bare root, like the page. Both states now sit on the hero's
       `WorkspaceGround` rather than on a wash that hid it, so the ground is
       continuous across the swap. */
    <div className="min-h-screen">
      <HeroSection
        badge={{
          icon: <Activity className="h-3.5 w-3.5" />,
          text: "Trade History",
        }}
        title={tExt("my_trades")}
        description={t("view_and_analyze_your_copy_trading_activity")}
      />

      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatsCard
            label={tCommon("total_trades")}
            value=""
            loading
            icon={BarChart3}
            {...statsCardColors.primary}
          />

          {/* Same anatomy as the page's hand-built profit tile. */}
          <Card className="p-4">
            <div className="mb-3 flex items-center justify-between gap-2">
              <span className="truncate text-xs font-medium text-muted-foreground">
                {tCommon("total_profit")}
              </span>
              <span className="grid h-7 w-7 shrink-0 place-items-center rounded-sm bg-success/15 text-success">
                <TrendingUp className="h-3.5 w-3.5" />
              </span>
            </div>
            <div className="text-2xl font-semibold leading-tight tracking-tight font-mono tabular-nums">
              <SkeletonText placeholder="0,000.00" />
            </div>
          </Card>

          <StatsCard
            label={tCommon("win_rate")}
            value=""
            loading
            icon={Target}
            {...statsCardColors.primary}
          />
          <StatsCard
            label={t("avg_latency")}
            value=""
            loading
            icon={Zap}
            {...statsCardColors.warning}
          />
        </div>

        {/* Filter bar — 100% static chrome. Labels, placeholder and control
            boxes all render on the first frame. */}
        <Card className="mb-6">
          <CardContent className="p-5">
            <div className="flex flex-wrap gap-4 items-end">
              <div className="flex-1 min-w-[200px]">
                <label className="text-xs text-subtle-foreground mb-1.5 block">
                  Symbol
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder={`${t("search_symbol")}…`}
                    readOnly
                    className="pl-10 h-10 rounded-xl"
                  />
                </div>
              </div>
              <div className="w-36">
                <label className="text-xs text-subtle-foreground mb-1.5 block">
                  Market
                </label>
                <div className="h-10 rounded-xl border border-input bg-transparent" />
              </div>
              <div className="w-40">
                <label className="text-xs text-subtle-foreground mb-1.5 block">
                  Status
                </label>
                <div className="h-10 rounded-xl border border-input bg-transparent" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Trade rows. Fixed count; the container is what is being reserved. */}
        <Card>
          <CardContent className="p-0">
            {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
              <div
                key={i}
                className="flex items-center justify-between gap-4 border-b border-border p-4 last:border-b-0"
              >
                <span className="font-medium">
                  <SkeletonText placeholder="BTCUSDT" />
                </span>
                <span className="font-mono tabular-nums text-sm">
                  <SkeletonText placeholder="0,000.00" />
                </span>
                <span className="font-mono tabular-nums text-sm">
                  <SkeletonText placeholder="+00.00" />
                </span>
                <span className="text-sm text-muted-foreground">
                  <SkeletonText placeholder="01 Jan 2026" />
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
