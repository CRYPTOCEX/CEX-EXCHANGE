"use client";

import React, { useState, useEffect } from "react";
import { $fetch } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Icon } from "@iconify/react";
import { useRouter } from "@/i18n/routing";
import { toast } from "sonner";
import { Slider } from "@/components/ui/slider";
import { useTranslations } from "next-intl";
import { HeroSection } from "@/components/ui/hero-section";
import { Sparkles } from "lucide-react";

interface EcosystemMarket {
  id: string;
  currency: string;
  pair: string;
  status: boolean;
  metadata?: {
    price?: number;
  };
}

interface AiMarketMaker {
  id: string;
  marketId: string;
  status: string;
}

type Step = 1 | 2 | 3 | 4;

const steps = [
  { number: 1, title: "Select Market", icon: "mdi:chart-line", description: "Choose trading pair" },
  { number: 2, title: "Price Settings", icon: "mdi:currency-usd", description: "Set target price" },
  { number: 3, title: "Trading Config", icon: "mdi:tune", description: "Configure behavior" },
  { number: 4, title: "Review", icon: "mdi:check-circle", description: "Confirm & create" },
];

export default function CreateAiMarketPage() {
  const t = useTranslations("ext_admin");
  const tCommon = useTranslations("common");
  const tExt = useTranslations("ext");
  const router = useRouter();

  const [currentStep, setCurrentStep] = useState<Step>(1);
  const [loading, setLoading] = useState(false);
  const [loadingMarkets, setLoadingMarkets] = useState(true);
  const [ecosystemMarkets, setEcosystemMarkets] = useState<EcosystemMarket[]>([]);
  const [existingMarketMakerIds, setExistingMarketMakerIds] = useState<Set<string>>(new Set());

  // Form state
  const [formData, setFormData] = useState({
    ecosystemMarketId: "",
    targetPrice: "",
    priceRangePercent: "10", // ±10% from target price by default
    aggressionLevel: "5",
    realLiquidityPercent: "50",
    maxDailyVolume: "100000",
  });

  const [selectedMarket, setSelectedMarket] = useState<EcosystemMarket | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoadingMarkets(true);

      // Fetch both ecosystem markets and existing AI market makers in parallel
      const [marketsResponse, aiMarketsResponse] = await Promise.all([
        $fetch({
          url: "/api/admin/ecosystem/market",
          silent: true,
        }),
        $fetch({
          url: "/api/admin/ai/market-maker/market",
          silent: true,
        }),
      ]);

      // Set ecosystem markets
      if (marketsResponse.data?.items) {
        setEcosystemMarkets(marketsResponse.data.items);
      } else if (marketsResponse.data?.data) {
        setEcosystemMarkets(marketsResponse.data.data);
      }

      // Set existing AI market maker IDs
      const aiMarkets = aiMarketsResponse.data?.items || aiMarketsResponse.data?.data || aiMarketsResponse.data || [];
      const existingIds = new Set<string>(
        aiMarkets.map((m: AiMarketMaker) => m.marketId)
      );
      setExistingMarketMakerIds(existingIds);
    } catch (err) {
      console.error("Failed to load markets", err);
    } finally {
      setLoadingMarkets(false);
    }
  };

  const handleMarketSelect = (marketId: string) => {
    // Prevent selecting markets that already have an AI market maker
    if (existingMarketMakerIds.has(marketId)) {
      return;
    }

    const market = ecosystemMarkets.find((m) => m.id === marketId);
    setSelectedMarket(market || null);
    setFormData((prev) => ({
      ...prev,
      ecosystemMarketId: marketId,
      targetPrice: market?.metadata?.price?.toString() || "",
    }));
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

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
      case 3:
        return (
          Number(formData.aggressionLevel) >= 1 &&
          Number(formData.aggressionLevel) <= 10 &&
          Number(formData.realLiquidityPercent) >= 0 &&
          Number(formData.realLiquidityPercent) <= 100
        );
      case 4:
        return true;
      default:
        return false;
    }
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep((prev) => (prev < 4 ? ((prev + 1) as Step) : prev));
    } else {
      toast.error("Please fill in all required fields correctly");
    }
  };

  const handlePrev = () => {
    setCurrentStep((prev) => (prev > 1 ? ((prev - 1) as Step) : prev));
  };

  // Convert aggression level (1-10) to enum
  const getAggressionEnum = (level: number): string => {
    if (level <= 3) return "CONSERVATIVE";
    if (level <= 7) return "MODERATE";
    return "AGGRESSIVE";
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);
      const targetPrice = Number(formData.targetPrice);
      const rangePercent = Number(formData.priceRangePercent) / 100;
      const priceRangeLow = targetPrice * (1 - rangePercent);
      const priceRangeHigh = targetPrice * (1 + rangePercent);

      const response = await $fetch({
        url: "/api/admin/ai/market-maker/market",
        method: "POST",
        body: {
          marketId: formData.ecosystemMarketId,
          targetPrice: targetPrice,
          priceRangeLow: priceRangeLow,
          priceRangeHigh: priceRangeHigh,
          aggressionLevel: getAggressionEnum(Number(formData.aggressionLevel)),
          realLiquidityPercent: Number(formData.realLiquidityPercent),
          maxDailyVolume: Number(formData.maxDailyVolume),


        },
      });

      if (response.data?.id) {
        toast.success("AI Market Maker created successfully!");
        router.push(`/admin/ai/market-maker/market/${response.data.id}`);
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to create market maker");
    } finally {
      setLoading(false);
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <div className="w-16 h-16 rounded-2xl bg-linear-to-br from-cyan-500 to-purple-600 flex items-center justify-center mx-auto mb-4 shadow-lg">
                <Icon icon="mdi:chart-line" className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-foreground">
                {t("select_ecosystem_market")}
              </h3>
              <p className="text-muted-foreground mt-2 max-w-md mx-auto">
                {t("choose_an_ecosystem_market_to_create")}
              </p>
            </div>

            {loadingMarkets ? (
              <div className="flex flex-col items-center justify-center py-12">
                <Icon
                  icon="mdi:loading"
                  className="w-12 h-12 text-cyan-500 animate-spin mb-4"
                />
                <p className="text-muted-foreground">{t("loading_markets_ellipsis")}</p>
              </div>
            ) : ecosystemMarkets.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 rounded-full bg-linear-to-br from-cyan-500/10 to-purple-500/10 flex items-center justify-center mx-auto mb-4">
                  <Icon icon="mdi:alert-circle-outline" className="w-8 h-8 text-cyan-500" />
                </div>
                <h4 className="text-lg font-semibold text-foreground mb-2">
                  {tExt("no_markets_available")}
                </h4>
                <p className="text-muted-foreground mb-4">
                  {t("create_an_ecosystem_market_first_to")}
                </p>
                <Button
                  variant="outline"
                  onClick={() => router.push("/admin/ecosystem/market")}
                  className="border-cyan-500/30 hover:border-cyan-500/50"
                >
                  {t("go_to_ecosystem_markets")}
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {ecosystemMarkets.map((market) => {
                  const hasAiMarketMaker = existingMarketMakerIds.has(market.id);
                  const isSelected = formData.ecosystemMarketId === market.id;

                  return (
                    <Card
                      key={market.id}
                      className={`group transition-all duration-300 overflow-hidden ${
                        hasAiMarketMaker
                          ? "opacity-60 cursor-not-allowed"
                          : isSelected
                            ? "ring-2 ring-cyan-500 shadow-lg cursor-pointer border-cyan-500/50"
                            : "hover:shadow-lg border-2 border-transparent hover:border-cyan-500/30 cursor-pointer"
                      }`}
                      onClick={() => handleMarketSelect(market.id)}
                    >
                      <CardContent className="p-5">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            <div
                              className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all ${
                                hasAiMarketMaker
                                  ? "bg-muted"
                                  : isSelected
                                    ? "bg-linear-to-br from-cyan-500 to-purple-600"
                                    : "bg-muted group-hover:bg-cyan-500/10"
                              }`}
                            >
                              <Icon
                                icon={hasAiMarketMaker ? "mdi:robot" : "mdi:bitcoin"}
                                className={`w-6 h-6 ${
                                  hasAiMarketMaker
                                    ? "text-muted-foreground"
                                    : isSelected
                                      ? "text-white"
                                      : "text-muted-foreground group-hover:text-cyan-500"
                                }`}
                              />
                            </div>
                            <div>
                              <h4 className={`font-bold text-lg ${hasAiMarketMaker ? "text-muted-foreground" : "text-foreground"}`}>
                                {market.currency}/{market.pair}
                              </h4>
                              {hasAiMarketMaker && (
                                <p className="text-xs text-amber-600 dark:text-amber-400 mt-0.5">
                                  AI Market Maker exists
                                </p>
                              )}
                            </div>
                          </div>
                          <div
                            className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                              hasAiMarketMaker
                                ? "border-muted-foreground/30 bg-muted"
                                : isSelected
                                  ? "border-cyan-500 bg-cyan-500"
                                  : "border-border"
                            }`}
                          >
                            {hasAiMarketMaker ? (
                              <Icon icon="mdi:check" className="w-4 h-4 text-muted-foreground" />
                            ) : isSelected ? (
                              <Icon icon="mdi:check" className="w-4 h-4 text-white" />
                            ) : null}
                          </div>
                        </div>
                        {market.metadata?.price && !hasAiMarketMaker && (
                          <div className="mt-4 pt-4 border-t">
                            <div className="flex items-center justify-between">
                              <span className="text-xs text-muted-foreground">{tCommon("current_price")}</span>
                              <span className="text-sm font-semibold text-foreground">
                                {Number(market.metadata.price).toFixed(6)} {market.pair}
                              </span>
                            </div>
                          </div>
                        )}
                        {hasAiMarketMaker && (
                          <div className="mt-4 pt-4 border-t">
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <Icon icon="mdi:information-outline" className="w-4 h-4" />
                              <span>{t("already_configured_with_ai_market_maker")}</span>
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        );

      case 2:
        return (
          <div className="max-w-xl mx-auto space-y-6">
            <div className="text-center mb-8">
              <div className="w-16 h-16 rounded-2xl bg-linear-to-br from-green-500 to-green-600 flex items-center justify-center mx-auto mb-4 shadow-lg">
                <Icon icon="mdi:currency-usd" className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-foreground">
                {t("price_settings")}
              </h3>
              <p className="text-muted-foreground mt-2">
                {t("configure_the_target_price_and_trading_range")}
              </p>
            </div>

            <Card className="border-cyan-500/20">
              <CardContent className="p-6 space-y-6">
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-2">
                    {tExt("target_price")}{selectedMarket?.pair || "Quote Currency"})
                  </label>
                  <Input
                    type="number"
                    value={formData.targetPrice}
                    onChange={(e) => handleInputChange("targetPrice", e.target.value)}
                    placeholder={t("enter_target_price")}
                    className="h-12 text-lg"
                  />
                  {selectedMarket?.metadata?.price && (
                    <p className="text-xs text-muted-foreground mt-2">
                      {tExt("current_market_price")} {Number(selectedMarket.metadata.price).toFixed(6)} {selectedMarket?.pair}
                    </p>
                  )}
                </div>

                <div>
                  <div className="flex items-center justify-between mb-4">
                    <label className="text-sm font-medium text-muted-foreground">
                      {tExt("price_range")}
                    </label>
                    <span className="text-lg font-bold text-foreground">
                      ±{formData.priceRangePercent}%
                    </span>
                  </div>
                  <Slider
                    value={[Number(formData.priceRangePercent)]}
                    min={1}
                    max={50}
                    step={1}
                    onValueChange={(value) => handleInputChange("priceRangePercent", value[0].toString())}
                    className="mb-2"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>{t("n_1_tight")} ({t("tight")})</span>
                    <span>±25%</span>
                    <span>{t("n_50_wide")} ({t("wide")})</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {formData.targetPrice && (
              <div className="p-5 bg-linear-to-r from-cyan-500/10 to-purple-500/5 rounded-2xl border border-cyan-500/20">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-cyan-500/20 flex items-center justify-center shrink-0">
                    <Icon icon="mdi:information" className="w-5 h-5 text-cyan-500" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-cyan-600 dark:text-cyan-400 mb-1">
                      {t("trading_range_preview")}
                    </h4>
                    <p className="text-sm text-cyan-600 dark:text-cyan-400">
                      {t("bots_will_trade_within")}{" "}
                      <span className="font-semibold">±{formData.priceRangePercent}%</span>{" "}
                      {t("of_the_target_price")}
                    </p>
                    <p className="text-sm font-semibold text-cyan-700 dark:text-cyan-300 mt-2">
                      {tCommon("range")} {(Number(formData.targetPrice) * (1 - Number(formData.priceRangePercent) / 100)).toFixed(6)} - {(Number(formData.targetPrice) * (1 + Number(formData.priceRangePercent) / 100)).toFixed(6)} {selectedMarket?.pair || ""}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        );

      case 3:
        return (
          <div className="max-w-xl mx-auto space-y-6">
            <div className="text-center mb-8">
              <div className="w-16 h-16 rounded-2xl bg-linear-to-br from-purple-500 to-purple-600 flex items-center justify-center mx-auto mb-4 shadow-lg">
                <Icon icon="mdi:tune" className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-foreground">
                {t("trading_configuration")}
              </h3>
              <p className="text-muted-foreground mt-2">
                {t("set_the_aggression_level_and_real")}
              </p>
            </div>

            <Card className="border-purple-500/20">
              <CardContent className="p-6 space-y-8">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <label className="text-sm font-medium text-muted-foreground">
                      {t("aggression_level")}
                    </label>
                    <span className="text-2xl font-bold text-purple-500">
                      {formData.aggressionLevel}/10
                    </span>
                  </div>
                  <Slider
                    value={[Number(formData.aggressionLevel)]}
                    min={1}
                    max={10}
                    step={1}
                    onValueChange={(value) => handleInputChange("aggressionLevel", value[0].toString())}
                    className="mb-2"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Conservative</span>
                    <span>Moderate</span>
                    <span>Aggressive</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-3 p-3 bg-muted/50 rounded-lg">
                    {t("higher_aggression_more_bots_higher_frequency")}
                  </p>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-4">
                    <label className="text-sm font-medium text-muted-foreground">
                      {t("real_liquidity")}
                    </label>
                    <span className="text-2xl font-bold text-cyan-500">
                      {formData.realLiquidityPercent}%
                    </span>
                  </div>
                  <Slider
                    value={[Number(formData.realLiquidityPercent)]}
                    min={0}
                    max={100}
                    step={5}
                    onValueChange={(value) => handleInputChange("realLiquidityPercent", value[0].toString())}
                    className="mb-2"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>AI Only</span>
                    <span>Mixed</span>
                    <span>{t("fully_real")}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-3 p-3 bg-muted/50 rounded-lg">
                    {t("percentage_of_orders_placed_as_real")}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-2">
                    {t("max_daily_volume")}{selectedMarket?.pair || "Quote Currency"})
                  </label>
                  <Input
                    type="number"
                    value={formData.maxDailyVolume}
                    onChange={(e) => handleInputChange("maxDailyVolume", e.target.value)}
                    placeholder="100000"
                    className="h-12"
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        );

      case 4:
        return (
          <div className="max-w-2xl mx-auto space-y-6">
            <div className="text-center mb-8">
              <div className="w-16 h-16 rounded-2xl bg-linear-to-br from-green-500 to-green-600 flex items-center justify-center mx-auto mb-4 shadow-lg">
                <Icon icon="mdi:check-circle" className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-foreground">
                {t("review_configuration")}
              </h3>
              <p className="text-muted-foreground mt-2">
                {t("please_review_your_settings_before_creating")}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className="overflow-hidden border-cyan-500/20">
                <div className="h-1 bg-linear-to-r from-cyan-500 to-cyan-600" />
                <CardContent className="p-5">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-xl bg-cyan-500/10 flex items-center justify-center">
                      <Icon icon="mdi:chart-line" className="w-5 h-5 text-cyan-500" />
                    </div>
                    <h4 className="font-semibold text-foreground">Market</h4>
                  </div>
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Market</span>
                      <span className="font-semibold text-foreground">
                        {selectedMarket?.currency}/{selectedMarket?.pair}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="overflow-hidden border-green-500/20">
                <div className="h-1 bg-linear-to-r from-green-500 to-green-600" />
                <CardContent className="p-5">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center">
                      <Icon icon="mdi:currency-usd" className="w-5 h-5 text-green-500" />
                    </div>
                    <h4 className="font-semibold text-foreground">Price</h4>
                  </div>
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Target</span>
                      <span className="font-semibold text-foreground">
                        {Number(formData.targetPrice).toFixed(6)} {selectedMarket?.pair || ""}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Range</span>
                      <span className="font-semibold text-foreground">
                        ±{formData.priceRangePercent}%
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="overflow-hidden border-purple-500/20">
                <div className="h-1 bg-linear-to-r from-purple-500 to-purple-600" />
                <CardContent className="p-5">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center">
                      <Icon icon="mdi:tune" className="w-5 h-5 text-purple-500" />
                    </div>
                    <h4 className="font-semibold text-foreground">Trading</h4>
                  </div>
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Aggression</span>
                      <span className="font-semibold text-foreground">
                        {formData.aggressionLevel}/10
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{t("real_liquidity")}</span>
                      <span className="font-semibold text-foreground">
                        {formData.realLiquidityPercent}%
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{t("max_volume")}</span>
                      <span className="font-semibold text-foreground">
                        {Number(formData.maxDailyVolume).toLocaleString()} {selectedMarket?.pair || ""}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

            </div>

            <div className="p-5 bg-linear-to-r from-green-500/10 to-green-500/5 rounded-2xl border border-green-500/20">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-green-500/20 flex items-center justify-center shrink-0">
                  <Icon icon="mdi:rocket-launch" className="w-5 h-5 text-green-500" />
                </div>
                <div>
                  <h4 className="font-semibold text-green-600 dark:text-green-400 mb-1">
                    {t("ready_to_launch")}
                  </h4>
                  <p className="text-sm text-green-600 dark:text-green-400">
                    {t("the_market_maker_will_be_created")} {t("you_can_start_it_from_the")}
                  </p>
                </div>
              </div>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-linear-to-b from-background via-muted/20 to-background dark:from-zinc-950 dark:via-zinc-900/30 dark:to-zinc-950">
      {/* Hero Section with AI Theme */}
      <HeroSection
        badge={{
          icon: <Sparkles className="h-3.5 w-3.5" />,
          text: t("create_new"),
          gradient: "from-cyan-100 to-purple-100 dark:from-cyan-950 dark:to-purple-950",
          iconColor: "text-cyan-500",
          textColor: "text-cyan-600 dark:text-cyan-400",
        }}
        title={[
          { text: "Create AI " },
          {
            text: "Market Maker",
            gradient:
              "from-cyan-600 via-purple-500 to-cyan-600 dark:from-cyan-400 dark:via-purple-400 dark:to-cyan-400",
          },
        ]}
        description={t("set_up_a_new_ai_powered_market_maker")}
        paddingTop="pt-24"
        paddingBottom="pb-12"
        layout="split"
        rightContentAlign="center"
        background={{
          orbs: [
            {
              color: "#06b6d4",
              position: { top: "-10rem", right: "-10rem" },
              size: "20rem",
            },
            {
              color: "#a855f7",
              position: { bottom: "-5rem", left: "-5rem" },
              size: "15rem",
            },
          ],
        }}
        particles={{
          count: 6,
          type: "floating",
          colors: ["#06b6d4", "#a855f7"],
          size: 8,
        }}
        rightContent={
          <Button
            variant="outline"
            onClick={() => router.push("/admin/ai/market-maker/market")}
            className="border-cyan-500/30 hover:border-cyan-500/50 hover:bg-cyan-500/5"
          >
            <Icon icon="mdi:arrow-left" className="w-5 h-5 mr-2" />
            {tCommon("back_to_markets")}
          </Button>
        }
      />

      {/* Main Content Container */}
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 max-w-5xl">
        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            {steps.map((step, index) => (
              <React.Fragment key={step.number}>
                <div className="flex flex-col items-center flex-1">
                  <div
                    className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-300 ${
                      currentStep >= step.number
                        ? "bg-linear-to-br from-cyan-500 to-purple-600 shadow-lg"
                        : "bg-muted"
                    }`}
                  >
                    {currentStep > step.number ? (
                      <Icon icon="mdi:check" className="w-6 h-6 text-white" />
                    ) : (
                      <Icon
                        icon={step.icon}
                        className={`w-6 h-6 ${
                          currentStep >= step.number ? "text-white" : "text-muted-foreground"
                        }`}
                      />
                    )}
                  </div>
                  <span
                    className={`text-sm font-medium mt-2 hidden sm:block ${
                      currentStep >= step.number
                        ? "text-cyan-600 dark:text-cyan-400"
                        : "text-muted-foreground"
                    }`}
                  >
                    {step.title}
                  </span>
                  <span className="text-xs text-muted-foreground hidden md:block">
                    {step.description}
                  </span>
                </div>
                {index < steps.length - 1 && (
                  <div
                    className={`flex-1 h-1 mx-2 rounded-full transition-all duration-300 ${
                      currentStep > step.number
                        ? "bg-linear-to-r from-cyan-500 to-purple-600"
                        : "bg-muted"
                    }`}
                  />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Step Content */}
        <Card className="mb-6 border-cyan-500/20">
          <CardContent className="p-8">{renderStep()}</CardContent>
        </Card>

        {/* Navigation */}
        <div className="flex justify-between">
          <Button
            variant="outline"
            onClick={handlePrev}
            disabled={currentStep === 1}
            size="lg"
            className="border-cyan-500/30 hover:border-cyan-500/50"
          >
            <Icon icon="mdi:arrow-left" className="w-5 h-5 mr-2" />
            Previous
          </Button>

          {currentStep < 4 ? (
            <Button
              onClick={handleNext}
              size="lg"
              className="bg-linear-to-r from-cyan-600 to-purple-600 hover:from-cyan-700 hover:to-purple-700"
            >
              {t("next_step")}
              <Icon icon="mdi:arrow-right" className="w-5 h-5 ml-2" />
            </Button>
          ) : (
            <Button
              onClick={handleSubmit}
              disabled={loading}
              size="lg"
              className="bg-linear-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700"
            >
              {loading ? (
                <Icon icon="mdi:loading" className="w-5 h-5 mr-2 animate-spin" />
              ) : (
                <Icon icon="mdi:rocket-launch" className="w-5 h-5 mr-2" />
              )}
              {loading ? "Creating..." : "Create Market Maker"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
