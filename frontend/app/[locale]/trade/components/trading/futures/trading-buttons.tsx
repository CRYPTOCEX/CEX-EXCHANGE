"use client";

import { Button } from "@/components/ui/button";
import { ArrowUpCircle, ArrowDownCircle, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";

interface TradingButtonsProps {
  handleSubmit: (side: "buy" | "sell") => Promise<void>;
  currentPrice: number | null;
  amount: number;
  isSubmitting?: boolean;
}

export default function TradingButtons({
  handleSubmit,
  currentPrice,
  amount,
  isSubmitting = false,
}: TradingButtonsProps) {
  const t = useTranslations("trade/components/trading/futures/trading-buttons");
  
  const isDisabled = !currentPrice || amount <= 0 || isSubmitting;
  
  return (
    <div className="grid grid-cols-2 gap-4 mt-auto">
      <Button
        variant="default"
        className="bg-green-600 hover:bg-green-700 text-white disabled:opacity-50"
        onClick={() => handleSubmit("buy")}
        disabled={isDisabled}
      >
        {isSubmitting ? (
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
        ) : (
          <ArrowUpCircle className="h-4 w-4 mr-2" />
        )}
        {isSubmitting ? t("submitting") : t("Long")}
      </Button>
      <Button
        variant="default"
        className="bg-red-600 hover:bg-red-700 text-white disabled:opacity-50"
        onClick={() => handleSubmit("sell")}
        disabled={isDisabled}
      >
        {isSubmitting ? (
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
        ) : (
          <ArrowDownCircle className="h-4 w-4 mr-2" />
        )}
        {isSubmitting ? t("submitting") : t("Short")}
      </Button>
    </div>
  );
}
