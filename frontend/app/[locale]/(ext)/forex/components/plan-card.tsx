"use client";

import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { SkeletonBlock, SkeletonText } from "@/components/ui/skeleton";
import { ArrowRight, Star, TrendingUp, DollarSign, Clock } from "lucide-react";
import { Link } from "@/i18n/routing";
import { formatCurrency, formatPercentage } from "@/utils/formatters";
import { useTranslations } from "next-intl";

export interface ForexPlan {
  id: string;
  title?: string;
  name: string;
  description?: string;
  image?: string;
  minProfit: number;
  maxProfit: number;
  minAmount?: number;
  invested: number;
  trending?: boolean;
}

interface PlanCardProps {
  plan: ForexPlan;
}

/**
 * A plan card whose PLAN has not arrived yet.
 * ============================================================================
 *
 * `FeaturedPlansSection` had no pending state at all — it took `trendingPlans`
 * and returned null when the array was empty, which during the fetch it always
 * is. So the entire "Premium Investment Opportunities" section did not exist
 * while loading and then appeared whole: `py-24` twice, a ~280px header and a
 * three-card row, about 700px arriving at once and pushing the performance
 * history, the completions feed, the step rail and the closing CTA down the
 * page.
 *
 * This is the card above with its unknown strings replaced, built from the same
 * literal classes and the same `Card`/`CardContent` pair — `h-40` plate, `p-5`
 * body, `text-lg` title, the `min-h-10` description box, the two `p-3` stat
 * tiles, the full-width CTA — so the two are diffable side by side in one file.
 *
 * Note what does NOT wait: the tile labels ("Profit", "Min"), the clock line
 * and the button's own label are literals on every card, so they render for
 * real. Only the four figures that come from the response are placeholders.
 */
