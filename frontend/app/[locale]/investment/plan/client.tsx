"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Link } from "@/i18n/routing";
import { useInvestmentStore } from "@/store/investment/user";
import {
  TrendingUp,
  Search,
  Filter,
  ArrowRight,
  Star,
  Target,
  Zap,
  Shield,
  DollarSign,
  Clock,
  BarChart3,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useTranslations } from "next-intl";

export default function InvestmentPlansClient() {
  const t = useTranslations("investment/plan/client");
  const { plans, plansLoading, fetchPlans, hasFetchedPlans } = useInvestmentStore();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedFilter, setSelectedFilter] = useState("all");
  
  useEffect(() => {
    // Only fetch if plans haven't been loaded yet
    if (!hasFetchedPlans && !plansLoading) {
      fetchPlans();
    }
  }, [hasFetchedPlans, plansLoading]);

  // Filter plans based on search and filter - ensure plans is an array
  const safePlans = Array.isArray(plans) ? plans : [];
  const filteredPlans = safePlans.filter((plan) => {
    const matchesSearch =
      plan.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      plan.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter =
      selectedFilter === "all" ||
      (selectedFilter === "trending" && plan.trending) ||
      (selectedFilter === "high-yield" && plan.profitPercentage > 15) ||
      (selectedFilter === "low-risk" && plan.profitPercentage <= 10);
    return matchesSearch && matchesFilter;
  });
  const formatCurrency = (amount: number, currency: string) => {
    // Validate amount
    if (amount === null || amount === undefined || isNaN(amount)) {
      return `${currency || "USD"} 0`;
    }

    // Validate currency
    if (!currency || typeof currency !== 'string') {
      currency = "USD";
    }

    // List of valid ISO 4217 currency codes that Intl.NumberFormat supports
    const validCurrencyCodes = [
      "USD", "EUR", "GBP", "JPY", "AUD", "CAD", "CHF", "CNY", "SEK", "NZD",
      "MXN", "SGD", "HKD", "NOK", "TRY", "ZAR", "BRL", "INR", "KRW", "RUB"
    ];

    // Check if the currency is a valid ISO currency code
    const isValidCurrency = validCurrencyCodes.includes(currency.toUpperCase());

    if (isValidCurrency) {
      try {
        return new Intl.NumberFormat("en-US", {
          style: "currency",
          currency: currency,
          minimumFractionDigits: 0,
          maximumFractionDigits: 0,
        }).format(amount);
      } catch (error) {
        // Fallback if there's still an error
        return `${currency} ${amount.toFixed(0)}`;
      }
    } else {
      // For cryptocurrencies and other non-ISO currencies, format manually
      const formattedValue = new Intl.NumberFormat("en-US", {
        minimumFractionDigits: 0,
        maximumFractionDigits: 8, // Cryptocurrencies often have more decimal places
      }).format(amount);
      
      return `${formattedValue} ${currency}`;
    }
  };
  const getPlanIcon = (index: number) => {
    const icons = [Target, Shield, Zap, BarChart3, DollarSign, Clock];
    return icons[index % icons.length];
  };
  const getPlanGradient = (index: number) => {
    const gradients = [
      "from-blue-500 to-cyan-500",
      "from-green-500 to-emerald-500",
      "from-purple-500 to-pink-500",
      "from-orange-500 to-red-500",
      "from-indigo-500 to-blue-500",
      "from-yellow-500 to-orange-500",
    ];
    return gradients[index % gradients.length];
  };
  const getPlanBgGradient = (index: number) => {
    const gradients = [
      "from-blue-50 to-cyan-50 dark:from-blue-950/20 dark:to-cyan-950/20",
      "from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20",
      "from-purple-50 to-pink-50 dark:from-purple-950/20 dark:to-pink-950/20",
      "from-orange-50 to-red-50 dark:from-orange-950/20 dark:to-red-950/20",
      "from-indigo-50 to-blue-50 dark:from-indigo-950/20 dark:to-blue-950/20",
      "from-yellow-50 to-orange-50 dark:from-yellow-950/20 dark:to-orange-950/20",
    ];
    return gradients[index % gradients.length];
  };
  if (plansLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-zinc-50 to-white dark:from-zinc-900 dark:to-zinc-950">
        <div className="container mx-auto px-4 py-12">
          <div className="max-w-6xl mx-auto">
            <Skeleton className="h-12 w-64 mx-auto mb-4" />
            <Skeleton className="h-6 w-96 mx-auto mb-12" />

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {Array.from({
                length: 6,
              }).map((_, i) => (
                <Skeleton key={i} className="h-96 w-full rounded-3xl" />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }
  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-50 to-white dark:from-zinc-900 dark:to-zinc-950">
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <motion.div
            initial={{
              opacity: 0,
              y: 30,
            }}
            animate={{
              opacity: 1,
              y: 0,
            }}
            transition={{
              duration: 0.8,
            }}
            className="text-center mb-12"
          >
            <motion.div
              initial={{
                opacity: 0,
                scale: 0.8,
              }}
              animate={{
                opacity: 1,
                scale: 1,
              }}
              transition={{
                duration: 0.6,
              }}
              className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-100 to-purple-100 dark:from-blue-950/50 dark:to-purple-950/50 border border-blue-200 dark:border-blue-800 rounded-full px-4 py-2 text-sm font-medium text-blue-700 dark:text-blue-300 mb-6"
            >
              <Star className="w-4 h-4" />
              {t("investment_plans")}
            </motion.div>

            <h1 className="text-4xl lg:text-5xl font-bold text-zinc-900 dark:text-zinc-100 mb-6">
              {t("choose_your")}{" "}
              <span className="bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 bg-clip-text text-transparent">
                {t("investment_plan")}
              </span>
            </h1>

            <p className="text-xl text-zinc-600 dark:text-zinc-300 max-w-3xl mx-auto leading-relaxed">
              {t("explore_our_comprehensive_risk_tolerance")}
            </p>
          </motion.div>

          {/* Search and Filters */}
          <motion.div
            initial={{
              opacity: 0,
              y: 20,
            }}
            animate={{
              opacity: 1,
              y: 0,
            }}
            transition={{
              duration: 0.6,
              delay: 0.2,
            }}
            className="mb-12"
          >
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
              {/* Search */}
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-zinc-400 w-4 h-4" />
                <Input
                  placeholder="Search investment plans..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 bg-white/80 dark:bg-zinc-800/80 backdrop-blur-sm border-zinc-200 dark:border-zinc-700"
                />
              </div>

              {/* Filters */}
              <div className="flex gap-2">
                {[
                  {
                    key: "all",
                    label: "All Plans",
                  },
                  {
                    key: "trending",
                    label: "Trending",
                  },
                  {
                    key: "high-yield",
                    label: "High Yield",
                  },
                  {
                    key: "low-risk",
                    label: "Low Risk",
                  },
                ].map((filter) => (
                  <Button
                    key={filter.key}
                    variant={
                      selectedFilter === filter.key ? "default" : "outline"
                    }
                    size="sm"
                    onClick={() => setSelectedFilter(filter.key)}
                    className={
                      selectedFilter === filter.key
                        ? "bg-gradient-to-r from-blue-600 to-purple-600 text-white"
                        : "border-zinc-200 dark:border-zinc-700"
                    }
                  >
                    {filter.label}
                  </Button>
                ))}
              </div>
            </div>
          </motion.div>

          {/* Plans Grid */}
          {filteredPlans.length === 0 ? (
            <motion.div
              initial={{
                opacity: 0,
              }}
              animate={{
                opacity: 1,
              }}
              className="text-center py-12"
            >
              <div className="w-24 h-24 bg-zinc-100 dark:bg-zinc-800 rounded-full flex items-center justify-center mx-auto mb-4">
                <Search className="w-8 h-8 text-zinc-400" />
              </div>
              <h3 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100 mb-2">
                {t("no_plans_found")}
              </h3>
              <p className="text-zinc-600 dark:text-zinc-400">
                {t("try_adjusting_your_search_or_filter_criteria")}
              </p>
            </motion.div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {filteredPlans.map((plan, index) => {
                const IconComponent = getPlanIcon(index);
                const gradient = getPlanGradient(index);
                const bgGradient = getPlanBgGradient(index);
                return (
                  <motion.div
                    key={plan.id}
                    initial={{
                      opacity: 0,
                      y: 30,
                    }}
                    animate={{
                      opacity: 1,
                      y: 0,
                    }}
                    transition={{
                      duration: 0.6,
                      delay: index * 0.1,
                    }}
                    whileHover={{
                      y: -10,
                    }}
                    className="group relative"
                  >
                    <div
                      className={`relative bg-gradient-to-br ${bgGradient} rounded-3xl p-8 border border-white/20 dark:border-zinc-700/50 shadow-xl hover:shadow-2xl transition-all duration-500 overflow-hidden h-full flex flex-col`}
                    >
                      {/* Background decoration */}
                      <div className="absolute inset-0 bg-gradient-to-br from-white/30 to-transparent dark:from-zinc-800/30 dark:to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                      {/* Trending badge */}
                      {plan.trending && (
                        <div className="absolute top-6 right-6">
                          <Badge
                            className={`bg-gradient-to-r ${gradient} text-white border-0 shadow-lg`}
                          >
                            <TrendingUp className="w-3 h-3 mr-1" />
                            {t("Trending")}
                          </Badge>
                        </div>
                      )}

                      <div className="relative z-10 flex-1 flex flex-col">
                        {/* Plan Icon */}
                        <div
                          className={`w-16 h-16 bg-gradient-to-br ${gradient} rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300`}
                        >
                          <IconComponent className="w-8 h-8 text-white" />
                        </div>

                        {/* Plan Title */}
                        <h3 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 mb-3">
                          {plan.title}
                        </h3>

                        {/* Plan Description */}
                        <p className="text-zinc-600 dark:text-zinc-300 mb-6 leading-relaxed flex-1">
                          {plan.description}
                        </p>

                        {/* Plan Stats */}
                        <div className="space-y-4 mb-8">
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-zinc-500 dark:text-zinc-400">
                              {t("expected_return")}
                            </span>
                            <span
                              className={`text-lg font-bold bg-gradient-to-r ${gradient} bg-clip-text text-transparent`}
                            >
                              {plan.profitPercentage}%
                            </span>
                          </div>

                          <div className="flex items-center justify-between">
                            <span className="text-sm text-zinc-500 dark:text-zinc-400">
                              {t("minimum_investment")}
                            </span>
                            <span className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                              {formatCurrency(plan.minAmount, plan.currency)}
                            </span>
                          </div>

                          <div className="flex items-center justify-between">
                            <span className="text-sm text-zinc-500 dark:text-zinc-400">
                              {t("maximum_investment")}
                            </span>
                            <span className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                              {formatCurrency(plan.maxAmount, plan.currency)}
                            </span>
                          </div>
                        </div>

                        {/* CTA Button */}
                        <Link href={`/investment/plan/${plan.id}`}>
                          <Button
                            className={`w-full bg-gradient-to-r ${gradient} hover:opacity-90 text-white shadow-lg hover:shadow-xl transition-all duration-300 group/btn`}
                            size="lg"
                          >
                            {t("invest_now")}
                            <ArrowRight className="ml-2 w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
                          </Button>
                        </Link>
                      </div>

                      {/* Hover effect decoration */}
                      <div
                        className={`absolute -inset-0.5 bg-gradient-to-br ${gradient} rounded-3xl opacity-0 group-hover:opacity-20 transition-opacity duration-500 -z-10`}
                      />
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}

          {/* Back to Home */}
          <motion.div
            initial={{
              opacity: 0,
              y: 20,
            }}
            animate={{
              opacity: 1,
              y: 0,
            }}
            transition={{
              duration: 0.6,
              delay: 0.4,
            }}
            className="text-center mt-12"
          >
            <Link href="/investment">
              <Button
                variant="outline"
                size="lg"
                className="border-2 border-zinc-300 dark:border-zinc-600 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-all duration-300"
              >
                {t("back_to_home")}
              </Button>
            </Link>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
