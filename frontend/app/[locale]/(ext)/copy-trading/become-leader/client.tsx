"use client";

import { useEffect, useState, useRef } from "react";
import { Link, useRouter } from "@/i18n/routing";
import { Card, CardContent } from "@/components/ui/card";
import BecomeLeaderLoading from "./loading";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Loader2,
  DollarSign,
  Users,
  BarChart3,
  Crown,
  Zap,
  Shield,
  CheckCircle2,
  Trophy,
  TrendingUp,
  Star,
  LineChart,
  X,
  Settings2,
} from "lucide-react";
import { $fetch } from "@/lib/api";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface EcosystemMarket {
  id: string;
  currency: string;
  pair: string;
  metadata: any;
}

interface SelectedMarket {
  symbol: string;
  baseCurrency: string;
  quoteCurrency: string;
  minBase: number;
  minQuote: number;
}

const tradingStyles = [
  {
    value: "SCALPING",
    title: "Scalping",
    description: "Quick trades, small profits, high frequency",
    icon: Zap,
  },
  {
    value: "DAY_TRADING",
    title: "Day Trading",
    description: "Positions closed same day",
    icon: BarChart3,
  },
  {
    value: "SWING",
    title: "Swing Trading",
    description: "Hold for days to weeks",
    icon: TrendingUp,
  },
  {
    value: "POSITION",
    title: "Position Trading",
    description: "Long-term holds, weeks to months",
    icon: Shield,
  },
];

const riskLevels = [
  {
    value: "LOW",
    title: "Low Risk",
    description: "Conservative approach, steady growth",
    color: 'text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-900/30',
  },
  {
    value: "MEDIUM",
    title: "Medium Risk",
    description: "Balanced risk and reward",
    color: 'text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/30',
  },
  {
    value: "HIGH",
    title: "High Risk",
    description: "Aggressive strategy, higher volatility",
    color: 'text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/30',
  },
];

