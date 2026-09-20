"use client";

import { m } from "framer-motion";
import { Link } from "@/i18n/routing";
import {
  Trophy,
  TrendingUp,
  Users,
  DollarSign,
  ArrowRight,
  Star,
  Clock,
  Percent,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loadable } from "@/components/ui/skeleton";
import { useTranslations } from "next-intl";

interface TopPlan {
  id: string;
  name: string;
  title: string;
  description?: string;
  image?: string;
  currency: string;
  minProfit: number | string;
  maxProfit: number | string;
  minAmount: number | string;
  maxAmount: number | string;
  profitPercentage: number | string;
  invested?: number | string;
  totalInvested?: number | string;
  investorCount?: number;
  winRate?: number | string;
  durations?: { duration: number; timeframe: string }[];
  badge?: string;
}

interface TopPlanSpotlightSectionProps {
  plan: TopPlan | null;
  isLoading?: boolean;
}

function formatCurrency(num: number | string): string {
  const value = typeof num === 'string' ? parseFloat(num) : num;
  if (isNaN(value)) return '$0';
  // No `$`: this abbreviates cross-plan aggregates, and `forexPlan.currency` is
  // per-plan. See performance-history-section.tsx for the same finding.
  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `${(value / 1000).toFixed(0)}K`;
  return `${value.toFixed(0)}`;
}

function formatAmount(num: number | string): string {
  const value = typeof num === 'string' ? parseFloat(num) : num;
  if (isNaN(value)) return '0';
  // Format with up to 2 decimal places, removing trailing zeros
  return value.toLocaleString('en-US', { maximumFractionDigits: 2 });
}

function formatPercent(num: number | string): string {
  const value = typeof num === 'string' ? parseFloat(num) : num;
  if (isNaN(value)) return '0';
  // Format with up to 2 decimal places
  return value.toLocaleString('en-US', { maximumFractionDigits: 2 });
}

/**
 * One stat tile. The icon and the caption are HANDED to it — there was never a
 * moment when either was unknown — so only the figure inside takes a
 * placeholder.
 */
function SpotlightStat({
  icon: Icon,
  label,
  value,
  isPending,
  placeholder,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value?: string;
  isPending: boolean;
  placeholder: string;
}) {
  return (
    <div className="p-4 rounded-lg bg-primary/10 border border-primary/20">
      <div className="flex items-center gap-2 mb-2">
        <span className="grid h-7 w-7 shrink-0 place-items-center rounded-sm bg-primary/20 text-primary">
          <Icon className="h-3.5 w-3.5" />
        </span>
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
      </div>
      <p className="text-2xl font-semibold leading-tight tracking-tight font-mono tabular-nums text-primary">
        <Loadable loading={isPending} placeholder={placeholder}>
          {value}
        </Loadable>
      </p>
    </div>
  );
}

