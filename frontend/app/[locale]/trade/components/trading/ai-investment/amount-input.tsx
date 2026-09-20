"use client";

import type React from "react";
import { useState } from "react";
import { useAiInvestmentStore } from "@/store/ai/investment/use-ai-investment-store";
import { AlertTriangle, Wallet } from "lucide-react";
import { useTranslations } from "next-intl";
import { PercentButtons, UnitField } from "../shared/order-form-ui";
import { formatCurrencyValue } from "../shared/percent-amount";
import { MoneyFigure } from "@/components/ui/money-figure";
import { Loadable } from "@/components/ui/skeleton";

interface AmountInputProps {
  investmentAmount: number;
  pair: string;
  availableBalance: number;
  /** Set when the balance could not be READ — never the same as a zero balance. */
  balanceError?: string | null;
  isLoadingBalance?: boolean;
  selectedPlan: any;
}

export default function AmountInput({
  investmentAmount,
  pair,
  availableBalance,
  balanceError = null,
  isLoadingBalance = false,
  selectedPlan,
}: AmountInputProps) {
  const t = useTranslations("common");
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

  // Handle amount change - allow free typing without enforcing min during input
  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    setPercentSelected(null);

    // Allow empty input so user can clear and type new value
    if (inputValue === "" || inputValue === null) {
      setInvestmentAmount(0);
      return;
    }

    const value = Number.parseFloat(inputValue);

    // Only update if it's a valid number, allow any value during typing
    // Min validation happens on blur, not during typing
    if (!isNaN(value) && value >= 0) {
      // Only enforce max limit during typing to prevent excessive values
      if (selectedPlan && value > selectedPlan.maxAmount) {
        setInvestmentAmount(selectedPlan.maxAmount);
      } else {
        setInvestmentAmount(value);
      }
    }
  };

  // Handle blur - enforce min constraint when user finishes typing
  const handleAmountBlur = () => {
    if (
      selectedPlan &&
      investmentAmount > 0 &&
      investmentAmount < selectedPlan.minAmount
    ) {
      setInvestmentAmount(selectedPlan.minAmount);
    }
  };

  return (
    <div className="space-y-2">
      <UnitField
        label={t("investment_amount")}
        labelAction={
          <div className="flex items-center text-xs text-muted-foreground">
            <Wallet className="h-3 w-3 mr-1 opacity-70" />
            <span>
              {t("available")}
              {balanceError ? (
                // A failed lookup is not a zero balance, and it blocks the
                // form — so it reads as an error, not as decoration. The hue
                // is on the glyph: `--destructive` at 12px is 4.16:1 in light.
                <span
                  className="inline-flex items-center gap-1 text-foreground font-medium"
                  title={balanceError}
                >
                  <AlertTriangle className="h-3 w-3 text-destructive" />
                  {t("unavailable")}
                </span>
              ) : (
                /* `Loadable`, not `isLoadingBalance ? <SkeletonText/> :
                   <MoneyFigure/>`. The primitive IS that ternary — it exists
                   so a value and its placeholder cannot be written as two
                   sibling elements that then drift apart. Collapsing it also
                   takes this chain from three branches to two, which is the
                   honest count: there is an error case and a value case, and
                   the value case has a pending sub-state.

                   An ellipsis was here before either: one glyph wide against a
                   figure that is twelve, so the label row settled sideways
                   every time a balance landed and on a narrow trading rail
                   that re-wrapped the whole line. `MoneyFigure`'s output is
                   `0.00000000 USDT`, and the placeholder is measured by the
                   same inherited type. */
                <Loadable
                  loading={isLoadingBalance}
                  placeholder={`0.00000000 ${pair}`}
                >
                  <MoneyFigure value={`${formattedBalance} ${pair}`} />
                </Loadable>
              )}
            </span>
          </div>
        }
        unit={pair}
        type="number"
        value={investmentAmount || ""}
        onChange={handleAmountChange}
        inputClassName="pr-16 py-2 text-sm"
        inputProps={{
          onBlur: handleAmountBlur,
          min: selectedPlan?.minAmount || 0,
          max: selectedPlan?.maxAmount || 1000000,
          step: "0.00000001",
        }}
      />

      {/* Amount Percentage Buttons */}
      <PercentButtons
        percentSelected={percentSelected}
        onPercentClick={handlePercentClick}
        size="md"
      />
    </div>
  );
}
