"use client";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { AlertCircle } from "lucide-react";
import { useTranslations } from "next-intl";

interface ErrorStateProps {
  error: string;
  onRetry?: () => void;
}

export default function ErrorState({ error, onRetry }: ErrorStateProps) {
  const t = useTranslations("common");
  return (
    <div className="min-h-screen flex items-center justify-center pt-20 px-4">
      <Alert variant="destructive" className="max-w-lg">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>
          {error || "Failed to load settings. Please refresh the page."}
        </AlertDescription>
        {onRetry && (
          <Button
            variant="outline"
            onClick={onRetry}
            className="mt-4"
          >
            {t("try_again")}
          </Button>
        )}
      </Alert>
    </div>
  );
}
