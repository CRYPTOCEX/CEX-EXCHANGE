"use client";

import React, { useEffect, useState, useMemo, useCallback } from "react";
import { Leaf, AlertCircle } from "lucide-react";
import { useAiInvestmentStore } from "@/store/ai/investment/use-ai-investment-store";
import PlanSelector from "./plan-selector";
import DurationSelector from "./duration-selector";
import AmountInput from "./amount-input";
import ExpectedProfitDisplay from "./expected-profit-display";
import InvestmentButton from "./investment-button";
import ErrorDisplay from "./error-display";
import { NoticeBox } from "../shared/order-form-ui";
import { $fetch } from "@/lib/api";
import { Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useTranslations } from "next-intl";
import { useKycGate } from "@/hooks/use-kyc-gate";
import KycRequiredNotice from "@/components/blocks/kyc/kyc-required-notice";
import { FixedReturnDisclosure } from "@/components/blocks/investment/fixed-return-disclosure";

// Module-level cache to prevent duplicate wallet fetches (StrictMode safe)
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

interface AiInvestmentFormProps {
  isEco?: boolean;
  symbol: string;
}

export default function AiInvestmentForm({
  isEco = false,
  symbol,
}: AiInvestmentFormProps) {
  const t = useTranslations("ext");
  const tCommon = useTranslations("common");
  // Funding a plan moves real balance, so this panel carries its own gate — the
  // page-level `trade`/`binary_trading` gate does not cover it.
  const gate = useKycGate("invest_ai");
  const [error, setError] = React.useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [availableBalance, setAvailableBalance] = useState(0);
  const [isLoadingBalance, setIsLoadingBalance] = useState(true);
  // Distinguishes "your balance is zero" from "we could not read your balance".
  const [balanceError, setBalanceError] = useState<string | null>(null);
  // Parse symbol to get currency and pair (supports both "BTCUSDT" and "BTC/USDT")
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

  // Initialize the store if needed
  useEffect(() => {
    const store = useAiInvestmentStore.getState();
    if (!Array.isArray(store.plans) || store.plans.length === 0) {
      store.fetchPlans();
    }
  }, []);

  // Fetch wallet balance with module-level cache
  const fetchWalletBalance = useCallback(async (force = false) => {
    if (!currency || !pair) return;

    const walletType = isEco ? "ECO" : "SPOT";
    const cacheKey = `${walletType}_${currency}_${pair}`;
    const now = Date.now();

    // Check cache - use cached value if recent and same key
    if (!force && cacheKey === walletBalanceCache.key) {
      if (walletBalanceCache.fetchInProgress || now - walletBalanceCache.timestamp < WALLET_CACHE_COOLDOWN_MS) {
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
        setBalanceError(null);
      } else {
        // A failed lookup is NOT a zero balance. Collapsing the two rendered
        // "Available 0.00" as a measured fact and blocked the form with
        // "insufficient balance", so an outage looked to the user like an empty
        // wallet. `$fetch` never throws, so this branch is the only place the
        // failure can be seen at all.
        setBalanceError(
          typeof error === "string" && error
            ? error
            : "Could not load your wallet balance"
        );
        setAvailableBalance(0);
      }
    } catch (err) {
      setBalanceError("Could not load your wallet balance");
      setAvailableBalance(0);
    } finally {
      walletBalanceCache.fetchInProgress = false;
      setIsLoadingBalance(false);
    }
  }, [currency, pair, isEco]);

  // Fetch wallet balance when currency or pair changes
  useEffect(() => {
    if (currency && pair) {
      fetchWalletBalance();
    }
  }, [currency, pair, fetchWalletBalance]);

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
    // Defensive: the form below is replaced by the notice in these two states,
    // so this can only fire if that branch is ever loosened.
    if (gate.state === "needs_kyc" || gate.state === "needs_level") return;
    if (!selectedPlanId) {
      setError(t("please_select_an_investment_plan"));
      return;
    }

    if (investmentAmount <= 0) {
      setError(t("please_enter_a_valid_investment_amount"));
      return;
    }

    if (
      selectedPlan &&
      (investmentAmount < selectedPlan.minAmount ||
        investmentAmount > selectedPlan.maxAmount)
    ) {
      setError(
        t("investment_amount_must_be_between_and", { minAmount: String(selectedPlan.minAmount), maxAmount: String(selectedPlan.maxAmount), pair: String(pair) })
      );
      return;
    }

    if (balanceError) {
      setError(
        t("please_retry_before_investing_your_balance", { balanceError: String(balanceError) })
      );
      return;
    }
    if (investmentAmount > availableBalance) {
      setError(
        t("insufficient_balance_you_have_available", { availableBalance: String(availableBalance), pair: String(pair) })
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
        setError(result.error || t("failed_to_create_investment"));
      } else {
        // Force refresh balance after successful investment
        fetchWalletBalance(true);
        // Notify orders panel to refresh AI investments list
        window.dispatchEvent(new CustomEvent("tp-ai-investment-created"));
      }
    } catch (error) {
      setError(tCommon("unexpected_error"));
      console.error("Error creating AI investment:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Check if form is valid
  const isFormValid =
    Boolean(selectedPlanId) &&
    investmentAmount > 0 &&
    investmentAmount <= availableBalance &&
    !balanceError;

  // Same convention as the trade page's own gate: only a signed-in user who is
  // short of the requirement gets the notice. "loading" and "anonymous" fall
  // through so a visitor still sees the panel rather than an empty tab.
  if (gate.state === "needs_kyc" || gate.state === "needs_level") {
    return (
      <div className="flex flex-col h-full bg-background overflow-y-auto">
        <KycRequiredNotice
          feature="invest_ai"
          requirement={gate.requirement ?? "verification"}
        />
      </div>
    );
  }

  /**
   * "No investment plans are currently available" — resolved, and there are
   * genuinely none.
   *
   * `!isLoadingPlans` is the fix, not the defect: `plans` is empty for the
   * whole fetch, so an ungated version tells every trader the product is
   * unavailable before showing them the plan picker directly underneath. The
   * `!apiError` half keeps it from stacking under the error notice, which
   * already says something more specific about the same failure.
   *
   * `PlanSelector` below renders its own pending plans, so the slot this
   * notice would occupy is never empty while the fetch is out.
   */
  const showNoPlans =
    !isLoadingPlans && (!plans || plans.length === 0) && !apiError;

  return (
    <div className="flex flex-col h-full bg-background overflow-y-auto">
      {/* Market type indicator */}
      {isEco && (
        <div className="px-3 py-1.5 bg-success/10 border-b border-success/20 flex items-center">
          <Leaf className="h-3.5 w-3.5 text-success mr-1.5" />
          <span className="text-xs font-medium text-foreground">
            {tCommon("eco_market")}
          </span>
          <Badge className="ml-auto bg-success/15 text-foreground border-success/30 text-[10px]">
            {tCommon("low_fee")}
          </Badge>
        </div>
      )}

      <div className="p-3 space-y-4">
        {/* AI Investment header */}
        <FormHeader />

        {/* API Error */}
        {apiError && (
          <NoticeBox
            tone="destructive"
            icon={<AlertCircle className="h-4 w-4" />}
          >
            <span className="block font-medium">{tCommon("api_error")}</span>
            <span className="block">{apiError}</span>
          </NoticeBox>
        )}

        {/* No Plans Available */}
        {showNoPlans && (
          <div className="p-3 bg-warning/10 border border-warning/30 rounded-sm text-center">
            <p className="text-sm text-foreground">
              {tCommon("no_investment_plans_are_currently_available")}.
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {tCommon("please_check_back_later_or_contact_support")}.
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
            pair={pair}
            availableBalance={availableBalance}
            balanceError={balanceError}
            isLoadingBalance={isLoadingBalance}
            selectedPlan={selectedPlan}
          />
        )}

        {/* Expected Profit */}
        {selectedPlan && investmentAmount > 0 && (
          <ExpectedProfitDisplay
            investmentAmount={investmentAmount}
            // The rate settlement actually pays. `defaultProfit` is the payout
            // engine's legacy fallback but is admin-only and not served here,
            // so the advertised `profitPercentage` is all the UI ever sees.
            profitPercentage={selectedPlan.profitPercentage ?? 0}
            currency={pair}
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
          <div className="text-[10px] text-muted-foreground text-center">
            {!selectedPlanId ? t("select_a_plan_and") : ""}
            {investmentAmount <= 0 ? tCommon("enter_an_amount") : ""}
            {balanceError
              ? t("balance_unavailable")
              : investmentAmount > availableBalance
                ? tCommon("insufficient_balance")
                : ""}
            {t("to_continue")}
          </div>
        )}

        <FixedReturnDisclosure />
      </div>
    </div>
  );
}

function FormHeader() {
  const t = useTranslations("ext");
  const tCommon = useTranslations("common");
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center">
        <Sparkles className="h-4 w-4 text-primary mr-1.5" />
        <h3 className="text-sm font-medium text-foreground">
          {tCommon("ai_investment")}
        </h3>
      </div>
      <Badge
        variant="outline"
        className="bg-primary/10 text-foreground border-primary/30 text-xs"
      >
        {tCommon("smart")}
      </Badge>
    </div>
  );
}
