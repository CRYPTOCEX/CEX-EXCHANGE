"use client";

import { Button } from "@/components/ui/button";
import { AlertCircle, RefreshCw } from "lucide-react";
import { useTranslations } from "next-intl";

interface ErrorDisplayProps {
  error: string;
  onRetry?: () => void;
}

export function ErrorDisplay({ error, onRetry }: ErrorDisplayProps) {
  const t = useTranslations("components");
  const tCommon = useTranslations("common");
  return (
    <div className="rounded-lg border border-red-200 dark:border-red-800/50 bg-red-50 dark:bg-red-950/30 p-4 text-red-800 dark:text-red-200">
      <div className="flex items-start">
        <AlertCircle className="h-5 w-5 mr-2 mt-0.5 flex-shrink-0" />
        <div className="flex-1">
          <h3 className="font-medium">{t("error_loading_data")}</h3>
          <p className="text-sm mt-1 text-red-700 dark:text-red-300">{error}</p>

          {onRetry && (
            <Button
              variant="outline"
              size="sm"
              className="mt-3 bg-white dark:bg-red-950 hover:bg-white/90 dark:hover:bg-red-900 border-red-200 dark:border-red-800"
              onClick={onRetry}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              {tCommon("retry")}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
