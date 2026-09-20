"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import type { BadgeTone } from "@/components/ui/badge";
import { StatusBadge } from "@/components/ui/status-badge";
import { statusTone } from "@/lib/status-tone";
import { Separator } from "@/components/ui/separator";
import {
  CheckCircle,
  XCircle,
  AlertCircle,
  Calendar,
  Info,
  ArrowLeft,
  TrendingUp,
  Clock,
  DollarSign,
  Sparkles,
  Target,
  BarChart3,
} from "lucide-react";
import {
  formatCurrency,
  formatDate,
  formatDuration,
  formatPercentage,
} from "@/utils/formatters";
import { calculateRemainingTime } from "@/utils/calculations";
import { useToast } from "@/hooks/use-toast";
import { Loadable, SkeletonText } from "@/components/ui/skeleton";
import { useParams } from "next/navigation";
import { $fetch } from "@/lib/api";
import { Link } from "@/i18n/routing";
import { m } from "framer-motion";
import { useTranslations } from "next-intl";

/** Ink for the result icon, which is an icon and not a pill. */
const TONE_INK: Record<BadgeTone, string> = {
  primary: "text-primary",
  secondary: "text-secondary-foreground",
  success: "text-success",
  warning: "text-warning",
  destructive: "text-destructive",
  info: "text-info",
  neutral: "text-muted-foreground",
};

/** The icon is the result's identity; only its colour comes from the tone. */
const RESULT_ICON = {
  WIN: CheckCircle,
  LOSS: XCircle,
  DRAW: AlertCircle,
} as const;

/**
 * The horizons the projection card lists.
 *
 * Hoisted out of the fetch handler because they are a CONSTANT of this screen —
 * every investment projects the same five windows — and the card can therefore
 * render its five rows, with their "7 Days" / "14 Days" labels, before any data
 * arrives. Only the two figures on the right of each row are unknown. Left
 * inside the effect, the whole card was empty until the request landed and then
 * grew by five 80px rows.
 */
const PROJECTION_DAYS = [7, 14, 30, 60, 90] as const;

