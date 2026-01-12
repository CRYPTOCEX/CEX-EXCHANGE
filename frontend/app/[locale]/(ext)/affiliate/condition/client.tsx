"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronRight,
  Filter,
  Search,
  SlidersHorizontal,
  Percent,
  DollarSign,
  Wallet,
  Coins,
  TrendingUp,
  Gift,
  Zap,
  Shield,
  ArrowRight,
  Sparkles,
  X,
  Copy,
  Check,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import {
  AffiliateCondition,
  useConditionStore,
} from "@/store/affiliate/condition-store";
import { useTranslations } from "next-intl";
import AffiliateConditionsLoading from "./loading";
import AffiliateConditionsErrorState from "./error-state";
import { ConditionHero } from "./components/condition-hero";

export default function AffiliateConditionsClient() {
  const tCommon = useTranslations("common");
  const tExt = useTranslations("ext");
  const { conditions, loading, error, fetchConditions } = useConditionStore();
  const [searchTerm, setSearchTerm] = useState("");
  const [filteredConditions, setFilteredConditions] = useState<
    AffiliateCondition[]
  >([]);
  const [sortBy, setSortBy] = useState<"reward" | "name" | "default">(
    "default"
  );
  const [selectedCondition, setSelectedCondition] =
    useState<AffiliateCondition | null>(null);

  useEffect(() => {
    fetchConditions();
  }, [fetchConditions]);

  useEffect(() => {
    if (conditions) {
      let filtered = [...conditions];

      if (searchTerm) {
        filtered = filtered.filter(
          (condition) =>
            condition.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            condition.description
              .toLowerCase()
              .includes(searchTerm.toLowerCase())
        );
      }

      if (sortBy === "reward") {
        filtered.sort((a, b) => b.reward - a.reward);
      } else if (sortBy === "name") {
        filtered.sort((a, b) => a.title.localeCompare(b.title));
      }

      setFilteredConditions(filtered);
    }
  }, [conditions, searchTerm, sortBy]);

  const handleSelectCondition = (condition: AffiliateCondition) => {
    setSelectedCondition(condition);
  };

  const handleCloseDetails = () => {
    setSelectedCondition(null);
  };

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.08,
      },
    },
  };

  if (loading && conditions.length === 0) {
    return <AffiliateConditionsLoading />;
  }

  if (error) {
    return <AffiliateConditionsErrorState error={error} />;
  }

  const totalPrograms = conditions.length;
  const activePrograms = conditions.filter((c) => c.status === true).length;
  const highestCommission =
    conditions.length > 0
      ? `${Math.max(...conditions.map((c) => c.reward || 0))}%`
      : "0%";

  return (
    <div className="w-full">
      <ConditionHero
        totalPrograms={totalPrograms}
        activePrograms={activePrograms}
        highestCommission={highestCommission}
      />

      <div className="container mx-auto pb-6 pt-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder={tExt("search_conditions_ellipsis")}
                className="pl-10 w-[200px] md:w-[280px] h-11 bg-muted/50"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon" className="h-11 w-11">
                  <SlidersHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setSortBy("default")}>
                  {tCommon("default_order")}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSortBy("reward")}>
                  {tCommon("highest_reward_first")}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSortBy("name")}>
                  {tCommon("alphabetical")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <Tabs defaultValue="all" className="w-full">
          <TabsList className="mb-8 bg-muted/50 p-1">
            <TabsTrigger value="all" className="px-6">
              {tCommon("all_conditions")}
            </TabsTrigger>
            <TabsTrigger value="percentage" className="px-6">
              {tCommon("percentage_rewards")}
            </TabsTrigger>
            <TabsTrigger value="fixed" className="px-6">
              {tCommon("fixed_rewards")}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="all">
            {filteredConditions.length === 0 ? (
              <EmptyState
                onReset={() => {
                  setSearchTerm("");
                  setSortBy("default");
                }}
                tCommon={tCommon}
              />
            ) : (
              <motion.div
                variants={container}
                initial="hidden"
                animate="show"
                className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6"
              >
                {filteredConditions.map((condition, index) => (
                  <ConditionCard
                    key={condition.id}
                    condition={condition}
                    index={index}
                    onSelect={() => handleSelectCondition(condition)}
                  />
                ))}
              </motion.div>
            )}
          </TabsContent>

          <TabsContent value="percentage">
            <motion.div
              variants={container}
              initial="hidden"
              animate="show"
              className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6"
            >
              {filteredConditions
                .filter((condition) => condition.rewardType === "PERCENTAGE")
                .map((condition, index) => (
                  <ConditionCard
                    key={condition.id}
                    condition={condition}
                    index={index}
                    onSelect={() => handleSelectCondition(condition)}
                  />
                ))}
            </motion.div>
          </TabsContent>

          <TabsContent value="fixed">
            <motion.div
              variants={container}
              initial="hidden"
              animate="show"
              className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6"
            >
              {filteredConditions
                .filter((condition) => condition.rewardType === "FIXED")
                .map((condition, index) => (
                  <ConditionCard
                    key={condition.id}
                    condition={condition}
                    index={index}
                    onSelect={() => handleSelectCondition(condition)}
                  />
                ))}
            </motion.div>
          </TabsContent>
        </Tabs>

        <AnimatePresence>
          {selectedCondition && (
            <ConditionDetailsModal
              condition={selectedCondition}
              onClose={handleCloseDetails}
            />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function EmptyState({
  onReset,
  tCommon,
}: {
  onReset: () => void;
  tCommon: any;
}) {
  return (
    <div className="text-center py-16">
      <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-muted/50 mb-6">
        <Filter className="h-10 w-10 text-muted-foreground" />
      </div>
      <h3 className="text-xl font-semibold mb-2">
        {tCommon("no_conditions_found")}
      </h3>
      <p className="text-muted-foreground mb-6 max-w-md mx-auto">
        {tCommon("try_adjusting_your_search_or_filter_criteria")}
      </p>
      <Button variant="outline" onClick={onReset} className="gap-2">
        {tCommon("reset_filters")}
      </Button>
    </div>
  );
}

const conditionConfig: Record<
  string,
  { icon: any; gradient: string; iconBg: string; iconColor: string; accent: string }
> = {
  DEPOSIT: {
    icon: Wallet,
    gradient: "from-blue-500/20 via-blue-600/10 to-transparent",
    iconBg: "bg-blue-100 dark:bg-blue-600",
    iconColor: "text-blue-600 dark:text-blue-100",
    accent: "text-blue-500",
  },
  TRADE: {
    icon: TrendingUp,
    gradient: "from-violet-500/20 via-violet-600/10 to-transparent",
    iconBg: "bg-violet-100 dark:bg-violet-600",
    iconColor: "text-violet-600 dark:text-violet-100",
    accent: "text-violet-500",
  },
  STAKING: {
    icon: Coins,
    gradient: "from-emerald-500/20 via-emerald-600/10 to-transparent",
    iconBg: "bg-emerald-100 dark:bg-emerald-600",
    iconColor: "text-emerald-600 dark:text-emerald-100",
    accent: "text-emerald-500",
  },
  P2P_TRADE: {
    icon: Zap,
    gradient: "from-amber-500/20 via-amber-600/10 to-transparent",
    iconBg: "bg-amber-100 dark:bg-amber-600",
    iconColor: "text-amber-600 dark:text-amber-100",
    accent: "text-amber-500",
  },
  ICO_CONTRIBUTION: {
    icon: Gift,
    gradient: "from-pink-500/20 via-pink-600/10 to-transparent",
    iconBg: "bg-pink-100 dark:bg-pink-600",
    iconColor: "text-pink-600 dark:text-pink-100",
    accent: "text-pink-500",
  },
  DEFAULT: {
    icon: Sparkles,
    gradient: "from-violet-500/20 via-violet-600/10 to-transparent",
    iconBg: "bg-violet-100 dark:bg-violet-600",
    iconColor: "text-violet-600 dark:text-violet-100",
    accent: "text-violet-500",
  },
};

function ConditionCard({
  condition,
  index,
  onSelect,
}: {
  condition: AffiliateCondition;
  index: number;
  onSelect: () => void;
}) {
  const tCommon = useTranslations("common");

  const config = conditionConfig[condition.name] || conditionConfig.DEFAULT;
  const Icon = config.icon;

  const item = {
    hidden: { opacity: 0, y: 30, scale: 0.95 },
    show: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: {
        type: "spring",
        stiffness: 100,
        damping: 15,
      },
    },
  };

  return (
    <motion.div variants={item} className="group">
      <div
        onClick={onSelect}
        className="relative h-full cursor-pointer rounded-2xl border border-border/50 bg-card overflow-hidden transition-all duration-500 hover:border-primary/30 hover:shadow-xl hover:shadow-primary/5 hover:-translate-y-1"
      >
        {/* Gradient Background */}
        <div
          className={`absolute inset-0 bg-gradient-to-br ${config.gradient} opacity-50 group-hover:opacity-100 transition-opacity duration-500`}
        />

        {/* Decorative Elements */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-primary/5 to-transparent rounded-bl-full" />
        <div className="absolute -bottom-8 -left-8 w-24 h-24 bg-primary/5 rounded-full blur-2xl group-hover:bg-primary/10 transition-colors duration-500" />

        <div className="relative p-6">
          {/* Header */}
          <div className="flex items-start justify-between mb-6">
            <div
              className={`${config.iconBg} w-14 h-14 rounded-xl flex items-center justify-center shadow-lg`}
            >
              <Icon className={`h-7 w-7 ${config.iconColor}`} />
            </div>
            <Badge
              className={`${
                condition.rewardType === "PERCENTAGE"
                  ? "bg-primary/10 text-primary border-primary/20"
                  : "bg-muted text-muted-foreground border-muted"
              } px-3 py-1.5 text-xs font-medium`}
            >
              {condition.rewardType === "PERCENTAGE" ? (
                <Percent className="h-3 w-3 mr-1" />
              ) : (
                <DollarSign className="h-3 w-3 mr-1" />
              )}
              {condition.rewardType === "PERCENTAGE"
                ? "Percentage"
                : "Fixed Amount"}
            </Badge>
          </div>

          {/* Title & Description */}
          <h3 className="text-xl font-bold mb-2 group-hover:text-primary transition-colors duration-300">
            {condition.title}
          </h3>
          <p className="text-muted-foreground text-sm line-clamp-2 mb-6 min-h-[40px]">
            {condition.description}
          </p>

          {/* Reward Display */}
          <div className="bg-muted/50 rounded-xl p-4 mb-6">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                {tCommon("reward")}
              </span>
              <div className="text-right">
                <span className={`text-2xl font-bold ${config.accent}`}>
                  {condition.rewardType === "PERCENTAGE"
                    ? `${condition.reward}%`
                    : condition.reward}
                </span>
                {condition.rewardType === "FIXED" && (
                  <span className="text-sm text-muted-foreground ml-1">
                    {condition.rewardCurrency}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Tags */}
          <div className="flex flex-wrap gap-2 mb-6">
            <span className="inline-flex items-center px-3 py-1.5 rounded-lg bg-muted/50 text-xs font-medium text-muted-foreground">
              <Wallet className="h-3 w-3 mr-1.5" />
              {condition.rewardWalletType}
            </span>
            <span className="inline-flex items-center px-3 py-1.5 rounded-lg bg-muted/50 text-xs font-medium text-muted-foreground">
              <Coins className="h-3 w-3 mr-1.5" />
              {condition.rewardCurrency}
            </span>
          </div>

          {/* CTA */}
          <div className="flex items-center justify-between pt-4 border-t border-border/50">
            <span className="text-sm font-medium text-muted-foreground group-hover:text-foreground transition-colors">
              {tCommon("view_details")}
            </span>
            <div className="w-10 h-10 rounded-full bg-muted/50 flex items-center justify-center group-hover:bg-primary transition-all duration-300">
              <ArrowRight className="h-5 w-5 text-foreground group-hover:text-primary-foreground transition-transform group-hover:translate-x-0.5" />
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function ConditionDetailsModal({
  condition,
  onClose,
}: {
  condition: AffiliateCondition;
  onClose: () => void;
}) {
  const t = useTranslations("ext");
  const tCommon = useTranslations("common");
  const [copied, setCopied] = useState(false);

  const config = conditionConfig[condition.name] || conditionConfig.DEFAULT;
  const Icon = config.icon;

  const sampleData: Record<string, number> = {
    DEPOSIT: 1000,
    TRADE: 5000,
    STAKING: 2000,
    P2P_TRADE: 3000,
    ICO_CONTRIBUTION: 500,
  };

  const sampleAmount = sampleData[condition.name] || 1000;
  const earnings =
    condition.rewardType === "PERCENTAGE"
      ? ((sampleAmount * condition.reward) / 100).toFixed(2)
      : condition.reward.toFixed(2);

  const handleCopy = () => {
    toast.success("Referral link copied to clipboard!");
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const steps = [
    {
      icon: Shield,
      title: tCommon("share_your_referral_and_followers"),
    },
    {
      icon: TrendingUp,
      title: `${tCommon("when_they_sign_up_and")} ${condition.name.toLowerCase().replace("_", " ")}${t("you_earn_rewards")}`,
    },
    {
      icon: Coins,
      title: t("rewards_are_calculated_activity_volume"),
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        transition={{ type: "spring", damping: 25, stiffness: 200 }}
        className="bg-card border border-border/50 rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with Gradient */}
        <div className="relative overflow-hidden">
          <div
            className={`absolute inset-0 bg-gradient-to-br ${config.gradient}`}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-card to-transparent" />

          <div className="relative p-8 pb-6">
            <button
              onClick={onClose}
              className="absolute top-4 right-4 w-10 h-10 rounded-full bg-background/80 backdrop-blur flex items-center justify-center hover:bg-background transition-colors"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="flex items-start gap-5">
              <div
                className={`${config.iconBg} w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg`}
              >
                <Icon className={`h-8 w-8 ${config.iconColor}`} />
              </div>
              <div className="flex-1">
                <h2 className="text-2xl font-bold mb-2">{condition.title}</h2>
                <p className="text-muted-foreground">{condition.description}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-8 pt-2 space-y-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          {/* Reward Card */}
          <div className="bg-gradient-to-br from-primary/10 via-primary/5 to-transparent rounded-2xl p-6 border border-primary/10">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">
                  {tCommon("reward_amount")}
                </p>
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-bold text-primary">
                    {condition.rewardType === "PERCENTAGE"
                      ? `${condition.reward}%`
                      : condition.reward}
                  </span>
                  {condition.rewardType === "FIXED" && (
                    <span className="text-lg text-muted-foreground">
                      {condition.rewardCurrency}
                    </span>
                  )}
                </div>
              </div>
              <Badge variant="secondary" className="px-4 py-2">
                {condition.rewardType === "PERCENTAGE"
                  ? "Per Transaction"
                  : "Fixed Bonus"}
              </Badge>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-muted/30 rounded-xl p-4 text-center">
              <Wallet className="h-5 w-5 mx-auto mb-2 text-muted-foreground" />
              <p className="text-xs text-muted-foreground mb-1">
                {tCommon("wallet_type")}
              </p>
              <p className="font-semibold">{condition.rewardWalletType}</p>
            </div>
            <div className="bg-muted/30 rounded-xl p-4 text-center">
              <Coins className="h-5 w-5 mx-auto mb-2 text-muted-foreground" />
              <p className="text-xs text-muted-foreground mb-1">
                {tCommon("currency")}
              </p>
              <p className="font-semibold">{condition.rewardCurrency}</p>
            </div>
            <div className="bg-muted/30 rounded-xl p-4 text-center">
              <TrendingUp className="h-5 w-5 mx-auto mb-2 text-muted-foreground" />
              <p className="text-xs text-muted-foreground mb-1">
                {tCommon("reward_type")}
              </p>
              <p className="font-semibold">{condition.rewardType}</p>
            </div>
          </div>

          {/* Earnings Calculator */}
          <div className="bg-muted/30 rounded-2xl p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              {tCommon("earnings_calculator")}
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center py-2">
                <span className="text-muted-foreground">{t("sample_amount")}</span>
                <span className="font-medium">${sampleAmount.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-muted-foreground">{t("reward_rate")}</span>
                <span className="font-medium">
                  {condition.rewardType === "PERCENTAGE"
                    ? `${condition.reward}%`
                    : `$${condition.reward} fixed`}
                </span>
              </div>
              <div className="h-px bg-border" />
              <div className="flex justify-between items-center py-2">
                <span className="font-semibold">{t("your_earnings")}</span>
                <span className="text-2xl font-bold text-primary">
                  ${earnings} {condition.rewardCurrency}
                </span>
              </div>
            </div>
          </div>

          {/* How it Works */}
          <div>
            <h3 className="text-lg font-semibold mb-4">{t("how_it_works")}</h3>
            <div className="space-y-3">
              {steps.map((step, index) => (
                <div
                  key={index}
                  className="flex items-start gap-4 p-4 rounded-xl bg-muted/20 hover:bg-muted/30 transition-colors"
                >
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <span className="text-sm font-bold text-primary">
                      {index + 1}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground pt-1">
                    {step.title}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <Button onClick={handleCopy} className="flex-1 h-12 gap-2">
              {copied ? (
                <Check className="h-4 w-4" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
              {tCommon("get_referral_link")}
            </Button>
            <Button variant="outline" onClick={onClose} className="h-12 px-6">
              {tCommon("close_details")}
            </Button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
