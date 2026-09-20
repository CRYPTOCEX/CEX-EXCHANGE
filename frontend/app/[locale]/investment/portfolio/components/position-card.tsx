"use client";

/**
 * One running position.
 *
 * THE CLOCK IS THE POINT.
 * -----------------------
 * This product's entire proposition is "commit an amount, wait a term, collect
 * an outcome" — and until now no surface in it showed the term running. Every
 * row carries `createdAt` and `endDate`; the dashboard rendered neither, so the
 * only way to learn when your money came back was to keep checking. A bar and a
 * remaining-time reading are what someone opens this page for.
 *
 * WHAT THE FIGURES MEAN
 * ---------------------
 * The amount is the principal, in the PLAN's currency — never defaulted, never
 * summed with a neighbouring row's. The projection beneath it is what maturity
 * will do to that principal under this plan's settlement rule, and it is
 * withheld entirely when the rule is unknown rather than assumed to be a gain.
 *
 * The whole card is a link. A position has a page of its own now — the one
 * place the cancel action lives — and a card that shows a bar with no way into
 * the record it describes is a dead end.
 */

import { ArrowRight } from "lucide-react";
import { Icon } from "@/components/ui/icon";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Money, SignedMoney, formatRate } from "../../components/kit/money";
import { projectedChange } from "../../components/kit/outcome";
import { useRemainingLabel, useTermLabel } from "../../components/term-label";
import type { InvestmentView } from "../../components/kit/position";

interface PositionCardProps {
  position: InvestmentView;
  /** The one instant the whole page is reading. */
  now: number;
  /** The plan's advertised rate, when the catalogue has been loaded. */
  rate?: number | null;
}

export function PositionCard({ position, now, rate }: PositionCardProps) {
  const t = useTranslations("investment");
  const tCommon = useTranslations("common");
  const termLabel = useTermLabel();
  const remaining = useRemainingLabel();

  const term = termLabel(position.term);
  const outcome = position.outcome;

  /* The projection needs BOTH the plan's rate and its settlement rule. The list
     endpoint trims `plan` to id/title/image/currency, so neither arrives on
     this row — `rate` is threaded in from the catalogue and `outcome` falls
     back to the row's own `result`. When either is missing the projection is
     omitted, not guessed: a number stated with the wrong sign is the defect
     this whole rebuild is about. */
  const projection =
    rate != null && outcome
      ? projectedChange(position.amount, rate, outcome)
      : null;

  const matured = position.clock.matured;

  return (
    <Link
      href={`/investment/${position.id}`}
      className="group flex flex-col gap-3 rounded-lg border border-border bg-surface-2 p-4 transition-colors hover:border-border-strong"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-1">
          <div className="flex flex-wrap items-center gap-2">
            {/* `plan.title` — the field the old dashboard had on every row and
                replaced with the literal string "Investment Plan". */}
            <span className="truncate text-sm font-semibold text-foreground">
              {position.planTitle ?? t("plan_no_longer_available")}
            </span>
            {term && (
              <span className="text-[11px] text-subtle-foreground">{term}</span>
            )}
          </div>

          <div className="flex items-baseline gap-2">
            <Money
              value={position.amount}
              currency={position.currency}
              size="lg"
            />
            <span className="text-[11px] uppercase tracking-wide text-subtle-foreground">
              {tCommon("principal")}
            </span>
          </div>
        </div>

        <div className="flex flex-col items-end gap-1.5">
          {/* Matured-but-unsettled is a real state and it is not "running": the
              term is up and the settlement cron has not reached this row yet.
              Saying "matured" while the status is still ACTIVE is the honest
              reading, and it stops the bar sitting at 100% under the word
              "running". */}
          <Badge tone={matured ? "warning" : "info"} appearance="soft">
            <Icon
              icon={matured ? "lucide:hourglass" : "lucide:activity"}
              className="mr-1 size-3"
              aria-hidden="true"
            />
            {matured ? t("awaiting_settlement") : tCommon("running")}
          </Badge>

          {projection !== null && (
            <span className="flex items-center gap-1">
              <span className="text-[11px] text-subtle-foreground">
                {t("at_maturity")}
              </span>
              <SignedMoney
                value={projection}
                currency={position.currency}
                size="sm"
              />
            </span>
          )}
        </div>
      </div>

      {/* The bar is drawn only when both ends of the term are known. A position
          with an unreadable start has a real countdown and no honest span, so
          it gets the reading and no bar. */}
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between gap-3 text-[11px]">
          <span className="text-subtle-foreground">
            {matured ? tCommon("term_complete") : tCommon("time_remaining")}
          </span>
          <span className="font-mono tabular-nums text-muted-foreground">
            {remaining(position.clock, now)}
          </span>
        </div>
        {position.clock.progress !== null && (
          <Progress
            value={position.clock.progress}
            className="h-1"
            indicatorClassName={matured ? "bg-warning" : undefined}
          />
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-subtle-foreground">
        <span>
          {position.clock.endDate
            ? t("matures_on", {
                date: position.clock.endDate.toLocaleDateString(),
              })
            : t("maturity_not_recorded")}
        </span>
        <span className="inline-flex items-center gap-1 text-muted-foreground transition-transform group-hover:translate-x-0.5">
          {rate != null && (
            <span className="font-mono tabular-nums">{formatRate(rate)}</span>
          )}
          <ArrowRight className="size-3.5" aria-hidden="true" />
        </span>
      </div>
    </Link>
  );
}
