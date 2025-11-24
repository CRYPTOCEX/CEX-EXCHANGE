"use client";
import { Button } from "@/components/ui/button";
import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";

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
  const t = useTranslations(
    "trade/components/trading/ai-investment/investment-button"
  );
  return (
    <Button
      className={cn(
        "w-full h-9 text-sm font-medium rounded-sm transition-all duration-200",
        isFormValid
          ? "bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white shadow-md hover:shadow-lg active:shadow-sm dark:from-emerald-500 dark:to-emerald-600 dark:hover:from-emerald-600 dark:hover:to-emerald-700"
          : "bg-zinc-200 text-zinc-500 border border-zinc-300 hover:bg-zinc-300 dark:bg-zinc-700/50 dark:text-zinc-400 dark:border-zinc-700/70 dark:hover:bg-zinc-700/60"
      )}
      onClick={onSubmit}
      disabled={isSubmitting || !isFormValid}
    >
      {isSubmitting ? (
        <span className="flex items-center">
          <span className="animate-spin mr-2 h-4 w-4 border-2 border-white border-t-transparent rounded-full"></span>
          {t("Processing")}.
        </span>
      ) : (
        <span className="flex items-center justify-center">
          <Sparkles className="h-3.5 w-3.5 mr-1.5" />
          {t("invest_with_ai")}
        </span>
      )}
    </Button>
  );
}
