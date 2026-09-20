"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles } from "lucide-react";
import { Link } from "@/i18n/routing";
import { m } from "framer-motion";
import { PendingPlanCard, PlanCard, type ForexPlan } from "./plan-card";
import { Link as RoutedLink } from "@/i18n/routing";
import { useTranslations } from "next-intl";

interface FeaturedPlansSectionProps {
  trendingPlans: ForexPlan[];
  isLoading?: boolean;
}

export function FeaturedPlansSection({
  trendingPlans,
  isLoading,
}: FeaturedPlansSectionProps) {
  const t = useTranslations("ext_forex");

  /**
   * THE SECTION HAD NO PENDING STATE, ONLY AN EMPTY ONE — AND THEY ARE NOT
   * THE SAME THING.
   * ==========================================================================
   *
   * `if (trendingPlans.length === 0) return null` never looked at load state,
   * and `trendingPlans` is `[]` for the whole fetch, so this section simply did
   * not exist while loading and then appeared whole: `py-24` twice (192px), a
   * ~280px header and a three-card row (~470px). About 700px arriving at once,
   * pushing the performance history, the completions feed, the step rail and
   * the closing CTA down `/en/forex`.
   *
   * Two predicates now, and they answer two different questions: is the answer
   * still unknown, or is the answer "nothing".
   */
  const showEmptyState = !isLoading && trendingPlans.length === 0;

  return (
    <section className="py-24 bg-linear-to-b from-background via-muted/10 to-background dark:via-surface-2/30 relative overflow-hidden">
      {/* Background decorations */}
      <div className="absolute inset-0">
        <div
          className={`absolute -top-40 left-1/4 w-80 h-80 bg-primary/15 rounded-full blur-3xl`}
        />
        <div
          className={`absolute bottom-0 right-1/4 w-72 h-72 bg-primary/10 rounded-full blur-3xl`}
        />
      </div>

      <div className="container mx-auto relative z-10">
        <m.div
          className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-16"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <div>
            <Badge
              variant="outline"
              className={`px-4 py-2 rounded-full mb-6 bg-primary/10 border-primary/20`}
            >
              <Sparkles className={`w-4 h-4 text-primary mr-2`} />
              <span
                className={`text-sm font-medium text-primary`}
              >
                {t("featured_plans")}
              </span>
            </Badge>
            <h2 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">
              <span className="text-foreground">
                {t("premium_investment")}
              </span>
              <br />
              <span
                className={`text-primary`}
              >
                Opportunities
              </span>
            </h2>
            <p className="text-lg text-muted-foreground max-w-xl">
              {t("choose_from_our_range_of_institutional")}
            </p>
          </div>
          <Link href="/forex/plan">
            <Button
              variant="outline"
              className={`rounded-xl border-2 border-primary/30 text-primary hover:bg-primary/5 hover:text-primary-ink dark:hover:bg-primary/10 font-semibold transition-all duration-300`}
            >
              {t("view_all_plans")}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </m.div>

        {showEmptyState ? (
          /* Gated on `!isLoading` through the predicate above — without that it
             fires against a `trendingPlans` array that is `[]` only because the
             landing payload has not arrived, and tells a visitor the platform
             offers no plans. Sized close to one card row so the step from the
             pending grid is small. */
          <div className="rounded-lg border border-border bg-card p-16 text-center">
            <Sparkles className="mx-auto mb-4 h-12 w-12 text-subtle-foreground" />
            <h3 className="mb-2 text-xl font-semibold text-foreground">
              {t("featured_plans")}
            </h3>
            <p className="mx-auto mb-8 max-w-md text-sm text-muted-foreground">
              {t("no_plan_is_featured_right_now")}
            </p>
            <div className="flex justify-center">
              <RoutedLink href="/forex/plan">
                <Button
                  variant="outline"
                  className="rounded-xl border-2 border-primary/30 text-primary hover:bg-primary/5 hover:text-primary-ink dark:hover:bg-primary/10 font-semibold transition-all duration-300"
                >
                  {t("see_every_plan")}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </RoutedLink>
            </div>
          </div>
        ) : (
          /* ONE grid. Three pending cards because the container is
             `lg:grid-cols-3` — one row is the knowable part, the number of rows
             is not. */
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {isLoading
              ? [0, 1, 2].map((i) => <PendingPlanCard key={`pending-plan-${i}`} />)
              : trendingPlans.map((plan, index) => (
                  <m.div
                    key={plan.id}
                    initial={{ opacity: 0, y: 40 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6, delay: index * 0.1 }}
                    className="h-full"
                  >
                    <PlanCard plan={plan} />
                  </m.div>
                ))}
          </div>
        )}
      </div>
    </section>
  );
}
