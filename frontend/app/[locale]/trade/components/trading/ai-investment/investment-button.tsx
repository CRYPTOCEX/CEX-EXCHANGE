"use client";
import { Button } from "@/components/ui/button";
import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";
import { ButtonSpinner } from "../shared/order-form-ui";

interface InvestmentButtonProps {
  isSubmitting: boolean;
  isFormValid: boolean;
  onSubmit: () => void;
}

export default function InvestmentButton({
  isSubmitting,
  isFormValid,
  onSubmit,
}: InvestmentButtonProps) {
  const t = useTranslations("common");
  const tTradeComponents = useTranslations("trade_components");
  return (
    <Button
      className={cn(
        // "Invest" is an interaction, not a price direction, so it takes the
        // accent rather than the buy-side green. The two-stop gradient it used
        // to wear was faking elevation (R3).
        "w-full h-9 text-sm font-medium rounded-sm transition-all duration-200",
        isFormValid
          ? "bg-primary hover:bg-primary/90 text-primary-foreground"
          : "bg-surface-3 text-muted-foreground border border-border hover:bg-surface-3/80"
      )}
      onClick={onSubmit}
      disabled={isSubmitting || !isFormValid}
    >
      {isSubmitting ? (
        <span className="flex items-center">
          <ButtonSpinner />
          {t("processing")}.
        </span>
      ) : (
        <span className="flex items-center justify-center">
          <Sparkles className="h-3.5 w-3.5 mr-1.5" />
          {tTradeComponents("invest_with_ai")}
        </span>
      )}
    </Button>
  );
}
