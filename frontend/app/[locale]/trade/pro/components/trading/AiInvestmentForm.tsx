"use client";

import React, { memo, useState, useEffect, useCallback, useMemo } from "react";
import {
  Sparkles,
  AlertCircle,
  CheckCircle,
  Clock,
  TrendingUp,
  Users,
  Wallet,
  Leaf
} from "lucide-react";
import { cn } from "../../utils/cn";
import { useAiInvestmentStore, type AiInvestmentPlan } from "@/store/ai/investment/use-ai-investment-store";
import { $fetch } from "@/lib/api";
import { useTranslations } from "next-intl";

interface AiInvestmentFormProps {
  symbol: string;
  marketType: "spot" | "futures" | "eco";
  className?: string;
}

// Module-level cache to prevent duplicate wallet fetches
const walletBalanceCache: {
  key: string;
  balance: number;
  timestamp: number;
  fetchInProgress: boolean;
} = {
  key: "",
  balance: 0,
  timestamp: 0,
  fetchInProgress: false,
};
const WALLET_CACHE_COOLDOWN_MS = 2000;

export const AiInvestmentForm = memo(function AiInvestmentForm({
  symbol,
  marketType,
  className,
}: AiInvestmentFormProps) {
  const t = useTranslations("common");
  const tTrade = useTranslations("trade_components");

  // Local state
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [availableBalance, setAvailableBalance] = useState(0);
  const [isLoadingBalance, setIsLoadingBalance] = useState(true);
  const [percentSelected, setPercentSelected] = useState<number | null>(null);

  // Determine if market is eco type
  const isEco = marketType === "eco";

  // Parse symbol to get currency and pair
  const [currency, pair] = useMemo(() => {
    if (symbol.includes("/")) {
      const parts = symbol.split("/");
      return [parts[0] || "BTC", parts[1] || "USDT"];
    }
    if (symbol.endsWith("USDT")) {
      return [symbol.replace("USDT", ""), "USDT"];
    }
    if (symbol.endsWith("BUSD")) {
      return [symbol.replace("BUSD", ""), "BUSD"];
    }
    if (symbol.endsWith("USD")) {
      return [symbol.replace("USD", ""), "USD"];
    }
    return ["BTC", "USDT"];
  }, [symbol]);

  // Store state
  const {
    plans,
    isLoadingPlans,
    selectedPlanId,
    selectedDurationId,
    investmentAmount,
    createInvestment,
    setSelectedPlan,
    setSelectedDuration,
    setInvestmentAmount,
    apiError,
    fetchPlans,
  } = useAiInvestmentStore();

  // Get selected plan and duration
  const selectedPlan = useMemo(() =>
    Array.isArray(plans) ? plans.find((plan) => plan.id === selectedPlanId) : undefined,
    [plans, selectedPlanId]
  );

  const selectedDuration = useMemo(() =>
    selectedPlan?.durations?.find((d) => d.id === selectedDurationId),
    [selectedPlan, selectedDurationId]
  );

  // Fetch plans on mount
  useEffect(() => {
    const store = useAiInvestmentStore.getState();
    if (!Array.isArray(store.plans) || store.plans.length === 0) {
      store.fetchPlans();
    }
  }, []);

  // Fetch wallet balance - we use PAIR (USDT) for AI investments, not CURRENCY (BTC)
  const fetchWalletBalance = useCallback(async (force = false) => {
    if (!currency || !pair) return;

    const walletType = isEco ? "ECO" : "SPOT";
    const cacheKey = `${walletType}_${currency}_${pair}`;
    const now = Date.now();

    // Check cache - use cached value if recent and same key
    if (!force && cacheKey === walletBalanceCache.key) {
      if (walletBalanceCache.fetchInProgress || now - walletBalanceCache.timestamp < WALLET_CACHE_COOLDOWN_MS) {
        // Use cached balance
        if (walletBalanceCache.balance > 0) {
          setAvailableBalance(walletBalanceCache.balance);
          setIsLoadingBalance(false);
        }
        return;
      }
    }

    walletBalanceCache.fetchInProgress = true;
    walletBalanceCache.key = cacheKey;
    setIsLoadingBalance(true);

    try {
      const { data, error } = await $fetch({
        url: `/api/finance/wallet/symbol?type=${walletType}&currency=${currency}&pair=${pair}`,
        silentSuccess: true,
      });

      if (!error && data) {
        // AI investments use PAIR (e.g., USDT) balance, not CURRENCY (e.g., BTC)
        const balance = Number.parseFloat(data.PAIR?.balance ?? data.PAIR ?? 0) || 0;
        walletBalanceCache.balance = balance;
        walletBalanceCache.timestamp = Date.now();
        setAvailableBalance(balance);
      } else {
        setAvailableBalance(0);
      }
    } catch (err) {
      setAvailableBalance(0);
    } finally {
      walletBalanceCache.fetchInProgress = false;
      setIsLoadingBalance(false);
    }
  }, [currency, pair, isEco]);

  // Refetch balance when currency or pair changes
  useEffect(() => {
    if (currency && pair) {
      fetchWalletBalance();
    }
  }, [currency, pair, fetchWalletBalance]);

  // Format balance based on pair currency (USDT, etc.)
  const formatBalance = useCallback((value: number): string => {
    // AI investments use pair (USDT) so format appropriately
    if (pair === "BTC" || pair.includes("BTC")) {
      return value.toFixed(8);
    } else if (pair === "ETH" || pair.includes("ETH")) {
      return value.toFixed(6);
    } else {
      // USDT, USD, BUSD etc - use 4 decimal places for small amounts
      return value < 1 ? value.toFixed(4) : value.toFixed(2);
    }
  }, [pair]);

  // Handle percent click
  const handlePercentClick = useCallback((percent: number) => {
    setPercentSelected(percent);
    const calculatedAmount = availableBalance * (percent / 100);

    if (availableBalance <= 0 && selectedPlan) {
      setInvestmentAmount(selectedPlan.minAmount);
      return;
    }

    if (selectedPlan) {
      if (calculatedAmount < selectedPlan.minAmount) {
        setInvestmentAmount(selectedPlan.minAmount);
      } else if (calculatedAmount > selectedPlan.maxAmount) {
        setInvestmentAmount(selectedPlan.maxAmount);
      } else {
        setInvestmentAmount(Number.parseFloat(calculatedAmount.toFixed(8)));
      }
    } else {
      setInvestmentAmount(Number.parseFloat(calculatedAmount.toFixed(8)));
    }
  }, [availableBalance, selectedPlan, setInvestmentAmount]);

  // Handle amount change
  const handleAmountChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = Number.parseFloat(e.target.value);
    setPercentSelected(null);

    if (!isNaN(value)) {
      if (selectedPlan) {
        if (value < selectedPlan.minAmount) {
          setInvestmentAmount(selectedPlan.minAmount);
        } else if (value > selectedPlan.maxAmount) {
          setInvestmentAmount(selectedPlan.maxAmount);
        } else {
          setInvestmentAmount(Number.parseFloat(value.toFixed(8)));
        }
      } else {
        setInvestmentAmount(Number.parseFloat(value.toFixed(8)));
      }
    } else {
      setInvestmentAmount(0);
    }
  }, [selectedPlan, setInvestmentAmount]);

  // Handle submit
  const handleSubmit = async () => {
    if (!selectedPlanId) {
      setError(t("please_select_plan"));
      return;
    }

    if (investmentAmount <= 0) {
      setError(t("please_enter_amount"));
      return;
    }

    if (selectedPlan && (investmentAmount < selectedPlan.minAmount || investmentAmount > selectedPlan.maxAmount)) {
      setError(`${t("amount_between")} ${selectedPlan.minAmount} - ${selectedPlan.maxAmount} ${pair}`);
      return;
    }

    if (investmentAmount > availableBalance) {
      setError(`${t("insufficient_balance")}: ${formatBalance(availableBalance)} ${pair}`);
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
        setError(result.error || t("investment_failed"));
      } else {
        // Force refresh balance after successful investment
        fetchWalletBalance(true);
        // Dispatch event to notify OrdersPanel to refresh AI investments
        window.dispatchEvent(new CustomEvent("tp-ai-investment-created"));
      }
    } catch (err) {
      setError(t("unexpected_error"));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Calculate expected profit
  const expectedProfit = useMemo(() => {
    if (!selectedPlan || investmentAmount <= 0) return 0;
    return (investmentAmount * selectedPlan.profitPercentage) / 100;
  }, [selectedPlan, investmentAmount]);

  // Check if form is valid
  const isFormValid = Boolean(selectedPlanId) && investmentAmount > 0 && investmentAmount <= availableBalance;

  return (
    <div className={cn("flex flex-col h-full overflow-hidden bg-[var(--tp-bg-secondary)]", className)}>
      {/* Eco market indicator */}
      {isEco && (
        <div className="shrink-0 flex items-center justify-between px-3 py-2 bg-[var(--tp-green)]/10 border-b border-[var(--tp-green)]/20">
          <div className="flex items-center gap-1.5">
            <Leaf className="h-4 w-4 text-[var(--tp-green)]" />
            <span className="text-xs font-medium text-[var(--tp-green)]">
              {t("eco_market")}
            </span>
          </div>
          <span className="text-[11px] px-2 py-0.5 rounded bg-[var(--tp-green)]/20 text-[var(--tp-green)]">
            {t("low_fee")}
          </span>
        </div>
      )}

      {/* Header */}
      <div className="shrink-0 flex items-center justify-between px-3 py-2 border-b border-[var(--tp-border)]">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-[var(--tp-blue)]" />
          <span className="text-sm font-medium text-[var(--tp-text-primary)]">
            {t("ai_investment")}
          </span>
        </div>
        <span className="text-[11px] px-2 py-0.5 rounded bg-[var(--tp-blue)]/10 text-[var(--tp-blue)] border border-[var(--tp-blue)]/20">
          {t("smart") || "Smart"}
        </span>
      </div>

      {/* Balance display */}
      <div className="shrink-0 flex items-center justify-between px-3 py-1.5 text-xs border-b border-[var(--tp-border)]">
        <div className="flex items-center gap-1.5 text-[var(--tp-text-muted)]">
          <Wallet className="h-3.5 w-3.5" />
          <span>{t("available")}</span>
        </div>
        {isLoadingBalance ? (
          <div className="w-24 h-4 bg-[var(--tp-bg-tertiary)] animate-pulse rounded" />
        ) : (
          <span className="font-mono text-[var(--tp-text-secondary)]">
            {formatBalance(availableBalance)} <span className="text-[var(--tp-text-muted)]">{pair}</span>
          </span>
        )}
      </div>

      {/* Scrollable content */}
      <div className="flex-1 min-h-0 overflow-y-auto p-2 space-y-3">
        {/* API Error */}
        {apiError && (
          <div className="flex items-start gap-2 p-2.5 rounded bg-[var(--tp-red)]/10 border border-[var(--tp-red)]/20">
            <AlertCircle className="h-4 w-4 text-[var(--tp-red)] mt-0.5 flex-shrink-0" />
            <div className="text-xs text-[var(--tp-red)]">
              <p className="font-medium">{t("api_error")}</p>
              <p className="opacity-80">{apiError}</p>
            </div>
          </div>
        )}

        {/* No Plans Available */}
        {!isLoadingPlans && (!plans || plans.length === 0) && !apiError && (
          <div className="text-center py-6 px-3">
            <p className="text-sm text-[var(--tp-text-muted)]">
              {t("no_investment_plans_are_currently_available")}
            </p>
            <p className="text-xs text-[var(--tp-text-muted)] opacity-70 mt-1">
              {t("please_check_back_later_or_contact_support")}
            </p>
          </div>
        )}

        {/* Loading Plans */}
        {isLoadingPlans && (
          <div className="space-y-2">
            <div className="text-xs font-medium text-[var(--tp-text-secondary)] mb-2">
              {tTrade("select_investment_strategy")}
            </div>
            <div className="h-28 bg-[var(--tp-bg-tertiary)] animate-pulse rounded" />
            <div className="h-28 bg-[var(--tp-bg-tertiary)] animate-pulse rounded" />
          </div>
        )}

        {/* Plans */}
        {!isLoadingPlans && plans && plans.length > 0 && (
          <div className="space-y-2.5">
            <div className="text-xs font-medium text-[var(--tp-text-secondary)]">
              {tTrade("select_investment_strategy")}
            </div>
            {plans.map((plan) => (
              <PlanCard
                key={plan.id}
                plan={plan}
                isSelected={selectedPlanId === plan.id}
                onSelect={() => setSelectedPlan(plan.id)}
              />
            ))}
          </div>
        )}

        {/* Duration selector */}
        {selectedPlan && selectedPlan.durations && selectedPlan.durations.length > 0 && (
          <div className="space-y-2">
            <div className="text-xs font-medium text-[var(--tp-text-secondary)]">
              {t("investment_duration")}
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              {selectedPlan.durations.map((duration) => (
                <button
                  key={duration.id}
                  onClick={() => setSelectedDuration(duration.id)}
                  className={cn(
                    "px-2 py-2 text-xs rounded border transition-colors",
                    selectedDurationId === duration.id
                      ? "bg-[var(--tp-blue)]/10 border-[var(--tp-blue)]/30 text-[var(--tp-blue)]"
                      : "bg-[var(--tp-bg-tertiary)] border-[var(--tp-border)] text-[var(--tp-text-secondary)] hover:bg-[var(--tp-bg-primary)]"
                  )}
                >
                  {duration.duration} {duration.timeframe.toLowerCase()}
                  {duration.duration > 1 ? "s" : ""}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Amount input */}
        {selectedPlan && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-[var(--tp-text-secondary)]">
                {t("investment_amount")}
              </span>
              <span className="text-[11px] text-[var(--tp-text-muted)]">
                {t("min")}: {selectedPlan.minAmount} / {t("max")}: {selectedPlan.maxAmount}
              </span>
            </div>
            <div className="relative">
              <input
                type="number"
                value={investmentAmount || ""}
                onChange={handleAmountChange}
                placeholder="0.00"
                min={selectedPlan.minAmount}
                max={selectedPlan.maxAmount}
                step="0.00000001"
                className="w-full px-3 py-2 pr-14 text-sm font-mono rounded border bg-[var(--tp-bg-primary)] border-[var(--tp-border)] text-[var(--tp-text-primary)] placeholder:text-[var(--tp-text-muted)] focus:outline-none focus:border-[var(--tp-blue)]"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[var(--tp-text-muted)]">
                {pair}
              </span>
            </div>

            {/* Quick amount buttons */}
            <div className="grid grid-cols-4 gap-1.5">
              {[25, 50, 75, 100].map((percent) => (
                <button
                  key={percent}
                  onClick={() => handlePercentClick(percent)}
                  className={cn(
                    "py-1.5 text-xs rounded border transition-colors",
                    percentSelected === percent
                      ? "bg-[var(--tp-blue)]/10 border-[var(--tp-blue)]/30 text-[var(--tp-blue)]"
                      : "bg-[var(--tp-bg-tertiary)] border-[var(--tp-border)] text-[var(--tp-text-secondary)] hover:bg-[var(--tp-bg-primary)]"
                  )}
                >
                  {percent}%
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Expected profit */}
        {selectedPlan && investmentAmount > 0 && (
          <div className="flex items-center justify-between p-2.5 rounded bg-[var(--tp-green)]/10 border border-[var(--tp-green)]/20">
            <span className="text-xs text-[var(--tp-green)]">
              {t("expected_profit")}
            </span>
            <span className="text-sm font-medium text-[var(--tp-green)]">
              +{formatBalance(expectedProfit)} {pair} ({selectedPlan.profitPercentage}%)
            </span>
          </div>
        )}

        {/* Error display */}
        {error && (
          <div className="flex items-center gap-2 p-2.5 rounded bg-[var(--tp-red)]/10 border border-[var(--tp-red)]/20">
            <AlertCircle className="h-4 w-4 text-[var(--tp-red)] shrink-0" />
            <span className="text-xs text-[var(--tp-red)]">{error}</span>
          </div>
        )}
      </div>

      {/* Submit button */}
      {plans && plans.length > 0 && (
        <div className="shrink-0 px-3 py-2 border-t border-[var(--tp-border)]">
          <button
            onClick={handleSubmit}
            disabled={isSubmitting || !isFormValid}
            className={cn(
              "w-full py-2 text-sm font-medium rounded flex items-center justify-center gap-2 transition-all",
              isFormValid
                ? "bg-[var(--tp-green)] text-white hover:bg-[var(--tp-green)]/90"
                : "bg-[var(--tp-bg-tertiary)] text-[var(--tp-text-muted)] cursor-not-allowed"
            )}
          >
            {isSubmitting ? (
              <>
                <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                {t("processing")}...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                {tTrade("invest_with_ai")}
              </>
            )}
          </button>

          {/* Form guidance */}
          {!isFormValid && (
            <p className="text-[11px] text-[var(--tp-text-muted)] text-center mt-1.5">
              {!selectedPlanId && `${t("select_plan")} `}
              {selectedPlanId && investmentAmount <= 0 && t("enter_amount")}
              {selectedPlanId && investmentAmount > availableBalance && t("insufficient_balance")}
            </p>
          )}

          {/* Disclaimer */}
          <p className="text-[10px] text-[var(--tp-text-muted)] text-center mt-1 opacity-60">
            {t("ai_investments_are_subject_to_market_risks")}
          </p>
        </div>
      )}
    </div>
  );
});

// Plan card component
const PlanCard = memo(function PlanCard({
  plan,
  isSelected,
  onSelect,
}: {
  plan: AiInvestmentPlan;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const t = useTranslations("common");

  // Format currency value
  const formatCurrency = (value: number): string => {
    if (value < 0.001) {
      return value.toFixed(8);
    }
    if (value < 1) return value.toFixed(4);
    return Number.parseFloat(value.toFixed(2)).toString();
  };

  // Get duration label
  const getDurationLabel = () => {
    if (!plan.durations || plan.durations.length === 0) return t("flexible") || "Flexible";
    const duration = plan.durations[0];
    return `${duration.duration} ${duration.timeframe.toLowerCase()}${duration.duration > 1 ? "s" : ""}`;
  };

  return (
    <button
      onClick={onSelect}
      className={cn(
        "w-full text-left p-3 rounded border transition-all",
        isSelected
          ? "bg-[var(--tp-blue)]/5 border-[var(--tp-blue)]/30"
          : "bg-[var(--tp-bg-primary)] border-[var(--tp-border)] hover:bg-[var(--tp-bg-tertiary)]"
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-2.5 min-w-0 flex-1">
          {isSelected ? (
            <CheckCircle className="h-5 w-5 text-[var(--tp-blue)] shrink-0 mt-0.5" />
          ) : (
            <div className="h-5 w-5 rounded-full border-2 border-[var(--tp-border)] shrink-0 mt-0.5" />
          )}
          <div className="min-w-0">
            <h3 className={cn(
              "text-sm font-semibold truncate",
              isSelected ? "text-[var(--tp-blue)]" : "text-[var(--tp-text-primary)]"
            )}>
              {plan.title}
            </h3>
            <div className="flex items-center gap-1.5 mt-1">
              <Users className="h-3 w-3 text-[var(--tp-text-muted)]" />
              <span className="text-[11px] text-[var(--tp-text-muted)]">
                {t("invested")}: {plan.invested}
              </span>
            </div>
          </div>
        </div>

        {/* Profit badge */}
        <div className="text-right shrink-0">
          {plan.trending && (
            <div className="flex items-center gap-0.5 text-[10px] text-amber-500 mb-0.5">
              <TrendingUp className="h-3 w-3" />
              {t("trending")}
            </div>
          )}
          <div className="text-lg font-bold text-[var(--tp-green)]">
            {plan.profitPercentage}%
          </div>
          <div className="text-[10px] text-[var(--tp-green)]/80">
            {t("expected_profit")}
          </div>
        </div>
      </div>

      {/* Description */}
      {plan.description && (
        <p className="text-[11px] text-[var(--tp-text-muted)] line-clamp-1 mt-2 pl-7">
          {plan.description}
        </p>
      )}

      {/* Details */}
      <div className="grid grid-cols-3 gap-3 mt-2.5 pt-2.5 border-t border-[var(--tp-border)]/50 pl-7">
        <div>
          <div className="flex items-center gap-1 text-[10px] text-[var(--tp-text-muted)]">
            <Clock className="h-3 w-3" />
            {t("duration")}
          </div>
          <div className="text-xs text-[var(--tp-text-secondary)] mt-0.5">
            {getDurationLabel()}
          </div>
        </div>
        <div>
          <div className="text-[10px] text-[var(--tp-text-muted)]">{t("min")}</div>
          <div className="text-xs text-[var(--tp-text-secondary)] mt-0.5">
            {formatCurrency(plan.minAmount)}
          </div>
        </div>
        <div>
          <div className="text-[10px] text-[var(--tp-text-muted)]">{t("max")}</div>
          <div className="text-xs text-[var(--tp-text-secondary)] mt-0.5">
            {formatCurrency(plan.maxAmount)}
          </div>
        </div>
      </div>
    </button>
  );
});

export default AiInvestmentForm;
