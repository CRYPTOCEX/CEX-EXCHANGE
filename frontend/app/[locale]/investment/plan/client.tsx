"use client";

/**
 * Every plan open for investment.
 *
 * THE FILTERS THAT INVENTED A RISK RATING ARE GONE.
 * -------------------------------------------------
 * The old bar offered "All Plans · Trending · High Yield · Low Risk", where
 * "High Yield" meant `profitPercentage > 15` and "Low Risk" meant
 * `profitPercentage <= 10`. There is no risk field on the plan model, on the
 * endpoint, or anywhere in the schema — the control was reading the advertised
 * RETURN and printing a RISK CLASSIFICATION from it, on a financial product, in
 * hardcoded English. A plan promising 8% was labelled "Low Risk" by the
 * platform on the strength of promising 8%.
 *
 * What replaces it is what the payload actually contains: the currency a plan
 * takes and how it settles. Both are facts, both are things people genuinely
 * filter on ("show me the ones I can fund from my USDT wallet"), and neither
 * asserts anything the platform does not know.
 *
 * A FAILED LOAD IS NOT AN EMPTY CATALOGUE.
 * ----------------------------------------
 * `filteredPlans.length === 0` used to render "No plans found — try adjusting
 * your search" during the fetch and after a failure alike. `plans` is `null`
 * until a request SUCCEEDS, so the three states are distinguishable here.
 */

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SkeletonBlock } from "@/components/ui/skeleton";
import { useInvestmentStore } from "@/store/investment/user";
import { useSettledFetch } from "../components/use-settled-fetch";
import {
  EmptyPanel,
  ErrorPanel,
  InvestmentFrame,
  StaleNote,
} from "../components/page-frame";
import { PlanCard } from "./components/plan-card";

/** A filter that reads a fact off the payload, never one that invents a rating. */
type Lens = "all" | "trending" | string;

export default function PlansClient() {
  const t = useTranslations("investment");
  const tCommon = useTranslations("common");
  const { plans, plansLoading, plansError, plansAttempted, fetchPlans } =
    useInvestmentStore();

  const [query, setQuery] = useState("");
  const [lens, setLens] = useState<Lens>("all");

  useSettledFetch(plansAttempted, plansLoading, fetchPlans);

  /** The currencies actually represented, so the control offers no dead option. */
  const currencies = useMemo(() => {
    const set = new Set<string>();
    for (const plan of plans ?? []) {
      if (plan?.currency) set.add(plan.currency);
    }
    return Array.from(set).sort();
  }, [plans]);

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return (plans ?? [])
      .filter((plan) => {
        if (needle) {
          const haystack = `${plan.title ?? ""} ${plan.description ?? ""}`.toLowerCase();
          if (!haystack.includes(needle)) return false;
        }
        if (lens === "all") return true;
        if (lens === "trending") return Boolean(plan.trending);
        return plan.currency === lens;
      })
      .sort((a, b) => {
        // Trending first, then by rate descending — a stable order, so the grid
        // does not reshuffle between renders the way an unordered `findAll`
        // response can.
        if (Boolean(b.trending) !== Boolean(a.trending)) return b.trending ? 1 : -1;
        return Number(b.profitPercentage) - Number(a.profitPercentage);
      });
  }, [plans, query, lens]);

  const header = {
    title: tCommon("investment_plans"),
    subtitle: t("plans_subtitle"),
  };

  const resolved = plans !== null || Boolean(plansError);

  if (!resolved) {
    return (
      <InvestmentFrame {...header}>
        <PlansSkeletonBody />
      </InvestmentFrame>
    );
  }

  if (plansError && plans === null) {
    return (
      <InvestmentFrame {...header}>
        <ErrorPanel
          title={t("could_not_load_plans")}
          error={plansError}
          fallback={t("something_went_wrong_our_end")}
          reassurance={t("plans_error_reassurance")}
          authSentence={t("session_ended_sentence")}
          retryLabel={tCommon("try_again")}
          retrying={plansLoading}
          onRetry={() => fetchPlans({ force: true })}
        />
      </InvestmentFrame>
    );
  }

  return (
    <InvestmentFrame {...header}>
      {plansError && (
        <StaleNote
          error={plansError}
          staleSentence={t("plans_from_last_load")}
          fallback={t("something_went_wrong_our_end")}
          authSentence={t("session_ended_sentence")}
          signInLabel={tCommon("sign_in_again")}
        />
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-xs">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          {/* The old input had a placeholder and no accessible name, so a
              screen reader announced it as an unlabelled edit field. */}
          <Input
            aria-label={tCommon("search_plans")}
            placeholder={tCommon("search_plans")}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="pl-9"
          />
        </div>

        {/* `flex-wrap` because the old row could not wrap and overflowed the
            viewport horizontally on a phone the moment there were four chips. */}
        <div
          role="group"
          aria-label={t("filter_plans")}
          className="flex flex-wrap gap-2"
        >
          <LensChip
            active={lens === "all"}
            onClick={() => setLens("all")}
            label={tCommon("all_plans")}
          />
          {(plans ?? []).some((plan) => plan.trending) && (
            <LensChip
              active={lens === "trending"}
              onClick={() => setLens("trending")}
              label={tCommon("trending")}
            />
          )}
          {currencies.length > 1 &&
            currencies.map((currency) => (
              <LensChip
                key={currency}
                active={lens === currency}
                onClick={() => setLens(currency)}
                label={currency}
              />
            ))}
        </div>
      </div>

      {visible.length === 0 ? (
        (plans ?? []).length === 0 ? (
          <EmptyPanel
            icon="lucide:layers"
            title={t("no_plans_open")}
            body={t("no_plans_open_body")}
          />
        ) : (
          <EmptyPanel
            icon="lucide:search-x"
            title={t("no_plans_match")}
            body={t("no_plans_match_body")}
            action={
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setQuery("");
                  setLens("all");
                }}
              >
                {tCommon("clear_filters")}
              </Button>
            }
          />
        )
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((plan, index) => (
            <PlanCard
              key={plan.id}
              plan={plan}
              /* The walkthrough points at ONE card, not the grid: a spotlight
                 over three columns highlights nothing in particular. */
              data-tour={index === 0 ? "invest-plan" : undefined}
            />
          ))}
        </div>
      )}
    </InvestmentFrame>
  );
}

/**
 * Selection is `aria-current`, not colour alone.
 *
 * The old row conveyed which filter was active purely by swapping the button
 * variant, so the state was invisible to a screen reader and to anyone who
 * cannot separate the two fills.
 */
function LensChip({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <Button
      type="button"
      variant={active ? "default" : "outline"}
      size="xs"
      aria-current={active ? "true" : undefined}
      onClick={onClick}
    >
      {label}
    </Button>
  );
}

/**
 * Six cards in the REAL grid at the REAL radius, drawn at rest.
 *
 * Exported so `loading.tsx` renders the same body — the count settles, the
 * container and the card do not.
 */
export function PlansSkeletonBody() {
  return (
    <>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <SkeletonBlock className="h-9 w-full rounded-md sm:max-w-xs" />
        <SkeletonBlock className="h-7 w-40 rounded-md" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <SkeletonBlock
            key={`pending-plan-${index}`}
            className="h-[330px] w-full rounded-lg"
          />
        ))}
      </div>
    </>
  );
}
