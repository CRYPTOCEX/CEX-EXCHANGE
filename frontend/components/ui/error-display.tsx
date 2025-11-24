"use client";

import { Button } from "@/components/ui/button";
import { AlertCircle, RefreshCw } from "lucide-react";
import { useTranslations } from "next-intl";

interface ErrorDisplayProps {
  error: string;
  onRetry?: () => void;
}

export function ErrorDisplay({ error, onRetry }: ErrorDisplayProps) {
  const t = useTranslations("components/ui/error-display");
  return (
    <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-800">
      <div className="flex items-start">
        <AlertCircle className="h-5 w-5 mr-2 mt-0.5 flex-shrink-0" />
        <div className="flex-1">
          <h3 className="font-medium">{t("error_loading_data")}</h3>
          <p className="text-sm mt-1">{error}</p>

          {onRetry && (
            <Button
              variant="outline"
              size="sm"
              className="mt-3 bg-white hover:bg-white/90"
              onClick={onRetry}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              {t("Retry")}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
