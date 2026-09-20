"use client";

/**
 * The term, drawn.
 *
 * A position is a promise with a date on it, and this is the panel that states
 * the promise: when it started, when it pays, how far through it is, and what
 * "pays" means for THIS plan. Nothing in the product showed any of it before.
 *
 * THE SETTLEMENT RULE IS STATED, NOT IMPLIED.
 * -------------------------------------------
 * `profitPercentage` is a magnitude. Whether maturity adds it to the principal,
 * leaves the principal alone, or subtracts it, is `defaultResult` — a field the
 * user-facing plan endpoints did not send until this rebuild, which is why
 * every surface in this product used to describe the magnitude as a gain.
 * `kit/outcome.ts` turns it into the sign, the tone and the sentence below.
 *
 * When the rule is UNKNOWN — an older backend that does not send the field —
 * the panel says the outcome is not stated rather than assuming a gain.
 */

import { Icon } from "@/components/ui/icon";
import { useTranslations } from "next-intl";
import { Progress } from "@/components/ui/progress";
import { Money, SignedMoney, formatRate } from "../../components/kit/money";
import { projectedChange, projectedReturn } from "../../components/kit/outcome";
import { useRemainingLabel, useTermLabel } from "../../components/term-label";
import { useOutcomeRule } from "../../components/outcome-label";
import type { InvestmentView } from "../../components/kit/position";

interface MaturityPanelProps {
  position: InvestmentView;
  now: number;
  /** The plan's advertised rate, when the catalogue could be read. */
  rate: number | null;
}

export function MaturityPanel({ position, now, rate }: MaturityPanelProps) {
  const t = useTranslations("investment");
  const tCommon = useTranslations("common");
  const termLabel = useTermLabel();
  const remaining = useRemainingLabel();
  const outcomeRule = useOutcomeRule();

  const outcome = position.outcome;
  const settled = position.isSettled;

  const change =
    rate != null && outcome
      ? projectedChange(position.amount, rate, outcome)
      : null;
  const total =
    rate != null && outcome
      ? projectedReturn(position.amount, rate, outcome)
      : null;

  return (
    <section className="flex flex-col gap-4 rounded-lg border border-border bg-surface-2 p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-subtle-foreground">
          {settled ? t("the_term") : tCommon("time_remaining")}
        </h2>
        <span className="font-mono text-sm tabular-nums text-foreground">
          {settled ? termLabel(position.term) : remaining(position.clock, now)}
        </span>
      </div>

      {position.clock.progress !== null && (
        <Progress
          value={position.clock.progress}
          className="h-1.5"
          indicatorClassName={
            position.clock.matured && !settled ? "bg-warning" : undefined
          }
        />
      )}

      <dl className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-4">
        <Fact label={tCommon("opened")}>
          {position.source.createdAt
            ? new Date(position.source.createdAt).toLocaleDateString()
            : "—"}
        </Fact>
        <Fact label={settled ? t("matured") : tCommon("matures")}>
          {position.clock.endDate
            ? position.clock.endDate.toLocaleDateString()
            : tCommon("not_recorded")}
        </Fact>
        <Fact label={tCommon("term")}>{termLabel(position.term) ?? "—"}</Fact>
        <Fact label={tCommon("rate")}>
          {rate != null ? formatRate(rate) : tCommon("not_recorded")}
        </Fact>
      </dl>

      {/*
        THE OUTCOME RULE.

        For a settled position this states what happened. For a running one it
        states what is going to happen — which is knowable, because the plan's
        `defaultResult` decides it deterministically at purchase time unless an
        admin edits the individual row.
      */}
      <div
        className={[
          "flex items-start gap-2 rounded-md px-3 py-2.5",
          outcome?.tone === "success" && "bg-success/10",
          outcome?.tone === "destructive" && "bg-destructive/10",
          (!outcome || outcome.tone === "neutral") && "bg-surface-3",
        ]
          .filter(Boolean)
          .join(" ")}
      >
        <Icon
          icon={outcome?.icon ?? "lucide:help-circle"}
          className={[
            "mt-0.5 size-4 shrink-0",
            outcome?.tone === "success" && "text-success-ink",
            outcome?.tone === "destructive" && "text-destructive-ink",
            (!outcome || outcome.tone === "neutral") && "text-muted-foreground",
          ]
            .filter(Boolean)
            .join(" ")}
          aria-hidden="true"
        />
        <div className="flex min-w-0 flex-col gap-1.5">
          <p className="text-xs font-medium text-foreground">
            {outcomeRule(outcome, settled)}
          </p>

          {change !== null && total !== null && (
            <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
              <span className="flex items-baseline gap-1.5">
                <span className="text-[11px] text-subtle-foreground">
                  {settled ? tCommon("result") : t("at_maturity")}
                </span>
                <SignedMoney
                  value={settled ? position.realised : change}
                  currency={position.currency}
                />
              </span>
              <span className="flex items-baseline gap-1.5">
                <span className="text-[11px] text-subtle-foreground">
                  {t("returns_to_wallet")}
                </span>
                <Money
                  value={
                    settled && position.realised !== null
                      ? Math.max(0, position.amount + position.realised)
                      : total
                  }
                  currency={position.currency}
                  emphasis="secondary"
                />
              </span>
            </div>
          )}
        </div>
      </div>
    </section>
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
