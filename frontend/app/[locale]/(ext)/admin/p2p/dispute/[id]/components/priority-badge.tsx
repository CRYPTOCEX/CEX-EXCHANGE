"use client";

import { Badge } from "@/components/ui/badge";
import { useTranslations } from "next-intl";

interface PriorityBadgeProps {
  priority: string;
}

export function PriorityBadge({ priority }: PriorityBadgeProps) {
  const t = useTranslations("ext");
  switch (priority) {
    case "high":
      return <Badge variant="destructive">{t("high_priority")}</Badge>;
    case "medium":
      return (
        <Badge
          variant="outline"
          className="border-orange-200 bg-orange-100 text-orange-800"
        >
          {t("medium_priority")}
        </Badge>
      );
    case "low":
      return (
        <Badge
          variant="outline"
          className="border-green-200 bg-green-100 text-green-800"
        >
          {t("low_priority")}
        </Badge>
      );
    default:
      return <Badge variant="outline">{priority}</Badge>;
  }
}
