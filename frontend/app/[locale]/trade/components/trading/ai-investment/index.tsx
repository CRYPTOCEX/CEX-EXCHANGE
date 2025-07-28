"use client";

import React, { useEffect, useState } from "react";
import { Leaf, AlertCircle } from "lucide-react";
import { useAiInvestmentStore } from "@/store/ai/investment/use-ai-investment-store";
import PlanSelector from "./plan-selector";
import DurationSelector from "./duration-selector";
import AmountInput from "./amount-input";
import ExpectedProfitDisplay from "./expected-profit-display";
import InvestmentButton from "./investment-button";
import ErrorDisplay from "./error-display";
import { cn } from "@/lib/utils";
import { $fetch } from "@/lib/api";
import { Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useTranslations } from "next-intl";

interface AiInvestmentFormProps {
  isEco?: boolean;
  symbol: string;
}

export default function AiInvestmentForm({
  isEco = false,
  symbol,
}: AiInvestmentFormProps) {
  const t = useTranslations("trade/components/trading/ai-investment/index");
  const [error, setError] = React.useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [availableBalance, setAvailableBalance] = useState(0);
  const [isLoadingBalance, setIsLoadingBalance] = useState(true);
  const [currency, setCurrency] = useState("BTC");
  const [pair, setPair] = useState("USDT");

  // Extract currency and pair from symbol
  useEffect(() => {
    if (symbol.endsWith("USDT")) {
      setCurrency(symbol.replace("USDT", ""));
      setPair("USDT");
    } else if (symbol.endsWith("BUSD")) {
      setCurrency(symbol.replace("BUSD", ""));
      setPair("BUSD");
    } else if (symbol.endsWith("USD")) {
      setCurrency(symbol.replace("USD", ""));
      setPair("USD");
    } else {
      // Default fallback
      setCurrency("BTC");
      setPair("USDT");
    }
  }, [symbol]);

  // Extract the base currency from the pair (e.g., "BTC" from "BTCUSDT")
  const baseCurrency = currency;

  // Initialize the store if needed
  useEffect(() => {
    const store = useAiInvestmentStore.getState();
    if (!Array.isArray(store.plans) || store.plans.length === 0) {
      store.fetchPlans();
    }

    // Fetch wallet balance
    fetchWalletBalance();
  }, [symbol]);

  // Refetch wallet balance when currency changes
  useEffect(() => {
    if (currency) {
      fetchWalletBalance();
    }
  }, [currency]);

  // Fetch wallet balance
  const fetchWalletBalance = async () => {
    setIsLoadingBalance(true);
    try {
      const { data, error } = await $fetch({
        url: `/api/finance/wallet/spot/${baseCurrency}`,
        silentSuccess: true,
      });

      if (!error && data) {
        setAvailableBalance(Number.parseFloat(data.free) || 0);
      } else {
        console.error("Failed to fetch wallet balance:", error);
        setAvailableBalance(0);
      }
    } catch (err) {
      console.error("Error fetching wallet balance:", err);
      setAvailableBalance(0);
    } finally {
      setIsLoadingBalance(false);
    }
  };

  // Get state and actions from the store
  const {
    plans,
    isLoadingPlans,
    selectedPlanId,
    selectedDurationId,
    investmentAmount,
    createInvestment,
    apiError,
  } = useAiInvestmentStore();

  // Get the selected plan
  const selectedPlan = Array.isArray(plans)
    ? plans.find((plan) => plan.id === selectedPlanId)
    : undefined;

  // Get the selected duration
  const selectedDuration = selectedPlan?.durations?.find(
    (duration) => duration.id === selectedDurationId
  );

  // Handle submit
  const handleSubmit = async () => {
    if (!selectedPlanId) {
      setError("Please select an investment plan");
      return;
    }

    if (investmentAmount <= 0) {
      setError("Please enter a valid investment amount");
      return;
    }

    if (
      selectedPlan &&
      (investmentAmount < selectedPlan.minAmount ||
        investmentAmount > selectedPlan.maxAmount)
    ) {
      setError(
        `Investment amount must be between ${selectedPlan.minAmount} and ${selectedPlan.maxAmount} ${baseCurrency}`
      );
      return;
    }

    if (investmentAmount > availableBalance) {
      setError(
        `Insufficient balance. You have ${availableBalance} ${baseCurrency} available.`
      );
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const result = await createInvestment({
        planId: selectedPlanId,
        durationId: selectedDurationId || undefined,
        amount: investmentAmount,
        currency,
        pair,
        type: isEco ? "ECO" : "SPOT",
      });

      if (!result.success) {
        setError(result.error || "Failed to create investment");
      }
    } catch (error) {
      setError("An unexpected error occurred");
      console.error("Error creating AI investment:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Check if form is valid
  const isFormValid =
    Boolean(selectedPlanId) &&
    investmentAmount > 0 &&
    investmentAmount <= availableBalance;

  return (
    <div className="flex flex-col h-full bg-white dark:bg-black overflow-y-auto">
      {/* Market type indicator */}
      {isEco && (
        <div className="px-3 py-1.5 bg-emerald-50 border-b border-emerald-200 dark:bg-emerald-500/10 dark:border-emerald-500/20 flex items-center">
          <Leaf className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-500 mr-1.5" />
          <span className="text-xs font-medium text-emerald-700 dark:text-emerald-400">
            {t("eco_market")}
          </span>
          <Badge
            className={cn(
              "ml-auto bg-emerald-100 text-emerald-700 border-emerald-300 dark:bg-emerald-500/20 dark:text-emerald-400 dark:border-emerald-500/30 text-[10px]"
            )}
          >
            {t("low_fee")}
          </Badge>
        </div>
      )}

      <div className="p-3 space-y-4">
        {/* AI Investment header */}
        <FormHeader />

        {/* API Error */}
        {apiError && (
          <div className="p-2 bg-red-50 border border-red-200 dark:bg-red-500/10 dark:border-red-500/20 rounded-sm flex items-start space-x-2">
            <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-500 mt-0.5 flex-shrink-0" />
            <div className="text-xs text-red-700 dark:text-red-400">
              <p className="font-medium">{t("api_error")}</p>
              <p>{apiError}</p>
            </div>
          </div>
        )}

        {/* No Plans Available */}
        {!isLoadingPlans && (!plans || plans.length === 0) && !apiError && (
          <div className="p-3 bg-amber-50 border border-amber-200 dark:bg-amber-500/10 dark:border-amber-500/20 rounded-sm text-center">
            <p className="text-sm text-amber-700 dark:text-amber-400">
              {t("no_investment_plans_are_currently_available")}.
            </p>
            <p className="text-xs text-amber-600 dark:text-amber-500/80 mt-1">
              {t("please_check_back_later_or_contact_support")}.
            </p>
          </div>
        )}

        {/* Investment Plan Selection */}
        <PlanSelector
          plans={plans}
          isLoadingPlans={isLoadingPlans}
          selectedPlanId={selectedPlanId}
        />

        {/* Duration Selection */}
        {selectedPlan &&
          selectedPlan.durations &&
          selectedPlan.durations.length > 0 && (
            <DurationSelector
              durations={selectedPlan.durations}
              selectedDurationId={selectedDurationId}
            />
          )}

        {/* Investment Amount */}
        {selectedPlan && (
          <AmountInput
            investmentAmount={investmentAmount}
            pair={baseCurrency}
            availableBalance={availableBalance}
            selectedPlan={selectedPlan}
          />
        )}

        {/* Expected Profit */}
        {selectedPlan && investmentAmount > 0 && (
          <ExpectedProfitDisplay
            investmentAmount={investmentAmount}
            profitPercentage={selectedPlan.profitPercentage}
            currency={baseCurrency}
          />
        )}

        {/* Error Message */}
        {error && <ErrorDisplay error={error} />}

        {/* Submit Button */}
        {plans && plans.length > 0 && (
          <InvestmentButton
            isSubmitting={isSubmitting}
            isFormValid={isFormValid}
            onSubmit={handleSubmit}
          />
        )}

        {/* Form Guidance */}
        {!isFormValid && plans && plans.length > 0 && (
          <div className="text-[10px] text-amber-600 dark:text-amber-500/80 text-center">
            {!selectedPlanId ? "Select a plan and " : ""}
            {investmentAmount <= 0 ? "enter an amount" : ""}
            {investmentAmount > availableBalance ? "insufficient balance" : ""}
            {" to continue"}
          </div>
        )}

        {/* Disclaimer */}
        <div className="text-[10px] text-zinc-500 dark:text-zinc-500 text-center">
          {t("ai_investments_are_subject_to_market_risks")}.{" "}
          {t("past_performance_is_future_results")}.
        </div>
      </div>
    </div>
  );
}

function FormHeader() {
  const t = useTranslations("trade/components/trading/ai-investment/index");
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center">
        <Sparkles className="h-4 w-4 text-blue-600 dark:text-primary mr-1.5" />
        <h3 className="text-sm font-medium text-zinc-900 dark:text-white">
          {t("ai_investment")}
        </h3>
      </div>
      <Badge
        variant="outline"
        className="bg-blue-50 text-blue-700 border-blue-300 dark:bg-primary/10 dark:text-primary dark:border-primary/20 text-xs"
      >
        {t("Smart")}
      </Badge>
    </div>
  );
}
