"use client";

import React, { memo, useState, useEffect, useCallback, useMemo } from "react";
import {
  Sparkles,
  AlertTriangle,
  Check,
  Clock,
  TrendingUp,
  Users,
  Leaf,
  RefreshCw,
} from "lucide-react";
import { cn } from "../../utils/cn";
import { formatNumber, formatCompact } from "../../utils/format";
import { NumberField, FieldAction } from "./NumberField";
import { AmountSlider } from "./AmountSlider";
import { SummaryCard, SummaryDivider, SummaryRow } from "./SummaryCard";
import { useAiInvestmentStore, type AiInvestmentPlan } from "@/store/ai/investment/use-ai-investment-store";
import { $fetch } from "@/lib/api";
import { SkeletonText } from "@/components/ui/skeleton";
import { useTranslations } from "next-intl";
import { useKycGate } from "@/hooks/use-kyc-gate";
import KycRequiredNotice from "@/components/blocks/kyc/kyc-required-notice";
import { FixedReturnDisclosure } from "@/components/blocks/investment/fixed-return-disclosure";

interface AiInvestmentFormProps {
  symbol: string;
  marketType: "spot" | "futures" | "eco";
  className?: string;
}

/** Blocking problems disable the submit; advisory ones only annotate it. */
type Validation = { level: "error" | "warn"; message: string } | null;

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

/** Section heading — same ink, size and rhythm as a field label. */
const SectionLabel = memo(function SectionLabel({
  children,
  action,
}: {
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-2 mb-1 min-h-[14px]">
      <span className="text-[10px] font-medium uppercase tracking-wide text-[var(--tp-text-muted)]">
        {children}
      </span>
      {action}
    </div>
  );
});

