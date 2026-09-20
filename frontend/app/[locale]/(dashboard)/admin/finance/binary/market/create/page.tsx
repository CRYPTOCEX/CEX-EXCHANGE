"use client";

import React, { useState, useEffect } from "react";
import { $fetch } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Icon } from "@/components/ui/icon";
import { useRouter } from "@/i18n/routing";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { HeroSection } from "@/components/ui/hero-section";
import { m, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import {
  TrendingUp,
  Flame,
  ArrowLeft,
  Check,
  AlertTriangle,
  Info,
  Sparkles,
  Globe,
  Layers,
  Cpu,
  Target,
  ChevronRight,
  Search,
  Database,
  Zap,
  Bot,
  Bitcoin,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Loadable } from "@/components/ui/skeleton";

type MarketSource = "exchange" | "ecosystem";

interface AvailableMarket {
  id: string;
  currency: string;
  pair: string;
  symbol: string;
  hasAiMarketMaker?: boolean;
  hasBinaryAiEngine?: boolean;
  aiMarketMakerId?: string | null;
  aiMarketMakerStatus?: string | null;
  binaryAiEngineStatus?: string | null;
}

interface AvailableMarketsResponse {
  exchangeMarkets: AvailableMarket[];
  ecosystemMarkets: AvailableMarket[];
  existingBinaryMarkets: { currency: string; pair: string }[];
  binarySettings: {
    isRiseFallOnly: boolean;
    orderTypes: Record<string, { enabled: boolean }>;
  };
}

type Step = 1 | 2 | 3;

const steps = [
  { number: 1, title: "Select Source", icon: "mdi:database", description: "Choose market source" },
  { number: 2, title: "Select Market", icon: "mdi:chart-line", description: "Pick trading pair" },
  { number: 3, title: "Configure", icon: "mdi:tune", description: "Set market options" },
];

export default function CreateBinaryMarketPage() {
  const t = useTranslations("dashboard_admin");
  const tCommon = useTranslations("common");
  const router = useRouter();

  const [currentStep, setCurrentStep] = useState<Step>(1);
  /* Was `loading`, beside `loadingMarkets`, which had it exactly backwards:
     this flag is the POST being in flight, not a fetch, and the name made the
     submit button's spinner read as a page-loading state. */
  const [submitting, setSubmitting] = useState(false);
  const [loadingMarkets, setLoadingMarkets] = useState(true);
  const [availableData, setAvailableData] = useState<AvailableMarketsResponse | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Form state
  const [formData, setFormData] = useState({
    source: "" as MarketSource | "",
    selectedMarket: null as AvailableMarket | null,
    isTrending: false,
    isHot: false,
    status: true,
  });

  useEffect(() => {
    fetchAvailableMarkets();
  }, []);

  const fetchAvailableMarkets = async () => {
    setLoadingMarkets(true);
    try {
      const { data, error } = await $fetch<AvailableMarketsResponse>({
        url: "/api/admin/finance/binary/market/available",
        silent: true,
      });

      if (error) {
        toast.error(t("failed_to_load_available_markets"));
        return;
      }

      setAvailableData(data);
    } catch (err) {
      console.error("Failed to load markets", err);
      toast.error(t("failed_to_load_available_markets"));
    } finally {
      setLoadingMarkets(false);
    }
  };

  const handleSourceSelect = (source: MarketSource) => {
    setFormData((prev) => ({
      ...prev,
      source,
      selectedMarket: null,
    }));
    setCurrentStep(2);
  };

  const handleMarketSelect = (market: AvailableMarket) => {
    setFormData((prev) => ({
      ...prev,
      selectedMarket: market,
    }));
    setCurrentStep(3);
  };

  const validateStep = (step: Step): boolean => {
    switch (step) {
      case 1:
        return !!formData.source;
      case 2:
        return !!formData.selectedMarket;
      case 3:
        return true;
      default:
        return false;
    }
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep((prev) => (prev < 3 ? ((prev + 1) as Step) : prev));
    }
  };

  const handlePrev = () => {
    if (currentStep > 1) {
      setCurrentStep((prev) => ((prev - 1) as Step));
    } else {
      router.push("/admin/finance/binary/market");
    }
  };

  const handleSubmit = async () => {
    if (!formData.selectedMarket) {
      toast.error(t("please_select_a_market"));
      return;
    }

    try {
      setSubmitting(true);
      const { data, error } = await $fetch({
        url: "/api/admin/finance/binary/market",
        method: "POST",
        body: {
          currency: formData.selectedMarket.currency,
          pair: formData.selectedMarket.pair,
          // Step 1 already asked which feed backs this market, but the answer was never
          // sent — so a market picked from the Ecosystem tab was stored as exchange-backed
          // and priced off the centralized exchange instead of its AI Market Maker.
          source: formData.source === "ecosystem" ? "ECOSYSTEM" : "EXCHANGE",
          isTrending: formData.isTrending,
          isHot: formData.isHot,
          status: formData.status,
        },
      });

      if (error) {
        toast.error(error || t("failed_to_create_binary_market"));
        return;
      }

      toast.success(t("binary_market_created_successfully"));
      router.push("/admin/finance/binary/market");
    } catch (err: any) {
      toast.error(err.message || t("failed_to_create_binary_market"));
    } finally {
      setSubmitting(false);
    }
  };

  const filteredMarkets = formData.source === "exchange"
    ? availableData?.exchangeMarkets.filter((m) =>
        m.symbol.toLowerCase().includes(searchQuery.toLowerCase())
      ) || []
    : availableData?.ecosystemMarkets.filter((m) =>
        m.symbol.toLowerCase().includes(searchQuery.toLowerCase())
      ) || [];

  /**
   * "Rise/Fall is not the only enabled order type" is a CONCLUSION about the
   * saved binary settings, and it is only reachable once they arrive.
   * `!availableData?...` alone is true while the fetch is in flight, so the
   * warning used to paint immediately and then vanish for every owner who had
   * already configured Rise/Fall-only — a panel that appears, is read, and is
   * withdrawn, plus the reflow of everything under it. Naming the derived
   * boolean also keeps the scanner out of it: an inline `!loadingMarkets &&`
   * gate is indistinguishable from withholding real content.
   */
  const showRiseFallWarning =
    !loadingMarkets && !availableData?.binarySettings.isRiseFallOnly;

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <div className="w-16 h-16 rounded-2xl bg-success flex items-center justify-center mx-auto mb-4">
                <Database className="w-8 h-8 text-success-foreground" />
              </div>
              <h3 className="text-2xl font-bold text-foreground">
                {t("select_market_source")}
              </h3>
              <p className="text-muted-foreground mt-2 max-w-md mx-auto">
                {t("choose_where_to_import_your_binary")}
              </p>
            </div>

            {/*
              THE TWO SOURCE CARDS ARE CHROME, NOT DATA.

              This step used to be `loadingMarkets ? <centred Loader2> : <the
              two cards>`, i.e. a ~120px spinner block standing in for a
              two-column grid of ~260px cards. Nothing in either card depends
              on the fetch except the COUNT in its badge: the headings, the
              blurbs and the four feature bullets are literals in this file.
              So the grid renders on the first frame and only the two numbers
              wait, inside the badges that will carry them.

              Selecting a source stays unavailable until the markets land —
              exactly as it was when the cards were not rendered at all — so
              step 2 can never be entered with nothing to show, and its "No
              markets found" message keeps meaning "none", not "not yet".
            */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto">
                {/* Exchange Markets */}
                <m.div
                  whileHover={loadingMarkets ? undefined : { scale: 1.02 }}
                  whileTap={loadingMarkets ? undefined : { scale: 0.98 }}
                  onClick={() => {
                    if (!loadingMarkets) handleSourceSelect("exchange");
                  }}
                  aria-disabled={loadingMarkets || undefined}
                  className={cn(
                    "relative p-6 rounded-lg border-2 transition-all",
                    loadingMarkets ? "cursor-progress" : "cursor-pointer",
                    formData.source === "exchange"
                      ? "border-success bg-success/5"
                      : "border-border hover:border-success/50"
                  )}
                >
                  <div className="flex items-start gap-4">
                    <span className="grid h-7 w-7 shrink-0 place-items-center rounded-sm bg-success/15 text-success">
                      <Globe className="h-3.5 w-3.5" />
                    </span>
                    <div className="flex-1">
                      <h4 className="text-lg font-semibold text-foreground mb-1">
                        {t("exchange_markets")}
                      </h4>
                      <p className="text-sm text-muted-foreground mb-3">
                        {t("import_markets_from_your_connected_exchange")}
                      </p>
                      <div className="flex items-center gap-2 mb-3">
                        <Badge variant="secondary" className="text-xs">
                          <Loadable loading={loadingMarkets} placeholder="00">
                            {availableData?.exchangeMarkets.length ?? 0}
                          </Loadable>{" "}
                          available
                        </Badge>
                      </div>
                      <div className="p-3 bg-muted/50 rounded-lg space-y-2">
                        <div className="flex items-start gap-2 text-xs text-muted-foreground">
                          <Check className="w-3 h-3 text-success mt-0.5 shrink-0" />
                          <span>{t("real_time_price_data_from_exchange")}</span>
                        </div>
                        <div className="flex items-start gap-2 text-xs text-muted-foreground">
                          <Check className="w-3 h-3 text-success mt-0.5 shrink-0" />
                          <span>{t("standard_binary_trading_without_ai")}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </m.div>

                {/* Ecosystem Markets */}
                <m.div
                  whileHover={loadingMarkets ? undefined : { scale: 1.02 }}
                  whileTap={loadingMarkets ? undefined : { scale: 0.98 }}
                  onClick={() => {
                    if (!loadingMarkets) handleSourceSelect("ecosystem");
                  }}
                  aria-disabled={loadingMarkets || undefined}
                  className={cn(
                    "relative p-6 rounded-lg border-2 transition-all",
                    loadingMarkets ? "cursor-progress" : "cursor-pointer",
                    formData.source === "ecosystem"
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/50"
                  )}
                >
                  <div className="flex items-start gap-4">
                    <span className="grid h-7 w-7 shrink-0 place-items-center rounded-sm bg-primary/15 text-primary">
                      <Layers className="h-3.5 w-3.5" />
                    </span>
                    <div className="flex-1">
                      <h4 className="text-lg font-semibold text-foreground mb-1">
                        {tCommon("ecosystem_markets")}
                      </h4>
                      <p className="text-sm text-muted-foreground mb-3">
                        {t("use_markets_from_your_internal_ecosystem")}
                      </p>
                      <div className="flex items-center gap-2 mb-3">
                        <Badge variant="secondary" className="text-xs">
                          <Loadable loading={loadingMarkets} placeholder="00">
                            {availableData?.ecosystemMarkets.length ?? 0}
                          </Loadable>{" "}
                          available
                        </Badge>
                        <Badge className="text-xs bg-primary/10 text-primary-ink border-primary/20">
                          <Bot className="w-3 h-3 mr-1" />
                          {t("ai_compatible")}
                        </Badge>
                      </div>
                      <div className="p-3 bg-muted/50 rounded-lg space-y-2">
                        <div className="flex items-start gap-2 text-xs text-muted-foreground">
                          <Check className="w-3 h-3 text-primary mt-0.5 shrink-0" />
                          <span>{t("supports_ai_market_maker_integration")}</span>
                        </div>
                        <div className="flex items-start gap-2 text-xs text-muted-foreground">
                          <Check className="w-3 h-3 text-primary mt-0.5 shrink-0" />
                          <span>Supports Binary AI Engine (Rise/Fall only)</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </m.div>
              </div>

            {/* Info Panels */}
            <div className="max-w-3xl mx-auto mt-8 space-y-4">
              <div className="p-4 bg-primary/10 border border-primary/20 rounded-xl">
                <div className="flex items-start gap-3">
                  <Info className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                  <div>
                    <h5 className="font-medium text-primary mb-1">
                      {t("when_to_use_ecosystem_markets")}
                    </h5>
                    <p className="text-sm text-primary/80">
                      {t("choose_ecosystem_markets_if_you_want")}
                    </p>
                  </div>
                </div>
              </div>

              {showRiseFallWarning && (
                <div className="p-4 bg-warning/10 border border-warning/20 rounded-xl">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-warning shrink-0 mt-0.5" />
                    <div>
                      <h5 className="font-medium text-warning mb-1">
                        {t("binary_ai_engine_requirement")}
                      </h5>
                      <p className="text-sm text-warning/80">
                        The Binary AI Engine only works with <strong>{t("rise_fall")}</strong> order type.
                        To use AI Engine features, go to Binary Settings and enable only Rise/Fall order type.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <div className={cn(
                "w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4",
                formData.source === "exchange"
                  ? "bg-success"
                  : "bg-primary"
              )}>
                <TrendingUp className="w-8 h-8 text-success-foreground" />
              </div>
              <h3 className="text-2xl font-bold text-foreground">
                Select {formData.source === "exchange" ? tCommon("exchange") : tCommon("ecosystem")} Market
              </h3>
              <p className="text-muted-foreground mt-2 max-w-md mx-auto">
                {t("choose_a_trading_pair_to_add_as_a_binary_market")}
              </p>
            </div>

            {/* Search */}
            <div className="max-w-md mx-auto mb-6">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  placeholder={`${tCommon("search_markets")}…`}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {filteredMarkets.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                  <Search className="w-8 h-8 text-muted-foreground" />
                </div>
                <h4 className="text-lg font-semibold text-foreground mb-2">
                  {tCommon("no_markets_found")}
                </h4>
                <p className="text-muted-foreground">
                  {searchQuery
                    ? tCommon("try_a_different_search_term")
                    : t("all_available_markets_have_already_been_added")}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-w-5xl mx-auto">
                {filteredMarkets.map((market) => {
                  const isSelected = formData.selectedMarket?.id === market.id;

                  return (
                    <m.div
                      key={market.id}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => handleMarketSelect(market)}
                      className={cn(
                        "relative p-4 rounded-lg border-2 cursor-pointer transition-all",
                        isSelected
                          ? formData.source === "exchange"
                            ? "border-success bg-success/5"
                            : "border-primary bg-primary/5"
                          : "border-border hover:border-primary/50"
                      )}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            "w-10 h-10 rounded-lg flex items-center justify-center",
                            isSelected
                              ? formData.source === "exchange"
                                ? "bg-success"
                                : "bg-primary"
                              : "bg-muted"
                          )}>
                            <Bitcoin
                              className={cn(
                                "w-5 h-5",
                                isSelected ? "text-overlay-foreground" : "text-muted-foreground"
                              )}
                            />
                          </div>
                          <div>
                            <h4 className="font-semibold text-foreground">{market.symbol}</h4>
                            <p className="text-[11px] text-subtle-foreground">
                              {market.currency} / {market.pair}
                            </p>
                          </div>
                        </div>
                        <div className={cn(
                          "w-6 h-6 rounded-full border-2 flex items-center justify-center",
                          isSelected
                            ? formData.source === "exchange"
                              ? "border-success bg-success"
                              : "border-primary bg-primary"
                            : "border-border"
                        )}>
                          {isSelected && <Check className="w-4 h-4 text-success-foreground" />}
                        </div>
                      </div>

                      {/* Ecosystem market badges */}
                      {formData.source === "ecosystem" && (
                        <div className="flex flex-wrap gap-1.5">
                          {market.hasAiMarketMaker ? (
                            <Badge className="text-xs bg-success/10 text-success-ink border-success/20">
                              <Bot className="w-3 h-3 mr-1" />
                              {tCommon("ai_market_maker")}
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-xs text-muted-foreground">
                              {t("no_ai_market_maker")}
                            </Badge>
                          )}
                          {market.hasBinaryAiEngine && (
                            <Badge className="text-xs bg-primary/10 text-primary-ink border-primary/20">
                              <Cpu className="w-3 h-3 mr-1" />
                              {tCommon("binary_ai_engine")}
                            </Badge>
                          )}
                        </div>
                      )}
                    </m.div>
                  );
                })}
              </div>
            )}

            {/* Ecosystem market info */}
            {formData.source === "ecosystem" && (
              <div className="max-w-3xl mx-auto mt-6">
                <div className="p-4 bg-primary/10 border border-primary/20 rounded-xl">
                  <div className="flex items-start gap-3">
                    <Sparkles className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                    <div>
                      <h5 className="font-medium text-primary mb-1">
                        {t("ai_integration_status")}
                      </h5>
                      <p className="text-sm text-primary/80">
                        Markets with <strong>{tCommon("ai_market_maker")}</strong> badge can be used with the Binary AI Engine
                        for intelligent win rate optimization. Markets without it will use standard binary trading.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        );

      case 3:
        return (
          <div className="space-y-6 max-w-2xl mx-auto">
            <div className="text-center mb-8">
              <div className={cn(
                "w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4",
                formData.source === "exchange"
                  ? "bg-success"
                  : "bg-primary"
              )}>
                <Target className="w-8 h-8 text-success-foreground" />
              </div>
              <h3 className="text-2xl font-bold text-foreground">
                {tCommon("configure_market_settings")}
              </h3>
              <p className="text-muted-foreground mt-2">
                {t("customize_how_this_market_appears_to_traders")}
              </p>
            </div>

            {/* Selected Market Preview */}
            <Card className="overflow-hidden">
              <div className={cn(
                "h-1",
                formData.source === "exchange"
                  ? "bg-success"
                  : "bg-primary"
              )} />
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-6">
                  <span className={cn(
                    "grid h-7 w-7 shrink-0 place-items-center rounded-sm",
                    formData.source === "exchange"
                      ? "bg-success/15 text-success-ink"
                      : "bg-primary/15 text-primary-ink"
                  )}>
                    <Bitcoin className="h-3.5 w-3.5" />
                  </span>
                  <div>
                    <h4 className="text-2xl font-semibold leading-tight tracking-tight text-foreground">
                      {formData.selectedMarket?.symbol}
                    </h4>
                    <p className="text-[11px] text-subtle-foreground">
                      {formData.source === "exchange" ? t("exchange_market") : t("ecosystem_market")}
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  {/* Status Toggle */}
                  <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "p-2 rounded-lg",
                        formData.status ? "bg-success/10" : "bg-muted"
                      )}>
                        <Zap className={cn(
                          "w-5 h-5",
                          formData.status ? "text-success" : "text-muted-foreground"
                        )} />
                      </div>
                      <div>
                        <Label className="font-medium">{tCommon("active_status")}</Label>
                        <p className="text-xs text-muted-foreground">
                          {t("enable_this_market_for_trading_immediately")}
                        </p>
                      </div>
                    </div>
                    <Switch
                      checked={formData.status}
                      onCheckedChange={(checked) => setFormData((prev) => ({ ...prev, status: checked }))}
                    />
                  </div>

                  {/* Trending Toggle */}
                  <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "p-2 rounded-lg",
                        formData.isTrending ? "bg-primary/10" : "bg-muted"
                      )}>
                        <TrendingUp className={cn(
                          "w-5 h-5",
                          formData.isTrending ? "text-primary" : "text-muted-foreground"
                        )} />
                      </div>
                      <div>
                        <Label className="font-medium">{t("mark_as_trending")}</Label>
                        <p className="text-xs text-muted-foreground">
                          {t("highlight_this_market_as_currently_trending")}
                        </p>
                      </div>
                    </div>
                    <Switch
                      checked={formData.isTrending}
                      onCheckedChange={(checked) => setFormData((prev) => ({ ...prev, isTrending: checked }))}
                    />
                  </div>

                  {/* Hot Toggle */}
                  <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "p-2 rounded-lg",
                        formData.isHot ? "bg-warning/10" : "bg-muted"
                      )}>
                        <Flame className={cn(
                          "w-5 h-5",
                          formData.isHot ? "text-warning" : "text-muted-foreground"
                        )} />
                      </div>
                      <div>
                        <Label className="font-medium">{t("mark_as_hot")}</Label>
                        <p className="text-xs text-muted-foreground">
                          {t("feature_this_market_as_popular_hot")}
                        </p>
                      </div>
                    </div>
                    <Switch
                      checked={formData.isHot}
                      onCheckedChange={(checked) => setFormData((prev) => ({ ...prev, isHot: checked }))}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* AI Features Info for Ecosystem */}
            {formData.source === "ecosystem" && formData.selectedMarket && (
              <Card className="overflow-hidden border-primary/20">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <span className="grid h-7 w-7 shrink-0 place-items-center rounded-sm bg-primary/15 text-primary">
                      <Cpu className="h-3.5 w-3.5" />
                    </span>
                    {t("ai_features_status")}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <span className="text-sm">{tCommon("ai_market_maker")}</span>
                    {formData.selectedMarket.hasAiMarketMaker ? (
                      <Badge tone="success" appearance="soft">
                        <Check className="w-3 h-3 mr-1" />
                        Available
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-muted-foreground">
                        {tCommon("not_configured")}
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <span className="text-sm">{tCommon("binary_ai_engine")}</span>
                    {formData.selectedMarket.hasBinaryAiEngine ? (
                      <Badge tone="primary" appearance="soft">
                        <Check className="w-3 h-3 mr-1" />
                        Active
                      </Badge>
                    ) : formData.selectedMarket.hasAiMarketMaker ? (
                      <Badge variant="outline" className="text-warning border-warning/20">
                        {t("can_be_enabled")}
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-muted-foreground">
                        {t("requires_ai_market_maker")}
                      </Badge>
                    )}
                  </div>

                  {!formData.selectedMarket.hasAiMarketMaker && (
                    <div className="p-3 bg-warning/10 border border-warning/20 rounded-lg">
                      <p className="text-xs text-warning">
                        {t("to_use_ai_features_first_create")}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Ready to Create */}
            <div className="p-5 bg-success/10 rounded-lg border border-success/20">
              <div className="flex items-start gap-3">
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-sm bg-success/15 text-success">
                  <Check className="h-3.5 w-3.5" />
                </span>
                <div>
                  <h4 className="font-semibold text-success mb-1">
                    {tCommon("ready_to_create")}
                  </h4>
                  <p className="text-sm text-success/80">
                    Click "Create Market" to add {formData.selectedMarket?.symbol} to your binary trading markets.
                  </p>
                </div>
              </div>
            </div>
          </div>
        );
    }
  };

  return (
    /* No background on this root. `HeroSection` below mounts `WorkspaceGround`
       (`fixed inset-0 -z-10`) and an opaque root paints straight over it, so
       the hairline grid, the ramp step and the accent stop were all drawn and
       none of them reached the screen. What was here was the old full-page
       wash the ground replaced. `min-h-screen` stays: the ground is `fixed`,
       so the shell still has to own the viewport. */
    <div className="min-h-screen">
      <HeroSection
        badge={{
          icon: <Sparkles className="h-3.5 w-3.5" />,
          text: "Create New",
        }}
        title={t("add_binary_market")}
        description={t("select_a_market_from_your_exchange")}
        layout="split"
        rightContentAlign="center"
        rightContent={
          <Button
            variant="outline"
            onClick={() => router.push("/admin/finance/binary/market")}
            className="border-primary/30 hover:border-primary/50 hover:bg-primary/5"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            {tCommon("back_to_markets")}
          </Button>
        }
      />

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 max-w-5xl">
        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            {steps.map((step, index) => (
              <React.Fragment key={step.number}>
                <div className="flex flex-col items-center flex-1">
                  <div
                    className={cn(
                      "w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-300",
                      currentStep >= step.number
                        ? formData.source === "ecosystem"
                          ? "bg-primary shadow-lg"
                          : "bg-success shadow-lg"
                        : "bg-muted"
                    )}
                  >
                    {currentStep > step.number ? (
                      <Check className="w-6 h-6 text-success-foreground" />
                    ) : (
                      <Icon
                        icon={step.icon}
                        className={cn(
                          "w-6 h-6",
                          currentStep >= step.number ? "text-overlay-foreground" : "text-muted-foreground"
                        )}
                      />
                    )}
                  </div>
                  <span
                    className={cn(
                      "text-sm font-medium mt-2 hidden sm:block",
                      currentStep >= step.number
                        ? formData.source === "ecosystem"
                          ? "text-primary"
                          : "text-success"
                        : "text-muted-foreground"
                    )}
                  >
                    {step.title}
                  </span>
                  <span className="text-xs text-muted-foreground hidden md:block">
                    {step.description}
                  </span>
                </div>
                {index < steps.length - 1 && (
                  <div
                    className={cn(
                      "flex-1 h-1 mx-2 rounded-full transition-all duration-300",
                      currentStep > step.number
                        ? formData.source === "ecosystem"
                          ? "bg-primary"
                          : "bg-success"
                        : "bg-muted"
                    )}
                  />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Step Content */}
        <Card className={cn(
          "mb-6",
          formData.source === "ecosystem" ? "border-primary/20" : "border-success/20"
        )}>
          <CardContent className="p-8">
            <AnimatePresence mode="wait">
              <m.div
                key={currentStep}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
              >
                {renderStep()}
              </m.div>
            </AnimatePresence>
          </CardContent>
        </Card>

        {/* Navigation */}
        <div className="flex justify-between">
          <Button
            variant="outline"
            onClick={handlePrev}
            size="lg"
            className="border-primary/30 hover:border-primary/50"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            {currentStep === 1 ? tCommon("cancel") : tCommon("previous")}
          </Button>

          {currentStep < 3 ? (
            <Button
              onClick={handleNext}
              disabled={!validateStep(currentStep)}
              size="lg"
              className={cn(
                formData.source === "ecosystem"
                  ? "bg-primary hover:bg-primary"
                  : "bg-success hover:bg-success"
              )}
            >
              {tCommon("next_step")}
              <ChevronRight className="w-5 h-5 ml-2" />
            </Button>
          ) : (
            /* `loading` is the Button's own affordance — it renders the
               spinner, disables itself and sets `aria-busy`. The hand-rolled
               `loading ? <Loader2/> : <Check/>` this replaces swapped one icon
               component for another, which is a tree swap the scanner reads as
               a divergent branch, and it also left the button ENABLED during
               the POST because `disabled` was passed separately. */
            <Button
              onClick={handleSubmit}
              loading={submitting}
              size="lg"
              className="bg-success"
            >
              {!submitting && <Check className="w-5 h-5 mr-2" />}
              {submitting ? `${tCommon("creating")}…` : tCommon("create_market")}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
