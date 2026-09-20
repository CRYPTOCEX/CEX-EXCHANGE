"use client";

/**
 * One plan, as a thing you can compare against the plan beside it.
 *
 * WHAT THE OLD CARD SAID THAT IT COULD NOT KNOW
 * ---------------------------------------------
 * It printed `profitPercentage` under the label "Expected return", in the
 * accent colour, as the headline figure. That label is a claim about direction,
 * and the direction is `defaultResult` — a field the plan endpoints did not
 * send. A plan an operator had configured to settle LOSS advertised its
 * deduction as an expected return, in the same ink as one that pays.
 *
 * The rate is still the headline, because it is still the number people
 * compare. What changed is that it now carries the rule beside it, and the rule
 * is a chip with a word and a glyph, not a colour — a LOSS plan has to be
 * legible in monochrome.
 *
 * `plan.image` is rendered here for the first time. All three endpoints the
 * frontend calls have selected it since the product shipped and no surface has
 * ever drawn it.
 */

import { ArrowRight, Flame } from "lucide-react";
import { Icon } from "@/components/ui/icon";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PlanImage } from "../../components/plan-image";
import { Money, formatRate } from "../../components/kit/money";
import { outcomeOf } from "../../components/kit/outcome";
import { useTermLabel } from "../../components/term-label";
import { useOutcomeChip } from "../../components/outcome-label";
import { termParts } from "../../components/kit/term";

export function PlanCard({
  plan,
  "data-tour": dataTour,
}: {
  plan: investmentPlanAttributes;
  /**
   * A guided-tour anchor, forwarded to the card.
   *
   * Threaded rather than hardcoded because this card renders on TWO pages —
   * the plan list and the overview's featured strip — and the resolver takes
   * the FIRST match in document order. A hardcoded anchor would fire on
   * whichever page happened to mount it, so the caller decides.
   */
  "data-tour"?: string;
}) {
  const t = useTranslations("investment");
  const tCommon = useTranslations("common");
  const termLabel = useTermLabel();
  const outcomeChip = useOutcomeChip();

  const outcome = outcomeOf(plan.defaultResult);
  const currency = plan.currency ?? null;

  const terms = (plan.durations ?? [])
    .map((duration) => termLabel(termParts(duration)))
    .filter(Boolean) as string[];

  return (
    <article
      data-tour={dataTour}
      className="group flex h-full flex-col overflow-hidden rounded-lg border border-border bg-surface-2 transition-colors hover:border-border-strong"
    >
      <div className="flex flex-1 flex-col gap-4 p-5">
        {/*
          A THUMBNAIL BESIDE THE TITLE, NOT A BANNER ABOVE IT — WHICH IS WHAT
          THE ADMIN ITSELF DOES WITH THIS EXACT FIELD.
          -------------------------------------------------------------------
          `plan.image` has NO declared aspect ratio anywhere. The upload path
          (`data-table/utils/image.ts`) hands sharp `resize({ fit: "inside" })`
          with a 1024x728 BOUND — a maximum, not a shape — so whatever the
          operator uploads keeps its own ratio. The files on a stock install
          prove how wide that spread is: 144x144 and 192x192 avatars, 728x728
          squares, and 1017x728 screenshots, all valid.

          A full-width header band cannot survive that. At `h-36` the square
          avatar sat marooned in the middle with two-thirds of the band empty,
          the screenshot letterboxed down to an illegible strip, and a plan
          whose file is missing contributed 144px of nothing — three cards in a
          row, three completely different weights.

          The admin's own compound cell answers the question: it renders this
          field at `w-30 h-18` (120x72), contained, bordered, BESIDE the title
          (`data-table/content/rows/cells/compound.tsx`). A small fixed tile is
          ratio-agnostic — every source shape reduces to the same footprint —
          and it costs 56px instead of 144px, so the facts people actually
          compare move up the card.
        */}
        <div className="flex items-start gap-3">
          {/* `tile`: twelve cards in three columns want ONE footprint, so a
              plan whose upload is missing keeps the tile and says so quietly
              rather than shifting its title left out of line with its
              neighbours'. */}
          <PlanImage
            src={plan.image}
            whenMissing="tile"
            className="size-14"
            sizes="56px"
          />

          <div className="flex min-w-0 flex-1 items-start justify-between gap-3">
            <h3 className="text-base font-semibold leading-tight text-foreground">
              {plan.title}
            </h3>
            {plan.trending && (
              <Badge tone="primary" appearance="soft" className="shrink-0">
                <Flame className="mr-1 size-3" aria-hidden="true" />
                {tCommon("trending")}
              </Badge>
            )}
          </div>
        </div>

        <p className="line-clamp-3 flex-1 text-xs leading-relaxed text-muted-foreground">
          {plan.description}
        </p>

        {/* THE RATE AND THE RULE, TOGETHER. Neither is meaningful alone. */}
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1.5">
          <span className="font-mono text-2xl font-semibold tabular-nums tracking-tight text-foreground">
            {formatRate(Number(plan.profitPercentage))}
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

        <dl className="flex flex-col gap-2 border-t border-border pt-4 text-xs">
          <div className="flex items-center justify-between gap-3">
            <dt className="text-muted-foreground">{tCommon("minimum")}</dt>
            <dd>
              <Money value={plan.minAmount} currency={currency} role="threshold" />
            </dd>
          </div>
          <div className="flex items-center justify-between gap-3">
            <dt className="text-muted-foreground">{tCommon("maximum")}</dt>
            <dd>
              <Money value={plan.maxAmount} currency={currency} role="threshold" />
            </dd>
          </div>
          <div className="flex items-start justify-between gap-3">
            <dt className="shrink-0 text-muted-foreground">{tCommon("terms")}</dt>
            <dd className="text-right text-[11px] text-foreground">
              {/* A plan with no durations cannot be invested in — the composer
                  has nothing to select and the backend requires a durationId.
                  Saying so here saves the trip. */}
              {terms.length > 0 ? terms.join(" · ") : t("no_terms_configured")}
            </dd>
          </div>
        </dl>

        <Button asChild className="w-full" size="sm">
          <Link href={`/investment/plan/${plan.id}`}>
            {t("view_plan")}
            <ArrowRight
              className="size-4 transition-transform group-hover:translate-x-0.5"
              aria-hidden="true"
            />
          </Link>
        </Button>
      </div>
    </article>
  );
}