export const AiInvestmentForm = memo(function AiInvestmentForm({
  symbol,
  marketType,
  className,
}: AiInvestmentFormProps) {
  const t = useTranslations("common");
  const tTrade = useTranslations("trade_components");
  // Funding a plan moves real balance, so this panel carries its own gate — the
  // terminal's page-level `trade` gate does not cover it.
  const gate = useKycGate("invest_ai");

  // Local state
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [availableBalance, setAvailableBalance] = useState(0);
  const [isLoadingBalance, setIsLoadingBalance] = useState(true);

  /**
   * The amount as typed. The store holds a number, and round-tripping through
   * it would eat a trailing "." or a leading "0." mid-keystroke — so the text
   * is owned here and pushed down, and only programmatic changes (a percentage,
   * a clamp, a plan switch) push back up.
   */
  const [amountDraft, setAmountDraft] = useState("");

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
  } = useAiInvestmentStore();

  // Get selected plan and duration
  const selectedPlan = useMemo(() =>
    Array.isArray(plans) ? plans.find((plan) => plan.id === selectedPlanId) : undefined,
    [plans, selectedPlanId]
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

  // Refetch balance when currency or pair changes.
  //
  // `react-hooks/set-state-in-effect` sees the loading flag flip inside
  // fetchWalletBalance and objects. This is the case the rule's own docs carve
  // out — an effect synchronising React with an external system (the wallet
  // endpoint) — and the flag is the request's own state, so it is suppressed
  // rather than restructured. Unchanged behaviour from before this file's
  // redesign; the rule only started reporting it once the component became
  // simple enough for the compiler to analyse.
  useEffect(() => {
    if (currency && pair) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      fetchWalletBalance();
    }
  }, [currency, pair, fetchWalletBalance]);

  /** Decimals the quote currency is worth quoting to. */
  const precision = useMemo(() => {
    if (pair.includes("BTC")) return 8;
    if (pair.includes("ETH")) return 6;
    return 2;
  }, [pair]);

  /** Push a programmatic value into both the field text and the store. */
  const applyAmount = useCallback(
    (value: number) => {
      const safe = Number.isFinite(value) && value > 0 ? value : 0;
      setAmountDraft(safe > 0 ? String(Number(safe.toFixed(precision))) : "");
      setInvestmentAmount(safe);
    },
    [precision, setInvestmentAmount]
  );

  // The ceiling for this plan: whichever runs out first, the wallet or the
  // plan's own cap.
  const maxInvestable = useMemo(() => {
    if (!selectedPlan) return availableBalance;
    return Math.min(availableBalance, selectedPlan.maxAmount);
  }, [selectedPlan, availableBalance]);

  // Handle percent click / slider drag
  const handlePercent = useCallback(
    (percent: number) => {
      if (maxInvestable <= 0) {
        if (selectedPlan) applyAmount(selectedPlan.minAmount);
        return;
      }
      applyAmount(Number(((maxInvestable * percent) / 100).toFixed(precision)));
    },
    [maxInvestable, selectedPlan, applyAmount, precision]
  );

  const amountPercent = useMemo(() => {
    if (maxInvestable <= 0 || investmentAmount <= 0) return 0;
    return Math.min(100, (investmentAmount / maxInvestable) * 100);
  }, [investmentAmount, maxInvestable]);

  // Typing: the store follows the text, unclamped. Clamping while a value is
  // half-typed is what made the old field fight the keyboard.
  const handleAmountChange = useCallback(
    (value: string) => {
      setAmountDraft(value);
      const parsed = Number.parseFloat(value);
      setInvestmentAmount(Number.isFinite(parsed) && parsed > 0 ? parsed : 0);
    },
    [setInvestmentAmount]
  );

  /**
   * Selecting a plan re-clamps the amount into that plan's band.
   *
   * Done here rather than in an effect on `selectedPlanId`: the clamp is a
   * consequence of the click, not of the id changing, and an effect would be a
   * second render pass to correct state the click already knew was wrong.
   * Without it, switching from a 100-minimum plan to a 500-minimum one left an
   * amount the backend would reject with nothing on screen saying so.
   */
  const handleSelectPlan = useCallback(
    (plan: AiInvestmentPlan) => {
      setSelectedPlan(plan.id);
      if (investmentAmount <= 0) return;
      if (investmentAmount < plan.minAmount) applyAmount(plan.minAmount);
      else if (investmentAmount > plan.maxAmount) applyAmount(plan.maxAmount);
    },
    [investmentAmount, setSelectedPlan, applyAmount]
  );

  // Calculate expected profit
  const expectedProfit = useMemo(() => {
    if (!selectedPlan || investmentAmount <= 0) return 0;
    return (investmentAmount * selectedPlan.profitPercentage) / 100;
  }, [selectedPlan, investmentAmount]);

  const validation = useMemo<Validation>(() => {
    if (!selectedPlanId) return { level: "error", message: t("select_plan") };
    if (investmentAmount <= 0) return null;
    if (selectedPlan && investmentAmount < selectedPlan.minAmount) {
      return {
        level: "error",
        message: `${t("min")}: ${formatNumber(selectedPlan.minAmount, precision)} ${pair}`,
      };
    }
    if (selectedPlan && investmentAmount > selectedPlan.maxAmount) {
      return {
        level: "error",
        message: `${t("max")}: ${formatNumber(selectedPlan.maxAmount, precision)} ${pair}`,
      };
    }
    if (investmentAmount > availableBalance) {
      return { level: "error", message: t("insufficient_balance") };
    }
    return null;
  }, [
    selectedPlanId,
    selectedPlan,
    investmentAmount,
    availableBalance,
    pair,
    precision,
    t,
  ]);

  const isFormValid =
    Boolean(selectedPlanId) && investmentAmount > 0 && validation === null;

  // Handle submit
  const handleSubmit = async () => {
    // Defensive: the form below is replaced by the notice in these two states.
    if (gate.state === "needs_kyc" || gate.state === "needs_level") return;
    if (!isFormValid || !selectedPlanId) return;

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
        applyAmount(0);
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

  const hasPlans = Array.isArray(plans) && plans.length > 0;

  // Same convention as the terminal's page-level gate: only a signed-in user
  // who is short of the requirement gets the notice, so "loading" and
  // "anonymous" keep the panel as it is instead of blanking a workspace tab.
  if (gate.state === "needs_kyc" || gate.state === "needs_level") {
    return (
      <div className={cn("flex flex-col h-full min-h-0 bg-[var(--tp-bg-secondary)]", className)}>
        <div className="flex-1 min-h-0 overflow-y-auto">
          <KycRequiredNotice
            feature="invest_ai"
            requirement={gate.requirement ?? "verification"}
          />
        </div>
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col h-full min-h-0 bg-[var(--tp-bg-secondary)]", className)}>
      {/* Same skeleton as the order form: one scroll region whose summary is
          pushed to the floor, then a fixed action bar. */}
      <div className="flex-1 min-h-0 overflow-y-auto flex flex-col">
        <div className="flex flex-col gap-2.5 p-2 pb-0">
          {/* Eco market marker. A full-width banner for a one-word fact cost a
              row of a 300px column; it is a chip on the balance label now. */}
          <div>
            <SectionLabel
              action={
                <button
                  type="button"
                  onClick={() => fetchWalletBalance(true)}
                  title={t("refresh")}
                  aria-label={t("refresh")}
                  className="shrink-0 p-0.5 -mr-0.5 rounded text-[var(--tp-text-muted)] hover:text-[var(--tp-text-primary)] hover:bg-[var(--tp-bg-elevated)] transition-colors"
                >
                  <RefreshCw className={cn("h-3 w-3", isLoadingBalance && "animate-spin")} />
                </button>
              }
            >
              <span className="flex items-center gap-1.5">
                {t("available")}
                {isEco && (
                  <span className="inline-flex items-center gap-0.5 rounded px-1 py-px text-[9px] font-medium bg-[var(--tp-green)]/15 text-[var(--tp-green)] normal-case tracking-normal">
                    <Leaf className="h-2.5 w-2.5" />
                    {t("eco_market")}
                  </span>
                )}
              </span>
            </SectionLabel>

            <div className="rounded-md border border-[var(--tp-border)] bg-[var(--tp-bg-tertiary)] px-2 py-1.5 flex items-center justify-between gap-2">
              <span className="text-[10px] text-[var(--tp-text-muted)]">{pair}</span>
              {/* ONE element in both states. The branch used to swap a `h-3`
                  (12px) block for a `text-[12px]` figure whose line box is
                  16px, so this row twitched 4px every time a balance landed —
                  and the workspace font-scale setting rescales
                  `text-[9px]`..`text-[13px]`, which the fixed `h-3` could not
                  follow at all. Keeping the span and swapping its CONTENT means
                  the height comes from the same text layout in both states. */}
              <span
                className="text-[12px] font-mono tabular-nums text-[var(--tp-text-primary)]"
                title={isLoadingBalance ? undefined : `${availableBalance} ${pair}`}
              >
                {isLoadingBalance ? (
                  <SkeletonText placeholder="0.000000" />
                ) : (
                  formatCompact(availableBalance, precision)
                )}
              </span>
            </div>
          </div>

          {/* API Error */}
          {apiError && (
            <div className="flex items-start gap-2 rounded-md border border-[var(--tp-red)]/30 bg-[var(--tp-red)]/10 px-2.5 py-2">
              <AlertTriangle className="h-3.5 w-3.5 text-[var(--tp-red)] mt-px shrink-0" />
              <div className="text-[10px] leading-4 text-[var(--tp-red)]">
                <p className="font-medium">{t("api_error")}</p>
                <p className="opacity-80">{apiError}</p>
              </div>
            </div>
          )}

          {/* Plans */}
          {!isLoadingPlans && !hasPlans && !apiError ? (
            <div className="rounded-md border border-[var(--tp-border)] bg-[var(--tp-bg-tertiary)]/60 px-3 py-6 text-center">
              <p className="text-[11px] text-[var(--tp-text-secondary)]">
                {t("no_investment_plans_are_currently_available")}
              </p>
              <p className="mt-1 text-[10px] text-[var(--tp-text-muted)]">
                {t("please_check_back_later_or_contact_support")}
              </p>
            </div>
          ) : (
            <div>
              <SectionLabel>{tTrade("select_investment_strategy")}</SectionLabel>
              {isLoadingPlans ? (
                <div className="space-y-1.5">
                  <div className="h-[86px] rounded-md bg-[var(--tp-bg-tertiary)] animate-pulse" />
                  <div className="h-[86px] rounded-md bg-[var(--tp-bg-tertiary)] animate-pulse" />
                </div>
              ) : (
                <div className="space-y-1.5">
                  {plans.map((plan) => (
                    <PlanCard
                      key={plan.id}
                      plan={plan}
                      currency={pair}
                      isSelected={selectedPlanId === plan.id}
                      onSelect={() => handleSelectPlan(plan)}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Duration selector */}
          {selectedPlan && selectedPlan.durations && selectedPlan.durations.length > 0 && (
            <div>
              <SectionLabel>{t("investment_duration")}</SectionLabel>
              <div className="grid grid-cols-3 gap-1">
                {selectedPlan.durations.map((duration) => (
                  <button
                    key={duration.id}
                    onClick={() => setSelectedDuration(duration.id)}
                    className={cn(
                      "px-2 py-1 rounded text-[11px] font-medium transition-colors",
                      selectedDurationId === duration.id
                        ? "bg-[var(--tp-blue)] text-[var(--tp-blue-fg)]"
                        : "bg-[var(--tp-bg-tertiary)] text-[var(--tp-text-secondary)] hover:bg-[var(--tp-bg-elevated)] hover:text-[var(--tp-text-primary)]"
                    )}
                  >
                    {duration.duration} {duration.timeframe.toLowerCase()}
                    {duration.duration > 1 ? "s" : ""}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Amount */}
          {selectedPlan && (
            <>
              <NumberField
                label={t("investment_amount")}
                value={amountDraft}
                onChange={handleAmountChange}
                placeholder={(0).toFixed(precision)}
                suffix={pair}
                invalid={validation?.level === "error" && investmentAmount > 0}
                hint={
                  maxInvestable > 0 ? (
                    <FieldAction onClick={() => handlePercent(100)}>
                      {t("max")}: {formatNumber(maxInvestable, precision)}
                    </FieldAction>
                  ) : undefined
                }
              />

              <AmountSlider
                value={amountPercent}
                onChange={handlePercent}
                disabled={maxInvestable <= 0}
              />

              <p className="text-[10px] text-[var(--tp-text-muted)] -mt-0.5">
                {t("min")} {formatNumber(selectedPlan.minAmount, precision)} ·{" "}
                {t("max")} {formatNumber(selectedPlan.maxAmount, precision)} {pair}
              </p>
            </>
          )}
        </div>

        {/* Projected return, docked to the floor of the scroll region */}
        {selectedPlan && (
          <div className="mt-auto p-2 pt-3">
            <SummaryCard>
              <SummaryRow
                label={t("investment_amount")}
                value={formatNumber(investmentAmount, precision)}
                currency={pair}
              />
              <SummaryRow
                label={`${t("expected_profit")} (${selectedPlan.profitPercentage}%)`}
                value={`+${formatNumber(expectedProfit, precision)}`}
                currency={pair}
                tone="positive"
              />
              <SummaryDivider />
              <SummaryRow
                label={t("total_value")}
                value={formatNumber(investmentAmount + expectedProfit, precision)}
                currency={pair}
                emphasis
              />
            </SummaryCard>
          </div>
        )}
      </div>

      {/* Action bar */}
      {hasPlans && (
        <div className="shrink-0 border-t border-[var(--tp-border)] p-2">
          <button
            onClick={handleSubmit}
            disabled={isSubmitting || !isFormValid}
            className={cn(
              "w-full py-2.5 rounded-md",
              "flex items-center justify-center gap-2",
              "text-[13px] font-semibold transition-all",
              // The interaction accent, not the up-green: this is a commit
              // action, and green/red stay reserved for price direction.
              "bg-[var(--tp-blue)] text-[var(--tp-blue-fg)] hover:bg-[var(--tp-blue-dim)]",
              "disabled:opacity-50 disabled:cursor-not-allowed"
            )}
          >
            {isSubmitting ? (
              <>
                <svg
                  className="w-4 h-4 animate-spin"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <circle cx="12" cy="12" r="10" strokeOpacity="0.25" />
                  <path d="M12 2a10 10 0 0 1 10 10" strokeLinecap="round" />
                </svg>
                {t("processing")}...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                {tTrade("invest_with_ai")}
              </>
            )}
          </button>

          {/* Fixed-height message slot, same as the order form's. */}
          <div className="min-h-[16px] mt-1 flex items-start justify-center gap-1 px-1">
            {error ? (
              <p className="text-[10px] leading-4 text-[var(--tp-red)] text-center">{error}</p>
            ) : validation && (investmentAmount > 0 || !selectedPlanId) ? (
              <>
                <AlertTriangle className="h-3 w-3 mt-0.5 shrink-0 text-[var(--tp-red)]" />
                <p className="text-[10px] leading-4 text-[var(--tp-red)]">
                  {validation.message}
                </p>
              </>
            ) : investmentAmount <= 0 ? (
              <p className="text-[10px] leading-4 text-[var(--tp-text-muted)]">
                {t("enter_amount")}
              </p>
            ) : null}
          </div>

          <FixedReturnDisclosure className="mt-1" />
        </div>
      )}
    </div>
  );
});

// Plan card component
const PlanCard = memo(function PlanCard({
  plan,
  currency,
  isSelected,
  onSelect,
}: {
  plan: AiInvestmentPlan;
  currency: string;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const t = useTranslations("common");

  // Format currency value
  const formatCurrency = (value: number): string => {
    if (value < 0.001) return value.toFixed(8);
    if (value < 1) return value.toFixed(4);
    return formatNumber(value, 2);
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
      aria-pressed={isSelected}
      className={cn(
        "w-full text-left rounded-md border px-2.5 py-2 transition-colors",
        isSelected
          ? "border-[var(--tp-blue)] bg-[var(--tp-blue-bg)]"
          : "border-[var(--tp-border)] bg-[var(--tp-bg-tertiary)]/60 hover:bg-[var(--tp-bg-tertiary)] hover:border-[var(--tp-text-muted)]"
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-2 min-w-0 flex-1">
          <span
            className={cn(
              "mt-px h-3.5 w-3.5 shrink-0 rounded-full border flex items-center justify-center transition-colors",
              isSelected
                ? "border-[var(--tp-blue)] bg-[var(--tp-blue)]"
                : "border-[var(--tp-text-muted)]"
            )}
          >
            {isSelected && (
              <Check className="h-2.5 w-2.5 text-[var(--tp-blue-fg)]" strokeWidth={3} />
            )}
          </span>
          <div className="min-w-0">
            <h3
              className={cn(
                "text-[12px] font-semibold truncate",
                isSelected
                  ? "text-[var(--tp-text-primary)]"
                  : "text-[var(--tp-text-secondary)]"
              )}
            >
              {plan.title}
            </h3>
            <div className="flex items-center gap-1 mt-0.5">
              <Users className="h-2.5 w-2.5 text-[var(--tp-text-muted)]" />
              <span className="text-[10px] text-[var(--tp-text-muted)]">
                {t("invested")}: {plan.invested}
              </span>
            </div>
          </div>
        </div>

        {/* Profit badge */}
        <div className="text-right shrink-0">
          {plan.trending && (
            <div className="flex items-center justify-end gap-0.5 text-[10px] text-[var(--tp-yellow)]">
              <TrendingUp className="h-2.5 w-2.5" />
              {t("trending")}
            </div>
          )}
          {/* text-base, not an arbitrary px size: only the sizes enumerated in
              trading-pro.css follow the workspace's text-size setting. */}
          <div className="text-base font-bold leading-tight font-mono tabular-nums text-[var(--tp-green)]">
            {plan.profitPercentage}%
          </div>
        </div>
      </div>

      {plan.description && (
        <p className="mt-1.5 pl-[22px] text-[10px] leading-4 text-[var(--tp-text-muted)] line-clamp-1">
          {plan.description}
        </p>
      )}

      {/* Details */}
      <div className="mt-2 pt-2 border-t border-[var(--tp-border)]/60 grid grid-cols-3 gap-2 pl-[22px]">
        <Detail
          label={
            <span className="flex items-center gap-1">
              <Clock className="h-2.5 w-2.5" />
              {t("duration")}
            </span>
          }
          value={getDurationLabel()}
        />
        <Detail label={t("min")} value={formatCurrency(plan.minAmount)} />
        <Detail label={`${t("max")} ${currency}`} value={formatCurrency(plan.maxAmount)} />
      </div>
    </button>
  );
});

function Detail({ label, value }: { label: React.ReactNode; value: string }) {
  return (
    <div className="min-w-0">
      <div className="text-[10px] text-[var(--tp-text-muted)] truncate">{label}</div>
      <div className="mt-0.5 text-[11px] font-mono tabular-nums text-[var(--tp-text-secondary)] truncate">
        {value}
      </div>
    </div>
  );
}

export default AiInvestmentForm;