export function PendingPlanCard() {
  const t = useTranslations("ext_forex");
  const tCommon = useTranslations("common");

  return (
    <div className="block h-full" aria-busy="true">
      <Card className="group relative overflow-hidden border border-border bg-surface-2 h-full flex flex-col">
        {/* The image is the one part with no text metrics of its own; `h-40`
            already fixes its box on the real card too. */}
        <div className="h-40 relative overflow-hidden shrink-0">
          <SkeletonBlock className="absolute inset-0 rounded-none" />
        </div>

        <CardContent className="relative p-5 flex flex-col grow">
          <div className="mb-4">
            <h3 className="text-lg font-bold text-foreground mb-1.5 line-clamp-1">
              <SkeletonText placeholder={t("balanced_growth")} />
            </h3>
            {/* `min-h-10` on the real card holds two lines open whatever the
                description turns out to be, so the placeholder only has to fill
                the first. */}
            <p className="text-muted-foreground text-sm line-clamp-2 leading-relaxed min-h-10">
              <SkeletonText placeholder={t("a_short_description_of_the_plan_and_who_it_suits")} />
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="rounded-xl bg-muted/80 p-3 border border-border-strong/50">
              <div className="flex items-center gap-1.5 mb-1.5">
                <div className="w-5 h-5 rounded bg-primary/20 flex items-center justify-center">
                  <TrendingUp className="h-3 w-3 text-primary" />
                </div>
                <span className="text-[10px] font-medium text-subtle-foreground uppercase tracking-wider">
                  Profit
                </span>
              </div>
              <p className="text-sm font-bold text-foreground">
                <SkeletonText placeholder="0.0% - 0.0%" />
              </p>
            </div>

            <div className="rounded-xl bg-muted/80 p-3 border border-border-strong/50">
              <div className="flex items-center gap-1.5 mb-1.5">
                <div className="w-5 h-5 rounded bg-primary/20 flex items-center justify-center">
                  <DollarSign className="h-3 w-3 text-primary" />
                </div>
                <span className="text-[10px] font-medium text-subtle-foreground uppercase tracking-wider">
                  Min
                </span>
              </div>
              <p className="text-sm font-bold text-foreground">
                <SkeletonText placeholder="$0,000" />
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 mb-4 text-subtle-foreground">
            <Clock className="h-3.5 w-3.5" />
            <span className="text-xs">{t("flexible_investment_duration")}</span>
          </div>

          <div className="mt-auto">
            <Button size="default" className="w-full rounded-xl" disabled>
              {tCommon("invest_now")}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export function PlanCard({ plan }: PlanCardProps) {
  const t = useTranslations("ext_forex");
  const tCommon = useTranslations("common");
  return (
    <Link href={`/forex/plan/${plan.id}`} className="block h-full">
      <Card
        className="group relative overflow-hidden border border-border bg-surface-2 hover:shadow-primary/10 hover:border-border-strong transition-all duration-300 hover:-translate-y-1 cursor-pointer h-full flex flex-col"
      >
        {/* Trending badge */}
        {plan.trending && (
          <div className="absolute top-4 right-4 z-20">
            <Badge className="bg-primary text-primary-foreground px-3 py-1.5 font-semibold shadow-lg shadow-primary/30 rounded-lg">
              {/* `fill-current` inherits the badge's `text-primary-foreground`,
                  which is the ink paired with the accent fill it sits on.
                  `fill-white` was frozen to a light accent. */}
              <Star className="h-3.5 w-3.5 mr-1.5 fill-current" />
              Premium
            </Badge>
          </div>
        )}

        {/* Image with overlay */}
        <div className="h-40 relative overflow-hidden shrink-0">
          <Image
            src={plan.image || `/img/placeholder.svg`}
            alt={plan.title || plan.name}
            fill
            className="object-cover"
          />
          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-linear-to-t from-surface-2 via-surface-2/50 to-transparent" />
        </div>

        <CardContent className="relative p-5 flex flex-col grow">
          {/* Plan Title & Description */}
          <div className="mb-4">
            <h3
              /* `primary-foreground` is the ink for a FILLED accent ground;
                 this heading sits on `bg-surface-2`, where it is white on a
                 near-white card in light mode. */
              className="text-lg font-bold text-foreground mb-1.5 group-hover:text-primary transition-colors duration-300 line-clamp-1"
            >
              {plan.title || plan.name}
            </h3>
            <p className="text-muted-foreground text-sm line-clamp-2 leading-relaxed min-h-10">
              {plan.description}
            </p>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            {/* Profit Range */}
            <div className="rounded-xl bg-muted/80 p-3 border border-border-strong/50">
              <div className="flex items-center gap-1.5 mb-1.5">
                <div
                  className="w-5 h-5 rounded bg-primary/20 flex items-center justify-center"
                >
                  <TrendingUp
                    className="h-3 w-3 text-primary"
                  />
                </div>
                <span className="text-[10px] font-medium text-subtle-foreground uppercase tracking-wider">
                  Profit
                </span>
              </div>
              {/* `primary-foreground` is the ink for a FILLED accent ground.
                  This value sits on `bg-muted`, where it is near-black on a
                  near-black tile in dark mode — the number was invisible. */}
              <p className="text-sm font-bold text-foreground">
                {formatPercentage(plan.minProfit)} -{" "}
                {formatPercentage(plan.maxProfit)}
              </p>
            </div>

            {/* Min Investment */}
            <div className="rounded-xl bg-muted/80 p-3 border border-border-strong/50">
              <div className="flex items-center gap-1.5 mb-1.5">
                <div
                  className="w-5 h-5 rounded bg-primary/20 flex items-center justify-center"
                >
                  <DollarSign
                    className="h-3 w-3 text-primary"
                  />
                </div>
                <span className="text-[10px] font-medium text-subtle-foreground uppercase tracking-wider">
                  Min
                </span>
              </div>
              <p className="text-sm font-bold text-foreground">
                {formatCurrency(plan.minAmount || 0)}
              </p>
            </div>
          </div>

          {/* Duration info */}
          <div className="flex items-center gap-2 mb-4 text-subtle-foreground">
            <Clock className="h-3.5 w-3.5" />
            <span className="text-xs">{t("flexible_investment_duration")}</span>
          </div>

          {/* CTA Button - pushed to bottom */}
          <div className="mt-auto">
            <Button size="default" className="w-full rounded-xl">
              {tCommon("invest_now")}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
