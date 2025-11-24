"use client";

import { Button } from "@/components/ui/button";
import { FileQuestion, FilterX } from "lucide-react";
import { useTranslations } from "next-intl";

interface FAQEmptyStateProps {
  loading: boolean;
  hasFilters: boolean;
  onClearFilters: () => void;
}

export function FAQEmptyState({
  loading,
  hasFilters,
  onClearFilters,
}: FAQEmptyStateProps) {
  const t = useTranslations("ext");
  if (loading) {
    return null;
  }

  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      {hasFilters ? (
        <>
          <FilterX className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">
            {t("no_faqs_match_your_filters")}
          </h3>
          <p className="text-muted-foreground mb-4">
            {t("try_changing_your_your_filters")}.
          </p>
          <Button onClick={onClearFilters}>{t("clear_filters")}</Button>
        </>
      ) : (
        <>
          <FileQuestion className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">{t("no_faqs_found")}</h3>
          <p className="text-muted-foreground mb-4">
            {t("get_started_by_creating_your_first_faq")}.
          </p>
        </>
      )}
    </div>
  );
}
