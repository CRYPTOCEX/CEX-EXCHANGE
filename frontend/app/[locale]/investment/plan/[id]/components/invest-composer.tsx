"use client";

/**
 * The one control in this product that moves money.
 *
 * WHAT IT HAD TO STOP DOING
 * -------------------------
 * 1. PRESENTING A MAGNITUDE AS A GAIN. It rendered "Expected Profit" and "Total
 *    Return" as arithmetic certainties — `amount * profitPercentage / 100`, and
 *    that plus the principal — beside a panel reading "your investment is
 *    protected by our security guarantee". The settlement engine pays
 *    `max(0, principal - roi)` on a plan whose `defaultResult` is LOSS, so both
 *    figures could be the exact inverse of what happened, under a guarantee the
 *    platform does not make. The projection is now signed by the plan's actual
 *    rule and the guarantee line is gone.
 *
 * 2. DISCOVERING PRECONDITIONS AFTER THE PRESS. The backend rejects an
 *    investment for five reasons and the form checked one of them. The other
 *    four — the feature being switched off, KYC, no terms configured, and a
 *    position ALREADY RUNNING in this plan — were all found out by pressing the
 *    button and reading a 400. `blockers` below is derived from the same rules
 *    before the button is enabled.
 *
 * 3. DOING NOTHING ON SUCCESS. The form did not reset, navigate or acknowledge;
 *    the button simply re-enabled with the same amount still in it, which reads
 *    as "that failed" on the one action that just moved real money.
 *
 * 4. DESTROYING ITS OWN ERROR. The only report of a failure was an `Alert` that
 *    a `setTimeout` cleared after five seconds.
 */

import { useMemo, useState } from "react";
import { Icon } from "@/components/ui/icon";
import { AlertTriangle, Clock, Info } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Link, useRouter } from "@/i18n/routing";
import { useInvestmentStore } from "@/store/investment/user";
import { Money, SignedMoney, formatRate } from "../../../components/kit/money";
import {
  outcomeOf,
  projectedChange,
  projectedReturn,
} from "../../../components/kit/outcome";
import { termParts } from "../../../components/kit/term";
import { useTermLabel } from "../../../components/term-label";
import { useOutcomeNotice } from "../../../components/outcome-label";
import { FixedReturnDisclosure } from "@/components/blocks/investment/fixed-return-disclosure";

interface InvestComposerProps {
  plan: investmentPlanAttributes;
  /** The viewer already has a position running in this plan. */
  alreadyRunning: boolean;
  /** Auth has settled and there is nobody signed in. */
  signedOut: boolean;
  signInHref: string;
}

