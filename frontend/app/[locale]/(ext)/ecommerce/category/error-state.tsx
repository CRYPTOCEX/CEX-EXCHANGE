"use client";

import { X } from "lucide-react";
import { useTranslations } from "next-intl";

interface ErrorStateProps {
  onRetry: () => void;
  message?: string;
}

export default function CategoryErrorState({ onRetry, message }: ErrorStateProps) {
  const t = useTranslations("ext_ecommerce");
  const tCommon = useTranslations("common");
  return (
    <div className="text-center py-12 pt-20 bg-white dark:bg-zinc-800/50 rounded-2xl shadow-xl p-8">
      <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/30 mb-4">
        <X className="h-8 w-8 text-red-600 dark:text-red-400" />
      </div>
      <h2 className="text-2xl font-bold text-gray-900 dark:text-zinc-100">{t("error_loading_categories")}</h2>
      <p className="mt-2 text-gray-600 dark:text-zinc-400 max-w-md mx-auto">{message || "There was an error loading the categories. Please try again later."}</p>
      <button
        onClick={onRetry}
        className="mt-6 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-amber-600 hover:bg-amber-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500 dark:bg-amber-700 dark:hover:bg-amber-600"
      >
        {tCommon("try_again")}
      </button>
    </div>
  );
}
