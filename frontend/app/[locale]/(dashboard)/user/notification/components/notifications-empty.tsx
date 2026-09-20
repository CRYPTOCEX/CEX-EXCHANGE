"use client";

import { FileSearch, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslations } from "next-intl";

interface NotificationsEmptyProps {
  message?: string;
  searchQuery?: string;
  hasFilters?: boolean;
}

export function NotificationsEmpty({
  message = "No notifications found",
  searchQuery,
  hasFilters,
}: NotificationsEmptyProps) {
  const t = useTranslations("dashboard_user");
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      {searchQuery ? (
        <FileSearch className="h-12 w-12 text-muted-foreground mb-4" />
      ) : (
        <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
      )}

      <h3 className="text-lg font-medium mb-2">
        {searchQuery ? t("no_results_for", { searchQuery: String(searchQuery) }) : message}
      </h3>

      <p className="text-muted-foreground max-w-md mb-6">
        {searchQuery
          ? t("try_adjusting_your_search_terms_or")
          : hasFilters
            ? t("try_changing_your_filters_to_see")
            : t("when_you_receive_notifications_they_will")}
      </p>

      {(searchQuery || hasFilters) && (
        <Button variant="outline" onClick={() => window.location.reload()}>
          {t("reset_all_filters")}
        </Button>
      )}
    </div>
  );
}
