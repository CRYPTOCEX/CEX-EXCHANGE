"use client";

/**
 * One plan, and the composer for it.
 *
 * IT FETCHES THE PLAN IT WAS ASKED FOR.
 * -------------------------------------
 * The old page did `plans.find((p) => p.id === planId)` over the cached LIST,
 * and the list endpoint filters to `status: true`. Two consequences: a plan an
 * operator had just deactivated rendered "Plan not found" rather than "this
 * plan is closed", and a direct link opened before the list arrived did the
 * same — `plansLoading` is false on the very first render, so the not-found
 * branch was reachable on EVERY cold load of this URL. `/plan/:id` has no
 * status filter and answers about the plan that was actually requested.
 */

import { useEffect, useMemo } from "react";
import { ArrowLeft } from "lucide-react";
import { Icon } from "@/components/ui/icon";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SkeletonBlock } from "@/components/ui/skeleton";
import { PlanImage } from "../../components/plan-image";
import { Link, usePathname } from "@/i18n/routing";
import { loginHref } from "@/lib/login-href";
import { useUserStore } from "@/store/user";
import { useInvestmentStore } from "@/store/investment/user";
import {
  EmptyPanel,
  ErrorPanel,
  InvestmentFrame,
} from "../../components/page-frame";
import { Money, formatRate } from "../../components/kit/money";
import { outcomeOf } from "../../components/kit/outcome";
import { termParts } from "../../components/kit/term";
import { useTermLabel } from "../../components/term-label";
import { useOutcomeChip } from "../../components/outcome-label";
import { InvestComposer } from "./components/invest-composer";