export default function InvestmentDetailClient() {
  const t = useTranslations("ext_forex");
  const tCommon = useTranslations("common");
  const tExt = useTranslations("ext");
  const { id } = useParams() as {
    id: string;
  };
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [investment, setInvestment] =
    useState<forexInvestmentAttributes | null>(null);
  const [plan, setPlan] = useState<any>(null);
  const [duration, setDuration] = useState<any>(null);
  const [profitProjection, setProfitProjection] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Fetch investment data from API
  const fetchInvestment = async (investmentId: string) => {
    try {
      setIsLoading(true);
      setError(null);
      const { data, error: fetchError } = await $fetch({
        url: `/api/forex/investment/${investmentId}`,
        silentSuccess: true,
      });
      if (fetchError) {
        setError(fetchError);
        toast({
          title: tCommon("error"),
          description: t("failed_to_fetch_investment_details"),
          variant: "destructive",
        });
        return null;
      }
      if (!data) {
        setError(t("investment_not_found"));
        toast({
          title: tCommon("error"),
          description: t("investment_not_found"),
          variant: "destructive",
        });
        return null;
      }
      return data;
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : t("unknown_error_occurred");
      setError(errorMessage);
      toast({
        title: tCommon("error"),
        description: errorMessage,
        variant: "destructive",
      });
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  // Load investment data
  useEffect(() => {
    const fetchData = async () => {
      if (!id) {
        setError(t("invalid_investment_id"));
        setIsLoading(false);
        return;
      }

      const fetchedInvestment = await fetchInvestment(id);
      if (fetchedInvestment) {
        setInvestment(fetchedInvestment);

        const relatedPlan = fetchedInvestment.plan;
        const relatedDuration = fetchedInvestment.duration;
        setPlan(relatedPlan);
        setDuration(relatedDuration);

        // Generate profit projection
        const projections = PROJECTION_DAYS.map((days) => {
          const projectedProfit =
            (((fetchedInvestment.amount || 0) *
              (relatedPlan?.profitPercentage || 5)) /
              100) *
            (days / 30);
          return {
            days,
            profit: projectedProfit,
            total: (fetchedInvestment.amount || 0) + projectedProfit,
          };
        });
        setProfitProjection(projections);
      }
    };
    fetchData();
  }, [id, toast]);

  // Get status badge
  const getStatusBadge = (status?: string, pending = false) => {
    const icon =
      status === "ACTIVE" || status === "COMPLETED" ? (
        <CheckCircle className="h-3.5 w-3.5" />
      ) : status === "CANCELLED" || status === "REJECTED" ? (
        <XCircle className="h-3.5 w-3.5" />
      ) : null;

    /* `StatusBadge` already takes a nullable status (neutral tone) and a `label`
       override, so the pill is ONE element in both states — its padding, radius
       and text size come from the component either way, and only the word waits.
       No icon while pending: the tick is a claim that the investment is live. */
    return (
      <StatusBadge
        status={status}
        icon={pending ? null : icon}
        appearance="solid"
        label={pending ? <SkeletonText chars={8} /> : undefined}
      />
    );
  };

  // Get result icon
  const getResultIcon = (result?: string) => {
    const Icon = result
      ? RESULT_ICON[result as keyof typeof RESULT_ICON]
      : undefined;
    if (!Icon) return null;
    return <Icon className={`h-5 w-5 ${TONE_INK[statusTone(result)]}`} />;
  };

  // Calculate progress
  const calculateProgress = () => {
    if (!investment || !investment.endDate || !investment.createdAt) return 0;
    if (investment.status === "COMPLETED") return 100;
    const now = new Date().getTime();
    const start = new Date(investment.createdAt).getTime();
    const end = new Date(investment.endDate).getTime();
    if (now >= end) return 100;
    return Math.max(0, Math.min(100, ((now - start) / (end - start)) * 100));
  };

  // Calculate remaining time
  const getRemainingTime = () => {
    if (!investment || !investment.endDate)
      return {
        days: 0,
        hours: 0,
        minutes: 0,
        isExpired: true,
      };
    return calculateRemainingTime(
      typeof investment.endDate === "string"
        ? investment.endDate
        : (investment.endDate as any)?.toISOString?.() || ""
    );
  };

  // Handle error state
  if (error) {
    return (
      <div className="min-h-screen bg-linear-to-b from-background via-muted/10 to-background dark:via-surface-2/30">
        <main className="pt-24 pb-12">
          <div className="container mx-auto">
            <Card className="max-w-md mx-auto border border-destructive/20 dark:border-destructive/30 bg-card">
              <CardContent className="p-8 text-center">
                <div className="w-16 h-16 rounded-2xl bg-destructive/10 flex items-center justify-center mx-auto mb-4">
                  <AlertCircle className="h-8 w-8 text-destructive" />
                </div>
                <h2 className="text-xl font-bold text-foreground mb-2">
                  {t("error_loading_investment")}
                </h2>
                <p className="text-muted-foreground mb-6">{error}</p>
                <Button
                  onClick={() => window.location.reload()}
                  className={`rounded-xl bg-success text-success-foreground`}
                >
                  {tCommon("try_again")}
                </Button>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    );
  }

  /*
    `if (isLoading || !investment) return <InvestmentDetailLoading/>` — gone.

    That sibling file is a two-column tree of ~15 hand-sized blocks that has to
    track this 690-line page by hand, and does not: it has no projection card,
    no rejection notice, a different sidebar and `h-8`/`h-4` boxes standing in
    for `text-2xl leading-tight` figures (30px) and `text-sm` labels (20px).
    Every one of those is a guess, and the page reflowed by the sum of them.

    Now `isPending` reaches the values instead. Note what it did NOT do: the
    `error` branch above stays where it is, because a failed fetch is a
    different outcome from a slow one — but it is already correct, since `error`
    is null until a request actually fails. The status-driven branches below are
    the ones that needed thought; each is commented where it sits.
  */
  const isPending = isLoading || !investment;

  const progress = calculateProgress();
  const remainingTime = getRemainingTime();

  /*
    `investment.status === "ACTIVE"` is FALSE while `investment` is undefined,
    so the two ACTIVE-only sections — the progress/time/end-date row and the
    whole projection card — were absent during the fetch and appeared on
    arrival, adding roughly 80px and 560px respectively.

    They are reserved for ACTIVE because that is what a detail page is almost
    always opened on; a completed or cancelled investment loses them a moment
    later, which is a smaller and rarer movement than every visitor gaining
    them. The rejection notice is NOT reserved, for the mirror-image reason:
    it is the rare branch, and pre-rendering "this investment has been
    rejected" for everyone would be the page asserting something false.
  */
  const showsActiveSections = isPending || investment?.status === "ACTIVE";

  return (
    <div className="min-h-screen bg-linear-to-b from-background via-muted/10 to-background dark:via-surface-2/30">
      <main className="pt-24 pb-12">
        <div className="container mx-auto">
          {/* Header */}
          <m.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="mb-8"
          >
            <div className="flex flex-wrap items-center gap-4 mb-4">
              <Link href="/forex/dashboard">
                <Button
                  variant="outline"
                  size="icon"
                  className={`rounded-xl border-border hover:bg-success/5 dark:hover:bg-success/10 hover:border-success/30`}
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
              </Link>
              <div className="flex-1">
                <div className="flex flex-wrap items-center gap-3 mb-1">
                  <h1 className="text-2xl md:text-3xl font-bold text-foreground">
                    <Loadable loading={isPending} placeholder={tCommon("investment_plan")}>
                      {plan?.title || plan?.name}
                    </Loadable>
                  </h1>
                  {getStatusBadge(investment?.status, isPending)}
                </div>
                {/* `investment.id.substring(...)` was an unguarded read behind
                    the early return — without one it throws on the first render
                    of every visit. The whole line is one `Loadable` so the
                    subtitle keeps its single-line height either way. */}
                <p className="text-muted-foreground">
                  <Loadable
                    loading={isPending}
                    placeholder={t("investment_id_00000000_ellipsis_created_on_00_jan") + " 0000"}
                  >
                    {investment
                      ? `Investment ID: ${investment.id.substring(0, 8)}... • Created on ${formatDate(investment.createdAt || "")}`
                      : null}
                  </Loadable>
                </p>
              </div>
            </div>
          </m.div>

          {/* Investment Summary */}
          <div className="grid lg:grid-cols-3 gap-8">
            {/* Main Info */}
            <div className="lg:col-span-2 space-y-6">
              {/* Status Card */}
              <m.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 }}
              >
                <Card className="rounded-lg border border-border bg-card overflow-hidden">
                  <div
                    className={`h-1 bg-success`}
                  >
                    <div
                      className="h-full bg-card/30"
                      style={{
                        width: `${100 - progress}%`,
                        marginLeft: `${progress}%`,
                      }}
                    />
                  </div>
                  <CardContent className="p-6">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                      <div>
                        <h3 className="text-lg font-semibold text-foreground mb-1">
                          {tExt("investment_status")}
                        </h3>
                        {/* The final `: "Your investment is no longer active."`
                            is the fall-through of this chain, and an undefined
                            status lands on it — so without the early return
                            this sentence told every visitor their investment
                            was dead for as long as the fetch took. It says
                            nothing at all until there is a status to describe. */}
                        <p className="text-muted-foreground text-sm">
                          <Loadable
                            loading={isPending}
                            placeholder={t("your_investment_is_active_and_generating_profits")}
                          >
                            {investment?.status === "ACTIVE"
                              ? t("your_investment_is_active_and_generating_profits")
                              : investment?.status === "COMPLETED"
                                ? t("your_investment_has_been_completed_successfully")
                                : investment?.status === "REJECTED"
                                  ? t("this_investment_has_been_rejected")
                                  : investment?.status === "CANCELLED"
                                    ? t("this_investment_has_been_cancelled")
                                    : t("your_investment_is_no_longer_active")}
                          </Loadable>
                        </p>
                      </div>

                      <div className="flex items-center space-x-2">
                        {investment?.result && getResultIcon(investment.result)}
                        <span className="font-medium text-foreground">
                          <Loadable loading={isPending} placeholder={tCommon("in_progress")}>
                            {investment?.status === "REJECTED"
                              ? tCommon("rejected")
                              : investment?.status === "CANCELLED"
                                ? tCommon("cancelled")
                                : investment?.status === "COMPLETED"
                                  ? tCommon("completed")
                                  : investment?.result || tCommon("in_progress")}
                          </Loadable>
                        </span>
                      </div>
                    </div>

                    {showsActiveSections && (
                      <div className="mt-6 pt-6 border-t border-border">
                        <div className="grid sm:grid-cols-3 gap-6">
                          <div>
                            <p className="text-xs font-medium text-muted-foreground mb-2">
                              Progress
                            </p>
                            <div className="flex items-center gap-3">
                              {/* The bar keeps its 8px track in both states —
                                  it is a fixed-height element, so only its FILL
                                  is unknown, and `calculateProgress()` returns
                                  0 with no investment. A 0% bar is a claim that
                                  the term has not started. */}
                              <Progress
                                value={isPending ? 0 : progress}
                                className={`h-2 flex-1 **:[[role=progressbar]]:bg-success`}
                              />
                              <span
                                className={`text-sm font-semibold font-mono tabular-nums text-success`}
                              >
                                <Loadable loading={isPending} placeholder="00%">
                                  {investment ? `${Math.round(progress)}%` : null}
                                </Loadable>
                              </span>
                            </div>
                          </div>

                          <div>
                            <p className="text-xs font-medium text-muted-foreground mb-2">
                              {tCommon("time_remaining")}
                            </p>
                            {/* `getRemainingTime()` returns `isExpired: true`
                                when there is no investment, so this printed
                                "Completing soon..." to everyone mid-fetch. */}
                            <p className="font-semibold text-foreground">
                              <Loadable loading={isPending} placeholder="00d 00h 00m">
                                {investment
                                  ? remainingTime.isExpired
                                    ? `${t("completing_soon")}…`
                                    : `${remainingTime.days}d ${remainingTime.hours}h ${remainingTime.minutes}m`
                                  : null}
                              </Loadable>
                            </p>
                          </div>

                          <div>
                            <p className="text-xs font-medium text-muted-foreground mb-2">
                              {tCommon("end_date")}
                            </p>
                            <p className="font-semibold text-foreground">
                              <Loadable loading={isPending} placeholder="00 Jan 0000">
                                {investment ? formatDate(investment.endDate || "") : null}
                              </Loadable>
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </m.div>

              {/* Details Card */}
              <m.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
              >
                <Card className="rounded-lg border border-border bg-card">
                  <CardHeader>
                    <CardTitle className="flex items-center text-foreground">
                      <span className="grid h-7 w-7 shrink-0 place-items-center rounded-sm bg-success/15 text-success mr-3">
                        <BarChart3 className="h-3.5 w-3.5" />
                      </span>
                      {tCommon("investment_details")}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-6">
                    <div className="grid sm:grid-cols-3 gap-6">
                      <div className="rounded-lg border border-border bg-card p-4">
                        <p className="text-xs font-medium text-muted-foreground mb-1">
                          {tCommon("investment_amount")}
                        </p>
                        {/* Money. `|| 0` renders a confident "$0.00" for an
                            investment that is merely late, which on an amount,
                            a profit and a total return is the most misleading
                            thing this page could say. */}
                        <p className="text-2xl font-semibold leading-tight tracking-tight font-mono tabular-nums text-foreground">
                          <Loadable loading={isPending} placeholder="$0,000.00">
                            {investment ? formatCurrency(investment.amount || 0) : null}
                          </Loadable>
                        </p>
                      </div>

                      <div className="rounded-lg border border-border bg-card p-4">
                        <p className="text-xs font-medium text-muted-foreground mb-1">
                          Profit
                        </p>
                        <p className="text-2xl font-semibold leading-tight tracking-tight font-mono tabular-nums text-success">
                          <Loadable loading={isPending} placeholder="$000.00">
                            {investment ? formatCurrency(investment.profit || 0) : null}
                          </Loadable>
                        </p>
                      </div>

                      <div className="rounded-lg border border-border bg-card p-4">
                        <p className="text-xs font-medium text-muted-foreground mb-1">
                          {tCommon("total_return")}
                        </p>
                        <p className="text-2xl font-semibold leading-tight tracking-tight font-mono tabular-nums text-foreground">
                          <Loadable loading={isPending} placeholder="$0,000.00">
                            {investment
                              ? formatCurrency(
                                  (investment.amount || 0) + (investment.profit || 0)
                                )
                              : null}
                          </Loadable>
                        </p>
                      </div>
                    </div>

                    <Separator className="my-6" />

                    <div className="grid sm:grid-cols-3 gap-6">
                      <div>
                        <p className="text-sm text-subtle-foreground mb-1">
                          {tCommon("profit_rate")}
                        </p>
                        {/* "N/A" is the answer for a plan with no rate — not
                            for a plan that has not arrived. Three of these
                            tiles fell through to it during every fetch. */}
                        <p className="font-semibold text-foreground">
                          <Loadable loading={isPending} placeholder="00.0%">
                            {plan?.profitPercentage
                              ? formatPercentage(plan.profitPercentage)
                              : "N/A"}
                          </Loadable>
                        </p>
                      </div>

                      <div>
                        <p className="text-sm text-subtle-foreground mb-1">
                          Duration
                        </p>
                        <p className="font-semibold text-foreground">
                          <Loadable loading={isPending} placeholder="30 days">
                            {duration
                              ? formatDuration(duration.duration, duration.timeframe)
                              : "N/A"}
                          </Loadable>
                        </p>
                      </div>

                      <div>
                        <p className="text-sm text-subtle-foreground mb-1">
                          Currency
                        </p>
                        <p className="font-semibold text-foreground">
                          <Loadable loading={isPending} placeholder="USD">
                            {plan?.currency || "USD"}
                          </Loadable>
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </m.div>

              {/* Profit Projection - Only show for ACTIVE investments */}
              {showsActiveSections && (
                <m.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.3 }}
                >
                  <Card className="rounded-lg border border-border bg-card">
                    <CardHeader>
                      <CardTitle className="flex items-center text-foreground">
                        <span className="grid h-7 w-7 shrink-0 place-items-center rounded-sm bg-success/15 text-success mr-3">
                          <TrendingUp className="h-3.5 w-3.5" />
                        </span>
                        {t("profit_projection")}
                      </CardTitle>
                      <CardDescription>
                        {t("estimated_profits_based_on_the_current_profit_rate")}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="p-6">
                      {/*
                        Driven by `PROJECTION_DAYS`, not by `profitProjection`.

                        The horizons are a constant of this screen, so all five
                        rows — their 48px icon tiles, their "7 Days" headings and
                        their "Projected return" captions — render on the first
                        paint at full height. `profitProjection` is `[]` until
                        the fetch resolves, so keying the list on it meant the
                        card rendered as a header over nothing and then grew by
                        five 80px rows plus four `space-y-4` gaps: ~448px, the
                        largest single movement on the page.
                      */}
                      <div className="space-y-4">
                        {PROJECTION_DAYS.map((days, index) => {
                          const projection = profitProjection[index];
                          return (
                            <div
                              key={days}
                              className="flex items-center justify-between p-4 rounded-xl bg-muted border border-border"
                            >
                              <div className="flex items-center">
                                <div
                                  className={`w-12 h-12 rounded-xl bg-success/10 flex items-center justify-center mr-4`}
                                >
                                  <Calendar
                                    className={`h-6 w-6 text-success`}
                                  />
                                </div>
                                <div>
                                  <p className="font-semibold text-foreground">
                                    {days} Days
                                  </p>
                                  <p className="text-sm text-subtle-foreground">
                                    {t("projected_return")}
                                  </p>
                                </div>
                              </div>

                              <div className="text-right">
                                <p
                                  className={`font-bold text-success`}
                                >
                                  <Loadable
                                    loading={!projection}
                                    placeholder="+$000.00"
                                  >
                                    {projection
                                      ? `+${formatCurrency(projection.profit)}`
                                      : null}
                                  </Loadable>
                                </p>
                                <p className="text-sm text-subtle-foreground">
                                  {tCommon("total")}:{" "}
                                  <Loadable
                                    loading={!projection}
                                    placeholder="$0,000.00"
                                  >
                                    {projection
                                      ? formatCurrency(projection.total)
                                      : null}
                                  </Loadable>
                                </p>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      <div
                        className={`mt-6 p-4 rounded-xl bg-success/5 dark:bg-success/10 border border-success/20 dark:border-success/20`}
                      >
                        <div className="flex items-start">
                          <Info
                            className={`h-5 w-5 text-success mr-3 mt-0.5 shrink-0`}
                          />
                          <p
                            className={`text-sm text-success`}
                          >
                            {t("projections_are_estimates_based_on_the")}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </m.div>
              )}

              {/* Rejection/Cancellation Notice. Deliberately NOT reserved —
                  see `showsActiveSections`: this is the rare branch, and a
                  placeholder version of it would tell every visitor their
                  investment had been rejected while the request was in flight. */}
              {(investment?.status === "REJECTED" ||
                investment?.status === "CANCELLED") && (
                <m.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.3 }}
                >
                  <Card className="border-2 border-destructive/20 dark:border-destructive/30 bg-card">
                    <CardHeader>
                      <CardTitle className="flex items-center text-destructive">
                        <span className="grid h-7 w-7 shrink-0 place-items-center rounded-sm bg-destructive/15 text-destructive mr-3">
                          <AlertCircle className="h-3.5 w-3.5" />
                        </span>
                        Investment{" "}
                        {investment?.status === "REJECTED"
                          ? tExt("rejection")
                          : tExt("cancellation")}{" "}
                        Notice
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-6">
                      <div className="flex items-start space-x-3">
                        <AlertCircle className="h-6 w-6 text-destructive shrink-0 mt-1" />
                        <div>
                          <p className="text-foreground mb-2">
                            {investment?.status === "REJECTED"
                              ? t("this_investment_has_been_rejected_and")
                              : t("this_investment_has_been_cancelled_and")}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {investment?.status === "REJECTED"
                              ? t("your_investment_amount_will_be_refunded")
                              : t("your_investment_amount_has_been_refunded")}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </m.div>
              )}
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Plan Image */}
              <m.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
              >
                <Card className="rounded-lg border border-border bg-card overflow-hidden">
                  <div className="h-48 relative">
                    <Image
                      src={plan?.image || "/img/placeholder.svg"}
                      alt={plan?.title || plan?.name || tCommon("investment_plan")}
                      fill
                      className="object-cover"
                    />
                    <div className="absolute inset-0 bg-linear-to-t from-overlay/80 via-overlay/40 to-transparent" />
                    <div className="absolute bottom-4 left-4 right-4">
                      <h3 className="text-primary-foreground text-xl font-bold">
                        <Loadable loading={isPending} placeholder={tCommon("investment_plan")}>
                          {plan?.title || plan?.name || tCommon("investment_plan")}
                        </Loadable>
                      </h3>
                      <p className="text-primary-foreground/80 text-sm">
                        <Loadable loading={isPending} placeholder="00.0% profit">
                          {plan?.profitPercentage
                            ? `${formatPercentage(plan.profitPercentage)} profit`
                            : tCommon("investment_plan")}
                        </Loadable>
                      </p>
                    </div>
                  </div>
                </Card>
              </m.div>

              {/* Quick Stats */}
              <m.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.3 }}
              >
                <Card className="rounded-lg border border-border bg-card">
                  <CardHeader>
                    <CardTitle className="flex items-center text-foreground text-base">
                      <span className="grid h-7 w-7 shrink-0 place-items-center rounded-sm bg-success/15 text-success mr-3">
                        <Target className="h-3.5 w-3.5" />
                      </span>
                      {tCommon("quick_stats")}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex justify-between">
                      <span className="text-subtle-foreground">
                        Plan
                      </span>
                      <span className="font-medium text-foreground">
                        <Loadable loading={isPending} placeholder={tCommon("investment_plan")}>
                          {plan?.title || plan?.name}
                        </Loadable>
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-subtle-foreground">
                        Status
                      </span>
                      {getStatusBadge(investment?.status, isPending)}
                    </div>
                    <div className="flex justify-between">
                      <span className="text-subtle-foreground">
                        ROI
                      </span>
                      <span
                        className={`font-medium text-success`}
                      >
                        {/* "0%" was the fall-through for a missing amount, so
                            every visitor was told their return was zero until
                            the request landed. */}
                        <Loadable loading={isPending} placeholder="00.0%">
                          {investment?.amount
                            ? formatPercentage(
                                ((investment.profit || 0) / investment.amount) *
                                  100
                              )
                            : "0%"}
                        </Loadable>
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </m.div>

              {/* Actions */}
              <m.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.4 }}
              >
                <Link href="/forex/plan">
                  <Button
                    className={`w-full rounded-xl bg-success bg-size-[200%_100%] hover:bg-position-[100%_0] text-success-foreground font-semibold transition-all duration-300`}
                  >
                    <Sparkles className="h-4 w-4 mr-2" />
                    {tCommon("new_investment")}
                  </Button>
                </Link>
              </m.div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
