"use client";

import { useEffect, useState, useRef } from "react";
import { Link, useRouter } from "@/i18n/routing";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { m } from "framer-motion";
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
  Timer,
  Layers,
} from "lucide-react";
import { $fetch } from "@/lib/api";
import { Loadable } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { useConfigStore } from "@/store/config";
import { useKycGate } from "@/hooks/use-kyc-gate";
import KycRequiredNotice from "@/components/blocks/kyc/kyc-required-notice";
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

interface BinaryMarket {
  id: string;
  currency: string;
  pair: string;
  status?: boolean;
  isTrending?: boolean;
  isHot?: boolean;
}

type LeaderTradingType = "SPOT" | "BINARY" | "BOTH";

interface SelectedMarket {
  symbol: string;
  type: "SPOT" | "BINARY";
  baseCurrency: string;
  quoteCurrency: string;
  minBase: string;
  minQuote: string;
}

// Settings values may arrive as booleans or strings ("true"/"false")
const isEnabled = (value: unknown, defaultValue: boolean) => {
  if (value === undefined || value === null || value === "") return defaultValue;
  if (typeof value === "boolean") return value;
  const normalized = String(value).toLowerCase();
  if (normalized === "true" || normalized === "1") return true;
  if (normalized === "false" || normalized === "0") return false;
  return defaultValue;
};

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

const tradingTypeOptions: {
  value: LeaderTradingType;
  title: string;
  description: string;
  icon: any;
}[] = [
  {
    value: "SPOT",
    title: "Spot Trading",
    description: "Copy your spot market trades",
    icon: LineChart,
  },
  {
    value: "BINARY",
    title: "Binary Options",
    description: "Copy your binary options positions",
    icon: Timer,
  },
  {
    value: "BOTH",
    title: "Both",
    description: "Offer both spot and binary copy trading",
    icon: Layers,
  },
];

const riskLevels = [
  {
    value: "LOW",
    title: "Low Risk",
    description: "Conservative approach, steady growth",
    color: 'text-success-ink bg-success/10 dark:bg-success/30',
  },
  {
    value: "MEDIUM",
    title: "Medium Risk",
    description: "Balanced risk and reward",
    color: 'text-warning-ink bg-warning/10 dark:bg-warning/30',
  },
  {
    value: "HIGH",
    title: "High Risk",
    description: "Aggressive strategy, higher volatility",
    color: 'text-destructive-ink bg-destructive/10 dark:bg-destructive/30',
  },
];