export default function PlanClient({ planId }: { planId: string }) {
  const t = useTranslations("investment");
  const tCommon = useTranslations("common");
  const pathname = usePathname();
  const termLabel = useTermLabel();
  const outcomeChip = useOutcomeChip();
  const { user, isLoading: authLoading } = useUserStore();

  const {
    plan,
    planLoading,
    planError,
    planId: loadedId,
    fetchPlan,
    investments,
    fetchUserInvestments,
  } = useInvestmentStore();

  useEffect(() => {
    fetchPlan(planId);
  }, [planId, fetchPlan]);

  /* The composer needs to know whether this person already has a position
     running in THIS plan — the backend permits only one, and the old form
     found out by submitting. */
  useEffect(() => {
    if (!user?.id) return;
    fetchUserInvestments(user.id);
  }, [user?.id, fetchUserInvestments]);

  const alreadyRunning = useMemo(
    () =>
      (investments ?? []).some(
        (row) =>
          row?.planId === planId &&
          String(row?.status).toUpperCase() === "ACTIVE"
      ),
    [investments, planId]
  );

  const showing = plan && loadedId === planId ? plan : null;
  const outcome = showing ? outcomeOf(showing.defaultResult) : null;
  const currency = showing?.currency ?? null;

  const header = {
    title: showing?.title ?? tCommon("investment_plan"),
    subtitle: t("plan_subtitle"),
    action: (
      <Button asChild variant="outline" size="sm">
        <Link href="/investment/plan">
          <ArrowLeft className="size-4" aria-hidden="true" />
          {tCommon("all_plans")}
        </Link>
      </Button>
    ),
  };

  if (planLoading || (!showing && !planError)) {
    return (
      <InvestmentFrame {...header} title={tCommon("investment_plan")}>
        <div className="grid gap-4 lg:grid-cols-[1fr_380px]">
          <SkeletonBlock className="h-[320px] w-full rounded-lg" />
          <SkeletonBlock className="h-[320px] w-full rounded-lg" />
        </div>
      </InvestmentFrame>
    );
  }

  if (!showing) {
    const gone = /not found/i.test(String(planError ?? ""));
    return (
      <InvestmentFrame {...header} title={tCommon("investment_plan")}>
        {gone ? (
          <EmptyPanel
            icon="lucide:file-question"
            title={t("plan_not_found")}
            body={t("plan_not_found_body")}
            action={
              <Button asChild size="sm" variant="outline">
                <Link href="/investment/plan">{tCommon("all_plans")}</Link>
              </Button>
            }
          />
        ) : (
          <ErrorPanel
            title={t("could_not_load_plan")}
            error={planError}
            fallback={t("something_went_wrong_our_end")}
            reassurance={t("plan_error_reassurance")}
            authSentence={t("session_ended_sentence")}
            retryLabel={tCommon("try_again")}
            onRetry={() => fetchPlan(planId)}
          />
        )}
      </InvestmentFrame>
    );
  }

  const terms = (showing.durations ?? [])
    .map((duration) => termLabel(termParts(duration)))
    .filter(Boolean) as string[];

  return (
    <InvestmentFrame {...header}>
      <div className="grid gap-4 lg:grid-cols-[1fr_380px] lg:items-start">
        <div className="flex flex-col gap-4">
          {/*
            Bounded BOTH ways, and GONE when there is nothing to show.

            The 1024x728 in the upload config is a maximum, not a shape, and the
            real files run from a 144x144 avatar to a 1017x728 screenshot — a
            full-width panel flatters exactly one of those, so the width is
            capped too and this reads as a picture rather than as a banner.

            `whenMissing="hide"` is the part that matters here. Most rows in a
            populated catalogue point at an upload that is no longer on disk,
            and a 320x160 bordered rectangle holding one grey glyph, sitting
            above the facts on an otherwise empty column, reads as a BROKEN
            image rather than an absent one. There is no grid alignment to
            preserve on a single-plan page, so it collapses and the page starts
            at the number people came for.
          */}
          <PlanImage
            src={showing.image}
            whenMissing="hide"
            className="h-40 w-full max-w-xs"
            sizes="320px"
            padding="p-3"
          />

          <section className="flex flex-col gap-4 rounded-lg border border-border bg-surface-2 p-4">
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-2">
              <span className="font-mono text-3xl font-semibold tabular-nums tracking-tight text-foreground">
                {formatRate(Number(showing.profitPercentage))}
              </span>
              {outcome ? (
                <Badge tone={outcome.tone} appearance="soft">
                  <Icon icon={outcome.icon} className="mr-1 size-3" aria-hidden="true" />
                  {outcomeChip(outcome)}
                </Badge>
              ) : (
                <Badge tone="neutral" appearance="soft">
                  {outcomeChip(null)}
                </Badge>
              )}
              <span className="text-[11px] text-subtle-foreground">
                {t("per_term")}
              </span>
            </div>

            <p className="max-w-[72ch] text-sm leading-relaxed text-muted-foreground">
              {showing.description}
            </p>

            <dl className="grid grid-cols-2 gap-x-4 gap-y-3 border-t border-border pt-4 sm:grid-cols-4">
              <Fact label={tCommon("minimum")}>
                <Money value={showing.minAmount} currency={currency} role="threshold" size="xs" />
              </Fact>
              <Fact label={tCommon("maximum")}>
                <Money value={showing.maxAmount} currency={currency} role="threshold" size="xs" />
              </Fact>
              <Fact label={tCommon("currency")}>{showing.currency}</Fact>
              <Fact label={t("funded_from")}>{showing.walletType}</Fact>
            </dl>

            {terms.length > 0 && (
              <div className="flex flex-wrap items-center gap-2 border-t border-border pt-4">
                <span className="text-[10px] font-medium uppercase tracking-widest text-subtle-foreground">
                  {tCommon("terms")}
                </span>
                {terms.map((term) => (
                  <Badge key={term} tone="neutral" appearance="soft">
                    {term}
                  </Badge>
                ))}
              </div>
            )}
          </section>
        </div>

        <InvestComposer
          plan={showing}
          alreadyRunning={alreadyRunning}
          signedOut={!authLoading && !user}
          signInHref={loginHref(pathname)}
        />
      </div>
    </InvestmentFrame>
  );
}

function Fact({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-[10px] font-medium uppercase tracking-widest text-subtle-foreground">
        {label}
      </dt>
      <dd className="font-mono text-xs tabular-nums text-foreground">
        {children}
      </dd>
    </div>
  );
}
