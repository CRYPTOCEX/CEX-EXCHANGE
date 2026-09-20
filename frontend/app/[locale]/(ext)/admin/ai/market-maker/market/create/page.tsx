"use client";

/**
 * WHO — the operator standing up a new synthetic market.
 * WHAT — decides which ecosystem pair gets one, where its price should sit, and
 *       how much of its order flow is real.
 * CLICK — Create, which writes the market maker and opens its record page.
 *
 * ---------------------------------------------------------------------------
 * WHAT CHANGED
 *
 *  - **The picker was reading a 10-row page.** Both fetches went out without a
 *    `perPage`, and `getFiltered` defaults to **10** — so an install with more
 *    than ten ecosystem markets could not create a market maker for the
 *    eleventh, and the "already has one" set was built from the first ten AI
 *    market makers too, which means an already-taken pair could look selectable
 *    and then fail on submit. Both now ask for the whole list and SAY SO when
 *    there is more.
 *  - **A failed create said nothing.** `$fetch` resolves `{data, error}` and
 *    never throws, so the `catch` was dead and the `if (response.data?.id)`
 *    branch simply did not fire: the spinner stopped and the page sat there.
 *  - **Aggression was a 1-to-10 slider** feeding a three-value enum through a
 *    bucketing function — seven of its ten positions were indistinguishable in
 *    the database. It is the three-way choice the column actually is, which is
 *    also what the market's Configuration tab now shows.
 *  - The frame, the four-step progress rail and the Previous/Next buttons were
 *    hand-built. `PageShell` + `components/ui/stepper` own all three, so this
 *    wizard now matches the ecosystem and futures wizards it sits beside.
 *  - Four `w-16 h-16 rounded-2xl` icon plates and four `text-2xl font-bold`
 *    headings — one per step — are gone: the Stepper's own rail already names
 *    the step, so they were the title said twice, 130px apart.
 */

import React, { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import {
  AlertTriangle,
  ArrowLeft,
  Bot,
  ChartLine,
  Check,
  Coins,
  DollarSign,
  Info,
  Rocket,
  Sliders,
} from "lucide-react";

import { $fetch } from "@/lib/api";
import { cn } from "@/lib/utils";
import { Link, useRouter } from "@/i18n/routing";
import { PageHeader, PageShell } from "@/components/layout/page-shell";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Loadable } from "@/components/ui/skeleton";
import Stepper from "@/components/ui/stepper";

interface EcosystemMarket {
  id: string;
  currency: string;
  pair: string;
  status: boolean;
  metadata?: { price?: number };
}

interface AiMarketMaker {
  id: string;
  marketId: string;
  marketType?: Venue;
  status: string;
}

/**
 * The two venues a maker can run on.
 *
 * The picker, the "already has a maker" check and the POST body all have to
 * agree on this, and a market id is only unique WITHIN its venue — the same
 * UUID space is used by two different tables — so nothing here may be keyed on
 * the id alone.
 */
type Venue = "ECO" | "FUTURES";

const VENUES: { id: Venue; endpoint: string }[] = [
  { id: "ECO", endpoint: "/api/admin/ecosystem/market" },
  { id: "FUTURES", endpoint: "/api/admin/futures/market" },
];

type Step = 1 | 2 | 3 | 4;

/**
 * How many rows to ask for.
 *
 * `getFiltered` pages at 10 by default, and a picker that silently shows the
 * first page is a market an operator cannot create. 500 is not a guess about
 * scale — it is "more than any install has", and the count that comes back is
 * checked against the total so a truncated list announces itself instead of
 * quietly dropping options.
 */
const PICKER_LIMIT = 500;

const AGGRESSION = ["CONSERVATIVE", "MODERATE", "AGGRESSIVE"] as const;
type Aggression = (typeof AGGRESSION)[number];

