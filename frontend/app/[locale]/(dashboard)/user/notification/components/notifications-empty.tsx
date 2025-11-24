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
  const t = useTranslations("dashboard");
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      {searchQuery ? (
        <FileSearch className="h-12 w-12 text-muted-foreground mb-4" />
      ) : (
        <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
      )}

      <h3 className="text-lg font-medium mb-2">
        {searchQuery ? `No results for "${searchQuery}"` : message}
      </h3>

      <p className="text-muted-foreground max-w-md mb-6">
        {searchQuery
          ? "Try adjusting your search terms or filters to find what you're looking for."
          : hasFilters
            ? "Try changing your filters to see more notifications."
            : "When you receive notifications, they will appear here."}
      </p>

      {(searchQuery || hasFilters) && (
        <Button variant="outline" onClick={() => window.location.reload()}>
          {t("reset_all_filters")}
        </Button>
      )}
    </div>
  );
}
