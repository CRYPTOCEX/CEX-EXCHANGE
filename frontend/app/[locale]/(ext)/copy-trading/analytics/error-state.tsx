"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BarChart3 } from "lucide-react";
import { useTranslations } from "next-intl";

interface ErrorStateProps {
  onRetry: () => void;
}

export default function AnalyticsErrorState({ onRetry }: ErrorStateProps) {
  const t = useTranslations("ext_copy-trading");
  const tCommon = useTranslations("common");
  return (
    <div className="min-h-screen flex items-center justify-center pt-20 bg-linear-to-b from-background to-muted/20 dark:from-zinc-950 dark:to-zinc-900/50">
      <Card className="max-w-md w-full mx-4 border-0 shadow-2xl">
        <CardContent className="pt-12 pb-8 text-center">
          <div className="w-20 h-20 rounded-2xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center mx-auto mb-6">
            <BarChart3 className="h-10 w-10 text-zinc-400" />
          </div>
          <h2 className="text-2xl font-bold mb-2">{t("unable_to_load_analytics")}</h2>
          <p className="text-zinc-500 mb-6">
            {t("please_try_again_later_or_check_your_connection")}
          </p>
          <Button onClick={onRetry} className="rounded-xl">
            {tCommon("try_again")}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
