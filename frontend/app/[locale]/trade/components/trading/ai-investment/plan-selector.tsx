"use client";

import { useState } from "react";
import { useAiInvestmentStore } from "@/store/ai/investment/use-ai-investment-store";
import { SkeletonBlock } from "@/components/ui/skeleton";
import { m, AnimatePresence } from "framer-motion";
import {
  CheckCircle,
  Clock,
  TrendingUp,
  ChevronRight,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";

interface PlanSelectorProps {
  plans: any[];
  isLoadingPlans: boolean;
  selectedPlanId: string | null;
}

export default function PlanSelector({
  plans,
  isLoadingPlans,
  selectedPlanId,
}: PlanSelectorProps) {
  const tTradeComponents = useTranslations("trade_components");
  const setSelectedPlan = useAiInvestmentStore(
    (state) => state.setSelectedPlan
  );

  /**
   * ONE tree. The pending copy had drifted in two places that both cost
   * pixels.
   * ==========================================================================
   *
   * Its heading was `text-sm font-medium` with NO `text-foreground`, so the
   * label rendered in the inherited colour and then changed colour on arrival —
   * and its list wrapper was `space-y-2` against the real `space-y-3`, a 4px
   * gap that only exists once there is more than one plan.
   *
   * The heading itself is `tTradeComponents("select_investment_strategy")`, a
   * static string, and it stays. Only the cards wait.
   *
   * `!plans || plans.length === 0` keeps returning `null` — a selector with no
   * plans is genuinely nothing — but it is now reached only after the fetch, so
   * the whole block no longer collapses to nothing mid-load and then expands to
   * 180px+ of cards.
   */
  if (!isLoadingPlans && (!plans || plans.length === 0)) {
    return null;
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <div className="text-sm font-medium text-foreground">
          {tTradeComponents("select_investment_strategy")}
        </div>
      </div>
      <div className="space-y-3">
        {/* One pending card at the real card height, inside the real
            `space-y-3` list.

            `SkeletonBlock` and not `Skeleton`: they render the same box, but
            the contract names `SkeletonBlock` for the case where the thing
            being awaited genuinely has NO text metrics to be measured from —
            an avatar, a thumbnail, a chart plot area, or here a whole bordered
            tile. Using the named primitive is how a reader tells this apart
            from an `h-8 w-24` guessed at a figure, which is the case the
            scanner's advisory rule is really hunting. */}
        {isLoadingPlans && (
          <SkeletonBlock className="h-[180px] w-full rounded-lg" />
        )}
        <AnimatePresence>
          {plans.map((plan) => (
            <PlanCard
              key={plan.id}
              plan={plan}
              isSelected={selectedPlanId === plan.id}
              onSelect={() => setSelectedPlan(plan.id)}
            />
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}

function PlanCard({ plan, isSelected, onSelect }) {
  const tCommon = useTranslations("common");
  const [isHovered, setIsHovered] = useState(false);

  // Format currency with appropriate decimals
  const formatCurrency = (value) => {
    // For very small values (like 0.0001)
    if (value < 0.001) {
      // Find the first non-zero digit after decimal
      const valueStr = value.toString();
      const decimalIndex = valueStr.indexOf(".");
      if (decimalIndex !== -1) {
        let significantDigitIndex = decimalIndex + 1;
        while (
          significantDigitIndex < valueStr.length &&
          valueStr[significantDigitIndex] === "0"
        ) {
          significantDigitIndex++;
        }
        // Show up to 2 significant digits after the first non-zero
        const precision = Math.min(significantDigitIndex - decimalIndex + 2, 8);
        return value.toFixed(precision);
      }
    }

    // For medium values (0.001 to 1)
    if (value < 1) return value.toFixed(4);

    // For larger values, show 2 decimals if needed
    return Number.parseFloat(value.toFixed(2)).toString();
  };

  // Get duration label
  const getDurationLabel = (durations) => {
    if (!durations || durations.length === 0) return "Flexible";

    const duration = durations[0];
    const value = duration.duration;
    const unit = duration.timeframe.toLowerCase();

    return `${value} ${unit}${value > 1 ? "s" : ""}`;
  };

  return (
    <m.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
      onClick={onSelect}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={cn(
        // Selection reads as a border + one surface step, not a glow (R3).
        "relative overflow-hidden rounded-lg border cursor-pointer transition-all duration-200",
        isSelected
          ? "border-primary bg-primary/10"
          : "border-border bg-card hover:bg-surface-3"
      )}
    >
      {/* Background pattern */}
      {plan.image ? (
        <div className="absolute inset-0 opacity-3 dark:opacity-5">
          <img
            src={plan.image || "/placeholder.svg"}
            alt=""
            className="w-full h-full object-cover"
          />
        </div>
      ) : (
        <div className="absolute inset-0 opacity-3 dark:opacity-5 bg-primary/20"></div>
      )}

      {/* Content */}
      <div className="relative p-4">
        <div className="flex flex-col space-y-4">
          {/* Header */}
          <div className="flex justify-between items-start">
            <div className="flex items-start gap-3">
              {isSelected ? (
                <div className="mt-1">
                  <CheckCircle className="h-5 w-5 text-primary" />
                </div>
              ) : (
                <div className="mt-1 h-5 w-5 rounded-full border-2 border-border-strong"></div>
              )}
              <div>
                <h3
                  className={cn(
                    "text-xl font-bold tracking-tight",
                    isSelected ? "text-primary" : "text-foreground"
                  )}
                >
                  {plan.title}
                </h3>
                <div className="flex items-center gap-2 mt-1">
                  <div className="flex items-center text-xs text-muted-foreground">
                    <Users className="mr-1 h-3 w-3" />
                    <span>
                      {tCommon("invested")}
                      {plan.invested}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Profit & Trending */}
            <div className="flex flex-col items-end">
              {/* "Trending" is a decorative attribute, not a caution — amber
                  here was status-as-brand. Neutral chip, accent icon. */}
              {plan.trending && (
                <div className="px-2 py-1 text-xs font-medium rounded-full bg-surface-3 text-foreground flex items-center gap-1 mb-1">
                  <TrendingUp className="h-3 w-3 text-primary" />
                  {tCommon("trending")}
                </div>
              )}
              <div className="flex items-baseline">
                <span className="text-2xl font-bold text-up tabular-nums">
                  {plan.profitPercentage}
                </span>
                <span className="text-lg font-bold text-up">%</span>
              </div>
              <div className="text-xs text-muted-foreground">
                {tCommon("expected_profit")}
              </div>
            </div>
          </div>

          {/* Description */}
          {plan.description && (
            <div className="text-xs text-muted-foreground line-clamp-2 mt-1">
              {plan.description}
            </div>
          )}

          {/* Details */}
          <div className="grid grid-cols-3 gap-4 pt-3 border-t border-border">
            {/* Duration */}
            <div className="flex flex-col">
              <div className="flex items-center text-xs text-muted-foreground mb-1">
                <Clock className="mr-1 h-3 w-3" />
                {tCommon("duration")}
              </div>
              <div className="text-sm font-medium text-foreground">
                {getDurationLabel(plan.durations)}
              </div>
            </div>

            {/* Min Investment */}
            <div className="flex flex-col">
              <div className="flex items-center text-xs text-muted-foreground mb-1">
                {tCommon("min")}
              </div>
              <div className="text-sm font-medium text-foreground tabular-nums">
                {formatCurrency(plan.minAmount)}
              </div>
            </div>

            {/* Max Investment */}
            <div className="flex flex-col">
              <div className="flex items-center text-xs text-muted-foreground mb-1">
                {tCommon("max")}
              </div>
              <div className="text-sm font-medium text-foreground tabular-nums">
                {formatCurrency(plan.maxAmount)}
              </div>
            </div>
          </div>
        </div>
      </div>
    </m.div>
  );
}
