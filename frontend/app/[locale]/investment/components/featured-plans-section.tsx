"use client";

/**
 * The one section on the overview that renders real rows.
 *
 * WHAT CHANGED
 * ------------
 * It carried a FOURTH copy of the hand-rolled `formatCurrency` — the one the
 * audit of the other three missed, because this file sits on the page everyone
 * assumed was already migrated. Like two of its siblings it took
 * `currency = "USD"` as a default parameter, the mechanism behind the
 * documented "$40,000.50" defect. It now prints through `kit/money`, like
 * everything else.
 *
 * It also advertised `profitPercentage` as "Expected return" with no reference
 * to the plan's settlement rule, which is the same misstatement the plan cards
 * carried. Both now show the rate and the rule together, from one component.
 *
 * `trending` IS THE ONLY SELECTOR, AND AN EMPTY RESULT HIDES THE SECTION.
 * The old version fell back to three invented plans ("Growth Portfolio",
 * 15.5%) when nothing was trending — fabricated returns on a financial
 * shopfront, each linking to `/investment/plan/1`, which does not exist, so the
 * CTA landed on "Plan not found". An unpopulated install shows nothing here.
 */

import { useTranslations } from "next-intl";
import { SkeletonBlock } from "@/components/ui/skeleton";
import { Section, SectionHeading, SecondaryCta } from "@/components/landing";
import { PlanCard } from "../plan/components/plan-card";

interface FeaturedPlansSectionProps {
  plans: investmentPlanAttributes[] | null;
  loading: boolean;
}

export function FeaturedPlansSection({
  plans,
  loading,
}: FeaturedPlansSectionProps) {
  const t = useTranslations("investment");
  const tCommon = useTranslations("common");

  const featured = (plans ?? []).filter((plan) => plan.trending).slice(0, 3);

  /* `plans === null` is "we have not been told yet" and `[]` is "there are
     none" — the store keeps them distinct. The section reserves its grid for
     the first case and disappears for the second, rather than popping into
     existence and shoving the rest of the page down. */
  if (!loading && plans !== null && featured.length === 0) return null;

  return (
    <Section bordered>
      <SectionHeading
        eyebrow={tCommon("trending")}
        title={t("featured_title")}
        subtitle={t("featured_subtitle")}
      />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {loading || plans === null
          ? Array.from({ length: 3 }).map((_, index) => (
              <SkeletonBlock
                key={`pending-featured-${index}`}
                className="h-[330px] w-full rounded-lg"
              />
            ))
          : featured.map((plan) => <PlanCard key={plan.id} plan={plan} />)}
      </div>

      <div className="mt-10 flex justify-center">
        <SecondaryCta href="/investment/plan">{t("see_all_plans")}</SecondaryCta>
      </div>
    </Section>
  );
}
