"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Progress } from "@/components/ui/progress";
import {
  Star,
  DollarSign,
  Percent,
  Filter,
  Search,
  SlidersHorizontal,
  Clock,
  ArrowUpRight,
} from "lucide-react";
import { useRouter } from "@/i18n/routing";
import { useForexStore } from "@/store/forex/user";
import { formatCurrency, formatPercentage } from "@/utils/formatters";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
export default function PlansClient() {
  const router = useRouter();
  const { plans, fetchPlans, hasFetchedPlans } = useForexStore();
  const [activeTab, setActiveTab] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [minProfit, setMinProfit] = useState(0);
  const [maxInvestment, setMaxInvestment] = useState(100000);
  const [showFilters, setShowFilters] = useState(false);
  const [sortBy, setSortBy] = useState("popularity");
  const [progressValue, setProgressValue] = useState(0);

  // Animate progress bar
  useEffect(() => {
    const timer = setTimeout(() => {
      setProgressValue(100);
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  // Fetch plans if not loaded
  useEffect(() => {
    if (!hasFetchedPlans) {
      fetchPlans();
    }
  }, [hasFetchedPlans, fetchPlans]);

  // Get max profit and investment values for filters
  const maxProfitValue = Math.max(...plans.map((plan) => plan.maxProfit));
  const maxInvestmentValue = Math.max(
    ...plans.map((plan) => plan.maxAmount || 100000)
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
    <div className="container mx-auto px-4 pt-6 pb-32">
      {/* Hero Section */}
      <div className="relative bg-gradient-to-r from-blue-600 to-indigo-700 dark:bg-gradient-to-r dark:from-zinc-900 dark:to-zinc-700 rounded-2xl p-8 md:p-12 mb-12 overflow-hidden">
        <div className="absolute inset-0 overflow-hidden opacity-10">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-white/30 dark:bg-zinc-700/30 rounded-full blur-3xl"></div>
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-white/30 dark:bg-zinc-700/30 rounded-full blur-3xl"></div>
        </div>
        <div className="relative z-10 max-w-2xl">
          <Badge className="mb-4 bg-white/20 text-white backdrop-blur-sm dark:bg-white dark:text-black">
            Investment Opportunities
          </Badge>
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Choose the Perfect Investment Plan for Your Financial Goals
          </h1>
          <p className="text-blue-100 dark:text-zinc-100 text-lg mb-6">
            Our professionally managed forex investment plans are designed to
            maximize your returns while minimizing risk. Select from a range of
            options tailored to your investment goals.
          </p>
          <div className="flex flex-wrap gap-6 mt-8">
            <div className="flex items-center bg-white/10 dark:bg-zinc-800/90 backdrop-blur-sm rounded-lg px-4 py-3">
              <DollarSign className="h-5 w-5 text-blue-200 dark:text-zinc-100 mr-2" />
              <div>
                <p className="text-xs text-blue-200 dark:text-zinc-100">
                  Min Investment
                </p>
                <p className="text-white font-bold">{formatCurrency(100)}</p>
              </div>
            </div>
            <div className="flex items-center bg-white/10 dark:bg-zinc-800/90 backdrop-blur-sm rounded-lg px-4 py-3">
              <Percent className="h-5 w-5 text-blue-200 dark:text-zinc-100 mr-2" />
              <div>
                <p className="text-xs text-blue-200 dark:text-zinc-100">
                  Profit Range
                </p>
                <p className="text-white font-bold">2.5% - 30%</p>
              </div>
            </div>
            <div className="flex items-center bg-white/10 dark:bg-zinc-800/90 backdrop-blur-sm rounded-lg px-4 py-3">
              <Clock className="h-5 w-5 text-blue-200 dark:text-zinc-100 mr-2" />
              <div>
                <p className="text-xs text-blue-200 dark:text-zinc-100">
                  Duration Options
                </p>
                <p className="text-white font-bold">24h - 6 Months</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="mb-8">
        <div className="flex flex-col gap-4">
          {/* Tabs Row */}
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <Tabs defaultValue="all" className="w-full sm:w-auto">
              <TabsList className="w-full sm:w-auto">
                <TabsTrigger
                  value="all"
                  onClick={() => setActiveTab("all")}
                  className="flex-1 sm:flex-none"
                >
                  All Plans
                </TabsTrigger>
                <TabsTrigger
                  value="trending"
                  onClick={() => setActiveTab("trending")}
                  className="flex-1 sm:flex-none"
                >
                  <Star className="mr-2 h-4 w-4 text-yellow-500" /> Trending
                </TabsTrigger>
              </TabsList>
            </Tabs>

            {/* Sort dropdown - mobile */}
            <div className="flex sm:hidden items-center space-x-2 w-full">
              <span className="text-sm text-gray-500 dark:text-zinc-400 whitespace-nowrap">
                Sort by:
              </span>
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="popularity">Popularity</SelectItem>
                  <SelectItem value="profit">Highest Profit</SelectItem>
                  <SelectItem value="minInvestment">
                    Lowest Min Investment
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
                placeholder="Search plans..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                icon="mdi:magnify"
                className="w-full"
              />
            </div>

            {/* Filters and Sort */}
            <div className="flex items-center gap-2 sm:gap-4 shrink-0">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowFilters(!showFilters)}
                className="flex-1 sm:flex-none"
              >
                <Filter className="h-4 w-4" />
                <span className="ml-2">Filters</span>
                {(minProfit > 0 || maxInvestment < maxInvestmentValue) && (
                  <Badge className="ml-1 bg-blue-600 text-white dark:bg-zinc-100 dark:text-zinc-900">
                    Active
                  </Badge>
                )}
              </Button>

              {/* Sort dropdown - desktop */}
              <div className="hidden sm:flex items-center space-x-2">
                <span className="text-sm text-gray-500 dark:text-zinc-400 whitespace-nowrap">
                  Sort by:
                </span>
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="popularity">Popularity</SelectItem>
                    <SelectItem value="profit">Highest Profit</SelectItem>
                    <SelectItem value="minInvestment">
                      Lowest Min Investment
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </div>
        {showFilters && (
          <div className="mt-4 p-6 bg-white rounded-lg shadow-sm border border-gray-100 animate-in fade-in-0 zoom-in-95 duration-200 dark:bg-zinc-900 dark:border-zinc-700">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-medium flex items-center">
                <SlidersHorizontal className="h-4 w-4 mr-2" /> Advanced Filters
              </h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setMinProfit(0);
                  setMaxInvestment(maxInvestmentValue);
                }}
              >
                Reset
              </Button>
            </div>
            <div className="grid md:grid-cols-2 gap-8">
              <div>
                <div className="flex justify-between mb-2">
                  <label className="text-sm text-gray-600 dark:text-white">
                    Minimum Profit Rate
                  </label>
                  <span className="text-sm font-medium">
                    {formatPercentage(minProfit)}
                  </span>
                </div>
                <Slider
                  value={[minProfit]}
                  min={0}
                  max={maxProfitValue}
                  step={0.5}
                  onValueChange={(values) => setMinProfit(values[0])}
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1 dark:text-white">
                  <span>0%</span>
                  <span>{formatPercentage(maxProfitValue)}</span>
                </div>
              </div>
              <div>
                <div className="flex justify-between mb-2">
                  <label className="text-sm text-gray-600 dark:text-white">
                    Maximum Investment
                  </label>
                  <span className="text-sm font-medium">
                    {formatCurrency(maxInvestment)}
                  </span>
                </div>
                <Slider
                  value={[maxInvestment]}
                  min={100}
                  max={maxInvestmentValue}
                  step={1000}
                  onValueChange={(values) => setMaxInvestment(values[0])}
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1 dark:text-white">
                  <span>{formatCurrency(100)}</span>
                  <span>{formatCurrency(maxInvestmentValue)}</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {filteredPlans.length === 0 ? (
        <div className="text-center py-12">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 mb-4 dark:bg-zinc-800">
            <Search className="h-8 w-8 text-gray-400 dark:text-white" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2 dark:text-white">
            No plans found
          </h3>
          <p className="text-gray-600 max-w-md mx-auto dark:text-white">
            We couldn't find any plans matching your criteria. Try adjusting
            your filters or search term.
          </p>
          <Button
            variant="outline"
            className="mt-4 dark:border-white dark:text-white dark:hover:bg-zinc-800"
            onClick={() => {
              setSearchTerm("");
              setMinProfit(0);
              setMaxInvestment(maxInvestmentValue);
              setActiveTab("all");
            }}
          >
            Reset Filters
          </Button>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredPlans.map((plan, index) => {
            return (
              <Card
                key={plan.id}
                className="relative group overflow-hidden border-none shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 dark:bg-zinc-800 dark:text-white"
              >
                {plan.trending && (
                  <div className="absolute top-4 right-4 z-10">
                    <Badge className="bg-yellow-500 text-yellow-900 px-3 py-1 font-medium dark:bg-white dark:text-black">
                      <Star className="h-3.5 w-3.5 mr-1 fill-yellow-900 dark:fill-black" />{" "}
                      Trending
                    </Badge>
                  </div>
                )}
                <div className="h-48 relative">
                  <Image
                    src={plan.image || `/img/placeholder.svg`}
                    alt={plan.title || plan.name}
                    fill
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
                  <div className="absolute bottom-4 left-4 right-4">
                    <h3 className="text-white text-xl font-bold">
                      {plan.title || plan.name}
                    </h3>
                    <p className="text-white/80 text-sm">
                      {plan.description?.substring(0, 60)}...
                    </p>
                  </div>
                </div>
                <CardContent className="p-6">
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-blue-500/10 p-3 rounded-lg">
                        <div className="flex items-center text-blue-600 mb-1 dark:text-blue-400">
                          <Percent className="h-4 w-4 mr-1" />
                          <span className="text-xs font-medium">
                            Profit Range
                          </span>
                        </div>
                        <p className="font-semibold">
                          {formatPercentage(plan.minProfit)} -{" "}
                          {formatPercentage(plan.maxProfit)}
                        </p>
                      </div>
                      <div className="bg-green-500/10 p-3 rounded-lg">
                        <div className="flex items-center text-green-600 mb-1 dark:text-green-400">
                          <DollarSign className="h-4 w-4 mr-1" />
                          <span className="text-xs font-medium">
                            Min Investment
                          </span>
                        </div>
                        <p className="font-semibold">
                          {plan.minAmount || 0} {plan.currency}
                        </p>
                      </div>
                    </div>
                    <div className="pt-2 space-y-3">
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-gray-600 dark:text-white">
                            Total Invested:
                          </span>
                          <span className="font-medium">
                            {plan.invested} {plan.currency}
                          </span>
                        </div>
                        <Progress
                          value={Math.min(100, (plan.invested / 1000000) * 100)}
                          className="h-2"
                        />
                      </div>
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="px-6 pb-6 pt-0">
                  <Button
                    className="w-full bg-blue-600 hover:bg-blue-700 group dark:bg-white dark:text-black dark:hover:bg-gray-100"
                    onClick={() => router.push(`/forex/plan/${plan.id}`)}
                  >
                    Invest Now
                    <ArrowUpRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1 group-hover:-translate-y-1" />
                  </Button>
                </CardFooter>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
