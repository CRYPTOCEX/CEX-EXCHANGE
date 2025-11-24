"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Link } from "@/i18n/routing";
import { useInvestmentStore } from "@/store/investment/user";
import {
  TrendingUp,
  ArrowLeft,
  DollarSign,
  Clock,
  Target,
  Shield,
  AlertCircle,
  CheckCircle,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useTranslations } from "next-intl";

interface InvestmentPlanClientProps {
  planId: string;
}

export default function InvestmentPlanClient({
  planId,
}: InvestmentPlanClientProps) {
  const t = useTranslations("investment/plan/[id]/client");
  const {
    plans,
    plansLoading,
    fetchPlans,
    hasFetchedPlans,
    createInvestment,
    isInvesting,
    investmentError,
    clearError,
  } = useInvestmentStore();
  const [amount, setAmount] = useState("");
  const [selectedDuration, setSelectedDuration] = useState("");

  useEffect(() => {
    // Only fetch if plans haven't been loaded yet
    if (!hasFetchedPlans && !plansLoading) {
      fetchPlans();
    }
  }, [hasFetchedPlans, plansLoading]);

  useEffect(() => {
    if (investmentError) {
      const timer = setTimeout(() => {
        clearError();
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [investmentError, clearError]);

  // Ensure plans is an array before calling find
  const plan = Array.isArray(plans) 
    ? plans.find((p) => p.id === planId)
    : undefined;

  const formatCurrency = (amount: number, currency = "USD") => {
    // Validate amount
    if (amount === null || amount === undefined || isNaN(amount)) {
      return `${currency} 0`;
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

  const handleInvest = async () => {
    if (!plan || !amount || !selectedDuration) return;

    const investmentAmount = parseFloat(amount);
    if (
      investmentAmount < plan.minAmount ||
      investmentAmount > plan.maxAmount
    ) {
      return;
    }

    await createInvestment(plan.id, selectedDuration, investmentAmount);
  };

  const isValidAmount = () => {
    if (!amount || !plan) return false;
    const investmentAmount = parseFloat(amount);
    return (
      investmentAmount >= plan.minAmount && investmentAmount <= plan.maxAmount
    );
  };

  if (plansLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-zinc-50 to-white dark:from-zinc-900 dark:to-zinc-950">
        <div className="container mx-auto px-4 py-12">
          <div className="max-w-4xl mx-auto">
            <Skeleton className="h-8 w-32 mb-8" />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <Skeleton className="h-96 w-full rounded-xl" />
              <Skeleton className="h-96 w-full rounded-xl" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!plan) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-zinc-50 to-white dark:from-zinc-900 dark:to-zinc-950">
        <div className="container mx-auto px-4 py-12">
          <div className="max-w-4xl mx-auto text-center">
            <div className="w-24 h-24 bg-zinc-100 dark:bg-zinc-800 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-8 h-8 text-zinc-400" />
            </div>
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 mb-2">
              {t("plan_not_found")}
            </h1>
            <p className="text-zinc-600 dark:text-zinc-400 mb-6">
              {t("the_investment_plan_been_removed")}.
            </p>
            <Link href="/investment/plan">
              <Button>
                <ArrowLeft className="w-4 h-4 mr-2" />
                {t("back_to_plans")}
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-50 to-white dark:from-zinc-900 dark:to-zinc-950">
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          {/* Back Button */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
            className="mb-8"
          >
            <Link href="/investment/plan">
              <Button variant="outline" size="sm">
                <ArrowLeft className="w-4 h-4 mr-2" />
                {t("back_to_plans")}
              </Button>
            </Link>
          </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Plan Details */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              <Card className="h-full">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-2xl">{plan.title}</CardTitle>
                    {plan.trending && (
                      <Badge className="bg-gradient-to-r from-orange-500 to-red-500 text-white">
                        <TrendingUp className="w-3 h-3 mr-1" />
                        {t("Trending")}
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  <p className="text-zinc-600 dark:text-zinc-300 leading-relaxed">
                    {plan.description}
                  </p>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-800">
                      <div className="flex items-center gap-2 mb-2">
                        <TrendingUp className="w-4 h-4 text-green-600" />
                        <span className="text-sm font-medium text-green-700 dark:text-green-300">
                          {t("expected_return")}
                        </span>
                      </div>
                      <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                        {plan.profitPercentage}%
                      </div>
                    </div>

                    <div className="p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
                      <div className="flex items-center gap-2 mb-2">
                        <DollarSign className="w-4 h-4 text-blue-600" />
                        <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
                          {t("Currency")}
                        </span>
                      </div>
                      <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                        {plan.currency}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-zinc-600 dark:text-zinc-400">
                        {t("minimum_investment")}
                      </span>
                      <span className="font-semibold">
                        {formatCurrency(plan.minAmount, plan.currency)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-zinc-600 dark:text-zinc-400">
                        {t("maximum_investment")}
                      </span>
                      <span className="font-semibold">
                        {formatCurrency(plan.maxAmount, plan.currency)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-zinc-600 dark:text-zinc-400">
                        {t("wallet_type")}
                      </span>
                      <span className="font-semibold">{plan.walletType}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 p-3 bg-zinc-50 dark:bg-zinc-800 rounded-lg">
                    <Shield className="w-5 h-5 text-blue-600" />
                    <span className="text-sm text-zinc-600 dark:text-zinc-300">
                      {t("your_investment_is_security_guarantee")}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Investment Form */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
            >
              <Card className="h-full">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="w-5 h-5" />
                    {t("make_investment")}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {investmentError && (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>{investmentError}</AlertDescription>
                    </Alert>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="amount">
                      {t("investment_amount_(")}
                      {plan.currency}
                      )
                    </Label>
                    <Input
                      id="amount"
                      type="number"
                      placeholder={`Min: ${formatCurrency(plan.minAmount, plan.currency)}`}
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      min={plan.minAmount}
                      max={plan.maxAmount}
                      step="0.01"
                    />
                    <div className="text-xs text-zinc-500 dark:text-zinc-400">
                      {t("range")}
                      {formatCurrency(plan.minAmount, plan.currency)} -{" "}
                      {formatCurrency(plan.maxAmount, plan.currency)}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>{t("investment_duration")}</Label>
                    {plan.durations && Array.isArray(plan.durations) && plan.durations.length > 0 ? (
                      <div className="grid grid-cols-1 gap-2">
                        {plan.durations.map((duration) => (
                          <Button
                            key={duration.id}
                            variant={
                              selectedDuration === duration.id
                                ? "default"
                                : "outline"
                            }
                            onClick={() => setSelectedDuration(duration.id)}
                            className="justify-start"
                          >
                            <Clock className="w-4 h-4 mr-2" />
                            {duration.duration}{" "}
                            {duration.timeframe.toLowerCase()}
                            {duration.duration > 1 ? "s" : ""}
                          </Button>
                        ))}
                      </div>
                    ) : (
                      <div className="p-4 bg-orange-50 dark:bg-orange-950/20 rounded-lg border border-orange-200 dark:border-orange-800">
                        <div className="flex items-center gap-2 mb-2">
                          <AlertCircle className="w-4 h-4 text-orange-600" />
                          <span className="text-sm font-medium text-orange-700 dark:text-orange-300">
                            {t("no_durations_available")}
                          </span>
                        </div>
                        <p className="text-xs text-orange-600 dark:text-orange-400">
                          {t("this_investment_plan_configured_yet")}.
                        </p>
                      </div>
                    )}
                  </div>

                  {amount && isValidAmount() && (
                    <div className="p-4 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-800">
                      <div className="flex items-center gap-2 mb-2">
                        <CheckCircle className="w-4 h-4 text-green-600" />
                        <span className="text-sm font-medium text-green-700 dark:text-green-300">
                          {t("expected_profit")}
                        </span>
                      </div>
                      <div className="text-lg font-bold text-green-600 dark:text-green-400">
                        {formatCurrency(
                          (parseFloat(amount) * plan.profitPercentage) / 100,
                          plan.currency
                        )}
                      </div>
                      <div className="text-xs text-green-600 dark:text-green-400">
                        {t("total_return")}
                        {formatCurrency(
                          parseFloat(amount) +
                            (parseFloat(amount) * plan.profitPercentage) / 100,
                          plan.currency
                        )}
                      </div>
                    </div>
                  )}

                  <Button
                    onClick={handleInvest}
                    disabled={
                      !isValidAmount() ||
                      !selectedDuration ||
                      isInvesting ||
                      !plan.durations ||
                      plan.durations.length === 0
                    }
                    className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
                    size="lg"
                  >
                    {isInvesting
                      ? "Processing..."
                      : !plan.durations || plan.durations.length === 0
                        ? "No Durations Available"
                        : "Invest Now"}
                  </Button>

                  <div className="text-xs text-zinc-500 dark:text-zinc-400 text-center">
                    {t("by_investing_you_and_conditions")}.{" "}
                    {t("your_investment_will_be_processed_immediately")}.
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}
