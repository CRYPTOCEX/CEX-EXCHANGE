"use client";

import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";
import { useTranslations } from "next-intl";

interface ErrorStateProps {
  error: string;
  onRetry?: () => void;
}

export default function NFTAnalyticsErrorState({ error, onRetry }: ErrorStateProps) {
  const t = useTranslations("ext_admin");
  return (
    <div className=" flex items-center justify-center min-h-[400px]">
      <div className="text-center space-y-4">
        <AlertTriangle className="h-12 w-12 text-destructive mx-auto" />
        <h3 className="text-lg font-semibold">{t("error_loading_nft_analytics")}</h3>
        <p className="text-muted-foreground">{error || "Failed to load analytics data"}</p>
        {onRetry && (
          <Button onClick={onRetry} variant="outline">
            Retry
          </Button>
        )}
      </div>
    </div>
  );
}
