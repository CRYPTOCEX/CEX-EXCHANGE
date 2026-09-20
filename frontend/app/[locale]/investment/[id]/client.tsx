"use client";

/**
 * One position, in full.
 *
 * THIS ROUTE DID NOT EXIST.
 * -------------------------
 * `GET /api/finance/investment/:id?type=general` has always returned the whole
 * record — the plan, the duration, the user — and nothing in the frontend
 * called it. The history table carried a comment saying so in as many words
 * ("There is no `/investment/[id]` detail route, so a view link would 404") and
 * disabled its own view action because of it. The settlement cron's completion
 * notification links to `/investments/{id}`, which is not a route either, so
 * every "View Investment" button in every completion email and notification
 * landed on a 404.
 *
 * Both now resolve here.
 *
 * A DEAD RECORD IS A DIFFERENT SCREEN FROM A DEAD REQUEST.
 * --------------------------------------------------------
 * "This position is gone" and "we could not ask about it" are different facts
 * and get different panels: one is final and offers the way back, the other is
 * transient and offers a retry. Conflating them is how a network blip comes to
 * tell somebody their investment no longer exists.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { useTranslations } from "next-intl";
import { $fetch } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
// `useRouter` from `@/i18n/routing`, NOT from `next/navigation`: the locale is a
// path segment here, and the bare Next router would push `/investment/portfolio`
// with no prefix — a hard navigation that drops the reader's language.
import { Link, usePathname, useRouter } from "@/i18n/routing";
import { statusTone } from "@/lib/status-tone";
import { isAuthError } from "@/lib/backend-error";
import { loginHref } from "@/lib/login-href";
import { useUserStore } from "@/store/user";
import { useInvestmentStore } from "@/store/investment/user";
import {
  EmptyPanel,
  ErrorPanel,
  InvestmentFrame,
} from "../components/page-frame";
import { usePageClock } from "../components/kit/term";
import { viewInvestment } from "../components/kit/position";
import { useStatusLabel } from "../components/outcome-label";
import { Money } from "../components/kit/money";
import { MaturityPanel } from "./components/maturity-panel";
import { CancelPanel } from "./components/cancel-panel";
import { PositionSkeletonBody } from "./components/position-skeleton";

/**
 * What we know about the record.
 *
 * FOUR values, not a boolean and a payload: `missing` is a 404 the server gave
 * us on purpose, `failed` is everything else, and the two must not share a
 * screen.
 */
type Phase = "pending" | "ready" | "missing" | "failed";