export default function CreateAiMarketPage() {
  const t = useTranslations("ext_admin");
  const tMm = useTranslations("ext_admin_ai_market-maker");
  const tCommon = useTranslations("common");
  const tExt = useTranslations("ext");
  const router = useRouter();

  const [currentStep, setCurrentStep] = useState<Step>(1);
  const [submitting, setSubmitting] = useState(false);
  const [loadingMarkets, setLoadingMarkets] = useState(true);
  const [ecosystemMarkets, setEcosystemMarkets] = useState<EcosystemMarket[]>([]);
  const [truncated, setTruncated] = useState(0);
  const [existingMarketMakerIds, setExistingMarketMakerIds] = useState<Set<string>>(
    new Set()
  );

  const [venue, setVenue] = useState<Venue>("ECO");
  /*
   * Which venues this install actually has.
   *
   * A futures market request answers 403 without the extension, so the tab is
   * hidden rather than offered and then refused. Starts as ECO-only and grows
   * once the futures list comes back — never the other way round, so the tab
   * cannot flicker in and out while the page loads.
   */
  const [availableVenues, setAvailableVenues] = useState<Venue[]>(["ECO"]);

  const [formData, setFormData] = useState({
    ecosystemMarketId: "",
    /** FUTURES only. Ignored by the endpoint on an ECO market. */
    futuresLeverage: "1",
    targetPrice: "",
    /** ±% from the target price. The endpoint takes absolute bounds. */
    priceRangePercent: "10",
    aggressionLevel: "MODERATE" as Aggression,
    realLiquidityPercent: "50",
    maxDailyVolume: "100000",
  });

  const [selectedMarket, setSelectedMarket] = useState<EcosystemMarket | null>(null);

  /*
    "No markets available — create an ecosystem market first" sends the admin off
    this page entirely, so flashing it while the list is still arriving routes
    people away from a screen that was about to work.
  */
  const showNoMarkets = !loadingMarkets && ecosystemMarkets.length === 0;

  /*
    The stand-in cards. Three because the grid is `lg:grid-cols-3` — one whole
    row at the width this wizard is used at, with no orphan to re-rag. `null` IS
    the pending card; the same renderer paints both.
  */
  const marketCards: (EcosystemMarket | null)[] = loadingMarkets
    ? [null, null, null]
    : ecosystemMarkets;

  const fetchData = useCallback(async () => {
    setLoadingMarkets(true);

    const endpoint =
      VENUES.find((v) => v.id === venue)?.endpoint ?? VENUES[0].endpoint;

    const [markets, aiMarkets] = await Promise.all([
      $fetch({ url: `${endpoint}?perPage=${PICKER_LIMIT}`, silent: true }),
      $fetch({
        url: `/api/admin/ai/market-maker/market?perPage=${PICKER_LIMIT}`,
        silent: true,
      }),
    ]);

    const marketItems: EcosystemMarket[] =
      (markets.data as any)?.items ?? (markets.data as any)?.data ?? [];
    setEcosystemMarkets(marketItems);

    /*
     * The FUTURES tab is offered only once that endpoint has answered.
     *
     * Without the extension it answers 403, and a tab that is refused the
     * moment it is pressed is worse than one that is absent: the operator
     * cannot tell whether they lack the addon or the permission. Widened only
     * — a later empty response does not take the tab away, because an install
     * with the extension and no markets yet still needs it.
     */
    if (venue === "FUTURES" && !markets.error) {
      setAvailableVenues((prev) =>
        prev.includes("FUTURES") ? prev : [...prev, "FUTURES"]
      );
    }

    // If the server holds more than we asked for, say how many are missing
    // rather than presenting a short list as the whole set.
    const total = Number((markets.data as any)?.pagination?.totalItems ?? 0);
    setTruncated(total > marketItems.length ? total - marketItems.length : 0);

    const existing: AiMarketMaker[] =
      (aiMarkets.data as any)?.items ??
      (aiMarkets.data as any)?.data ??
      (Array.isArray(aiMarkets.data) ? (aiMarkets.data as any) : []);
    /*
     * SCOPED TO THE VENUE ON SCREEN.
     *
     * A market id names a row in ecosystem_market OR futures_market, and the
     * two tables share a UUID space. A set keyed on the id alone would grey out
     * a futures market because an unrelated ecosystem market has a maker — and
     * far worse, would let a futures market through that already has one, so
     * the create fails at the server with "already exists" against a card that
     * showed as free.
     */
    setExistingMarketMakerIds(
      new Set(
        existing
          .filter((m) => (m.marketType ?? "ECO") === venue)
          .map((m) => m.marketId)
      )
    );

    setLoadingMarkets(false);
  }, [venue]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  /*
   * Probe FUTURES once on mount so the tab can appear without the operator
   * having to guess it exists. `perPage=1` because only the STATUS CODE is
   * being asked for.
   */
  useEffect(() => {
    let cancelled = false;
    $fetch({ url: "/api/admin/futures/market?perPage=1", silent: true }).then(
      (result) => {
        if (cancelled || result.error) return;
        setAvailableVenues((prev) =>
          prev.includes("FUTURES") ? prev : [...prev, "FUTURES"]
        );
      }
    );
    return () => {
      cancelled = true;
    };
  }, []);

  const handleMarketSelect = (market: EcosystemMarket) => {
    if (existingMarketMakerIds.has(market.id)) return;
    setSelectedMarket(market);
    setFormData((prev) => ({
      ...prev,
      ecosystemMarketId: market.id,
      targetPrice: market.metadata?.price?.toString() || "",
    }));
  };

  const set = (field: keyof typeof formData, value: string) =>
    setFormData((prev) => ({ ...prev, [field]: value }));

  const validateStep = (step: Step): boolean => {
    switch (step) {
      case 1:
        return !!formData.ecosystemMarketId;
      case 2:
        return (
          !!formData.targetPrice &&
          Number(formData.targetPrice) > 0 &&
          Number(formData.priceRangePercent) > 0 &&
          Number(formData.priceRangePercent) <= 50
        );
      case 3: {
        // Checked here as well as at the endpoint, because the wizard hides the
        // reason: pressing Next with a leverage of 0 would submit at step 4 and
        // fail there, three screens from the field that was wrong.
        const leverageOk =
          venue !== "FUTURES" ||
          (Number(formData.futuresLeverage) >= 1 &&
            Number(formData.futuresLeverage) <= 125);
        return (
          leverageOk &&
          Number(formData.realLiquidityPercent) >= 0 &&
          Number(formData.realLiquidityPercent) <= 100 &&
          Number(formData.maxDailyVolume) >= 0
        );
      }
      default:
        return true;
    }
  };

  const handleNext = () => {
    if (!validateStep(currentStep)) {
      toast.error(t("please_fill_in_all_required_fields_correctly"));
      return;
    }
    setCurrentStep((prev) => (prev < 4 ? ((prev + 1) as Step) : prev));
  };

  const handlePrev = () =>
    setCurrentStep((prev) => (prev > 1 ? ((prev - 1) as Step) : prev));

  const handleSubmit = async () => {
    setSubmitting(true);
    const targetPrice = Number(formData.targetPrice);
    const rangePercent = Number(formData.priceRangePercent) / 100;

    const { data, error } = await $fetch({
      url: "/api/admin/ai/market-maker/market",
      method: "POST",
      body: {
        marketId: formData.ecosystemMarketId,
        marketType: venue,
        ...(venue === "FUTURES" && {
          futuresLeverage: Number(formData.futuresLeverage),
        }),
        targetPrice,
        priceRangeLow: targetPrice * (1 - rangePercent),
        priceRangeHigh: targetPrice * (1 + rangePercent),
        aggressionLevel: formData.aggressionLevel,
        realLiquidityPercent: Number(formData.realLiquidityPercent),
        maxDailyVolume: Number(formData.maxDailyVolume),
      },
      silent: true,
    });
    setSubmitting(false);

    // The 400 body names the precondition that failed — a duplicate market, a
    // range that does not contain the target. Truncating it loses the only
    // actionable part, and reporting nothing at all is what this did before.
    if (error) {
      toast.error(
        typeof error === "string" ? error : t("failed_to_create_market_maker")
      );
      return;
    }
    toast.success(t("ai_market_maker_created_successfully"));
    const id = (data as any)?.id;
    router.push(
      id ? `/admin/ai/market-maker/market/${id}` : "/admin/ai/market-maker/market"
    );
  };

  const rangeLow =
    Number(formData.targetPrice) * (1 - Number(formData.priceRangePercent) / 100);
  const rangeHigh =
    Number(formData.targetPrice) * (1 + Number(formData.priceRangePercent) / 100);

  const aggressionLabel = (level: Aggression) =>
    level === "CONSERVATIVE"
      ? t("conservative")
      : level === "MODERATE"
        ? tCommon("moderate")
        : t("aggressive");

  const stepLabels = [
    { label: tCommon("select_market"), description: tMm("choose_trading_pair") },
    { label: t("price_settings"), description: tMm("set_target_price") },
    { label: t("trading_configuration"), description: tMm("configure_behaviour") },
    { label: t("review"), description: tMm("confirm_and_create") },
  ];

  const masthead = (
    <div className="border-b border-border bg-card">
      <div className="mx-auto w-full px-4 container pt-header-clear pb-8">
        <div className="divide-y divide-border">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 pb-3 font-mono text-[11px] uppercase tracking-wider text-subtle-foreground">
            <Link
              href="/admin/ai/market-maker/market"
              className="flex items-center gap-1.5 rounded-sm text-muted-foreground outline-hidden transition-colors hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50"
            >
              <ArrowLeft className="h-3 w-3" />
              {tCommon("back_to_markets")}
            </Link>
            <span aria-hidden className="h-3 w-px shrink-0 bg-border" />
            <span>
              {tCommon("step")} {currentStep} / 4
            </span>
          </div>
          <PageHeader
            className="py-5"
            title={t("create_ai_market_maker")}
            description={t("set_up_a_new_ai_powered_market_maker")}
          />
        </div>
      </div>
    </div>
  );

  return (
    <PageShell ground="subtle" width="default" rhythm="lg" header={masthead}>
      <Stepper
        currentStep={currentStep}
        totalSteps={4}
        stepLabels={stepLabels}
        onNext={handleNext}
        onPrev={handlePrev}
        onSubmit={handleSubmit}
        isSubmitting={submitting}
        disableNext={!validateStep(currentStep)}
        showStepDescription
      >
        {/* STEP 1 — MARKET -------------------------------------------------- */}
        {currentStep === 1 ? (
          <div className="space-y-4">
            {/*
              THE VENUE COMES BEFORE THE MARKET, BECAUSE IT DECIDES WHICH
              MARKETS EXIST.

              Rendered only when there is a choice to make. On an install
              without the Futures extension there is exactly one venue, and a
              single-option toggle is a control that teaches an operator
              nothing while asking them to press it.
            */}
            {availableVenues.length > 1 ? (
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">
                  {t("venue")}
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {availableVenues.map((option) => {
                    const active = venue === option;
                    return (
                      <button
                        key={option}
                        type="button"
                        aria-pressed={active}
                        onClick={() => {
                          if (active) return;
                          setVenue(option);
                          // The selection belongs to the OLD venue's table and
                          // means nothing in the new one. Cleared rather than
                          // carried, or step 1 validates against a market that
                          // is no longer on screen.
                          setSelectedMarket(null);
                          setFormData((prev) => ({
                            ...prev,
                            ecosystemMarketId: "",
                            targetPrice: "",
                          }));
                        }}
                        className={cn(
                          "rounded-md border px-3 py-2.5 text-sm font-medium outline-hidden transition-colors focus-visible:ring-[3px] focus-visible:ring-ring/50",
                          active
                            ? "border-primary bg-primary/10 text-foreground"
                            : "border-border text-muted-foreground hover:border-border-strong hover:bg-muted"
                        )}
                      >
                        {option === "FUTURES" ? tMm("venue_futures") : tMm("venue_eco")}
                      </button>
                    );
                  })}
                </div>
                <p className="text-xs text-muted-foreground">
                  {venue === "FUTURES"
                    ? tMm("venue_futures_hint")
                    : tMm("venue_eco_hint")}
                </p>
              </div>
            ) : null}

            {truncated > 0 ? (
              <Alert tone="warning">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>{tMm("market_list_truncated")}</AlertTitle>
                <AlertDescription>
                  {tMm("market_list_truncated_detail", { count: truncated })}
                </AlertDescription>
              </Alert>
            ) : null}

            {showNoMarkets ? (
              <Card>
                <CardContent
                  padding="md"
                  className="flex flex-col items-center justify-center gap-3 py-12 text-center"
                >
                  <span className="grid h-12 w-12 place-items-center rounded-full bg-surface-3 text-muted-foreground">
                    <Coins className="h-6 w-6" />
                  </span>
                  <p className="text-base font-semibold text-foreground">
                    {tExt("no_markets_available")}
                  </p>
                  <p className="max-w-md text-sm text-muted-foreground">
                    {t("create_an_ecosystem_market_first_to")}
                  </p>
                  <Button
                    variant="outline"
                    className="mt-2"
                    onClick={() => router.push("/admin/ecosystem/market")}
                  >
                    {t("go_to_ecosystem_markets")}
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                {marketCards.map((market, i) => {
                  const pending = !market;
                  /* `taken` decides the card's tint, its icon and a whole extra
                     footer row. `existingMarketMakerIds` is a Set, so an absent
                     id reads `false` — a confident "this market is free" about a
                     market nobody has read yet — which is why it is gated on
                     `!pending`. */
                  const taken = !pending && existingMarketMakerIds.has(market.id);
                  const selected =
                    !pending && formData.ecosystemMarketId === market.id;
                  /* Reserved while pending: this footer is a bordered ~53px
                     block and most ecosystem markets carry a price, so holding
                     the common shape moves fewer cards than withholding it. */
                  const showPriceFooter =
                    pending || (!!market.metadata?.price && !taken);

                  return (
                    <Card
                      key={market?.id ?? `pending-${i}`}
                      interactive={!pending && !taken}
                      onClick={() => market && handleMarketSelect(market)}
                      className={cn(
                        "overflow-hidden",
                        taken && "opacity-60",
                        selected && "border-primary ring-1 ring-primary/30"
                      )}
                    >
                      {/* `pt-4`: no `CardHeader` above, and `CardContent` drops
                          its own top padding by contract. */}
                      <CardContent padding="md" className="pt-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex min-w-0 items-center gap-3">
                            <span
                              className={cn(
                                "grid h-10 w-10 shrink-0 place-items-center rounded-sm",
                                selected
                                  ? "bg-primary text-primary-foreground"
                                  : "bg-surface-3 text-muted-foreground"
                              )}
                            >
                              {/* The 40px well renders either way; only the mark
                                  inside it waits, and which icon it gets IS the
                                  answer being awaited. */}
                              {pending ? null : taken ? (
                                <Bot className="h-4 w-4" />
                              ) : (
                                <Coins className="h-4 w-4" />
                              )}
                            </span>
                            <div className="min-w-0">
                              <p
                                className={cn(
                                  "truncate font-semibold",
                                  taken ? "text-muted-foreground" : "text-foreground"
                                )}
                              >
                                <Loadable loading={pending} placeholder="BTC/USDT">
                                  {pending
                                    ? null
                                    : `${market.currency}/${market.pair}`}
                                </Loadable>
                              </p>
                              {taken ? (
                                <p className="mt-0.5 text-xs text-warning-ink">
                                  {t("ai_market_maker_exists")}
                                </p>
                              ) : null}
                            </div>
                          </div>
                          <span
                            className={cn(
                              "grid h-5 w-5 shrink-0 place-items-center rounded-full border",
                              selected
                                ? "border-primary bg-primary text-primary-foreground"
                                : "border-border"
                            )}
                          >
                            {selected ? <Check className="h-3 w-3" /> : null}
                          </span>
                        </div>

                        {showPriceFooter ? (
                          <div className="mt-4 flex items-center justify-between border-t border-border pt-3 text-xs">
                            <span className="text-muted-foreground">
                              {tCommon("current_price")}
                            </span>
                            <span className="font-medium text-foreground">
                              <span className="font-mono tabular-nums">
                                <Loadable loading={pending} placeholder="0.000000">
                                  {pending
                                    ? null
                                    : Number(market.metadata?.price).toFixed(6)}
                                </Loadable>
                              </span>{" "}
                              <Loadable loading={pending} placeholder="USDT">
                                {market?.pair}
                              </Loadable>
                            </span>
                          </div>
                        ) : null}

                        {taken ? (
                          <div className="mt-4 flex items-center gap-2 border-t border-border pt-3 text-xs text-muted-foreground">
                            <Info className="h-3.5 w-3.5 shrink-0" />
                            <span>
                              {t("already_configured_with_ai_market_maker")}
                            </span>
                          </div>
                        ) : null}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        ) : null}

        {/* STEP 2 — PRICE --------------------------------------------------- */}
        {currentStep === 2 ? (
          <div className="space-y-4">
            <Card>
              <CardHeader padding="md">
                <div className="flex items-center gap-3">
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-sm bg-primary/10 text-primary">
                    <DollarSign className="h-4 w-4" />
                  </span>
                  <div>
                    <CardTitle className="text-base font-semibold text-foreground">
                      {t("price_settings")}
                    </CardTitle>
                    <p className="text-xs text-muted-foreground">
                      {t("configure_the_target_price_and_trading_range")}
                    </p>
                  </div>
                </div>
              </CardHeader>
              <CardContent padding="md" className="space-y-5">
                <div className="space-y-2">
                  <Input
                    label={`${tCommon("target_price")} (${selectedMarket?.pair || t("quote_currency")})`}
                    type="number"
                    value={formData.targetPrice}
                    onChange={(e) => set("targetPrice", e.target.value)}
                    placeholder={t("enter_target_price")}
                  />
                  {selectedMarket?.metadata?.price ? (
                    <p className="text-xs text-muted-foreground">
                      {tExt("current_market_price")}{" "}
                      <span className="font-mono tabular-nums">
                        {Number(selectedMarket.metadata.price).toFixed(6)}
                      </span>{" "}
                      {selectedMarket.pair}
                    </p>
                  ) : null}
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-muted-foreground">
                      {tExt("price_range")}
                    </label>
                    <span className="font-mono text-sm font-medium tabular-nums text-foreground">
                      ±{formData.priceRangePercent}%
                    </span>
                  </div>
                  <Slider
                    value={[Number(formData.priceRangePercent)]}
                    min={1}
                    max={50}
                    step={1}
                    onValueChange={([value]) =>
                      set("priceRangePercent", String(value))
                    }
                    aria-label={tExt("price_range")}
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>{t("tight")}</span>
                    <span>±25%</span>
                    <span>{t("wide")}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {tMm("range_explainer")}
                  </p>
                </div>
              </CardContent>
            </Card>

            {formData.targetPrice ? (
              <Alert tone="info">
                <Info className="h-4 w-4" />
                <AlertTitle>{t("trading_range_preview")}</AlertTitle>
                <AlertDescription>
                  {tCommon("range")}{" "}
                  <span className="font-mono tabular-nums">
                    {rangeLow.toFixed(6)} – {rangeHigh.toFixed(6)}
                  </span>{" "}
                  {selectedMarket?.pair || ""}
                </AlertDescription>
              </Alert>
            ) : null}
          </div>
        ) : null}

        {/* STEP 3 — TRADING ------------------------------------------------- */}
        {currentStep === 3 ? (
          <Card>
            <CardHeader padding="md">
              <div className="flex items-center gap-3">
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-sm bg-primary/10 text-primary">
                  <Sliders className="h-4 w-4" />
                </span>
                <div>
                  <CardTitle className="text-base font-semibold text-foreground">
                    {t("trading_configuration")}
                  </CardTitle>
                  <p className="text-xs text-muted-foreground">
                    {t("set_the_aggression_level_and_real")}
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardContent padding="md" className="space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">
                  {t("aggression_level")}
                </label>
                {/* Three options, because the column is an enum of three. */}
                <div className="grid grid-cols-3 gap-2">
                  {AGGRESSION.map((level) => {
                    const active = formData.aggressionLevel === level;
                    return (
                      <button
                        key={level}
                        type="button"
                        aria-pressed={active}
                        onClick={() => set("aggressionLevel", level)}
                        className={cn(
                          "rounded-md border px-3 py-2.5 text-sm font-medium outline-hidden transition-colors focus-visible:ring-[3px] focus-visible:ring-ring/50",
                          active
                            ? "border-primary bg-primary/10 text-foreground"
                            : "border-border text-muted-foreground hover:border-border-strong hover:bg-muted"
                        )}
                      >
                        {aggressionLabel(level)}
                      </button>
                    );
                  })}
                </div>
                <p className="text-xs text-muted-foreground">
                  {t("higher_aggression_more_bots_higher_frequency")}
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-muted-foreground">
                    {t("real_liquidity")} %
                  </label>
                  <span className="font-mono text-sm font-medium tabular-nums text-foreground">
                    {formData.realLiquidityPercent}%
                  </span>
                </div>
                <Slider
                  value={[Number(formData.realLiquidityPercent)]}
                  min={0}
                  max={100}
                  step={5}
                  onValueChange={([value]) =>
                    set("realLiquidityPercent", String(value))
                  }
                  aria-label={`${t("real_liquidity")} %`}
                />
                <p className="text-xs text-muted-foreground">
                  {tMm("real_liquidity_hint", {
                    real: formData.realLiquidityPercent,
                    simulated: 100 - Number(formData.realLiquidityPercent),
                  })}
                </p>
              </div>

              <Input
                label={`${t("max_daily_volume")} (${selectedMarket?.pair || t("quote_currency")})`}
                type="number"
                value={formData.maxDailyVolume}
                onChange={(e) => set("maxDailyVolume", e.target.value)}
                placeholder="100000"
              />

              {/*
                LEVERAGE, AND ONLY ON FUTURES.

                There is nothing to leverage on the ecosystem: a maker there
                funds its orders from pool balances rather than posting margin,
                and the endpoint refuses the field on an ECO market rather than
                storing something it will never read. Showing it anyway would
                offer an operator a risk control that does nothing.
              */}
              {venue === "FUTURES" ? (
                <div className="space-y-2">
                  <Input
                    label={tMm("futures_leverage")}
                    type="number"
                    min={1}
                    max={125}
                    step="1"
                    value={formData.futuresLeverage}
                    onChange={(e) => set("futuresLeverage", e.target.value)}
                    placeholder="1"
                  />
                  <p className="text-xs text-muted-foreground">
                    {tMm("futures_leverage_hint")}
                  </p>
                </div>
              ) : null}
            </CardContent>
          </Card>
        ) : null}

        {/* STEP 4 — REVIEW -------------------------------------------------- */}
        {currentStep === 4 ? (
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              <ReviewCard icon={ChartLine} title={tCommon("market")}>
                <ReviewRow
                  label={tCommon("market")}
                  value={`${selectedMarket?.currency ?? ""}/${selectedMarket?.pair ?? ""}`}
                />
                {/* The venue on the review, because a symbol does not carry it
                    and the same pair can exist on both. */}
                <ReviewRow
                  label={t("venue")}
                  value={venue === "FUTURES" ? tMm("venue_futures") : tMm("venue_eco")}
                />
                {venue === "FUTURES" ? (
                  <ReviewRow
                    label={tMm("futures_leverage")}
                    value={`${formData.futuresLeverage}x`}
                    mono
                  />
                ) : null}
              </ReviewCard>

              <ReviewCard icon={DollarSign} title={tCommon("price")}>
                <ReviewRow
                  label={t("target")}
                  value={`${Number(formData.targetPrice).toFixed(6)} ${selectedMarket?.pair ?? ""}`}
                  mono
                />
                <ReviewRow
                  label={tCommon("range")}
                  value={`${rangeLow.toFixed(6)} – ${rangeHigh.toFixed(6)}`}
                  mono
                />
              </ReviewCard>

              <ReviewCard icon={Sliders} title={t("trading_configuration")}>
                <ReviewRow
                  label={t("aggression_level")}
                  value={aggressionLabel(formData.aggressionLevel)}
                />
                <ReviewRow
                  label={`${t("real_liquidity")} %`}
                  value={`${formData.realLiquidityPercent}%`}
                  mono
                />
                <ReviewRow
                  label={t("max_volume")}
                  value={`${Number(formData.maxDailyVolume).toLocaleString()} ${selectedMarket?.pair ?? ""}`}
                  mono
                />
              </ReviewCard>
            </div>

            <Alert tone="success">
              <Rocket className="h-4 w-4" />
              <AlertTitle>{t("ready_to_launch")}</AlertTitle>
              <AlertDescription>
                {t("the_market_maker_will_be_created")}{" "}
                {t("you_can_start_it_from_the")}
              </AlertDescription>
            </Alert>
          </div>
        ) : null}
      </Stepper>
    </PageShell>
  );
}

function ReviewCard({
  icon: Icon,
  title,
  children,
}: {
  icon: React.ElementType;
  title: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader padding="md">
        <div className="flex items-center gap-3">
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-sm bg-primary/10 text-primary">
            <Icon className="h-4 w-4" />
          </span>
          <CardTitle className="text-base font-semibold text-foreground">
            {title}
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent padding="md" className="space-y-3 text-sm">
        {children}
      </CardContent>
    </Card>
  );
}

function ReviewRow({
  label,
  value,
  mono,
}: {
  label: React.ReactNode;
  value: React.ReactNode;
  mono?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span className="text-muted-foreground">{label}</span>
      <span
        className={cn(
          "text-right font-medium text-foreground",
          mono && "font-mono tabular-nums"
        )}
      >
        {value}
      </span>
    </div>
  );
}