export default function BecomeLeaderClient() {
  const t = useTranslations("ext_copy-trading");
  const tExt = useTranslations("ext");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasExistingApplication, setHasExistingApplication] = useState(false);

  // Form state
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [tradingStyle, setTradingStyle] = useState("DAY_TRADING");
  const [riskLevel, setRiskLevel] = useState("MEDIUM");
  const [profitSharePercent, setProfitSharePercent] = useState(20);

  // Markets state
  const [availableMarkets, setAvailableMarkets] = useState<EcosystemMarket[]>([]);
  const [selectedMarkets, setSelectedMarkets] = useState<SelectedMarket[]>([]);
  const [marketsLoading, setMarketsLoading] = useState(true);

  const fetchedRef = useRef(false);

  useEffect(() => {
    if (fetchedRef.current) return;
    fetchedRef.current = true;

    const checkExisting = async () => {
      const { data, error } = await $fetch({
        url: "/api/copy-trading/leader/me",
        method: "GET",
        silentSuccess: true,
      });

      if (!error && data) {
        setHasExistingApplication(true);
        router.push("/copy-trading/dashboard");
        return;
      }

      setIsLoading(false);
    };

    const fetchMarkets = async () => {
      setMarketsLoading(true);
      const { data, error } = await $fetch({
        url: "/api/ecosystem/market",
        method: "GET",
        silentSuccess: true,
      });

      if (!error && data) {
        setAvailableMarkets(data);
      }
      setMarketsLoading(false);
    };

    checkExisting();
    fetchMarkets();
  }, [router]);

  const addMarket = (symbol: string) => {
    const [baseCurrency, quoteCurrency] = symbol.split("/");
    if (!selectedMarkets.find((m) => m.symbol === symbol)) {
      setSelectedMarkets([
        ...selectedMarkets,
        { symbol, baseCurrency, quoteCurrency, minBase: 0, minQuote: 0 },
      ]);
    }
  };

  const removeMarket = (symbol: string) => {
    setSelectedMarkets(selectedMarkets.filter((m) => m.symbol !== symbol));
  };

  const updateMarketSettings = (
    symbol: string,
    field: "minBase" | "minQuote",
    value: number
  ) => {
    setSelectedMarkets(
      selectedMarkets.map((m) =>
        m.symbol === symbol ? { ...m, [field]: value } : m
      )
    );
  };

  const handleSubmit = async () => {
    if (!displayName.trim()) {
      toast.error("Display name is required");
      return;
    }

    if (displayName.length < 2) {
      toast.error("Display name must be at least 2 characters");
      return;
    }

    if (selectedMarkets.length === 0) {
      toast.error("Please select at least one market to trade");
      return;
    }

    setIsSubmitting(true);
    const { error } = await $fetch({
      url: "/api/copy-trading/leader/apply",
      method: "POST",
      body: {
        displayName: displayName.trim(),
        bio: bio.trim(),
        tradingStyle,
        riskLevel,
        profitSharePercent,
        markets: selectedMarkets.map((m) => ({
          symbol: m.symbol,
          minBase: m.minBase,
          minQuote: m.minQuote,
        })),
      },
    });

    if (!error) {
      toast.success("Application submitted successfully!");
      router.push("/copy-trading/dashboard");
    }
    setIsSubmitting(false);
  };

  if (isLoading) {
    return <BecomeLeaderLoading />;
  }

  return (
    <div className="bg-muted/30 dark:bg-zinc-950">
      <div className="container mx-auto px-4 py-8 max-w-4xl pt-20">
        {/* Back button */}
        <Link
          href="/copy-trading"
          className="inline-flex items-center text-sm text-zinc-600 dark:text-zinc-400 hover:text-primary mb-6 group"
        >
          <ArrowLeft className="h-4 w-4 mr-2 transition-transform group-hover:-translate-x-1" />
          {t("back_to_copy_trading")}
        </Link>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          {/* Header */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center px-4 py-2 rounded-full bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/20 dark:border-amber-500/30 mb-6">
              <Crown className="w-4 h-4 text-amber-500 mr-2" />
              <span className="text-sm font-semibold text-amber-600 dark:text-amber-400">
                {t("become_a_leader")}
              </span>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-zinc-900 dark:text-zinc-100 mb-4">
              {t("share_your_trading_expertise")}
            </h1>
            <p className="text-lg text-zinc-600 dark:text-zinc-400 max-w-2xl mx-auto">
              {t("help_others_profit_from_your_trades")}
            </p>
          </div>

          {/* Benefits */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-12">
            {[
              { icon: Users, title: "Build Following", desc: "Attract traders who want to copy your strategies" },
              { icon: DollarSign, title: "Earn Commission", desc: "Get paid when your followers make profits" },
              { icon: Trophy, title: "Gain Recognition", desc: "Build your reputation as a top trader" },
            ].map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 * i }}
              >
                <Card className="h-full ">
                  <CardContent className="p-5 text-center">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center mx-auto mb-3">
                      <item.icon className="h-6 w-6 text-white" />
                    </div>
                    <h3 className="font-semibold mb-1">{item.title}</h3>
                    <p className="text-sm text-zinc-500">{item.desc}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>

          {/* Form */}
          <div className="space-y-6">
            {/* Profile Section */}
            <Card>
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
                  <Star className="h-5 w-5 text-amber-500" />
                  {tExt("your_profile")}
                </h3>
                <div className="space-y-6">
                  <div>
                    <Label htmlFor="displayName" className="text-base">
                      {tExt("display_name")} <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="displayName"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder={t("enter_your_trader_name")}
                      className="mt-2 h-12"
                      maxLength={50}
                    />
                    <p className="text-xs text-zinc-500 mt-1">
                      {t("this_is_how_followers_will_see_you")}{displayName.length}/50)
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="bio" className="text-base">
                      Bio
                    </Label>
                    <Textarea
                      id="bio"
                      value={bio}
                      onChange={(e) => setBio(e.target.value)}
                      placeholder={t("tell_followers_about_your_trading_strategy")}
                      className="mt-2 min-h-[120px]"
                      maxLength={500}
                    />
                    <p className="text-xs text-zinc-500 mt-1">
                      {bio.length}/500 characters
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Trading Style */}
            <Card>
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-amber-500" />
                  {tExt("trading_style")}
                </h3>
                <RadioGroup
                  value={tradingStyle}
                  onValueChange={setTradingStyle}
                  className="grid grid-cols-1 md:grid-cols-2 gap-4"
                >
                  {tradingStyles.map((style) => (
                    <label
                      key={style.value}
                      className={`flex items-start gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                        tradingStyle === style.value
                          ? "border-amber-500 bg-amber-500/5"
                          : "border-zinc-200 dark:border-zinc-700 hover:border-zinc-300 dark:hover:border-zinc-600"
                      }`}
                    >
                      <RadioGroupItem value={style.value} className="mt-1" />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <style.icon className="h-4 w-4 text-amber-500" />
                          <span className="font-medium">{style.title}</span>
                        </div>
                        <p className="text-sm text-zinc-500 mt-1">{style.description}</p>
                      </div>
                    </label>
                  ))}
                </RadioGroup>
              </CardContent>
            </Card>

            {/* Risk Level */}
            <Card>
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
                  <Shield className="h-5 w-5 text-amber-500" />
                  {tCommon("risk_level")}
                </h3>
                <RadioGroup
                  value={riskLevel}
                  onValueChange={setRiskLevel}
                  className="grid grid-cols-1 md:grid-cols-3 gap-4"
                >
                  {riskLevels.map((level) => (
                    <label
                      key={level.value}
                      className={`flex flex-col items-center p-4 rounded-xl border-2 cursor-pointer transition-all text-center ${
                        riskLevel === level.value
                          ? "border-amber-500 bg-amber-500/5"
                          : "border-zinc-200 dark:border-zinc-700 hover:border-zinc-300 dark:hover:border-zinc-600"
                      }`}
                    >
                      <RadioGroupItem value={level.value} className="sr-only" />
                      <Badge className={`mb-2 ${level.color}`}>{level.title}</Badge>
                      <p className="text-xs text-zinc-500">{level.description}</p>
                    </label>
                  ))}
                </RadioGroup>
              </CardContent>
            </Card>

            {/* Trading Markets Selection */}
            <Card>
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
                  <LineChart className="h-5 w-5 text-amber-500" />
                  {t("trading_markets")} <span className="text-red-500">*</span>
                </h3>
                <p className="text-sm text-zinc-500 mb-4">
                  {t("select_the_markets_you_will_be_trading_on")}
                </p>

                {/* Market selector */}
                <div className="mb-6">
                  <Select
                    onValueChange={(value) => addMarket(value)}
                    disabled={marketsLoading}
                  >
                    <SelectTrigger className="h-12">
                      <SelectValue
                        placeholder={
                          marketsLoading
                            ? "Loading markets..."
                            : "Select a market to add"
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {availableMarkets
                        .filter(
                          (m) =>
                            !selectedMarkets.find(
                              (sm) => sm.symbol === `${m.currency}/${m.pair}`
                            )
                        )
                        .map((market) => (
                          <SelectItem
                            key={market.id}
                            value={`${market.currency}/${market.pair}`}
                          >
                            {market.currency}/{market.pair}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Selected markets with min settings */}
                {selectedMarkets.length > 0 ? (
                  <div className="space-y-4">
                    {selectedMarkets.map((market) => (
                      <div
                        key={market.symbol}
                        className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50"
                      >
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-2">
                            <Badge
                              variant="secondary"
                              className="bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300"
                            >
                              {market.symbol}
                            </Badge>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeMarket(market.symbol)}
                            className="text-zinc-400 hover:text-red-500 transition-colors"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <Label
                              htmlFor={`minBase-${market.symbol}`}
                              className="text-sm"
                            >
                              Min {market.baseCurrency} Allocation
                            </Label>
                            <Input
                              id={`minBase-${market.symbol}`}
                              type="number"
                              min={0}
                              step="any"
                              value={market.minBase || ""}
                              onChange={(e) =>
                                updateMarketSettings(
                                  market.symbol,
                                  "minBase",
                                  parseFloat(e.target.value) || 0
                                )
                              }
                              placeholder="0"
                              className="mt-1"
                            />
                            <p className="text-xs text-zinc-500 mt-1">
                              Minimum {market.baseCurrency} followers must allocate
                            </p>
                          </div>
                          <div>
                            <Label
                              htmlFor={`minQuote-${market.symbol}`}
                              className="text-sm"
                            >
                              Min {market.quoteCurrency} Allocation
                            </Label>
                            <Input
                              id={`minQuote-${market.symbol}`}
                              type="number"
                              min={0}
                              step="any"
                              value={market.minQuote || ""}
                              onChange={(e) =>
                                updateMarketSettings(
                                  market.symbol,
                                  "minQuote",
                                  parseFloat(e.target.value) || 0
                                )
                              }
                              placeholder="0"
                              className="mt-1"
                            />
                            <p className="text-xs text-zinc-500 mt-1">
                              Minimum {market.quoteCurrency} followers must allocate
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-zinc-400 italic">
                    {t("no_markets_selected_yet_select_at")}
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Profit Share Settings */}
            <Card>
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
                  <DollarSign className="h-5 w-5 text-amber-500" />
                  {tCommon("profit_share")}
                </h3>
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <p className="text-sm text-zinc-500">{t("percentage_of_followers_profits_you_earn")}</p>
                    </div>
                    <span className="text-2xl font-bold text-amber-600">{profitSharePercent}%</span>
                  </div>
                  <Slider
                    value={[profitSharePercent]}
                    onValueChange={([v]) => setProfitSharePercent(v)}
                    min={5}
                    max={50}
                    step={5}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-zinc-400 mt-1">
                    <span>5%</span>
                    <span>50% ({t("higher_earnings")})</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Submit */}
            <Card className="bg-gradient-to-r from-amber-500/10 to-orange-500/10 border-amber-500/20">
              <CardContent className="p-6">
                <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                  <div>
                    <h3 className="text-lg font-semibold">{t("ready_to_start")}</h3>
                    <p className="text-sm text-zinc-600 dark:text-zinc-400">
                      {t("your_application_will_be_reviewed_by_our_team")}
                    </p>
                  </div>
                  <Button
                    size="lg"
                    className="h-14 px-8 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all"
                    onClick={handleSubmit}
                    disabled={
                      isSubmitting ||
                      !displayName.trim() ||
                      selectedMarkets.length === 0
                    }
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                        {tCommon('submitting')}
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="h-5 w-5 mr-2" />
                        {tExt("submit_application")}
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
