"use client";

import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { ChevronRight, Filter, Search, SlidersHorizontal } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { Separator } from "@/components/ui/separator";
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

      // Apply search filter
      if (searchTerm) {
        filtered = filtered.filter(
          (condition) =>
            condition.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            condition.description
              .toLowerCase()
              .includes(searchTerm.toLowerCase())
        );
      }

      // Apply sorting
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
        staggerChildren: 0.1,
      },
    },
  };

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 },
  };

  if (loading && conditions.length === 0) {
    return <AffiliateConditionsLoading />;
  }

  if (error) {
    return <AffiliateConditionsErrorState error={error} />;
  }

  // Calculate stats for hero
  const totalPrograms = conditions.length;
  const activePrograms = conditions.filter(c => c.status === true).length;
  const highestCommission = conditions.length > 0
    ? `${Math.max(...conditions.map(c => c.reward || 0))}%`
    : '0%';

  return (
    <div className="w-full">
      {/* Hero Section */}
      <ConditionHero
        totalPrograms={totalPrograms}
        activePrograms={activePrograms}
        highestCommission={highestCommission}
      />

      <div className="container mx-auto pb-6 pt-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder={tExt("search_conditions_ellipsis")}
              className="pl-8 w-[200px] md:w-[250px]"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon">
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
        <TabsList className="mb-6">
          <TabsTrigger value="all">{tCommon("all_conditions")}</TabsTrigger>
          <TabsTrigger value="percentage">
            {tCommon("percentage_rewards")}
          </TabsTrigger>
          <TabsTrigger value="fixed">{tCommon("fixed_rewards")}</TabsTrigger>
        </TabsList>

        <TabsContent value="all">
          {filteredConditions.length === 0 ? (
            <div className="text-center py-12">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted mb-4">
                <Filter className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-medium mb-2">
                {tCommon("no_conditions_found")}
              </h3>
              <p className="text-muted-foreground mb-4">
                {tCommon("try_adjusting_your_search_or_filter_criteria")}
              </p>
              <Button
                variant="outline"
                onClick={() => {
                  setSearchTerm("");
                  setSortBy("default");
                }}
              >
                {tCommon("reset_filters")}
              </Button>
            </div>
          ) : (
            <motion.div
              variants={container}
              initial="hidden"
              animate="show"
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
            >
              {filteredConditions.map((condition) => (
                <ConditionCard
                  key={condition.id}
                  condition={condition}
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
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {filteredConditions
              .filter((condition) => condition.rewardType === "PERCENTAGE")
              .map((condition) => (
                <ConditionCard
                  key={condition.id}
                  condition={condition}
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
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {filteredConditions
              .filter((condition) => condition.rewardType === "FIXED")
              .map((condition) => (
                <ConditionCard
                  key={condition.id}
                  condition={condition}
                  onSelect={() => handleSelectCondition(condition)}
                />
              ))}
          </motion.div>
        </TabsContent>
      </Tabs>

      {selectedCondition && (
        <ConditionDetailsModal
          condition={selectedCondition}
          onClose={handleCloseDetails}
        />
      )}
      </div>
    </div>
  );
}

function ConditionCard({
  condition,
  onSelect,
}: {
  condition: AffiliateCondition;
  onSelect: () => void;
}) {
  const t = useTranslations("ext");
  const tCommon = useTranslations("common");
  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 },
  };

  // Generate a gradient background based on the condition type
  const getGradient = () => {
    switch (condition.name) {
      case "DEPOSIT":
        return "from-blue-600/10 to-blue-600/10 border-blue-600/20";
      case "TRADE":
        return "from-purple-500/10 to-purple-600/10 border-purple-500/20";
      case "STAKING":
        return "from-green-500/10 to-green-600/10 border-green-500/20";
      case "P2P_TRADE":
        return `from-yellow-500/10 to-yellow-500/10 border-yellow-500/20`;
      case "ICO_CONTRIBUTION":
        return "from-pink-500/10 to-pink-600/10 border-pink-500/20";
      default:
        return "from-primary/10 to-primary/5 border-primary/20";
    }
  };

  return (
    <motion.div variants={item}>
      <Card
        className={`h-full transition-all duration-300 hover:shadow-lg hover:border-amber-600/50 bg-linear-to-br ${getGradient()}`}
      >
        <CardHeader>
          <div className="flex justify-between items-start">
            <CardTitle className="text-xl">{condition.title}</CardTitle>
            <Badge
              variant={
                condition.rewardType === "PERCENTAGE" ? "default" : "secondary"
              }
              className="px-2.5 py-1"
            >
              {condition.rewardType === "PERCENTAGE" ? "%" : "Fixed"}
            </Badge>
          </div>
          <CardDescription className="line-clamp-2">
            {condition.description}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">
                {tCommon("reward")}
              </span>
              <span className="font-medium text-lg">
                {condition.rewardType === "PERCENTAGE"
                  ? `${condition.reward}%`
                  : `${condition.reward} ${condition.rewardCurrency}`}
              </span>
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-sm">
                <span>{tCommon("earning_potential")}</span>
                <span className="font-medium">
                  {condition.rewardType === "PERCENTAGE" ? "High" : "Medium"}
                </span>
              </div>
              <Progress
                value={condition.rewardType === "PERCENTAGE" ? 80 : 60}
                className="h-2"
              />
            </div>

            <div className="flex flex-wrap gap-2">
              <Badge variant="outline" className="bg-amber-600/5 border-amber-600/20">
                {condition.rewardWalletType}
              </Badge>
              <Badge variant="outline" className="bg-amber-600/5 border-amber-600/20">
                {condition.rewardCurrency}
              </Badge>
              {condition.rewardChain && (
                <Badge variant="outline" className="bg-amber-600/5 border-amber-600/20">
                  {condition.rewardChain}
                </Badge>
              )}
            </div>
          </div>
        </CardContent>
        <CardFooter>
          <Button
            onClick={onSelect}
            className="w-full gap-1 group"
            variant="outline"
          >
            {tCommon("view_details")}
            <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </Button>
        </CardFooter>
      </Card>
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
  // Sample calculation data
  const sampleData = {
    depositAmount: 1000,
    tradingVolume: 5000,
    stakingAmount: 2000,
    p2pVolume: 3000,
    icoContribution: 500,
  };

  // Calculate potential earnings based on condition type
  const calculateEarnings = () => {
    switch (condition.name) {
      case "DEPOSIT":
        return ((sampleData.depositAmount * condition.reward) / 100).toFixed(2);
      case "TRADE":
        return ((sampleData.tradingVolume * condition.reward) / 100).toFixed(2);
      case "STAKING":
        return ((sampleData.stakingAmount * condition.reward) / 100).toFixed(2);
      case "P2P_TRADE":
        return ((sampleData.p2pVolume * condition.reward) / 100).toFixed(2);
      case "ICO_CONTRIBUTION":
        return ((sampleData.icoContribution * condition.reward) / 100).toFixed(
          2
        );
      default:
        return "0.00";
    }
  };

  // Generate a gradient background based on the condition type
  const getGradient = () => {
    switch (condition.name) {
      case "DEPOSIT":
        return "from-blue-600/10 to-blue-600/5 border-blue-600/20";
      case "TRADE":
        return "from-purple-500/10 to-purple-600/5 border-purple-500/20";
      case "STAKING":
        return "from-green-500/10 to-green-600/5 border-green-500/20";
      case "P2P_TRADE":
        return `from-yellow-500/10 to-yellow-500/5 border-yellow-500/20`;
      case "ICO_CONTRIBUTION":
        return "from-pink-500/10 to-pink-600/5 border-pink-500/20";
      default:
        return "from-primary/10 to-primary/5 border-primary/20";
    }
  };

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-background border rounded-lg shadow-lg w-full max-w-3xl max-h-[90vh] overflow-auto"
      >
        <div className="sticky top-0 bg-background z-10 flex justify-between items-center p-4 border-b">
          <h2 className="text-xl font-bold">{condition.title}</h2>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-4 w-4"
            >
              <path d="M18 6 6 18" />
              <path d="m6 6 12 12" />
            </svg>
            <span className="sr-only">Close</span>
          </Button>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <Card className={`bg-linear-to-br ${getGradient()} p-4 mb-4`}>
                <div className="text-center">
                  <h3 className="text-xl font-bold mb-2">{condition.title}</h3>
                  <Badge
                    variant={
                      condition.rewardType === "PERCENTAGE"
                        ? "default"
                        : "secondary"
                    }
                    className="px-3 py-1"
                  >
                    {condition.rewardType === "PERCENTAGE"
                      ? "Percentage"
                      : "Fixed"}{" "}
                    {tCommon("reward")}
                  </Badge>
                </div>
              </Card>

              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-medium mb-2">
                    {tCommon("description")}
                  </h3>
                  <p className="text-muted-foreground">
                    {condition.description}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">
                      {tCommon("reward_type")}
                    </p>
                    <p className="font-medium">{condition.rewardType}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">
                      {tCommon("reward_amount")}
                    </p>
                    <p className="font-medium">
                      {condition.rewardType === "PERCENTAGE"
                        ? `${condition.reward}%`
                        : `${condition.reward} ${condition.rewardCurrency}`}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">
                      {tCommon("wallet_type")}
                    </p>
                    <p className="font-medium">{condition.rewardWalletType}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">
                      {tCommon("currency")}
                    </p>
                    <p className="font-medium">{condition.rewardCurrency}</p>
                  </div>
                  {condition.rewardChain && (
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">
                        {t("chain")}
                      </p>
                      <p className="font-medium">{condition.rewardChain}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium mb-4">
                  {tCommon("earnings_calculator")}
                </h3>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">
                      {tCommon("potential_earnings")}
                    </CardTitle>
                    <CardDescription>
                      {tCommon("based_on_sample")}{" "}
                      {condition.name.toLowerCase().replace("_", " ")}
                      {t("activity")}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <span className="text-sm">{t("sample_amount")}</span>
                        <span className="font-medium">
                          {condition.name === "DEPOSIT" &&
                            `$${sampleData.depositAmount}`}
                          {condition.name === "TRADE" &&
                            `$${sampleData.tradingVolume}`}
                          {condition.name === "STAKING" &&
                            `$${sampleData.stakingAmount}`}
                          {condition.name === "P2P_TRADE" &&
                            `$${sampleData.p2pVolume}`}
                          {condition.name === "ICO_CONTRIBUTION" &&
                            `$${sampleData.icoContribution}`}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm">{t("reward_rate")}</span>
                        <span className="font-medium">{condition.reward}%</span>
                      </div>
                      <Separator />
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium">
                          {t("your_earnings")}
                        </span>
                        <span className="text-xl font-bold text-primary">
                          ${calculateEarnings()} {condition.rewardCurrency}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div>
                <h3 className="text-lg font-medium mb-4">
                  {t("how_it_works")}
                </h3>
                <ol className="space-y-3 list-decimal list-inside text-muted-foreground">
                  <li>{tCommon("share_your_referral_and_followers")}</li>
                  <li>
                    {tCommon("when_they_sign_up_and")}{" "}
                    {condition.name.toLowerCase().replace("_", " ")}
                    {t("you_earn_rewards")}
                  </li>
                  <li>{t("rewards_are_calculated_activity_volume")}</li>
                  <li>
                    {tCommon("earnings_are_credited_to_your")}{" "}
                    {condition.rewardWalletType.toLowerCase()}
                    {tCommon("wallet")}
                  </li>
                  <li>
                    {tCommon("withdraw_or_use_your_earnings_within_the_platform")}
                  </li>
                </ol>
              </div>

              <div className="flex flex-col gap-3">
                <Button
                  onClick={() => {
                    toast.success("Referral link copied to clipboard!");
                  }}
                >
                  {tCommon("get_referral_link")}
                </Button>
                <Button variant="outline" onClick={onClose}>
                  {tCommon("close_details")}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
