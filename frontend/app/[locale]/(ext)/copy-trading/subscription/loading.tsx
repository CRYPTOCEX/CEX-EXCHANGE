"use client";

import { Activity, Plus, Target, TrendingUp, Trophy, Users, Wallet } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { StatsCard, statsCardColors } from "@/components/ui/card/stats-card";
import { HeroSection } from "@/components/ui/hero-section";
import { SkeletonText } from "@/components/ui/skeleton";

/**
 * Pending state for /copy-trading/subscription.
 *
 * WAS: `min-h-screen flex items-center justify-center pt-20` around a single
 * `<Loader2 className="h-10 w-10 animate-spin"/>`. Nothing about the page was
 * reserved — not the hero, not the six-up summary row, not the subscription
 * cards — so every pixel of layout arrived as shift. The `pt-20` was invented:
 * the settled root is `min-h-screen` and nothing more, with no top padding,
 * because `HeroSection` brings its own.
 *
 * NOW: the page's frame with pending values. The hero is the real component
 * with the real badge, headline, description and "Follow new leader" button —
 * all of which are literals or `t()` calls, i.e. knowable before the fetch.
 *
 * The summary row is `grid-cols-2 lg:grid-cols-3 xl:grid-cols-6`, copied from
 * `client.tsx`. Note the page gates that row behind `subscriptions.length > 0`;
 * this file renders it unconditionally, which is the right pending shape — a
 * skeleton cannot know the count yet, and reserving the row is what stops the
 * cards below it jumping when it appears. (The page's own gate is the
 * "hidden-while-loading" pattern in SKELETONS.md and belongs on the page-file
 * owner's list.)
 */
export default function SubscriptionLoading() {
  const t = useTranslations("ext_copy-trading");
  const tExt = useTranslations("ext");
  const tCommon = useTranslations("common");

  return (
    /* No wash here, same as the page. The hero's `WorkspaceGround` is what
       this state stands on now, which is also what the settled page stands
       on — so nothing about the ground changes when the fetch resolves. */
    <div className="min-h-screen">
      <HeroSection
        badge={{
          icon: <Users className="h-3.5 w-3.5" />,
          text: "My Subscriptions",
        }}
        title={tExt("active_subscriptions")}
        description={t("monitor_and_manage_your_copy_trading")}
        layout="split"
        rightContent={
          <div className="lg:mt-8">
            <Button size="lg" className="rounded-xl w-full sm:w-auto">
              <Plus className="mr-2 h-5 w-5" />
              {t("follow_new_leader")}
            </Button>
          </div>
        }
      />

      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-8">
          <StatsCard label={tExt("total_allocated")} value="" loading icon={Wallet} {...statsCardColors.primary} />
          <StatsCard label={tCommon("total_profit")} value="" loading icon={TrendingUp} {...statsCardColors.primary} />
          <StatsCard label={t("avg_roi")} value="" loading icon={Target} {...statsCardColors.primary} />
          <StatsCard label="Active" value="" loading icon={Users} {...statsCardColors.primary} />
          <StatsCard label={tCommon("total_trades")} value="" loading icon={Activity} {...statsCardColors.warning} />
          <StatsCard label={tCommon("avg_win_rate")} value="" loading icon={Trophy} {...statsCardColors.primary} />
        </div>

        {/* Subscription cards. A list has no knowable length — reserve the
            container and a fixed count of rows, and accept that the count
            settles (SKELETONS.md, "Lists and grids"). */}
        <div className="space-y-4">
          {[0, 1, 2].map((i) => (
            <Card key={i} className="p-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-full bg-muted animate-pulse" />
                  <div>
                    <p className="font-semibold">
                      <SkeletonText placeholder={tExt("leader_name")} />
                    </p>
                    <p className="text-sm text-muted-foreground">
                      <SkeletonText placeholder={t("following_since_01_jan") + " 2026"} />
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-8">
                  <div>
                    <p className="text-xs text-muted-foreground">{tExt("total_allocated")}</p>
                    <p className="text-lg font-semibold font-mono tabular-nums">
                      <SkeletonText placeholder="0,000.00" />
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">{tCommon("total_profit")}</p>
                    <p className="text-lg font-semibold font-mono tabular-nums">
                      <SkeletonText placeholder="0,000.00" />
                    </p>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