export default function PositionClient({ id }: { id: string }) {
  const t = useTranslations("investment");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const pathname = usePathname();
  const statusLabel = useStatusLabel();
  const { user, isLoading: authLoading } = useUserStore();

  const [row, setRow] = useState<investmentAttributes | null>(null);
  const [phase, setPhase] = useState<Phase>("pending");
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const { plans, fetchPlans, cancelInvestment, cancellingId, cancelError } =
    useInvestmentStore();

  /**
   * The read, as a pure function of the id: it returns the outcome instead of
   * writing it, so the two callers below decide what to do with a response that
   * may have been superseded while it was in flight.
   */
  const read = useCallback(async () => {
    const { data, error: err } = await $fetch<investmentAttributes>({
      url: `/api/finance/investment/${id}`,
      params: { type: "general" },
      silent: true,
    });
    return { data: data ?? null, err };
  }, [id]);

  const apply = useCallback((result: { data: investmentAttributes | null; err: any }) => {
    if (result.err) {
      setError(result.err);
      /* The backend answers a missing row — and a row belonging to somebody
         else, since the lookup is scoped `where: { id, userId }` — with the
         same 404 "Investment not found". Both mean "not yours to see", and both
         correctly land on the gone panel rather than on a retry. */
      setPhase(/not found/i.test(String(result.err)) ? "missing" : "failed");
      return;
    }
    setRow(result.data);
    setError(null);
    setPhase(result.data ? "ready" : "missing");
  }, []);

  /** The retry button: the same read, with the pending affordance a gesture wants. */
  const retry = useCallback(async () => {
    setRefreshing(true);
    apply(await read());
    setRefreshing(false);
  }, [read, apply]);

  useEffect(() => {
    if (!user?.id) return;
    /* An inline async body with a `cancelled` guard — the idiom used across
       this codebase for a fetch-on-mount. Two reasons it is not a bare call to
       an outer async function: nothing runs synchronously in the effect body,
       so there is no setState-during-effect cascade; and navigating from one
       investment to another while the first request is open would otherwise
       let the stale response land on the new page. */
    let cancelled = false;

    (async () => {
      const result = await read();
      if (!cancelled) apply(result);
    })();

    // The single-investment endpoint does include the full plan, but the rate
    // is not on the trimmed association the LIST sends, so the catalogue is the
    // reliable source for both surfaces — and it is already cached by the time
    // most people arrive here from the portfolio.
    fetchPlans();

    return () => {
      cancelled = true;
    };
  }, [user?.id, read, apply, fetchPlans]);

  const isOpen = String(row?.status ?? "").toUpperCase() === "ACTIVE";
  const now = usePageClock(isOpen);
  const position = useMemo(
    () => (row ? viewInvestment(row, now) : null),
    [row, now]
  );

  /*
    ─────────────────────────────────────────────────────────────────────────
    THE POSITION'S OWN SNAPSHOT FIRST. THE PLAN'S LIVE RATE IS NOT THE TERMS.

    An investment's return is FROZEN at purchase: `finance/investment/index.post.ts:183`
    computes `roi = (plan.profitPercentage / 100) * amount` and stores it as
    `profit`, and settlement pays that stored value —
    `finance/investment/cron.ts:163-169` prefers `roiPercentage`, then `profit`,
    and only falls back to the plan when the row carries neither.

    This read the PLAN as it stands TODAY. After any admin edit to a plan's
    rate, every running position under it advertised a maturity value it would
    not receive — and the edit is invisible to the holder, so the number simply
    changed under them.

    Order of preference mirrors the cron exactly, so the projection and the
    payout are computed from the same value: the row's `roiPercentage`, then its
    `profit` expressed as a rate, then the embedded plan, then the catalogue.
    The kit already reads `investment.profit` for SETTLED positions
    (`components/kit/outcome.ts:631-644`); it was only the projection that
    reached past it.
    ─────────────────────────────────────────────────────────────────────────
  */
  const rate = useMemo(() => {
    const snapshotRate = Number((row as any)?.roiPercentage);
    if (Number.isFinite(snapshotRate)) return snapshotRate;

    const snapshotProfit = Number((row as any)?.profit);
    const principal = Number((row as any)?.amount);
    if (Number.isFinite(snapshotProfit) && Number.isFinite(principal) && principal > 0) {
      return (snapshotProfit / principal) * 100;
    }

    const embedded = Number((row?.plan as any)?.profitPercentage);
    if (Number.isFinite(embedded)) return embedded;
    const fromCatalogue = plans?.find((plan) => plan.id === row?.planId);
    const value = Number(fromCatalogue?.profitPercentage);
    return Number.isFinite(value) ? value : null;
  }, [row, plans]);

  const header = {
    title: position?.planTitle ?? tCommon("investment"),
    subtitle: t("position_subtitle"),
    width: "narrow" as const,
    action: (
      <Button asChild variant="outline" size="sm">
        <Link href="/investment/portfolio">
          <ArrowLeft className="size-4" aria-hidden="true" />
          {t("all_investments")}
        </Link>
      </Button>
    ),
  };

  const signedOut = !authLoading && !user;
  if (signedOut || (isAuthError(error) && !row)) {
    return (
      <InvestmentFrame {...header} title={tCommon("investment")}>
        <EmptyPanel
          icon="lucide:lock"
          title={user ? tCommon("session_ended_title") : t("sign_in_to_see_title")}
          body={user ? t("session_ended_body") : t("sign_in_to_position_body")}
          action={
            <Button asChild size="sm">
              <Link href={loginHref(pathname)}>{tCommon("sign_in")}</Link>
            </Button>
          }
        />
      </InvestmentFrame>
    );
  }

  if (phase === "pending") {
    return (
      <InvestmentFrame {...header} title={tCommon("investment")}>
        <PositionSkeletonBody />
      </InvestmentFrame>
    );
  }

  if (phase === "missing") {
    return (
      <InvestmentFrame {...header} title={tCommon("investment")}>
        <EmptyPanel
          icon="lucide:file-question"
          title={t("position_not_found")}
          body={t("position_not_found_body")}
          action={
            <Button asChild size="sm" variant="outline">
              <Link href="/investment/portfolio">{t("all_investments")}</Link>
            </Button>
          }
        />
      </InvestmentFrame>
    );
  }

  if (phase === "failed" || !position) {
    return (
      <InvestmentFrame {...header} title={tCommon("investment")}>
        <ErrorPanel
          title={t("could_not_load_position")}
          error={error}
          fallback={t("something_went_wrong_our_end")}
          reassurance={t("position_error_reassurance")}
          authSentence={t("session_ended_sentence")}
          retryLabel={tCommon("try_again")}
          retrying={refreshing}
          onRetry={retry}
        />
      </InvestmentFrame>
    );
  }

  return (
    <InvestmentFrame {...header}>
      <section className="flex flex-wrap items-end justify-between gap-4 rounded-lg border border-border bg-surface-2 p-4">
        <div className="flex flex-col gap-1">
          <span className="text-[10px] font-medium uppercase tracking-widest text-subtle-foreground">
            {tCommon("principal")}
          </span>
          <Money
            value={position.amount}
            currency={position.currency}
            size="2xl"
          />
        </div>
        <div className="flex flex-col items-end gap-2">
          <Badge tone={statusTone(position.status)} appearance="soft">
            {statusLabel(position.status)}
          </Badge>
          {position.planId && (
            <Link
              href={`/investment/plan/${position.planId}`}
              className="text-[11px] font-medium text-primary-ink underline underline-offset-2"
            >
              {t("view_the_plan")}
            </Link>
          )}
        </div>
      </section>

      <MaturityPanel position={position} now={now} rate={rate} />

      {/* A control the server would always refuse is not rendered at all. The
          backend accepts cancellation on ACTIVE and nothing else ("Only active
          investments can be cancelled"), so `canCancel` is derived from the
          same rule rather than from what looks reasonable. */}
      {position.canCancel && (
        <CancelPanel
          position={position}
          cancelling={cancellingId === position.id}
          error={cancelError}
          onCancel={async () => {
            const ok = await cancelInvestment(position.id);
            /* The row is soft-deleted, so re-reading this page would 404 into
               the gone panel. Send them to the list, where the refund and the
               remaining positions are. */
            if (ok) router.push("/investment/portfolio");
          }}
        />
      )}
    </InvestmentFrame>
  );
}
