"use client";

import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ArrowLeft } from "lucide-react";
import { useRouter } from "@/i18n/routing";
import { useTranslations } from "next-intl";

interface ErrorDisplayProps {
  error: string;
  clearError: () => void;
}

export function ErrorDisplay({ error, clearError }: ErrorDisplayProps) {
  const t = useTranslations("ext");
  const router = useRouter();

  return (
    <div className="space-y-6">
      <Button
        variant="outline"
        size="sm"
        onClick={() => router.push("/admin/disputes")}
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        {t("back_to_disputes")}
      </Button>
      <Alert variant="destructive">
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
        <Button
          variant="ghost"
          size="sm"
          onClick={clearError}
          className="absolute right-2 top-2"
        >
          {t("Dismiss")}
        </Button>
      </Alert>
    </div>
  );
}
