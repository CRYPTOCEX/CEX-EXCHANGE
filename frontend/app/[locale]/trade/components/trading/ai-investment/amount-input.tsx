"use client";

import type React from "react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAiInvestmentStore } from "@/store/ai/investment/use-ai-investment-store";
import { Wallet } from "lucide-react";
import { useTranslations } from "next-intl";

interface AmountInputProps {
  investmentAmount: number;
  pair: string;
  availableBalance: number;
  selectedPlan: any;
}

export default function AmountInput({
  investmentAmount,
  pair,
  availableBalance,
  selectedPlan,
}: AmountInputProps) {
  const t = useTranslations(
    "trade/components/trading/ai-investment/amount-input"
  );
  const { setInvestmentAmount } = useAiInvestmentStore();
  const [percentSelected, setPercentSelected] = useState<number | null>(null);

  // Format the balance based on the currency
  const formattedBalance = formatCurrencyValue(availableBalance, pair);

  // Handle percent click
  const handlePercentClick = (percent: number) => {
    setPercentSelected(percent);

    // Calculate amount based on percentage of available balance
    const calculatedAmount = availableBalance * (percent / 100);

    // If balance is 0, use the minimum amount from the plan
    if (availableBalance <= 0 && selectedPlan) {
      setInvestmentAmount(selectedPlan.minAmount);
      return;
    }

    // Ensure amount is within plan limits if a plan is selected
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
  };

  // Handle amount change
  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = Number.parseFloat(e.target.value);

    if (!isNaN(value)) {
      // Ensure amount is within plan limits if a plan is selected
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

      setPercentSelected(null);
    } else {
      setInvestmentAmount(0);
      setPercentSelected(null);
    }
  };

  // Format currency value based on the pair
  function formatCurrencyValue(value: number, currency: string): string {
    if (currency.includes("BTC")) {
      return value.toFixed(8);
    } else if (currency.includes("ETH")) {
      return value.toFixed(6);
    } else {
      return value.toFixed(2);
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
          {t("investment_amount")}
        </label>
        <div className="flex items-center text-xs text-zinc-500 dark:text-zinc-500">
          <Wallet className="h-3 w-3 mr-1 opacity-70" />
          <span>
            {t("available")}
            {formattedBalance} {pair}
          </span>
        </div>
      </div>

      <div className="relative">
        <input
          type="number"
          className="w-full pl-3 pr-16 py-2 text-sm border border-zinc-300 dark:border-zinc-700 rounded-sm bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500 dark:focus:ring-emerald-500 focus:border-blue-500 dark:focus:border-emerald-500"
          placeholder="0.00"
          value={investmentAmount || ""}
          onChange={handleAmountChange}
          min={selectedPlan?.minAmount || 0}
          max={selectedPlan?.maxAmount || 1000000}
          step="0.00000001"
        />
        <div className="absolute inset-y-0 right-0 flex items-center pr-3">
          <span className="text-xs text-zinc-500 dark:text-zinc-500">
            {pair}
          </span>
        </div>
      </div>

      {/* Amount Percentage Buttons */}
      <div className="grid grid-cols-4 gap-1">
        {[25, 50, 75, 100].map((percent) => (
          <Button
            key={percent}
            variant="outline"
            size="sm"
            className={cn(
              "h-8 text-xs rounded-sm transition-colors",
              percentSelected === percent
                ? "bg-blue-50 border-blue-300 text-blue-700 hover:bg-blue-100 dark:bg-primary/20 dark:border-primary/30 dark:text-primary-foreground dark:hover:bg-primary/30"
                : "border-zinc-300 bg-zinc-50 hover:bg-zinc-100 text-zinc-700 dark:border-zinc-700 dark:bg-zinc-800 dark:hover:bg-zinc-700 dark:text-zinc-300"
            )}
            onClick={() => handlePercentClick(percent)}
          >
            {percent}%
          </Button>
        ))}
      </div>
    </div>
  );
}
