"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import {
  Star,
  DollarSign,
  TrendingUp,
  Filter,
  Search,
  SlidersHorizontal,
  Clock,
  Sparkles,
} from "lucide-react";
import { useForexStore } from "@/store/forex/user";
import { formatCurrency, formatPercentage } from "@/utils/formatters";
import { PlanCard } from "../components/plan-card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { motion } from "framer-motion";
import { HeroSection } from "@/components/ui/hero-section";
import { StatsGroup } from "@/components/ui/stats-group";
import { useTranslations } from "next-intl";

export default function PlansClient() {
  const t = useTranslations("ext_forex");
  const tCommon = useTranslations("common");
  const tExt = useTranslations("ext");
  const { plans, fetchPlans, hasFetchedPlans } = useForexStore();
  const [activeTab, setActiveTab] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [minProfit, setMinProfit] = useState(0);
  const [maxInvestment, setMaxInvestment] = useState(100000);
  const [showFilters, setShowFilters] = useState(false);
  const [sortBy, setSortBy] = useState("popularity");

  // Fetch plans if not loaded
  useEffect(() => {
    if (!hasFetchedPlans) {
      fetchPlans();
    }
  }, [hasFetchedPlans, fetchPlans]);

  // Get max profit and investment values for filters
  const maxProfitValue = Math.max(...plans.map((plan) => plan.maxProfit), 30);
  const maxInvestmentValue = Math.max(
    ...plans.map((plan) => plan.maxAmount || 100000),
    100000
  );

  // Filter and sort plans
  const filteredPlans = plans
    .filter((plan) => {
      if (activeTab === "trending" && !plan.trending) return false;
      if (
        searchTerm &&
        !plan.title?.toLowerCase().includes(searchTerm.toLowerCase()) &&
        !plan.description?.toLowerCase().includes(searchTerm.toLowerCase())
      )
        return false;
      if (plan.minProfit < minProfit) return false;
      if ((plan.maxAmount || 100000) > maxInvestment) return false;
      return true;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case "profit":
          return b.profitPercentage - a.profitPercentage;
        case "minInvestment":
          return (a.minAmount || 0) - (b.minAmount || 0);
        case "popularity":
        default:
          return b.invested - a.invested;
      }
    });

  return (
    <div className="min-h-screen bg-linear-to-b from-background via-muted/10 to-background dark:from-zinc-950 dark:via-zinc-900/30 dark:to-zinc-950">
      {/* Hero Section */}
      <HeroSection
        badge={{
          icon: <Sparkles className="h-3.5 w-3.5" />,
          text: "Investment Opportunities",
          gradient: `from-emerald-500/10 to-teal-500/10`,
          iconColor: `text-emerald-600`,
          textColor: `text-emerald-600 dark:text-emerald-400`,
        }}
        title={[
          { text: "Choose Your Perfect" },
          {
            text: "Investment Plan",
            gradient: `from-emerald-600 via-teal-500 to-emerald-600`,
          },
        ]}
        description={`${t("our_professionally_managed_forex_investment_plans")} ${t("select_from_a_range_of_options")}`}
        paddingTop="pt-24"
        paddingBottom="pb-12"
        background={{
          orbs: [
            {
              color: "#10b981",
              position: { top: "-10rem", right: "-10rem" },
              size: "20rem",
            },
            {
              color: "#14b8a6",
              position: { bottom: "-5rem", left: "-5rem" },
              size: "15rem",
            },
          ],
        }}
        particles={{
          count: 6,
          type: "floating",
          colors: ["#10b981", "#14b8a6"],
          size: 8,
        }}
      >
        <StatsGroup
          stats={[
            {
              icon: DollarSign,
              label: "Min Investment",
              value: formatCurrency(100),
              iconColor: `text-emerald-600`,
              iconBgColor: `bg-emerald-600/10`,
              valueColor: `text-emerald-600 dark:text-emerald-400`,
            },
            {
              icon: TrendingUp,
              label: "Profit Range",
              value: "2.5% - 30%",
              iconColor: `text-teal-500`,
              iconBgColor: `bg-teal-500/10`,
            },
            {
              icon: Clock,
              label: "Duration",
              value: "24h - 6 Months",
              iconColor: `text-emerald-600`,
              iconBgColor: `bg-emerald-600/10`,
            },
          ]}
        />
      </HeroSection>

      {/* Content Section */}
      <div className="container mx-auto py-8 pb-24">
        {/* Search and Filters */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="mb-8"
        >
          <Card className="border border-zinc-200/50 dark:border-zinc-700/50 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-sm shadow-xl">
            <CardContent className="p-6">
              <div className="flex flex-col gap-4">
                {/* Tabs Row */}
                <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                  <Tabs defaultValue="all" className="w-full sm:w-auto">
                    <TabsList className="w-full sm:w-auto bg-zinc-100 dark:bg-zinc-800 p-1 rounded-xl">
                      <TabsTrigger
                        value="all"
                        onClick={() => setActiveTab("all")}
                        className="flex-1 sm:flex-none rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-zinc-700 data-[state=active]:shadow-sm"
                      >
                        {t("all_plans")}
                      </TabsTrigger>
                      <TabsTrigger
                        value="trending"
                        onClick={() => setActiveTab("trending")}
                        className="flex-1 sm:flex-none rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-zinc-700 data-[state=active]:shadow-sm"
                      >
                        <Star className="mr-2 h-4 w-4 text-amber-500" /> Trending
                      </TabsTrigger>
                    </TabsList>
                  </Tabs>

                  {/* Sort dropdown - mobile */}
                  <div className="flex sm:hidden items-center space-x-2 w-full">
                    <span className="text-sm text-zinc-500 dark:text-zinc-400 whitespace-nowrap">
                      {tCommon("sort_by")}:
                    </span>
                    <Select value={sortBy} onValueChange={setSortBy}>
                      <SelectTrigger className="flex-1 rounded-xl border-zinc-200 dark:border-zinc-700">
                        <SelectValue placeholder={tCommon("sort_by")} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="popularity">Popularity</SelectItem>
                        <SelectItem value="profit">
                          {t("highest_profit")}
                        </SelectItem>
                        <SelectItem value="minInvestment">
                          {t("lowest_min_investment")}
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Search and Filters Row */}
                <div className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-center">
                  {/* Search Input */}
                  <div className="relative flex-1 min-w-0">
                    <Input
                      placeholder={t("search_plans_ellipsis")}
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full rounded-xl border-zinc-200 dark:border-zinc-700 pl-10"
                    />
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
                  </div>

                  {/* Filters and Sort */}
                  <div className="flex items-center gap-2 sm:gap-4 shrink-0">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowFilters(!showFilters)}
                      className={`flex-1 sm:flex-none rounded-xl border-zinc-200 dark:border-zinc-700 hover:bg-emerald-500/5 dark:hover:bg-emerald-600/10 hover:border-emerald-600/30`}
                    >
                      <Filter className="h-4 w-4" />
                      <span className="ml-2">Filters</span>
                      {(minProfit > 0 || maxInvestment < maxInvestmentValue) && (
                        <Badge
                          className={`ml-1 bg-emerald-600 text-white`}
                        >
                          Active
                        </Badge>
                      )}
                    </Button>

                    {/* Sort dropdown - desktop */}
                    <div className="hidden sm:flex items-center space-x-2">
                      <span className="text-sm text-zinc-500 dark:text-zinc-400 whitespace-nowrap">
                        {tCommon("sort_by")}:
                      </span>
                      <Select value={sortBy} onValueChange={setSortBy}>
                        <SelectTrigger className="w-40 rounded-xl border-zinc-200 dark:border-zinc-700">
                          <SelectValue placeholder={tCommon("sort_by")} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="popularity">Popularity</SelectItem>
                          <SelectItem value="profit">
                            {t("highest_profit")}
                          </SelectItem>
                          <SelectItem value="minInvestment">
                            {t("lowest_min_investment")}
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              </div>

              {/* Expandable Filters */}
              {showFilters && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mt-6 pt-6 border-t border-zinc-200 dark:border-zinc-700"
                >
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-medium flex items-center text-zinc-900 dark:text-white">
                      <SlidersHorizontal
                        className={`h-4 w-4 mr-2 text-emerald-600`}
                      />{" "}
                      {tExt("advanced_filters")}
                    </h3>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setMinProfit(0);
                        setMaxInvestment(maxInvestmentValue);
                      }}
                      className={`text-emerald-600 hover:text-emerald-700 hover:bg-emerald-500/5 dark:text-emerald-400 dark:hover:bg-emerald-600/10`}
                    >
                      Reset
                    </Button>
                  </div>
                  <div className="grid md:grid-cols-2 gap-8">
                    <div>
                      <div className="flex justify-between mb-3">
                        <label className="text-sm text-zinc-600 dark:text-zinc-400">
                          {t("minimum_profit_rate")}
                        </label>
                        <span
                          className={`text-sm font-semibold text-emerald-600 dark:text-emerald-400`}
                        >
                          {formatPercentage(minProfit)}
                        </span>
                      </div>
                      <Slider
                        value={[minProfit]}
                        min={0}
                        max={maxProfitValue}
                        step={0.5}
                        onValueChange={(values) => setMinProfit(values[0])}
                        className={`**:[[role=slider]]:bg-emerald-500`}
                      />
                      <div className="flex justify-between text-xs text-zinc-500 mt-2">
                        <span>0%</span>
                        <span>{formatPercentage(maxProfitValue)}</span>
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between mb-3">
                        <label className="text-sm text-zinc-600 dark:text-zinc-400">
                          {tCommon("maximum_investment")}
                        </label>
                        <span
                          className={`text-sm font-semibold text-emerald-600 dark:text-emerald-400`}
                        >
                          {formatCurrency(maxInvestment)}
                        </span>
                      </div>
                      <Slider
                        value={[maxInvestment]}
                        min={100}
                        max={maxInvestmentValue}
                        step={1000}
                        onValueChange={(values) => setMaxInvestment(values[0])}
                        className={`**:[[role=slider]]:bg-emerald-500`}
                      />
                      <div className="flex justify-between text-xs text-zinc-500 mt-2">
                        <span>{formatCurrency(100)}</span>
                        <span>{formatCurrency(maxInvestmentValue)}</span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Plans Grid */}
        {filteredPlans.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-16"
          >
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-zinc-100 dark:bg-zinc-800 mb-6">
              <Search className="h-10 w-10 text-zinc-400" />
            </div>
            <h3 className="text-xl font-bold text-zinc-900 dark:text-white mb-2">
              {tCommon("no_plans_found")}
            </h3>
            <p className="text-zinc-600 dark:text-zinc-400 max-w-md mx-auto mb-6">
              {t("we_couldnt_find_any_plans_matching_your_criteria_1")}{" "}
              {t("try_adjusting_your_filters_or_search_term_1")}
            </p>
            <Button
              variant="outline"
              onClick={() => {
                setSearchTerm("");
                setMinProfit(0);
                setMaxInvestment(maxInvestmentValue);
                setActiveTab("all");
              }}
              className={`rounded-xl border-emerald-600/30 text-emerald-600 hover:bg-emerald-500/5 dark:text-emerald-400 dark:hover:bg-emerald-600/10`}
            >
              {tCommon("reset_filters")}
            </Button>
          </motion.div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredPlans.map((plan, index) => (
              <motion.div
                key={plan.id}
                initial={{ opacity: 0, y: 40 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="h-full"
              >
                <PlanCard plan={plan} />
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
