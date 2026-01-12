"use client";

import React, { useState, useEffect } from "react";
import { $fetch } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Icon } from "@iconify/react";
import { useRouter } from "@/i18n/routing";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { HeroSection } from "@/components/ui/hero-section";
import { motion, AnimatePresence } from "framer-motion";
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
  Loader2,
  Database,
  Zap,
  Bot,
} from "lucide-react";
import { Input } from "@/components/ui/input";

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
  const [loading, setLoading] = useState(false);
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
        toast.error("Failed to load available markets");
        return;
      }

      setAvailableData(data);
    } catch (err) {
      console.error("Failed to load markets", err);
      toast.error("Failed to load available markets");
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
      toast.error("Please select a market");
      return;
    }

    try {
      setLoading(true);
      const { data, error } = await $fetch({
        url: "/api/admin/finance/binary/market",
        method: "POST",
        body: {
          currency: formData.selectedMarket.currency,
          pair: formData.selectedMarket.pair,
          isTrending: formData.isTrending,
          isHot: formData.isHot,
          status: formData.status,
        },
      });

      if (error) {
        toast.error(error || "Failed to create binary market");
        return;
      }

      toast.success("Binary market created successfully!");
      router.push("/admin/finance/binary/market");
    } catch (err: any) {
      toast.error(err.message || "Failed to create binary market");
    } finally {
      setLoading(false);
    }
  };

  const filteredMarkets = formData.source === "exchange"
    ? availableData?.exchangeMarkets.filter((m) =>
        m.symbol.toLowerCase().includes(searchQuery.toLowerCase())
      ) || []
    : availableData?.ecosystemMarkets.filter((m) =>
        m.symbol.toLowerCase().includes(searchQuery.toLowerCase())
      ) || [];

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center mx-auto mb-4 shadow-lg">
                <Database className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-foreground">
                Select Market Source
              </h3>
              <p className="text-muted-foreground mt-2 max-w-md mx-auto">
                Choose where to import your binary trading market from
              </p>
            </div>

            {loadingMarkets ? (
              <div className="flex flex-col items-center justify-center py-12">
                <Loader2 className="w-12 h-12 text-primary animate-spin mb-4" />
                <p className="text-muted-foreground">Loading available markets...</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto">
                {/* Exchange Markets */}
                <motion.div
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleSourceSelect("exchange")}
                  className={cn(
                    "relative p-6 rounded-2xl border-2 cursor-pointer transition-all",
                    formData.source === "exchange"
                      ? "border-emerald-500 bg-emerald-500/5 shadow-lg"
                      : "border-border hover:border-emerald-500/50"
                  )}
                >
                  <div className="flex items-start gap-4">
                    <div className="p-3 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 shadow-lg">
                      <Globe className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <h4 className="text-lg font-bold text-foreground mb-1">
                        Exchange Markets
                      </h4>
                      <p className="text-sm text-muted-foreground mb-3">
                        Import markets from your connected exchange provider
                      </p>
                      <div className="flex items-center gap-2 mb-3">
                        <Badge variant="secondary" className="text-xs">
                          {availableData?.exchangeMarkets.length || 0} available
                        </Badge>
                      </div>
                      <div className="p-3 bg-muted/50 rounded-lg space-y-2">
                        <div className="flex items-start gap-2 text-xs text-muted-foreground">
                          <Check className="w-3 h-3 text-emerald-500 mt-0.5 shrink-0" />
                          <span>Real-time price data from exchange</span>
                        </div>
                        <div className="flex items-start gap-2 text-xs text-muted-foreground">
                          <Check className="w-3 h-3 text-emerald-500 mt-0.5 shrink-0" />
                          <span>Standard binary trading without AI</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>

                {/* Ecosystem Markets */}
                <motion.div
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleSourceSelect("ecosystem")}
                  className={cn(
                    "relative p-6 rounded-2xl border-2 cursor-pointer transition-all",
                    formData.source === "ecosystem"
                      ? "border-purple-500 bg-purple-500/5 shadow-lg"
                      : "border-border hover:border-purple-500/50"
                  )}
                >
                  <div className="flex items-start gap-4">
                    <div className="p-3 rounded-xl bg-gradient-to-br from-purple-500 to-violet-600 shadow-lg">
                      <Layers className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <h4 className="text-lg font-bold text-foreground mb-1">
                        Ecosystem Markets
                      </h4>
                      <p className="text-sm text-muted-foreground mb-3">
                        Use markets from your internal ecosystem
                      </p>
                      <div className="flex items-center gap-2 mb-3">
                        <Badge variant="secondary" className="text-xs">
                          {availableData?.ecosystemMarkets.length || 0} available
                        </Badge>
                        <Badge className="text-xs bg-purple-500/10 text-purple-500 border-purple-500/20">
                          <Bot className="w-3 h-3 mr-1" />
                          AI Compatible
                        </Badge>
                      </div>
                      <div className="p-3 bg-muted/50 rounded-lg space-y-2">
                        <div className="flex items-start gap-2 text-xs text-muted-foreground">
                          <Check className="w-3 h-3 text-purple-500 mt-0.5 shrink-0" />
                          <span>Supports AI Market Maker integration</span>
                        </div>
                        <div className="flex items-start gap-2 text-xs text-muted-foreground">
                          <Check className="w-3 h-3 text-purple-500 mt-0.5 shrink-0" />
                          <span>Supports Binary AI Engine (Rise/Fall only)</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              </div>
            )}

            {/* Info Panels */}
            <div className="max-w-3xl mx-auto mt-8 space-y-4">
              <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl">
                <div className="flex items-start gap-3">
                  <Info className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
                  <div>
                    <h5 className="font-medium text-blue-600 dark:text-blue-400 mb-1">
                      When to use Ecosystem Markets
                    </h5>
                    <p className="text-sm text-blue-600/80 dark:text-blue-400/80">
                      Choose ecosystem markets if you want to use the AI Market Maker for price control,
                      or the Binary AI Engine for win rate optimization. This requires setting up an
                      AI Market Maker first.
                    </p>
                  </div>
                </div>
              </div>

              {!availableData?.binarySettings.isRiseFallOnly && (
                <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                    <div>
                      <h5 className="font-medium text-amber-600 dark:text-amber-400 mb-1">
                        Binary AI Engine Requirement
                      </h5>
                      <p className="text-sm text-amber-600/80 dark:text-amber-400/80">
                        The Binary AI Engine only works with <strong>Rise/Fall</strong> order type.
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
                "w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg",
                formData.source === "exchange"
                  ? "bg-gradient-to-br from-emerald-500 to-teal-600"
                  : "bg-gradient-to-br from-purple-500 to-violet-600"
              )}>
                <TrendingUp className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-foreground">
                Select {formData.source === "exchange" ? "Exchange" : "Ecosystem"} Market
              </h3>
              <p className="text-muted-foreground mt-2 max-w-md mx-auto">
                Choose a trading pair to add as a binary market
              </p>
            </div>

            {/* Search */}
            <div className="max-w-md mx-auto mb-6">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  placeholder="Search markets..."
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
                  No markets found
                </h4>
                <p className="text-muted-foreground">
                  {searchQuery
                    ? "Try a different search term"
                    : "All available markets have already been added"}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-w-5xl mx-auto">
                {filteredMarkets.map((market) => {
                  const isSelected = formData.selectedMarket?.id === market.id;

                  return (
                    <motion.div
                      key={market.id}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => handleMarketSelect(market)}
                      className={cn(
                        "relative p-4 rounded-xl border-2 cursor-pointer transition-all",
                        isSelected
                          ? formData.source === "exchange"
                            ? "border-emerald-500 bg-emerald-500/5 shadow-lg"
                            : "border-purple-500 bg-purple-500/5 shadow-lg"
                          : "border-border hover:border-primary/50"
                      )}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            "w-10 h-10 rounded-lg flex items-center justify-center",
                            isSelected
                              ? formData.source === "exchange"
                                ? "bg-emerald-500"
                                : "bg-purple-500"
                              : "bg-muted"
                          )}>
                            <Icon
                              icon="mdi:bitcoin"
                              className={cn(
                                "w-5 h-5",
                                isSelected ? "text-white" : "text-muted-foreground"
                              )}
                            />
                          </div>
                          <div>
                            <h4 className="font-bold text-foreground">{market.symbol}</h4>
                            <p className="text-xs text-muted-foreground">
                              {market.currency} / {market.pair}
                            </p>
                          </div>
                        </div>
                        <div className={cn(
                          "w-6 h-6 rounded-full border-2 flex items-center justify-center",
                          isSelected
                            ? formData.source === "exchange"
                              ? "border-emerald-500 bg-emerald-500"
                              : "border-purple-500 bg-purple-500"
                            : "border-border"
                        )}>
                          {isSelected && <Check className="w-4 h-4 text-white" />}
                        </div>
                      </div>

                      {/* Ecosystem market badges */}
                      {formData.source === "ecosystem" && (
                        <div className="flex flex-wrap gap-1.5">
                          {market.hasAiMarketMaker ? (
                            <Badge className="text-xs bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
                              <Bot className="w-3 h-3 mr-1" />
                              AI Market Maker
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-xs text-muted-foreground">
                              No AI Market Maker
                            </Badge>
                          )}
                          {market.hasBinaryAiEngine && (
                            <Badge className="text-xs bg-purple-500/10 text-purple-600 border-purple-500/20">
                              <Cpu className="w-3 h-3 mr-1" />
                              Binary AI Engine
                            </Badge>
                          )}
                        </div>
                      )}
                    </motion.div>
                  );
                })}
              </div>
            )}

            {/* Ecosystem market info */}
            {formData.source === "ecosystem" && (
              <div className="max-w-3xl mx-auto mt-6">
                <div className="p-4 bg-purple-500/10 border border-purple-500/20 rounded-xl">
                  <div className="flex items-start gap-3">
                    <Sparkles className="w-5 h-5 text-purple-500 shrink-0 mt-0.5" />
                    <div>
                      <h5 className="font-medium text-purple-600 dark:text-purple-400 mb-1">
                        AI Integration Status
                      </h5>
                      <p className="text-sm text-purple-600/80 dark:text-purple-400/80">
                        Markets with <strong>AI Market Maker</strong> badge can be used with the Binary AI Engine
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
                "w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg",
                formData.source === "exchange"
                  ? "bg-gradient-to-br from-emerald-500 to-teal-600"
                  : "bg-gradient-to-br from-purple-500 to-violet-600"
              )}>
                <Target className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-foreground">
                Configure Market Settings
              </h3>
              <p className="text-muted-foreground mt-2">
                Customize how this market appears to traders
              </p>
            </div>

            {/* Selected Market Preview */}
            <Card className="overflow-hidden">
              <div className={cn(
                "h-1",
                formData.source === "exchange"
                  ? "bg-gradient-to-r from-emerald-500 to-teal-600"
                  : "bg-gradient-to-r from-purple-500 to-violet-600"
              )} />
              <CardContent className="p-6">
                <div className="flex items-center gap-4 mb-6">
                  <div className={cn(
                    "w-14 h-14 rounded-xl flex items-center justify-center",
                    formData.source === "exchange"
                      ? "bg-gradient-to-br from-emerald-500 to-teal-600"
                      : "bg-gradient-to-br from-purple-500 to-violet-600"
                  )}>
                    <Icon icon="mdi:bitcoin" className="w-7 h-7 text-white" />
                  </div>
                  <div>
                    <h4 className="text-xl font-bold text-foreground">
                      {formData.selectedMarket?.symbol}
                    </h4>
                    <p className="text-sm text-muted-foreground">
                      {formData.source === "exchange" ? "Exchange Market" : "Ecosystem Market"}
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  {/* Status Toggle */}
                  <div className="flex items-center justify-between p-4 bg-muted/50 rounded-xl">
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "p-2 rounded-lg",
                        formData.status ? "bg-emerald-500/10" : "bg-muted"
                      )}>
                        <Zap className={cn(
                          "w-5 h-5",
                          formData.status ? "text-emerald-500" : "text-muted-foreground"
                        )} />
                      </div>
                      <div>
                        <Label className="font-medium">Active Status</Label>
                        <p className="text-xs text-muted-foreground">
                          Enable this market for trading immediately
                        </p>
                      </div>
                    </div>
                    <Switch
                      checked={formData.status}
                      onCheckedChange={(checked) => setFormData((prev) => ({ ...prev, status: checked }))}
                    />
                  </div>

                  {/* Trending Toggle */}
                  <div className="flex items-center justify-between p-4 bg-muted/50 rounded-xl">
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "p-2 rounded-lg",
                        formData.isTrending ? "bg-blue-500/10" : "bg-muted"
                      )}>
                        <TrendingUp className={cn(
                          "w-5 h-5",
                          formData.isTrending ? "text-blue-500" : "text-muted-foreground"
                        )} />
                      </div>
                      <div>
                        <Label className="font-medium">Mark as Trending</Label>
                        <p className="text-xs text-muted-foreground">
                          Highlight this market as currently trending
                        </p>
                      </div>
                    </div>
                    <Switch
                      checked={formData.isTrending}
                      onCheckedChange={(checked) => setFormData((prev) => ({ ...prev, isTrending: checked }))}
                    />
                  </div>

                  {/* Hot Toggle */}
                  <div className="flex items-center justify-between p-4 bg-muted/50 rounded-xl">
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "p-2 rounded-lg",
                        formData.isHot ? "bg-orange-500/10" : "bg-muted"
                      )}>
                        <Flame className={cn(
                          "w-5 h-5",
                          formData.isHot ? "text-orange-500" : "text-muted-foreground"
                        )} />
                      </div>
                      <div>
                        <Label className="font-medium">Mark as Hot</Label>
                        <p className="text-xs text-muted-foreground">
                          Feature this market as popular/hot
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
              <Card className="overflow-hidden border-purple-500/20">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Cpu className="w-5 h-5 text-purple-500" />
                    AI Features Status
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <span className="text-sm">AI Market Maker</span>
                    {formData.selectedMarket.hasAiMarketMaker ? (
                      <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
                        <Check className="w-3 h-3 mr-1" />
                        Available
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-muted-foreground">
                        Not Configured
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <span className="text-sm">Binary AI Engine</span>
                    {formData.selectedMarket.hasBinaryAiEngine ? (
                      <Badge className="bg-purple-500/10 text-purple-600 border-purple-500/20">
                        <Check className="w-3 h-3 mr-1" />
                        Active
                      </Badge>
                    ) : formData.selectedMarket.hasAiMarketMaker ? (
                      <Badge variant="outline" className="text-amber-600 border-amber-500/20">
                        Can be enabled
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-muted-foreground">
                        Requires AI Market Maker
                      </Badge>
                    )}
                  </div>

                  {!formData.selectedMarket.hasAiMarketMaker && (
                    <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                      <p className="text-xs text-amber-600 dark:text-amber-400">
                        To use AI features, first create an AI Market Maker for this ecosystem market.
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Ready to Create */}
            <div className="p-5 bg-gradient-to-r from-emerald-500/10 to-emerald-500/5 rounded-2xl border border-emerald-500/20">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center shrink-0">
                  <Check className="w-5 h-5 text-emerald-500" />
                </div>
                <div>
                  <h4 className="font-semibold text-emerald-600 dark:text-emerald-400 mb-1">
                    Ready to Create
                  </h4>
                  <p className="text-sm text-emerald-600/80 dark:text-emerald-400/80">
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
    <div className="min-h-screen bg-gradient-to-b from-background via-muted/20 to-background dark:from-zinc-950 dark:via-zinc-900/30 dark:to-zinc-950">
      <HeroSection
        badge={{
          icon: <Sparkles className="h-3.5 w-3.5" />,
          text: "Create New",
          gradient: formData.source === "ecosystem"
            ? "from-purple-100 to-violet-100 dark:from-purple-950 dark:to-violet-950"
            : "from-emerald-100 to-teal-100 dark:from-emerald-950 dark:to-teal-950",
          iconColor: formData.source === "ecosystem" ? "text-purple-500" : "text-emerald-500",
          textColor: formData.source === "ecosystem"
            ? "text-purple-600 dark:text-purple-400"
            : "text-emerald-600 dark:text-emerald-400",
        }}
        title={[
          { text: "Add Binary " },
          {
            text: "Market",
            gradient: formData.source === "ecosystem"
              ? "from-purple-600 via-violet-500 to-purple-600 dark:from-purple-400 dark:via-violet-400 dark:to-purple-400"
              : "from-emerald-600 via-teal-500 to-emerald-600 dark:from-emerald-400 dark:via-teal-400 dark:to-emerald-400",
          },
        ]}
        description="Select a market from your exchange or ecosystem to enable binary trading"
        paddingTop="pt-24"
        paddingBottom="pb-12"
        layout="split"
        rightContentAlign="center"
        background={{
          orbs: formData.source === "ecosystem"
            ? [
                { color: "#a855f7", position: { top: "-10rem", right: "-10rem" }, size: "20rem" },
                { color: "#7c3aed", position: { bottom: "-5rem", left: "-5rem" }, size: "15rem" },
              ]
            : [
                { color: "#10b981", position: { top: "-10rem", right: "-10rem" }, size: "20rem" },
                { color: "#14b8a6", position: { bottom: "-5rem", left: "-5rem" }, size: "15rem" },
              ],
        }}
        particles={{
          count: 6,
          type: "floating",
          colors: formData.source === "ecosystem" ? ["#a855f7", "#7c3aed"] : ["#10b981", "#14b8a6"],
          size: 8,
        }}
        rightContent={
          <Button
            variant="outline"
            onClick={() => router.push("/admin/finance/binary/market")}
            className="border-primary/30 hover:border-primary/50 hover:bg-primary/5"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            Back to Markets
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
                          ? "bg-gradient-to-br from-purple-500 to-violet-600 shadow-lg"
                          : "bg-gradient-to-br from-emerald-500 to-teal-600 shadow-lg"
                        : "bg-muted"
                    )}
                  >
                    {currentStep > step.number ? (
                      <Check className="w-6 h-6 text-white" />
                    ) : (
                      <Icon
                        icon={step.icon}
                        className={cn(
                          "w-6 h-6",
                          currentStep >= step.number ? "text-white" : "text-muted-foreground"
                        )}
                      />
                    )}
                  </div>
                  <span
                    className={cn(
                      "text-sm font-medium mt-2 hidden sm:block",
                      currentStep >= step.number
                        ? formData.source === "ecosystem"
                          ? "text-purple-600 dark:text-purple-400"
                          : "text-emerald-600 dark:text-emerald-400"
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
                          ? "bg-gradient-to-r from-purple-500 to-violet-600"
                          : "bg-gradient-to-r from-emerald-500 to-teal-600"
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
          formData.source === "ecosystem" ? "border-purple-500/20" : "border-emerald-500/20"
        )}>
          <CardContent className="p-8">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentStep}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
              >
                {renderStep()}
              </motion.div>
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
            {currentStep === 1 ? "Cancel" : "Previous"}
          </Button>

          {currentStep < 3 ? (
            <Button
              onClick={handleNext}
              disabled={!validateStep(currentStep)}
              size="lg"
              className={cn(
                formData.source === "ecosystem"
                  ? "bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-700 hover:to-violet-700"
                  : "bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700"
              )}
            >
              Next Step
              <ChevronRight className="w-5 h-5 ml-2" />
            </Button>
          ) : (
            <Button
              onClick={handleSubmit}
              disabled={loading}
              size="lg"
              className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              ) : (
                <Check className="w-5 h-5 mr-2" />
              )}
              {loading ? "Creating..." : "Create Market"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
