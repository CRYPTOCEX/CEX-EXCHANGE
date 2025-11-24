"use client";

import { useEffect } from "react";
import { useWizard } from "../trading-wizard";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { ArrowDownToLine, ArrowUpFromLine } from "lucide-react";
import { useTranslations } from "next-intl";

export function TradeTypeStep() {
  const t = useTranslations("ext");
  const { tradeData, updateTradeData, markStepComplete, isStepComplete } =
    useWizard();

  // Fix the useEffect in TradeTypeStep to avoid infinite updates
  useEffect(() => {
    // Only set default value if not already set
    if (!tradeData.tradeType) {
      updateTradeData({ tradeType: "BUY" });
    }
  }, [tradeData.tradeType, updateTradeData]); // Run only once on mount

  // Update the useEffect hooks to ensure step completion is properly handled

  // Replace the second useEffect with this implementation
  useEffect(() => {
    // Mark step as complete if we have a trade type
    if (tradeData.tradeType) {
      markStepComplete(1);
    }
  }, [tradeData.tradeType, markStepComplete]);

  // Add a new useEffect that runs on every render to ensure the step is always marked as complete if a trade type is selected
  useEffect(() => {
    if (tradeData.tradeType) {
      markStepComplete(1);
    }
  }, [tradeData.tradeType, markStepComplete]);

  const handleTradeTypeChange = (value: string) => {
    // Convert to uppercase to match our type definitions
    const tradeType = value.toUpperCase();
    updateTradeData({ tradeType });
    markStepComplete(1);
  };

  return (
    <div className="space-y-6">
      <p className="text-muted-foreground">
        {t("choose_whether_you_want_to_buy_or_sell_currency")}.{" "}
        {t("this_will_determine_the_type_of_trade_youll_create")}.
      </p>

      <RadioGroup
        value={(tradeData.tradeType || "BUY").toLowerCase()}
        onValueChange={handleTradeTypeChange}
        className="grid grid-cols-1 md:grid-cols-2 gap-4"
      >
        <div>
          <RadioGroupItem value="buy" id="buy" className="peer sr-only" />
          <Label
            htmlFor="buy"
            className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"
          >
            <ArrowDownToLine className="mb-3 h-6 w-6" />
            <div className="text-center space-y-1">
              <h3 className="font-medium">{t("buy_currency")}</h3>
              <p className="text-sm text-muted-foreground">
                {t("purchase_crypto_from_payment_method")}
              </p>
            </div>
          </Label>
        </div>

        <div>
          <RadioGroupItem value="sell" id="sell" className="peer sr-only" />
          <Label
            htmlFor="sell"
            className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"
          >
            <ArrowUpFromLine className="mb-3 h-6 w-6" />
            <div className="text-center space-y-1">
              <h3 className="font-medium">{t("sell_currency")}</h3>
              <p className="text-sm text-muted-foreground">
                {t("sell_your_crypto_preferred_method")}
              </p>
            </div>
          </Label>
        </div>
      </RadioGroup>

      <div className="bg-muted p-4 rounded-md">
        <h4 className="font-medium mb-2">{t("what_happens_next")}</h4>
        <p className="text-sm text-muted-foreground">
          {tradeData.tradeType === "BUY"
            ? "You'll be able to browse sell offers from other users, or create your own buy offer specifying how much crypto you want to purchase and how you'll pay for it."
            : "You'll need to specify how much crypto you want to sell, your asking price, and which payment methods you accept. Your crypto will be held in secure escrow until the trade is complete."}
        </p>
      </div>
    </div>
  );
}