export function InvestComposer({
  plan,
  alreadyRunning,
  signedOut,
  signInHref,
}: InvestComposerProps) {
  const t = useTranslations("investment");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const termLabel = useTermLabel();
  const outcomeNotice = useOutcomeNotice();
  const { createInvestment, isInvesting, investmentError, clearError } =
    useInvestmentStore();

  const durations = plan.durations ?? [];
  const [durationId, setDurationId] = useState<string>(
    durations.length === 1 ? durations[0].id : ""
  );
  const [raw, setRaw] = useState("");

  const currency = plan.currency ?? null;
  const rate = Number(plan.profitPercentage);
  const outcome = outcomeOf(plan.defaultResult);

  const min = Number(plan.minAmount);
  const max = Number(plan.maxAmount);
  const amount = Number(raw);
  const hasAmount = raw.trim() !== "" && Number.isFinite(amount);

  /**
   * WHAT THE BUTTON IS WAITING FOR — every reason, checked here rather than
   * discovered from a 400.
   *
   * `min`/`max` mirror the server's own conditions exactly, including the part
   * that is easy to miss: it skips each bound when the plan's value is null or
   * `<= 0`, so a plan with `maxAmount: 0` has NO upper bound and a form that
   * enforced one would refuse an amount the backend would have taken.
   */
  const blockers = useMemo(() => {
    const list: string[] = [];
    if (durations.length === 0) list.push(t("blocker_no_terms"));
    if (alreadyRunning) list.push(t("blocker_already_running"));
    return list;
  }, [durations.length, alreadyRunning, t]);

  const belowMin = hasAmount && min > 0 && amount < min;
  const aboveMax = hasAmount && max > 0 && amount > max;
  const nonPositive = hasAmount && amount <= 0;
  const amountValid = hasAmount && !belowMin && !aboveMax && !nonPositive;

  const change = amountValid ? projectedChange(amount, rate, outcome) : null;
  const total = amountValid ? projectedReturn(amount, rate, outcome) : null;

  const ready =
    amountValid && Boolean(durationId) && blockers.length === 0 && !signedOut;

  if (signedOut) {
    return (
      <Panel title={t("invest")}>
        <p className="text-xs leading-relaxed text-muted-foreground">
          {t("sign_in_to_invest_body")}
        </p>
        <Button asChild size="sm" className="w-full">
          <Link href={signInHref}>{tCommon("sign_in")}</Link>
        </Button>
      </Panel>
    );
  }

  return (
    <Panel title={t("invest")}>
      {/* A precondition the server enforces is stated up front, not after the
          press. "Already invested in this plan" in particular is invisible
          otherwise: the backend allows only ONE ACTIVE position per plan. */}
      {blockers.length > 0 && (
        <ul className="flex flex-col gap-1.5">
          {blockers.map((blocker) => (
            <li
              key={blocker}
              className="flex items-start gap-2 rounded-md bg-surface-3 px-3 py-2 text-xs text-muted-foreground"
            >
              <Info
                className="mt-0.5 size-3.5 shrink-0"
                aria-hidden="true"
              />
              {blocker}
            </li>
          ))}
          {alreadyRunning && (
            <li>
              <Button asChild variant="outline" size="xs">
                <Link href="/investment/portfolio">
                  {t("see_your_position")}
                </Link>
              </Button>
            </li>
          )}
        </ul>
      )}

      <div className="flex flex-col gap-2" data-tour="invest-amount">
        <Label htmlFor="invest-amount">
          {tCommon("amount_in", { currency: plan.currency ?? "" })}
        </Label>
        <Input
          id="invest-amount"
          type="number"
          inputMode="decimal"
          value={raw}
          min={min > 0 ? min : undefined}
          max={max > 0 ? max : undefined}
          step="any"
          disabled={blockers.length > 0}
          aria-describedby="invest-amount-bounds"
          aria-invalid={hasAmount && !amountValid ? true : undefined}
          onChange={(event) => {
            if (investmentError) clearError();
            setRaw(event.target.value);
          }}
        />
        <p
          id="invest-amount-bounds"
          className="text-[11px] text-subtle-foreground"
        >
          {/* The bounds are stated as the SERVER applies them: a bound of zero
              is not enforced, so it is not claimed. */}
          {min > 0 && max > 0
            ? t("bounds_between")
            : min > 0
              ? t("bounds_min_only")
              : max > 0
                ? tCommon("up_to")
                : t("bounds_none")}{" "}
          {min > 0 && (
            <Money value={min} currency={currency} role="threshold" size="xs" emphasis="muted" />
          )}
          {min > 0 && max > 0 && " – "}
          {max > 0 && (
            <Money value={max} currency={currency} role="threshold" size="xs" emphasis="muted" />
          )}
        </p>
        {belowMin && (
          <FieldError>{t("error_below_min")}</FieldError>
        )}
        {aboveMax && <FieldError>{t("error_above_max")}</FieldError>}
        {nonPositive && <FieldError>{tCommon("error_not_positive")}</FieldError>}
      </div>

      {durations.length > 0 && (
        <fieldset className="flex flex-col gap-2" data-tour="invest-term">
          <legend className="mb-2 text-sm font-medium text-foreground">
            {tCommon("term")}
          </legend>
          {/* Real radio inputs, not buttons: this is a single choice inside a
              form, and the old version used a row of Buttons whose selected
              state was conveyed by variant alone — invisible to assistive
              technology and to anyone who cannot separate the two fills. */}
          <div className="grid gap-2">
            {durations.map((duration) => {
              const label = termLabel(termParts(duration));
              const selected = durationId === duration.id;
              return (
                <label
                  key={duration.id}
                  className={[
                    "flex cursor-pointer items-center gap-3 rounded-md border px-3 py-2.5 text-sm transition-colors",
                    selected
                      ? "border-primary bg-primary/10 text-foreground"
                      : "border-border bg-surface-2 text-muted-foreground hover:border-border-strong",
                  ].join(" ")}
                >
                  <input
                    type="radio"
                    name="invest-term"
                    value={duration.id}
                    checked={selected}
                    onChange={() => setDurationId(duration.id)}
                    className="size-4 accent-primary"
                  />
                  <Clock className="size-4" aria-hidden="true" />
                  {label ?? duration.id}
                </label>
              );
            })}
          </div>
          {/*
            THE TERM DOES NOT CHANGE THE PAYOUT, AND THE FORM USED TO IMPLY IT
            DID. `roi = (plan.profitPercentage / 100) * amount` is computed once
            at purchase, from the plan alone; the duration only sets `endDate`.
            Two terms on one plan pay the same amount at different times, and
            presenting them as a menu without saying so invites the reader to
            assume the longer one pays more.
          */}
          {durations.length > 1 && (
            <p className="text-[11px] leading-relaxed text-subtle-foreground">
              {t("term_sets_date_not_amount")}
            </p>
          )}
        </fieldset>
      )}

      {/* THE PROJECTION, SIGNED BY THE PLAN'S OWN RULE. */}
      {amountValid && (
        <div
          className={[
            "flex flex-col gap-2 rounded-md px-3 py-3",
            outcome?.tone === "success" && "bg-success/10",
            outcome?.tone === "destructive" && "bg-destructive/10",
            (!outcome || outcome.tone === "neutral") && "bg-surface-3",
          ]
            .filter(Boolean)
            .join(" ")}
        >
          {!outcome ? (
            <p className="text-xs text-muted-foreground">
              {t("outcome_not_stated_composer")}
            </p>
          ) : (
            <>
              <p className="flex items-start gap-2 text-xs font-medium text-foreground">
                <Icon
                  icon={outcome.icon}
                  className={[
                    "mt-0.5 size-3.5 shrink-0",
                    outcome.tone === "success" && "text-success-ink",
                    outcome.tone === "destructive" && "text-destructive-ink",
                    outcome.tone === "neutral" && "text-muted-foreground",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  aria-hidden="true"
                />
                {outcomeNotice(outcome, formatRate(rate))}
              </p>
              <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1 pl-5.5">
                <span className="flex items-baseline gap-1.5">
                  <span className="text-[11px] text-subtle-foreground">
                    {t("at_maturity")}
                  </span>
                  <SignedMoney value={change} currency={currency} />
                </span>
                <span className="flex items-baseline gap-1.5">
                  <span className="text-[11px] text-subtle-foreground">
                    {t("returns_to_wallet")}
                  </span>
                  <Money value={total} currency={currency} emphasis="secondary" />
                </span>
              </div>
            </>
          )}
        </div>
      )}

      {/* The failure persists until the reader changes something. */}
      {investmentError && (
        <p className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive-ink">
          <AlertTriangle
            className="mt-0.5 size-3.5 shrink-0"
            aria-hidden="true"
          />
          {investmentError}
        </p>
      )}

      {/* Immediately above the press, not tucked under it: the reader has to
          have passed this to reach the button. */}
      <FixedReturnDisclosure />

      <Button
        data-tour="invest-submit"
        className="w-full"
        disabled={!ready}
        loading={isInvesting}
        onClick={async () => {
          const ok = await createInvestment(plan.id, durationId, amount);
          // Success takes them to the position they just opened — the clock is
          // the thing they now want to look at.
          if (ok) router.push("/investment/portfolio");
        }}
      >
        {t("open_position")}
      </Button>

      <p className="text-[11px] leading-relaxed text-subtle-foreground">
        {t("funded_from_wallet", {
          currency: plan.currency ?? "",
          wallet: plan.walletType ?? "",
        })}
      </p>
    </Panel>
  );
}

function Panel({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-4 rounded-lg border border-border bg-surface-2 p-4">
      <h2 className="text-xs font-semibold uppercase tracking-widest text-subtle-foreground">
        {title}
      </h2>
      {children}
    </section>
  );
}

function FieldError({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[11px] text-destructive-ink" role="alert">
      {children}
    </p>
  );
}
