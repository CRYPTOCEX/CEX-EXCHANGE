"use client";

import { useState } from "react";
import { useAiInvestmentStore } from "@/store/ai/investment/use-ai-investment-store";
import { Skeleton } from "@/components/ui/skeleton";
import { motion, AnimatePresence } from "framer-motion";
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
  const t = useTranslations(
    "trade/components/trading/ai-investment/plan-selector"
  );
  const setSelectedPlan = useAiInvestmentStore(
    (state) => state.setSelectedPlan
  );

  // If loading, show skeleton
  if (isLoadingPlans) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <div className="text-sm font-medium">
            {t("select_investment_strategy")}
          </div>
        </div>
        <div className="space-y-2">
          <Skeleton className="h-[180px] w-full rounded-lg" />
        </div>
      </div>
    );
  }

  // If no plans, don't render the selector
  if (!plans || plans.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <div className="text-sm font-medium text-zinc-900 dark:text-white">
          {t("select_investment_strategy")}
        </div>
      </div>
      <div className="space-y-3">
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
  const t = useTranslations(
    "trade/components/trading/ai-investment/plan-selector"
  );
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
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
      onClick={onSelect}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={cn(
        "relative overflow-hidden rounded-lg border cursor-pointer transition-all duration-200",
        isSelected
          ? "border-blue-500/50 bg-blue-50/50 dark:bg-primary/10 shadow-[0_0_20px_rgba(59,130,246,0.15)] dark:shadow-[0_0_20px_rgba(0,0,0,0.1)] dark:border-primary/50"
          : "border-zinc-200 bg-white hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900/50 dark:hover:bg-zinc-800/80 shadow-sm hover:shadow-md"
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
        <div className="absolute inset-0 opacity-3 dark:opacity-5 bg-gradient-to-br from-blue-500/10 to-blue-600/5 dark:from-primary/20 dark:to-primary/5"></div>
      )}

      {/* Content */}
      <div className="relative p-4">
        <div className="flex flex-col space-y-4">
          {/* Header */}
          <div className="flex justify-between items-start">
            <div className="flex items-start gap-3">
              {isSelected ? (
                <div className="mt-1">
                  <CheckCircle className="h-5 w-5 text-blue-600 dark:text-primary" />
                </div>
              ) : (
                <div className="mt-1 h-5 w-5 rounded-full border-2 border-zinc-300 dark:border-muted-foreground/30"></div>
              )}
              <div>
                <h3
                  className={cn(
                    "text-xl font-bold tracking-tight",
                    isSelected
                      ? "text-blue-600 dark:text-primary"
                      : "text-zinc-900 dark:text-white"
                  )}
                >
                  {plan.title}
                </h3>
                <div className="flex items-center gap-2 mt-1">
                  <div className="flex items-center text-xs text-zinc-600 dark:text-muted-foreground">
                    <Users className="mr-1 h-3 w-3" />
                    <span>
                      {t("invested")}
                      {plan.invested}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Profit & Trending */}
            <div className="flex flex-col items-end">
              {plan.trending && (
                <div className="px-2 py-1 text-xs font-medium rounded-full bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-500 flex items-center gap-1 mb-1">
                  <TrendingUp className="h-3 w-3" />
                  {t("Trending")}
                </div>
              )}
              <div className="flex items-baseline">
                <span className="text-2xl font-bold text-emerald-600 dark:text-emerald-500">
                  {plan.profitPercentage}
                </span>
                <span className="text-lg font-bold text-emerald-600 dark:text-emerald-500">
                  %
                </span>
              </div>
              <div className="text-xs text-emerald-700 dark:text-emerald-400">
                {t("expected_profit")}
              </div>
            </div>
          </div>

          {/* Description */}
          {plan.description && (
            <div className="text-xs text-zinc-600 dark:text-muted-foreground line-clamp-2 mt-1">
              {plan.description}
            </div>
          )}

          {/* Details */}
          <div className="grid grid-cols-3 gap-4 pt-3 border-t border-zinc-200 dark:border-zinc-700/30">
            {/* Duration */}
            <div className="flex flex-col">
              <div className="flex items-center text-xs text-zinc-500 dark:text-muted-foreground mb-1">
                <Clock className="mr-1 h-3 w-3" />
                {t("Duration")}
              </div>
              <div className="text-sm font-medium text-zinc-900 dark:text-white">
                {getDurationLabel(plan.durations)}
              </div>
            </div>

            {/* Min Investment */}
            <div className="flex flex-col">
              <div className="flex items-center text-xs text-zinc-500 dark:text-muted-foreground mb-1">
                {t("Min")}
              </div>
              <div className="text-sm font-medium text-zinc-900 dark:text-white">
                {formatCurrency(plan.minAmount)}
              </div>
            </div>

            {/* Max Investment */}
            <div className="flex flex-col">
              <div className="flex items-center text-xs text-zinc-500 dark:text-muted-foreground mb-1">
                {t("Max")}
              </div>
              <div className="text-sm font-medium text-zinc-900 dark:text-white">
                {formatCurrency(plan.maxAmount)}
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
