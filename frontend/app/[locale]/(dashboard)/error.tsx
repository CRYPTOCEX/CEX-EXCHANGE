"use client"; // Error components must be Client Components

import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Info } from "lucide-react";
import { useTranslations } from "next-intl";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations("dashboard");
  return (
    <div className="space-y-4">
      <Alert color="destructive">
        <Info className="h-5 w-5" />
        <AlertDescription>{t("something_went_wrong")}</AlertDescription>
      </Alert>
      <Button onClick={() => reset()} color="destructive" size="sm">
        {t("try_again")}
      </Button>
    </div>
  );
}
