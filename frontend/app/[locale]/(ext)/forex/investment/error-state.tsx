"use client";

import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslations } from "next-intl";

interface ErrorStateProps {
  onRetry?: () => void;
  error?: string;
}

export default function InvestmentErrorState({
  onRetry,
  error,
}: ErrorStateProps) {
  const t = useTranslations("ext_forex");
  const tCommon = useTranslations("common");
  return (
    <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-red-200 dark:border-red-800 shadow-xl p-12 text-center">
      <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-red-500/10 dark:bg-red-500/20 mb-6">
        <AlertCircle className="h-10 w-10 text-red-600 dark:text-red-400" />
      </div>
      <h3 className="text-2xl font-bold text-zinc-900 dark:text-white mb-3">
        {t("error_loading_investment")}
      </h3>
      <p className="text-zinc-600 dark:text-zinc-400 max-w-md mx-auto mb-8">
        {error ||
          "There was an error loading the investment details. Please try again."}
      </p>
      {onRetry && (
        <Button
          onClick={onRetry}
          className={`bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl`}
        >
          {tCommon("try_again")}
        </Button>
      )}
    </div>
  );
}
