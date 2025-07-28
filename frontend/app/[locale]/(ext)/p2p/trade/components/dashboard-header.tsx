"use client";

import { Link } from "@/i18n/routing";
import { Plus, RefreshCw, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslations } from "next-intl";

interface DashboardHeaderProps {
  isRefreshing: boolean;
  onRefresh: () => void;
}

export function DashboardHeader({
  isRefreshing,
  onRefresh,
}: DashboardHeaderProps) {
  const t = useTranslations("ext");
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          {t("trade_dashboard")}
        </h1>
        <p className="text-muted-foreground mt-1">
          {t("manage_your_active_trading_activity")}
        </p>
      </div>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          className="h-9"
          onClick={onRefresh}
          disabled={isRefreshing}
        >
          {isRefreshing ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="mr-2 h-4 w-4" />
          )}
          {t("Refresh")}
        </Button>
        <Link href="/p2p/offer/create" className="h-9">
          <Button size="sm">
            <Plus className="mr-2 h-4 w-4" />
            {t("create_new_offer")}
          </Button>
        </Link>
      </div>
    </div>
  );
}
