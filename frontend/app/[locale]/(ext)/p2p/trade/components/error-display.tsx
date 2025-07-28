"use client";

import { AlertCircle, RefreshCw, Loader2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { useTranslations } from "next-intl";

interface ErrorDisplayProps {
  error: string;
  onRetry: () => void;
  isRetrying: boolean;
}

export function ErrorDisplay({
  error,
  onRetry,
  isRetrying,
}: ErrorDisplayProps) {
  const t = useTranslations("ext");
  return (
    <div className="flex min-h-screen w-full flex-col">
      <main className="flex flex-1 flex-col gap-6 p-4 md:gap-8 md:p-8">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
        <Button onClick={onRetry} disabled={isRetrying}>
          {isRetrying ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="mr-2 h-4 w-4" />
          )}
          {t("try_again")}
        </Button>
      </main>
    </div>
  );
}
