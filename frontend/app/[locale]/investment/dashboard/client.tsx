"use client";

import { useEffect } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Link } from "@/i18n/routing";
import { useInvestmentStore } from "@/store/investment/user";
import { useUserStore } from "@/store/user";
import {
  TrendingUp,
  DollarSign,
  Clock,
  BarChart3,
  PieChart,
  ArrowRight,
  Plus,
  Target,
  Activity,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useTranslations } from "next-intl";

export default function InvestmentDashboardClient() {
  const t = useTranslations("investment/dashboard/client");
  const { investments, investmentsLoading, fetchUserInvestments } =
    useInvestmentStore();
  const { user } = useUserStore();
  useEffect(() => {
    if (user) {
      fetchUserInvestments();
    }
  }, [user, fetchUserInvestments]);

  // Find active investment from the investments list
  // Ensure investments is an array before calling find
  const activeInvestment =
    Array.isArray(investments) 
      ? investments.find((inv) => inv.status === "ACTIVE") || null
      : null;
  const formatCurrency = (amount: number, currency = "USD") => {
    // Validate amount
    if (amount === null || amount === undefined || isNaN(amount)) {
      return `${currency} 0.00`;
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
          currency,
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        }).format(amount);
      } catch (error) {
        // Fallback if there's still an error
        return `${currency} ${amount.toFixed(2)}`;
      }
    } else {
      // For cryptocurrencies and other non-ISO currencies, format manually
      const formattedValue = new Intl.NumberFormat("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 8, // Cryptocurrencies often have more decimal places
      }).format(amount);
      
      return `${formattedValue} ${currency}`;
    }
  };
  const formatDate = (date: string | Date | null | undefined) => {
    if (!date) {
      return "N/A";
    }
    
    try {
      const dateObj = new Date(date);
      // Check if the date is valid
      if (isNaN(dateObj.getTime())) {
        return "Invalid Date";
      }
      
      return dateObj.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch (error) {
      return "Invalid Date";
    }
  };
  const getStatusColor = (status: string) => {
    switch (status) {
      case "ACTIVE":
        return "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400";
      case "COMPLETED":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400";
      case "CANCELLED":
        return "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400";
      case "REJECTED":
        return "bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400";
    }
  };

  // Calculate portfolio stats - ensure investments is an array
  const safeInvestments = Array.isArray(investments) ? investments : [];
  const totalInvested = safeInvestments.reduce((sum, inv) => sum + inv.amount, 0);
  const totalProfit = safeInvestments.reduce(
    (sum, inv) => sum + (inv.profit || 0),
    0
  );
  const totalValue = totalInvested + totalProfit;
  const activeInvestments = safeInvestments.filter(
    (inv) => inv.status === "ACTIVE"
  ).length;
  const completedInvestments = safeInvestments.filter(
    (inv) => inv.status === "COMPLETED"
  ).length;
  if (investmentsLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-zinc-50 to-white dark:from-zinc-900 dark:to-zinc-950">
        <div className="container mx-auto px-4 py-12">
          <div className="max-w-6xl mx-auto">
            <Skeleton className="h-12 w-64 mb-8" />

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              {Array.from({
                length: 4,
              }).map((_, i) => (
                <Skeleton key={i} className="h-32 w-full rounded-xl" />
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <Skeleton className="h-96 w-full rounded-xl" />
              <Skeleton className="h-96 w-full rounded-xl" />
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
            className="mb-8"
          >
            <div className="flex flex-col md:flex-row md:items-center md:justify-between">
              <div>
                <h1 className="text-4xl font-bold text-zinc-900 dark:text-zinc-100 mb-2">
                  {t("investment_dashboard")}
                </h1>
                <p className="text-zinc-600 dark:text-zinc-300">
                  {t("track_your_portfolio_your_investments")}
                </p>
              </div>

              <Link href="/investment/plan">
                <Button className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg hover:shadow-xl transition-all duration-300 group mt-4 md:mt-0">
                  <Plus className="w-4 h-4 mr-2" />
                  {t("new_investment")}
                  <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
            </div>
          </motion.div>

          {/* Portfolio Overview Cards */}
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
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8"
          >
            <Card className="bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-950/20 dark:to-cyan-950/20 border-blue-200 dark:border-blue-800">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-blue-700 dark:text-blue-300">
                  {t("total_portfolio_value")}
                </CardTitle>
                <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-lg flex items-center justify-center">
                  <DollarSign className="w-4 h-4 text-white" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
                  {formatCurrency(totalValue)}
                </div>
                <p className="text-xs text-zinc-600 dark:text-zinc-400">
                  {totalProfit >= 0 ? "+" : ""}
                  {formatCurrency(totalProfit)} {t("profit")}
                </p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 border-green-200 dark:border-green-800">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-green-700 dark:text-green-300">
                  {t("total_invested")}
                </CardTitle>
                <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-emerald-500 rounded-lg flex items-center justify-center">
                  <TrendingUp className="w-4 h-4 text-white" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
                  {formatCurrency(totalInvested)}
                </div>
                <p className="text-xs text-zinc-600 dark:text-zinc-400">
                  {t("Across")} {safeInvestments.length} {t("investments")}
                </p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950/20 dark:to-pink-950/20 border-purple-200 dark:border-purple-800">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-purple-700 dark:text-purple-300">
                  {t("active_investments")}
                </CardTitle>
                <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
                  <Activity className="w-4 h-4 text-white" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
                  {activeInvestments}
                </div>
                <p className="text-xs text-zinc-600 dark:text-zinc-400">
                  {t("currently_running")}
                </p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-orange-50 to-red-50 dark:from-orange-950/20 dark:to-red-950/20 border-orange-200 dark:border-orange-800">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-orange-700 dark:text-orange-300">
                  {t("Completed")}
                </CardTitle>
                <div className="w-8 h-8 bg-gradient-to-br from-orange-500 to-red-500 rounded-lg flex items-center justify-center">
                  <Target className="w-4 h-4 text-white" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
                  {completedInvestments}
                </div>
                <p className="text-xs text-zinc-600 dark:text-zinc-400">
                  {t("successfully_finished")}
                </p>
              </CardContent>
            </Card>
          </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Active Investment */}
            <motion.div
              initial={{
                opacity: 0,
                x: -20,
              }}
              animate={{
                opacity: 1,
                x: 0,
              }}
              transition={{
                duration: 0.6,
                delay: 0.3,
              }}
            >
              <Card className="h-full">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-emerald-500 rounded-lg flex items-center justify-center">
                      <Activity className="w-4 h-4 text-white" />
                    </div>
                    {t("active_investment")}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {activeInvestment ? (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-zinc-600 dark:text-zinc-400">
                          {t("Plan")}
                        </span>
                        <span className="font-semibold">
                          {t("investment_plan")}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-zinc-600 dark:text-zinc-400">
                          {t("Amount")}
                        </span>
                        <span className="font-semibold">
                          {formatCurrency(activeInvestment.amount, activeInvestment.plan?.currency || "USD")}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-zinc-600 dark:text-zinc-400">
                          {t("Status")}
                        </span>
                        <Badge
                          className={getStatusColor(activeInvestment.status)}
                        >
                          {activeInvestment.status}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-zinc-600 dark:text-zinc-400">
                          {t("Duration")}
                        </span>
                        <span className="font-semibold">
                          {t("investment_duration")}
                        </span>
                      </div>
                      {activeInvestment.endDate && (
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-zinc-600 dark:text-zinc-400">
                            {t("end_date")}
                          </span>
                          <span className="font-semibold">
                            {formatDate(activeInvestment.endDate)}
                          </span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <div className="w-16 h-16 bg-zinc-100 dark:bg-zinc-800 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Target className="w-8 h-8 text-zinc-400" />
                      </div>
                      <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-2">
                        {t("no_active_investment")}
                      </h3>
                      <p className="text-zinc-600 dark:text-zinc-400 mb-4">
                        {t("start_your_investment_journey_today")}
                      </p>
                      <Link href="/investment/plan">
                        <Button
                          size="sm"
                          className="bg-gradient-to-r from-blue-600 to-purple-600 text-white"
                        >
                          {t("browse_plans")}
                        </Button>
                      </Link>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>

            {/* Investment History */}
            <motion.div
              initial={{
                opacity: 0,
                x: 20,
              }}
              animate={{
                opacity: 1,
                x: 0,
              }}
              transition={{
                duration: 0.6,
                delay: 0.4,
              }}
            >
              <Card className="h-full">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-lg flex items-center justify-center">
                      <BarChart3 className="w-4 h-4 text-white" />
                    </div>
                    {t("recent_investments")}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {safeInvestments.length > 0 ? (
                    <div className="space-y-4 max-h-80 overflow-y-auto">
                      {safeInvestments.slice(0, 5).map((investment) => {
                        return (
                          <div
                            key={investment.id}
                            className="flex items-center justify-between p-3 bg-zinc-50 dark:bg-zinc-800 rounded-lg"
                          >
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-medium text-sm">
                                  {t("investment_plan")}
                                </span>
                                <Badge
                                  className={getStatusColor(investment.status)}
                                >
                                  {investment.status}
                                </Badge>
                              </div>
                              <div className="text-xs text-zinc-600 dark:text-zinc-400">
                                {formatDate(investment.createdAt || new Date())}
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="font-semibold text-sm">
                                {formatCurrency(investment.amount, investment.plan?.currency || "USD")}
                              </div>
                              {investment.profit !== null &&
                                investment.profit !== undefined && (
                                  <div
                                    className={`text-xs ${investment.profit >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}
                                  >
                                    {investment.profit >= 0 ? "+" : ""}
                                    {formatCurrency(investment.profit, investment.plan?.currency || "USD")}
                                  </div>
                                )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <div className="w-16 h-16 bg-zinc-100 dark:bg-zinc-800 rounded-full flex items-center justify-center mx-auto mb-4">
                        <BarChart3 className="w-8 h-8 text-zinc-400" />
                      </div>
                      <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-2">
                        {t("no_investments_yet")}
                      </h3>
                      <p className="text-zinc-600 dark:text-zinc-400">
                        {t("your_investment_history_will_appear_here")}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          </div>

          {/* Quick Actions */}
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
              delay: 0.5,
            }}
            className="mt-8"
          >
            <Card>
              <CardHeader>
                <CardTitle>{t("quick_actions")}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Link href="/investment/plan">
                    <Button
                      variant="outline"
                      className="w-full h-20 flex flex-col gap-2 hover:bg-blue-50 dark:hover:bg-blue-950/20 border-blue-200 dark:border-blue-800"
                    >
                      <Plus className="w-6 h-6 text-blue-600" />
                      <span>{t("new_investment")}</span>
                    </Button>
                  </Link>

                  <Button
                    variant="outline"
                    className="w-full h-20 flex flex-col gap-2 hover:bg-green-50 dark:hover:bg-green-950/20 border-green-200 dark:border-green-800"
                  >
                    <Clock className="w-6 h-6 text-green-600" />
                    <span>{t("view_history")}</span>
                  </Button>

                  <Button
                    variant="outline"
                    className="w-full h-20 flex flex-col gap-2 hover:bg-purple-50 dark:hover:bg-purple-950/20 border-purple-200 dark:border-purple-800"
                  >
                    <PieChart className="w-6 h-6 text-purple-600" />
                    <span>{t("Analytics")}</span>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
