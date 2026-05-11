"use client";

import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslations } from "next-intl";

interface ErrorStateProps {
  onRetry?: () => void;
  error?: string;
}

export default function OffersErrorState({ onRetry, error }: ErrorStateProps) {
  const t = useTranslations("ext_ico");
  const tCommon = useTranslations("common");
  return (
    <div className="bg-card rounded-2xl border border-destructive/20 shadow-xl p-12 text-center">
      <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-destructive/10 mb-6">
        <AlertCircle className="h-10 w-10 text-destructive" />
      </div>
      <h3 className="text-2xl font-bold mb-3">
        {t("error_loading_offerings")}
      </h3>
      <p className="text-muted-foreground max-w-md mx-auto mb-8">
        {error || "There was an error loading the token offerings. Please try again."}
      </p>
      {onRetry && (
        <Button onClick={onRetry}>
          {tCommon("try_again")}
        </Button>
      )}
    </div>
  );
}