export default function BecomeLeaderClient() {
  const t = useTranslations("ext_copy-trading");
  const tExt = useTranslations("ext");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const gate = useKycGate("become_trader");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasExistingApplication, setHasExistingApplication] = useState(false);

  const { settings, extensions } = useConfigStore();

  // Availability gating
  const spotAvailable =
    (extensions || []).includes("ecosystem") &&
    isEnabled(settings?.copyTradingEnableSpot, true);
  const binaryAvailable =
    isEnabled(settings?.binaryStatus, false) &&
    isEnabled(settings?.copyTradingEnableBinary, true);

  // Form state
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [tradingType, setTradingType] = useState<LeaderTradingType>("SPOT");
  const [tradingStyle, setTradingStyle] = useState("DAY_TRADING");
  const [riskLevel, setRiskLevel] = useState("MEDIUM");
  const [profitSharePercent, setProfitSharePercent] = useState(20);

  // Markets state
  const [availableMarkets, setAvailableMarkets] = useState<EcosystemMarket[]>([]);
  const [availableBinaryMarkets, setAvailableBinaryMarkets] = useState<BinaryMarket[]>([]);
  const [selectedMarkets, setSelectedMarkets] = useState<SelectedMarket[]>([]);
  const [marketsLoading, setMarketsLoading] = useState(true);
  const [binaryMarketsLoading, setBinaryMarketsLoading] = useState(true);

  // Keep tradingType within the available options (SPOT preferred)
  useEffect(() => {
    if (tradingType === "SPOT" && !spotAvailable && binaryAvailable) {
      setTradingType("BINARY");
    } else if (tradingType === "BINARY" && !binaryAvailable && spotAvailable) {
      setTradingType("SPOT");
    } else if (tradingType === "BOTH" && !(spotAvailable && binaryAvailable)) {
      setTradingType(spotAvailable ? "SPOT" : binaryAvailable ? "BINARY" : "SPOT");
    }
  }, [spotAvailable, binaryAvailable, tradingType]);

  const fetchedRef = useRef(false);

  useEffect(() => {
    if (fetchedRef.current) return;
    fetchedRef.current = true;

    const checkExisting = async () => {
      const { data, error } = await $fetch({
        url: "/api/copy-trading/leader/me",
        method: "GET",
        silent: true,
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
        silent: true,
      });

      if (!error && data) {
        setAvailableMarkets(data);
      }
      setMarketsLoading(false);
    };

    const fetchBinaryMarkets = async () => {
      setBinaryMarketsLoading(true);
      const { data, error } = await $fetch({
        url: "/api/exchange/binary/market",
        method: "GET",
        silent: true,
      });

      if (!error && data) {
        setAvailableBinaryMarkets(Array.isArray(data) ? data : []);
      }
      setBinaryMarketsLoading(false);
    };

    checkExisting();
    fetchMarkets();
    fetchBinaryMarkets();
  }, [router]);

  const addMarket = (symbol: string, type: "SPOT" | "BINARY" = "SPOT") => {
    const [baseCurrency, quoteCurrency] = symbol.split("/");
    if (!selectedMarkets.find((m) => m.symbol === symbol && m.type === type)) {
      setSelectedMarkets([
        ...selectedMarkets,
        { symbol, type, baseCurrency, quoteCurrency, minBase: "0", minQuote: "0" },
      ]);
    }
  };

  const removeMarket = (symbol: string, type: "SPOT" | "BINARY") => {
    setSelectedMarkets(
      selectedMarkets.filter((m) => !(m.symbol === symbol && m.type === type))
    );
  };

  const updateMarketSettings = (
    symbol: string,
    type: "SPOT" | "BINARY",
    field: "minBase" | "minQuote",
    value: string
  ) => {
    setSelectedMarkets(
      selectedMarkets.map((m) =>
        m.symbol === symbol && m.type === type ? { ...m, [field]: value } : m
      )
    );
  };

  const includesSpot = tradingType === "SPOT" || tradingType === "BOTH";
  const includesBinary = tradingType === "BINARY" || tradingType === "BOTH";
  const selectedSpotMarkets = selectedMarkets.filter((m) => m.type === "SPOT");
  const selectedBinaryMarkets = selectedMarkets.filter((m) => m.type === "BINARY");

  const visibleTradingTypes = tradingTypeOptions.filter((option) =>
    option.value === "SPOT"
      ? spotAvailable
      : option.value === "BINARY"
        ? binaryAvailable
        : spotAvailable && binaryAvailable
  );

  const handleSubmit = async () => {
    if (!displayName.trim()) {
      toast.error(t("display_name_is_required"));
      return;
    }

    if (displayName.length < 2) {
      toast.error(t("display_name_must_be_at_least_2_characters"));
      return;
    }

    if (includesSpot && selectedSpotMarkets.length === 0) {
      toast.error(t("please_select_at_least_one_spot_market_to_trade"));
      return;
    }

    if (includesBinary && selectedBinaryMarkets.length === 0) {
      toast.error(t("please_select_at_least_one_binary_market_to_trade"));
      return;
    }

    const marketsPayload = [
      ...(includesSpot ? selectedSpotMarkets : []),
      ...(includesBinary ? selectedBinaryMarkets : []),
    ].map((m) => ({
      symbol: m.symbol,
      type: m.type,
      minBase: m.type === "BINARY" ? 0 : parseFloat(m.minBase) || 0,
      minQuote: parseFloat(m.minQuote) || 0,
    }));

    setIsSubmitting(true);
    const { error } = await $fetch({
      url: "/api/copy-trading/leader/apply",
      method: "POST",
      body: {
        displayName: displayName.trim(),
        bio: bio.trim(),
        tradingType,
        tradingStyle,
        riskLevel,
        profitSharePercent,
        markets: marketsPayload,
      },
    });

    if (!error) {
      toast.success(tExt("application_submitted_successfully"));
      router.push("/copy-trading/dashboard");
    }
    setIsSubmitting(false);
  };

  /*
    TWO whole-page swaps used to sit here, both returning this route's own
    `loading.tsx` — so a single navigation to /copy-trading/become-leader
    greyed the page out up to three times: Next's route-level `loading.tsx`,
    then this one while the KYC gate resolved, then this one again while the
    "are you already a leader?" check ran.

    None of it was necessary. THIS PAGE IS A FORM. Its heading, its three
    benefit cards, every field label, every radio option and the submit button
    are literals in this file — there is nothing to wait for. The only genuinely
    asynchronous thing on it is the market catalogue, and both market selects
    already handle that themselves with a "Loading markets..." placeholder
    inside a select that is already the right size.

    `isLoading` here means "we do not yet know whether you belong on this page":
    it is only cleared when the leader check comes back EMPTY, and stays set
    while an existing leader is redirected to their dashboard. Holding the form
    during that is the honest choice — the overwhelming majority of visitors are
    not leaders, which is why they are on the application page.
  */
  const pending =
    isLoading || gate.state === "loading" || gate.state === "anonymous";

  // Followers commit real money to a leader, so the gate sits ahead of the
  // application form. Named, because the distinction is the fix: this is "the
  // gate answered no", not "the gate has not answered".
  const gateRefused = !pending && !gate.allowed;
  if (gateRefused) {
    return (
      <KycRequiredNotice
        feature="become_trader"
        requirement={gate.requirement ?? "verification"}
      />
    );
  }

  return (
    <div className="bg-muted/30">
      <div className="container mx-auto px-4 py-8 max-w-4xl pt-20">
        {/* Back button */}
        <Link
          href="/copy-trading"
          className="inline-flex items-center text-sm text-muted-foreground hover:text-primary mb-6 group"
        >
          <ArrowLeft className="h-4 w-4 mr-2 transition-transform group-hover:-translate-x-1" />
          {t("back_to_copy_trading")}
        </Link>

        <m.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          {/* Header */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center px-4 py-2 rounded-full bg-warning/10 border border-warning/20 dark:border-warning/30 mb-6">
              <Crown className="w-4 h-4 text-warning mr-2" />
              <span className="text-sm font-semibold text-warning">
                {t("become_a_leader")}
              </span>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
              {t("share_your_trading_expertise")}
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              {t("help_others_profit_from_your_trades")}
            </p>
          </div>

          {/* Benefits */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-12">
            {[
              { icon: Users, title: t("build_following"), desc: "Attract traders who want to copy your strategies" },
              { icon: DollarSign, title: t("earn_commission"), desc: "Get paid when your followers make profits" },
              { icon: Trophy, title: t("gain_recognition"), desc: "Build your reputation as a top trader" },
            ].map((item, i) => (
              <m.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 * i }}
              >
                <Card className="h-full ">
                  <CardContent className="p-5 text-center">
                    <div className="w-12 h-12 rounded-xl bg-warning flex items-center justify-center mx-auto mb-3">
                      <item.icon className="h-6 w-6 text-primary-foreground" />
                    </div>
                    <h3 className="font-semibold mb-1">{item.title}</h3>
                    <p className="text-sm text-subtle-foreground">{item.desc}</p>
                  </CardContent>
                </Card>
              </m.div>
            ))}
          </div>

          {/* Form */}
          <div className="space-y-6">
            {/* Trading Type */}
            <Card>
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-sm bg-warning/15 text-warning">
                    <Settings2 className="h-3.5 w-3.5" />
                  </span>
                  {tExt("trading_type")}
                </h3>
                {visibleTradingTypes.length > 0 ? (
                  <RadioGroup
                    value={tradingType}
                    onValueChange={(value) =>
                      setTradingType(value as LeaderTradingType)
                    }
                    className="grid grid-cols-1 md:grid-cols-3 gap-4"
                  >
                    {visibleTradingTypes.map((option) => (
                      <label
                        key={option.value}
                        className={`flex items-start gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                          tradingType === option.value
                            ? "border-warning bg-warning/5"
                            : "border-border hover:border-border-strong"
                        }`}
                      >
                        <RadioGroupItem value={option.value} className="mt-1" />
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <option.icon className="h-4 w-4 text-warning" />
                            <span className="font-medium">{option.title}</span>
                          </div>
                          <p className="text-sm text-subtle-foreground mt-1">
                            {option.description}
                          </p>
                        </div>
                      </label>
                    ))}
                  </RadioGroup>
                ) : (
                  /*
                    This sentence is a CONCLUSION about the installation, drawn
                    from `settings.copyTradingEnableSpot` / `binaryStatus` in
                    the config store. An absent settings object makes both
                    `spotAvailable` and `binaryAvailable` false, so before the
                    store is populated the empty-list branch is reached and the
                    page states, confidently and wrongly, that the whole feature
                    is switched off — on the page whose entire purpose is to
                    enrol someone in it. While the page is pending the sentence
                    waits; its box does not.
                  */
                  <p className="text-sm text-muted-foreground italic">
                    <Loadable
                      loading={pending}
                      placeholder={t("copy_trading_is_currently_unavailable_on")}
                    >
                      {t("copy_trading_is_currently_unavailable_on")}
                    </Loadable>
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Profile Section */}
            <Card>
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-sm bg-warning/15 text-warning">
                    <Star className="h-3.5 w-3.5" />
                  </span>
                  {tExt("your_profile")}
                </h3>
                <div className="space-y-6">
                  <div>
                    <Label htmlFor="displayName" className="text-base">
                      {tExt("display_name")} <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="displayName"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder={t("enter_your_trader_name")}
                      className="mt-2 h-12"
                      maxLength={50}
                    />
                    <p className="text-xs text-subtle-foreground mt-1">
                      {t("this_is_how_followers_will_see_you")} ({displayName.length}/50)
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
                      placeholder={`${t("tell_followers_about_your_trading_strategy")}…`}
                      className="mt-2 min-h-[120px]"
                      maxLength={500}
                    />
                    <p className="text-xs text-subtle-foreground mt-1">
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
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-sm bg-warning/15 text-warning">
                    <BarChart3 className="h-3.5 w-3.5" />
                  </span>
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
                          ? "border-warning bg-warning/5"
                          : "border-border hover:border-border-strong"
                      }`}
                    >
                      <RadioGroupItem value={style.value} className="mt-1" />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <style.icon className="h-4 w-4 text-warning" />
                          <span className="font-medium">{style.title}</span>
                        </div>
                        <p className="text-sm text-subtle-foreground mt-1">{style.description}</p>
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
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-sm bg-warning/15 text-warning">
                    <Shield className="h-3.5 w-3.5" />
                  </span>
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
                          ? "border-warning bg-warning/5"
                          : "border-border hover:border-border-strong"
                      }`}
                    >
                      <RadioGroupItem value={level.value} className="sr-only" />
                      <Badge className={`mb-2 ${level.color}`}>{level.title}</Badge>
                      <p className="text-xs text-subtle-foreground">{level.description}</p>
                    </label>
                  ))}
                </RadioGroup>
              </CardContent>
            </Card>

            {/* Trading Markets Selection */}
            <Card>
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-sm bg-warning/15 text-warning">
                    <LineChart className="h-3.5 w-3.5" />
                  </span>
                  {t("trading_markets")} <span className="text-destructive">*</span>
                </h3>
                <p className="text-sm text-subtle-foreground mb-4">
                  {t("select_the_markets_you_will_be_trading_on")}
                </p>

                {/* Spot markets */}
                {includesSpot && (
                  <div className={includesBinary ? "mb-8" : ""}>
                    <h4 className="text-base font-semibold mb-3 flex items-center gap-2">
                      <LineChart className="h-4 w-4 text-warning" />
                      {t("spot_markets")}
                    </h4>

                    {/* Market selector */}
                    <div className="mb-6">
                      <Select
                        onValueChange={(value) => addMarket(value, "SPOT")}
                        disabled={marketsLoading}
                      >
                        <SelectTrigger className="h-12">
                          <SelectValue
                            placeholder={
                              marketsLoading
                                ? `${tCommon("loading_markets")}…`
                                : t("select_a_market_to_add")
                            }
                          />
                        </SelectTrigger>
                        <SelectContent>
                          {availableMarkets
                            .filter(
                              (m) =>
                                !selectedMarkets.find(
                                  (sm) =>
                                    sm.type === "SPOT" &&
                                    sm.symbol === `${m.currency}/${m.pair}`
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
                    {selectedSpotMarkets.length > 0 ? (
                      <div className="space-y-4">
                        {selectedSpotMarkets.map((market) => (
                          <div
                            key={`SPOT-${market.symbol}`}
                            className="p-4 rounded-xl border border-border bg-muted dark:bg-muted/50"
                          >
                            <div className="flex items-center justify-between mb-4">
                              <div className="flex items-center gap-2">
                                <Badge
                                  variant="secondary"
                                  className="bg-warning/10 dark:bg-warning/30 text-warning-ink"
                                >
                                  {market.symbol}
                                </Badge>
                                {tradingType === "BOTH" && (
                                  <Badge
                                    variant="outline"
                                    className="text-[10px] px-1.5 py-0"
                                  >
                                    SPOT
                                  </Badge>
                                )}
                              </div>
                              <button
                                type="button"
                                onClick={() => removeMarket(market.symbol, "SPOT")}
                                className="text-muted-foreground hover:text-destructive transition-colors"
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
                                  type="text"
                                  inputMode="decimal"
                                  value={market.minBase}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    // Allow empty, digits, and one decimal point
                                    if (val === "" || /^\d*\.?\d*$/.test(val)) {
                                      updateMarketSettings(
                                        market.symbol,
                                        "SPOT",
                                        "minBase",
                                        val
                                      );
                                    }
                                  }}
                                  placeholder="0"
                                  className="mt-1"
                                />
                                <p className="text-xs text-subtle-foreground mt-1">
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
                                  type="text"
                                  inputMode="decimal"
                                  value={market.minQuote}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    // Allow empty, digits, and one decimal point
                                    if (val === "" || /^\d*\.?\d*$/.test(val)) {
                                      updateMarketSettings(
                                        market.symbol,
                                        "SPOT",
                                        "minQuote",
                                        val
                                      );
                                    }
                                  }}
                                  placeholder="0"
                                  className="mt-1"
                                />
                                <p className="text-xs text-subtle-foreground mt-1">
                                  Minimum {market.quoteCurrency} followers must allocate
                                </p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground italic">
                        {t("no_markets_selected_yet_select_at")}
                      </p>
                    )}
                  </div>
                )}

                {/* Binary markets */}
                {includesBinary && (
                  <div>
                    <h4 className="text-base font-semibold mb-3 flex items-center gap-2">
                      <Timer className="h-4 w-4 text-warning" />
                      {tCommon("binary_markets")}
                    </h4>

                    {/* Binary market selector */}
                    <div className="mb-6">
                      <Select
                        onValueChange={(value) => addMarket(value, "BINARY")}
                        disabled={binaryMarketsLoading}
                      >
                        <SelectTrigger className="h-12">
                          <SelectValue
                            placeholder={
                              binaryMarketsLoading
                                ? `${tCommon("loading_markets")}…`
                                : t("select_a_binary_market_to_add")
                            }
                          />
                        </SelectTrigger>
                        <SelectContent>
                          {availableBinaryMarkets
                            .filter(
                              (m) =>
                                !selectedMarkets.find(
                                  (sm) =>
                                    sm.type === "BINARY" &&
                                    sm.symbol === `${m.currency}/${m.pair}`
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

                    {/* Selected binary markets with min stake */}
                    {selectedBinaryMarkets.length > 0 ? (
                      <div className="space-y-4">
                        {selectedBinaryMarkets.map((market) => (
                          <div
                            key={`BINARY-${market.symbol}`}
                            className="p-4 rounded-xl border border-border bg-muted dark:bg-muted/50"
                          >
                            <div className="flex items-center justify-between mb-4">
                              <div className="flex items-center gap-2">
                                <Badge
                                  variant="secondary"
                                  className="bg-warning/10 dark:bg-warning/30 text-warning-ink"
                                >
                                  {market.symbol}
                                </Badge>
                                {tradingType === "BOTH" && (
                                  <Badge
                                    variant="outline"
                                    className="text-[10px] px-1.5 py-0"
                                  >
                                    BINARY
                                  </Badge>
                                )}
                              </div>
                              <button
                                type="button"
                                onClick={() => removeMarket(market.symbol, "BINARY")}
                                className="text-muted-foreground hover:text-destructive transition-colors"
                              >
                                <X className="h-4 w-4" />
                              </button>
                            </div>

                            <div>
                              <Label
                                htmlFor={`minStake-${market.symbol}`}
                                className="text-sm"
                              >
                                Min Stake ({market.quoteCurrency})
                              </Label>
                              <Input
                                id={`minStake-${market.symbol}`}
                                type="text"
                                inputMode="decimal"
                                value={market.minQuote}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  // Allow empty, digits, and one decimal point
                                  if (val === "" || /^\d*\.?\d*$/.test(val)) {
                                    updateMarketSettings(
                                      market.symbol,
                                      "BINARY",
                                      "minQuote",
                                      val
                                    );
                                  }
                                }}
                                placeholder="0"
                                className="mt-1"
                              />
                              <p className="text-xs text-subtle-foreground mt-1">
                                Minimum {market.quoteCurrency} stake followers must allocate
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground italic">
                        {t("no_binary_markets_selected_yet_select")}
                      </p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Profit Share Settings */}
            <Card>
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-sm bg-warning/15 text-warning">
                    <DollarSign className="h-3.5 w-3.5" />
                  </span>
                  {tCommon("profit_share")}
                </h3>
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <p className="text-xs font-medium text-muted-foreground">{t("percentage_of_followers_profits_you_earn")}</p>
                    </div>
                    <span className="text-2xl font-semibold leading-tight tracking-tight font-mono tabular-nums text-warning">{profitSharePercent}%</span>
                  </div>
                  <Slider
                    value={[profitSharePercent]}
                    onValueChange={([v]) => setProfitSharePercent(v)}
                    min={5}
                    max={50}
                    step={5}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground mt-1">
                    <span>5%</span>
                    <span>50% ({t("higher_earnings")})</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Submit */}
            <Card className="bg-warning/10 border-warning/20">
              <CardContent className="p-6">
                <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                  <div>
                    <h3 className="text-lg font-semibold">{t("ready_to_start")}</h3>
                    <p className="text-sm text-muted-foreground">
                      {t("your_application_will_be_reviewed_by_our_team")}
                    </p>
                  </div>
                  <Button
                    size="lg"
                    className="h-14 bg-warning text-warning-foreground font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all"
                    onClick={handleSubmit}
                    disabled={
                      isSubmitting ||
                      !displayName.trim() ||
                      (includesSpot && selectedSpotMarkets.length === 0) ||
                      (includesBinary && selectedBinaryMarkets.length === 0)
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
                        {tCommon("submit_application")}
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </m.div>
      </div>
    </div>
  );
}