export default function TopPlanSpotlightSection({
  plan,
  isLoading,
}: TopPlanSpotlightSectionProps) {
  const t = useTranslations("ext_forex");
  const tCommon = useTranslations("common");
  const tExt = useTranslations("ext");

  /**
   * `loading` and `empty` are different states.
   *
   * The old shape was `isLoading ? <LoadingSpotlight/> : plan && <realCard/>`,
   * and the two trees agreed on nothing but their outer padding:
   * `rounded-3xl` against the card's `rounded-lg`, a translucent `card/80` with
   * a `dark:` fork against an opaque `bg-card`, four stacked grey bars against
   * a heading, a description, a FOUR-column stat grid, a range row and a
   * `py-6 text-lg` button, and an `h-48` rectangle against a `max-w-[280px]`
   * `aspect-square` dial. It measured ~350px against a real card of ~450.
   *
   * `isPending` drives one card now. The section still resolves to nothing when
   * there is genuinely no top plan, which is a decision about the page rather
   * than about loading — a "Highest ROI plan" heading over an empty panel is
   * not worth its own section.
   */
  const isPending = !!isLoading;
  if (!isPending && !plan) {
    return null;
  }

  return (
    <section className="py-24 relative overflow-hidden">
      <div className="container mx-auto relative z-10">
        {/* Section Header */}
        <m.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <Badge
            variant="outline"
            className="px-4 py-2 rounded-full mb-6 bg-primary/10 border-primary/20"
          >
            <Trophy className="w-4 h-4 text-primary mr-2" />
            <span className="text-sm font-medium text-primary">
              {tExt("top_performer") || tExt("top_performer")}
            </span>
          </Badge>
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            {t("highest_roi") || t("highest_roi")}{" "}
            <span className="text-primary">
              {tCommon("investment_plan") || tCommon("investment_plan")}
            </span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            {t("our_best_performing_plan") ||
              t("our_best_performing_plan_based_on")}
          </p>
        </m.div>

        {/*
          ONE CARD, BOTH STATES. Everything below that is not a figure from the
          response — the "#1 performing plan" ribbon, the four stat tiles with
          their icons and captions, the min/max row, the CTA, the three dashed
          rings and the dial's "Up to … Returns" copy — is chrome and renders
          identically either way. Only the eight values wait.
        */}
        <m.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="relative max-w-5xl mx-auto"
          aria-busy={isPending || undefined}
        >
          <div className="relative p-8 md:p-12 rounded-lg bg-card border border-primary/30 dark:border-primary/20">
            {/* Top Badge */}
            <div className="absolute -top-4 left-8">
              <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30">
                <Star className="w-4 h-4 fill-current" />
                <span className="text-sm font-bold">#1 {t("performing_plan")}</span>
              </div>
            </div>

            <div className="flex flex-col lg:flex-row gap-8 items-center pt-4">
              {/* Content */}
              <div className="flex-1">
                <h3 className="text-2xl md:text-3xl font-bold text-foreground mb-3">
                  <Loadable loading={isPending} placeholder={t("balanced_growth_plan")}>
                    {plan ? plan.title || plan.name : null}
                  </Loadable>
                </h3>
                {/*
                  The description IS reserved, and the first pass at this file
                  got it wrong for a plausible-sounding reason.

                  It is optional on the type, so the first version skipped it
                  during the fetch on the grounds that reserving a paragraph
                  that might not exist is the same defect in reverse. Measured,
                  that was the whole of what was left on `/en/forex`: one line
                  of `text-base` (24px) plus `mb-6` (24px) = 48px, and the
                  harness reported **+45.5px** on "Platform Performance" and
                  every section after it.

                  A plan that publishes no description at all is the rare case;
                  a plan that has one is the norm, so the pending state assumes
                  the norm. `plan && !plan.description` — resolved, and genuinely
                  blank — is the only branch that collapses, and it collapses by
                  48px rather than growing by it on every other install.
                */}
                {(isPending || plan?.description) && (
                  <p className="text-muted-foreground mb-6">
                    <Loadable
                      loading={isPending}
                      placeholder={t("what_this_plan_does_and_who_it_suits_in_a_sentence")}
                    >
                      {plan?.description}
                    </Loadable>
                  </p>
                )}

                {/*
                  Stats Grid — four tiles in both states.

                  The three optional tiles are gated on `isPending ||` as well
                  as on their own field, because this grid is `md:grid-cols-4`:
                  four tiles is one row and one tile is also one row, so the
                  count settles without moving anything. Reserving all four is
                  what the response almost always contains.
                */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                  <SpotlightStat
                    icon={Percent}
                    label="ROI"
                    isPending={isPending}
                    placeholder="00.0%"
                    value={plan ? `${formatPercent(plan.profitPercentage)}%` : undefined}
                  />

                  {(isPending || plan?.winRate !== undefined) && (
                    <SpotlightStat
                      icon={TrendingUp}
                      label={tCommon("win_rate")}
                      isPending={isPending}
                      placeholder="00.0%"
                      value={plan ? `${formatPercent(plan.winRate ?? 0)}%` : undefined}
                    />
                  )}

                  {(isPending || plan?.investorCount !== undefined) && (
                    <SpotlightStat
                      icon={Users}
                      label="Investors"
                      isPending={isPending}
                      placeholder="000"
                      value={plan ? `${plan.investorCount ?? 0}` : undefined}
                    />
                  )}

                  {(isPending ||
                    plan?.totalInvested !== undefined ||
                    plan?.invested !== undefined) && (
                    <SpotlightStat
                      icon={DollarSign}
                      label="Invested"
                      isPending={isPending}
                      placeholder="$000K"
                      value={
                        plan
                          ? formatCurrency(plan.totalInvested ?? plan.invested ?? 0)
                          : undefined
                      }
                    />
                  )}
                </div>

                {/* Investment Range & Durations. The "Min"/"Max" words and the
                    icon are literals; only the amounts wait. The durations
                    clause is genuinely optional on a real plan, so like the
                    description it is not reserved — but it sits on the SAME
                    flex line as the min/max row, so its arrival changes that
                    row's width, not the card's height. */}
                <div className="flex flex-wrap items-center gap-4 mb-6">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <DollarSign className="w-4 h-4" />
                    <span>
                      {tCommon("min")}{" "}
                      <strong>
                        <Loadable loading={isPending} placeholder="$0,000">
                          {/* The PLAN's own currency, which is in the payload
                              and was being replaced with a literal `$`. Unlike
                              the aggregates above, this figure has a knowable
                              unit — so it gets one rather than losing it. */}
                          {plan ? `${formatAmount(plan.minAmount)} ${plan.currency}` : null}
                        </Loadable>
                      </strong>
                    </span>
                    {(isPending || plan?.maxAmount) && (
                      <>
                        <span>-</span>
                        <span>
                          {tCommon("max")}{" "}
                          <strong>
                            <Loadable loading={isPending} placeholder="$00,000">
                              {plan ? `${formatAmount(plan.maxAmount)} ${plan.currency}` : null}
                            </Loadable>
                          </strong>
                        </span>
                      </>
                    )}
                  </div>
                  {/* No `!isPending` here — it would be redundant AND wrong to
                      write: `plan` is null for the whole pending window (the
                      page flips `plan` and `isLoading` together), so the
                      optional-chain already covers it. The scanner flagged the
                      belt-and-braces version as `hidden-while-loading` and it
                      was right to: a load-state token in a JSX gate is exactly
                      what it is looking for, and here there was nothing for it
                      to be doing. */}
                  {plan?.durations && plan.durations.length > 0 && (
                    <>
                      <div className="w-px h-4 bg-muted" />
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Clock className="w-4 h-4" />
                        <span>
                          {plan.durations.length} duration
                          {plan.durations.length > 1 ? "s" : ""} available
                        </span>
                      </div>
                    </>
                  )}
                </div>

                {/* CTA — the label is a literal and only the href needs the
                    plan, so the button renders for real and inert until there
                    is somewhere to send the reader. It is what holds the bottom
                    of this column open. */}
                {plan ? (
                  <Link href={`/forex/plan/${plan.id}`}>
                    <Button className="bg-primary text-primary-foreground rounded-xl px-8 py-6 text-lg font-semibold shadow-lg shadow-primary/25 group">
                      {tCommon("invest_now") || tCommon("invest_now")}
                      <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                    </Button>
                  </Link>
                ) : (
                  <Button
                    disabled
                    className="bg-primary text-primary-foreground rounded-xl px-8 py-6 text-lg font-semibold shadow-lg shadow-primary/25"
                  >
                    {tCommon("invest_now") || tCommon("invest_now")}
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                )}
              </div>

              {/* Visual Element. The dial is pure chrome — its box comes from
                  `aspect-square max-w-[280px]`, not from anything in the
                  response — so it spins in both states and only the percentage
                  in the middle waits. */}
              <div className="w-full lg:w-80 flex-shrink-0">
                <div className="relative aspect-square max-w-[280px] mx-auto">
                  {/* Animated rings */}
                  <m.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                    className="absolute inset-0 rounded-full border-2 border-dashed border-primary/30"
                  />
                  <m.div
                    animate={{ rotate: -360 }}
                    transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
                    className="absolute inset-4 rounded-full border-2 border-dashed border-primary/30"
                  />
                  <m.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
                    className="absolute inset-8 rounded-full border-2 border-dashed border-primary/30"
                  />

                  {/* Center content */}
                  <div className="absolute inset-12 rounded-full bg-primary flex flex-col items-center justify-center text-primary-foreground shadow-2xl shadow-primary/30">
                    <span className="text-sm font-medium opacity-80">{tCommon("up_to")}</span>
                    <span className="text-4xl font-semibold tracking-tight font-mono tabular-nums">
                      <Loadable loading={isPending} placeholder="00%">
                        {plan ? `${formatPercent(plan.maxProfit)}%` : null}
                      </Loadable>
                    </span>
                    <span className="text-sm font-medium opacity-80">Returns</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </m.div>
      </div>
    </section>
  );
}
