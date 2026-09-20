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
import { m } from "framer-motion";
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
  // `null` means "no ceiling chosen yet". It used to start at a literal
  // 100,000, and the filter excludes any plan whose OWN maximum is above the
  // slider — so a VIP plan with a 500,000 ceiling was invisible on first load,
  // with the Filters button showing an "Active" badge for a filter the user
  // never set. It is now seeded from the plans themselves once they arrive.
  const [maxInvestment, setMaxInvestment] = useState<number | null>(null);
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

  // Open the ceiling to whatever the widest plan needs, once, when the plans
  // land. After that the user owns the value.
  useEffect(() => {
    if (maxInvestment === null && plans.length > 0) {
      setMaxInvestment(maxInvestmentValue);
    }
  }, [plans.length, maxInvestmentValue, maxInvestment]);

  const effectiveMaxInvestment = maxInvestment ?? maxInvestmentValue;

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
      if ((plan.maxAmount || 100000) > effectiveMaxInvestment) return false;
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
    /* Nothing paints here. The `HeroSection` below brings `WorkspaceGround`
       with it, and the vertical wash this root used to carry is opaque — it
       sat over the ground and hid every part of it. `min-h-screen` is all
       that is left, and it has to stay: the ground is `fixed inset-0`. */
    <div className="min-h-screen">
      {/* Hero Section */}
      <HeroSection
        badge={{
          icon: <Sparkles className="h-3.5 w-3.5" />,
          text: "Investment Opportunities",
        }}
        title={t("choose_your_perfect_investment_plan")}
        description={`${t("our_professionally_managed_forex_investment_plans")} ${t("select_from_a_range_of_options")}`}
      >
        <StatsGroup
          stats={[
            {
              icon: DollarSign,
              label: t("min_investment"),
              value: formatCurrency(100),
              iconColor: `text-success`,
              iconBgColor: `bg-success/10`,
              valueColor: `text-success`,
            },
            {
              icon: TrendingUp,
              label: t("profit_range"),
              value: "2.5% - 30%",
              iconColor: `text-success`,
              iconBgColor: `bg-success/10`,
            },
            {
              icon: Clock,
              label: tCommon("duration"),
              value: "24h - 6 Months",
              iconColor: `text-success`,
              iconBgColor: `bg-success/10`,
            },
          ]}
        />
      </HeroSection>

      {/* Content Section */}
      <div className="container mx-auto py-8 pb-24">
        {/* Search and Filters */}
        <m.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="mb-8"
        >
          <Card className="border border-border/50 dark:border-border-strong/50 bg-card/80 dark:bg-surface-2/80 backdrop-blur-sm">
            <CardContent className="p-6">
              <div className="flex flex-col gap-4">
                {/* Tabs Row */}
                <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                  <Tabs defaultValue="all" className="w-full sm:w-auto">
                    <TabsList className="w-full sm:w-auto bg-muted p-1 rounded-xl">
                      <TabsTrigger
                        value="all"
                        onClick={() => setActiveTab("all")}
                        className="flex-1 sm:flex-none rounded-lg data-[state=active]:bg-card dark:data-[state=active]:bg-muted "
                      >
                        {tCommon("all_plans")}
                      </TabsTrigger>
                      <TabsTrigger
                        value="trending"
                        onClick={() => setActiveTab("trending")}
                        className="flex-1 sm:flex-none rounded-lg data-[state=active]:bg-card dark:data-[state=active]:bg-muted "
                      >
                        <Star className="mr-2 h-4 w-4 text-warning" /> Trending
                      </TabsTrigger>
                    </TabsList>
                  </Tabs>

                  {/* Sort dropdown - mobile */}
                  <div className="flex sm:hidden items-center space-x-2 w-full">
                    <span className="text-sm text-subtle-foreground whitespace-nowrap">
                      {tCommon("sort_by")}:
                    </span>
                    <Select value={sortBy} onValueChange={setSortBy}>
                      <SelectTrigger className="flex-1 rounded-xl border-border">
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
                      placeholder={`${tCommon("search_plans")}…`}
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full rounded-xl border-border pl-10"
                    />
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  </div>

                  {/* Filters and Sort */}
                  <div className="flex items-center gap-2 sm:gap-4 shrink-0">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowFilters(!showFilters)}
                      className={`flex-1 sm:flex-none rounded-xl border-border hover:bg-success/5 dark:hover:bg-success/10 hover:border-success/30`}
                    >
                      <Filter className="h-4 w-4" />
                      <span className="ml-2">Filters</span>
                      {(minProfit > 0 || effectiveMaxInvestment < maxInvestmentValue) && (
                        <Badge
                          className={`ml-1 bg-success text-success-foreground`}
                        >
                          Active
                        </Badge>
                      )}
                    </Button>

                    {/* Sort dropdown - desktop */}
                    <div className="hidden sm:flex items-center space-x-2">
                      <span className="text-sm text-subtle-foreground whitespace-nowrap">
                        {tCommon("sort_by")}:
                      </span>
                      <Select value={sortBy} onValueChange={setSortBy}>
                        <SelectTrigger className="w-40 rounded-xl border-border">
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
                <m.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mt-6 pt-6 border-t border-border"
                >
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-medium flex items-center text-foreground">
                      <SlidersHorizontal
                        className={`h-4 w-4 mr-2 text-success`}
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
                      className={`text-success hover:text-success hover:bg-success/5 dark:hover:bg-success/10`}
                    >
                      Reset
                    </Button>
                  </div>
                  <div className="grid md:grid-cols-2 gap-8">
                    <div>
                      <div className="flex justify-between mb-3">
                        <label className="text-sm text-muted-foreground">
                          {t("minimum_profit_rate")}
                        </label>
                        <span
                          className={`text-sm font-semibold text-success`}
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
                        className={`**:[[role=slider]]:bg-success`}
                      />
                      <div className="flex justify-between text-xs text-subtle-foreground mt-2">
                        <span>0%</span>
                        <span>{formatPercentage(maxProfitValue)}</span>
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between mb-3">
                        <label className="text-sm text-muted-foreground">
                          {tCommon("maximum_investment")}
                        </label>
                        <span
                          className={`text-sm font-semibold text-success`}
                        >
                          {formatCurrency(effectiveMaxInvestment)}
                        </span>
                      </div>
                      <Slider
                        value={[effectiveMaxInvestment]}
                        min={100}
                        max={maxInvestmentValue}
                        step={1000}
                        onValueChange={(values) => setMaxInvestment(values[0])}
                        className={`**:[[role=slider]]:bg-success`}
                      />
                      <div className="flex justify-between text-xs text-subtle-foreground mt-2">
                        <span>{formatCurrency(100)}</span>
                        <span>{formatCurrency(maxInvestmentValue)}</span>
                      </div>
                    </div>
                  </div>
                </m.div>
              )}
            </CardContent>
          </Card>
        </m.div>

        {/* Plans Grid */}
        {filteredPlans.length === 0 ? (
          <m.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-16"
          >
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-muted mb-6">
              <Search className="h-10 w-10 text-muted-foreground" />
            </div>
            <h3 className="text-xl font-bold text-foreground mb-2">
              {tCommon("no_plans_found")}
            </h3>
            <p className="text-muted-foreground max-w-md mx-auto mb-6">
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
              className={`rounded-xl border-success/30 text-success hover:bg-success/5 hover:text-success-ink dark:hover:bg-success/10`}
            >
              {tCommon("reset_filters")}
            </Button>
          </m.div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredPlans.map((plan, index) => (
              <m.div
                key={plan.id}
                initial={{ opacity: 0, y: 40 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="h-full"
              >
                <PlanCard plan={plan} />
              </m.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
