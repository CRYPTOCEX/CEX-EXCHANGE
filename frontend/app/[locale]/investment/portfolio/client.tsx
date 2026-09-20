"use client";

/**
 * "My investments" — one destination in place of two.
 *
 * WHAT IT COLLAPSES
 * -----------------
 *   /investment/dashboard   four KPI tiles, an active-investment panel and the
 *                           five most recent rows
 *   /investment/history     a DataTable of the same rows, behind its own nav
 *                           item
 *
 * Two doors into one room, and the dashboard's list was capped at five while
 * the store fetched a hundred — so the sixth row was reachable only through a
 * "view all" link that rendered conditionally. Both paths still resolve; see
 * the redirect stubs.
 *
 * Running positions are first, biggest, and sorted by how close they are to
 * paying, because that is what somebody opens this page to find out. Everything
 * settled shares one section below.
 *
 * ONE CLOCK
 * ---------
 * `usePageClock` owns a single interval for the page. Twenty positions must not
 * mount twenty timers, and every countdown on screen has to be reading the same
 * instant — see the note in `kit/term.ts`.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { Icon } from "@/components/ui/icon";
import { Plus, RefreshCw } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Link, usePathname } from "@/i18n/routing";
import { useInvestmentStore } from "@/store/investment/user";
import { useUserStore } from "@/store/user";
import { isAuthError } from "@/lib/backend-error";
import { loginHref } from "@/lib/login-href";
import {
  EmptyPanel,
  ErrorPanel,
  InvestmentFrame,
  SectionHeading,
  StaleNote,
} from "../components/page-frame";
import { usePageClock } from "../components/kit/term";
import {
  bucketByCurrency,
  byUrgency,
  viewInvestment,
} from "../components/kit/position";
import { PortfolioStrip } from "./components/portfolio-strip";
import { PositionCard } from "./components/position-card";
import { HistoryList } from "./components/history-list";
import { PortfolioSkeletonBody } from "./components/portfolio-skeleton";

export default function PortfolioClient() {
  const t = useTranslations("investment");
  const tCommon = useTranslations("common");
  const { user, isLoading: authLoading } = useUserStore();
  const pathname = usePathname();

  const {
    investments,
    investmentsLoading,
    investmentsError,
    fetchUserInvestments,
    plans,
    fetchPlans,
    ownerId,
    reset,
  } = useInvestmentStore();

  const [showSettled, setShowSettled] = useState(false);

  /*
    THE CROSS-USER GUARD.

    This store is a module singleton. Signing out and back in as somebody else
    left the previous account's rows in it, so the first paint after the switch
    showed another person's positions. Clearing on a CHANGED id — rather than on
    every mount — keeps the cache useful when the same user navigates back here.
  */
  useEffect(() => {
    if (!user?.id) return;
    if (ownerId && ownerId !== user.id) reset();
  }, [user?.id, ownerId, reset]);

  useEffect(() => {
    if (!user?.id) return;
    fetchUserInvestments(user.id);
    // The catalogue supplies each position's advertised rate and settlement
    // rule; the list endpoint trims `plan` to four fields and sends neither.
    fetchPlans();
  }, [user?.id, fetchUserInvestments, fetchPlans]);

  /* The clock only runs while something is running. A portfolio of settled
     positions has nothing to count down, and an interval left spinning behind
     it wakes a phone up for a screen that cannot change. */
  const hasOpen = useMemo(
    () =>
      Array.isArray(investments) &&
      investments.some((row) => String(row?.status).toUpperCase() === "ACTIVE"),
    [investments]
  );
  const now = usePageClock(hasOpen);

  const views = useMemo(
    () =>
      (Array.isArray(investments) ? investments : [])
        .map((row) => viewInvestment(row, now))
        .sort(byUrgency),
    [investments, now]
  );

  const open = useMemo(() => views.filter((v) => v.isOpen), [views]);
  const settled = useMemo(() => views.filter((v) => v.isSettled), [views]);
  const { buckets, unbucketed } = useMemo(
    () => bucketByCurrency(views),
    [views]
  );

  /**
   * THE POSITION'S OWN SNAPSHOT FIRST, then the plan's advertised rate.
   *
   * An investment's return is FROZEN at purchase — `finance/investment/index.post.ts:183`
   * stores `roi = (plan.profitPercentage / 100) * amount` as `profit`, and
   * settlement pays that stored value (`cron.ts:163-169`). Projecting from the
   * CATALOGUE meant that after any admin edit to a plan's rate, every running
   * position under it advertised a payout it would not receive.
   *
   * Order of preference mirrors the cron exactly, so a projection and a payout
   * come from the same number.
   */
  const rateOf = useMemo(() => {
    const map = new Map<string, number>();
    for (const plan of plans ?? []) {
      if (plan?.id != null) map.set(plan.id, Number(plan.profitPercentage));
    }
    return (position: { planId: string | null; roiPercentage?: unknown; profit?: unknown; amount?: unknown }) => {
      const snapshotRate = Number(position?.roiPercentage);
      if (Number.isFinite(snapshotRate)) return snapshotRate;

      const snapshotProfit = Number(position?.profit);
      const principal = Number(position?.amount);
      if (Number.isFinite(snapshotProfit) && Number.isFinite(principal) && principal > 0) {
        return (snapshotProfit / principal) * 100;
      }

      const planId = position?.planId ?? null;
      return planId && map.has(planId) ? map.get(planId)! : null;
    };
  }, [plans]);

  /*
    A position that crosses maturity is not settled by the browser — the cron
    settles it, and not necessarily in the same minute. Pull once at the
    boundary so the row stops describing itself as running. Keyed by the SET of
    matured-but-open ids, so a second position crossing later triggers its own
    refresh and a steady state triggers none.
  */
  const maturedKey = open
    .filter((position) => position.clock.matured)
    .map((position) => position.id)
    .join(",");
  const handledRef = useRef("");
  useEffect(() => {
    if (!maturedKey || maturedKey === handledRef.current) return;
    handledRef.current = maturedKey;
    fetchUserInvestments(user?.id);
  }, [maturedKey, fetchUserInvestments, user?.id]);

  /* --- the state machine ------------------------------------------------ */

  const authSettled = !authLoading;
  const signedOut = authSettled && !user;
  /* Both a payload and an error are RESOLVED answers. Anything else — including
     the gap between first paint and the effect above firing — is still pending,
     and rendering "you have no investments" into that gap tells somebody with
     capital committed that they have nothing at stake. */
  const resolved = investments !== null || Boolean(investmentsError);
  const pending = !signedOut && !resolved;
  const sessionEnded = isAuthError(investmentsError);
  const hardError =
    Boolean(investmentsError) && investments === null && !sessionEnded;

  const header = {
    title: t("my_investments"),
    subtitle: t("my_investments_subtitle"),
    action: (
      <Button asChild size="sm">
        <Link href="/investment/plan">
          <Plus className="size-4" aria-hidden="true" />
          {tCommon("new_investment")}
        </Link>
      </Button>
    ),
  };

  if (signedOut || (sessionEnded && investments === null)) {
    return (
      <InvestmentFrame {...header}>
        <EmptyPanel
          icon="lucide:lock"
          title={user ? tCommon("session_ended_title") : t("sign_in_to_see_title")}
          body={user ? t("session_ended_body") : t("sign_in_to_see_body")}
          action={
            <Button asChild size="sm">
              <Link href={loginHref(pathname)}>{tCommon("sign_in")}</Link>
            </Button>
          }
        />
      </InvestmentFrame>
    );
  }

  if (pending) {
    return (
      <InvestmentFrame {...header}>
        <PortfolioSkeletonBody />
      </InvestmentFrame>
    );
  }

  if (hardError) {
    return (
      <InvestmentFrame {...header}>
        <ErrorPanel
          title={t("could_not_load_portfolio")}
          error={investmentsError}
          fallback={t("something_went_wrong_our_end")}
          reassurance={t("portfolio_error_reassurance")}
          authSentence={t("session_ended_sentence")}
          retryLabel={tCommon("try_again")}
          retrying={investmentsLoading}
          onRetry={() => fetchUserInvestments(user?.id)}
        />
      </InvestmentFrame>
    );
  }

  return (
    <InvestmentFrame {...header}>
      {/* A failed refresh leaves the previous rows on screen. Say so, rather
          than letting figures from ten minutes ago pass for current ones. */}
      {investmentsError && (
        <StaleNote
          error={investmentsError}
          staleSentence={tCommon("figures_from_last_load")}
          fallback={t("something_went_wrong_our_end")}
          authSentence={t("session_ended_sentence")}
          signInLabel={tCommon("sign_in_again")}
        />
      )}

      <PortfolioStrip buckets={buckets} unbucketed={unbucketed} />

      <section className="flex flex-col gap-3" data-tour="invest-positions">
        <SectionHeading
          title={tCommon("running")}
          trailing={
            <Button
              variant="ghost"
              size="xs"
              loading={investmentsLoading}
              onClick={() => fetchUserInvestments(user?.id)}
            >
              <RefreshCw className="size-3.5" aria-hidden="true" />
              {tCommon("refresh")}
            </Button>
          }
        />

        {open.length === 0 ? (
          <EmptyPanel
            icon="lucide:trending-up"
            title={t("nothing_running")}
            body={t("nothing_running_body")}
            action={
              <Button asChild size="sm" variant="outline">
                <Link href="/investment/plan">{t("browse_plans")}</Link>
              </Button>
            }
          />
        ) : (
          <div className="flex flex-col gap-3">
            {open.map((position) => (
              <PositionCard
                key={position.id}
                position={position}
                now={now}
                rate={rateOf(position as any)}
              />
            ))}
          </div>
        )}
      </section>

      {/* Settled positions sit BELOW the running ones and behind a disclosure,
          not as a top-level tab beside them: they are the same kind of thing at
          a lower priority, and a tab would make "what is running" and "what has
          finished" two equal destinations again — which is the split this page
          exists to end. */}
      <section className="flex flex-col gap-3">
        <SectionHeading
          title={tCommon("settled")}
          trailing={
            settled.length > 0 ? (
              <Button
                variant="ghost"
                size="xs"
                aria-expanded={showSettled}
                onClick={() => setShowSettled((open) => !open)}
              >
                <Icon
                  icon={showSettled ? "lucide:chevron-up" : "lucide:chevron-down"}
                  className="size-3.5"
                  aria-hidden="true"
                />
                {showSettled
                  ? tCommon("hide_detail")
                  : t("show_n_settled", { count: settled.length })}
              </Button>
            ) : undefined
          }
        />
        {(showSettled || settled.length === 0) && (
          <HistoryList positions={settled} />
        )}
      </section>
    </InvestmentFrame>
  );
}
