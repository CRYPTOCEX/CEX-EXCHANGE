"use client";

import { useTranslations } from "next-intl";

interface ErrorStateProps {
  onRetry: () => void;
  error?: string;
}

export default function CategoryDetailErrorState({ onRetry, error }: ErrorStateProps) {
  const t = useTranslations("common");
  return (
    <div className="container px-4 py-16 sm:px-6 lg:px-8 pt-20">
      <div className="bg-red-50 dark:bg-red-900/20 border-l-4 border-red-400 dark:border-red-500 p-6 rounded-lg">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg
              className="h-6 w-6 text-red-400 dark:text-red-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-lg font-medium text-red-800 dark:text-red-300">
              {t("error_loading_category")}
            </h3>
            <p className="mt-2 text-sm text-red-700 dark:text-red-300">
              {error || "An unexpected error occurred"}
            </p>
            <div className="mt-4">
              <button
                onClick={onRetry}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 dark:bg-red-700 dark:hover:bg-red-600"
              >
                {t("try_again")}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
