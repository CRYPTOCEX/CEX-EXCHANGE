"use client";

import { Badge } from "@/components/ui/badge";
import { useTranslations } from "next-intl";

interface DisputeStatusBadgeProps {
  status: string;
}

export function DisputeStatusBadge({ status }: DisputeStatusBadgeProps) {
  const t = useTranslations("ext");
  switch (status) {
    case "pending":
      return (
        <Badge
          variant="outline"
          className="ml-2 border-orange-200 bg-orange-100 text-orange-800"
        >
          {t("Pending")}
        </Badge>
      );
    case "in-progress":
      return (
        <Badge
          variant="outline"
          className="ml-2 border-blue-200 bg-blue-100 text-blue-800"
        >
          {t("in_progress")}
        </Badge>
      );
    case "resolved":
      return (
        <Badge
          variant="outline"
          className="ml-2 border-green-200 bg-green-100 text-green-800"
        >
          {t("Resolved")}
        </Badge>
      );
    default:
      return (
        <Badge variant="outline" className="ml-2">
          {status}
        </Badge>
      );
  }
}
