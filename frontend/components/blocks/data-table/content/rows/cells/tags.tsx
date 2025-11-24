import React from "react";
import { Badge } from "@/components/ui/badge";
import { useTranslations } from "next-intl";

interface TagsCellProps {
  value: any[];
  row: any;
  maxDisplay?: number;
}

export function TagsCell({ value, row, maxDisplay = 3 }: TagsCellProps) {
  const t = useTranslations(
    "components/blocks/data-table/content/rows/cells/tags"
  );
  const transformed = Array.isArray(value)
    ? value.map((item: any) =>
        typeof item === "object" && item.name ? item.name : item
      )
    : [];

  const displayTags = transformed.slice(0, maxDisplay);
  if (displayTags.length === 0) {
    return <span>{t("N_A")}</span>;
  }
  const remaining = transformed.length - maxDisplay;

  return (
    <div className="flex items-center gap-1 overflow-hidden">
      {displayTags.map((tag: string, index: number) => (
        <Badge key={index} variant="soft" className="whitespace-nowrap">
          {tag}
        </Badge>
      ))}
      {remaining > 0 && <Badge variant="soft">+{remaining}</Badge>}
    </div>
  );
}
