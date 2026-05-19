"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AlertCircle } from "lucide-react";
import { useTranslations } from "next-intl";

interface ErrorStateProps {
  error: string;
  onRetry?: () => void;
}

export default function NFTAdminErrorState({ error, onRetry }: ErrorStateProps) {
  const t = useTranslations("common");
  return (
    <div className=" space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">NFT Admin Dashboard</h1>
      </div>
      <Card>
        <CardContent className="pt-6">
          <div className="text-center">
            <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <p className="text-destructive mb-4">{error || "Failed to load dashboard data"}</p>
            {onRetry && <Button onClick={onRetry}>{t("try_again")}</Button>}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
