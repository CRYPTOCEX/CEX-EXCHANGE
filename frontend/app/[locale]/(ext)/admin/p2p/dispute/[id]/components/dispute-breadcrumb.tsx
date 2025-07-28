"use client";

import { Link } from "@/i18n/routing";
import { ChevronRight } from "lucide-react";
import { useTranslations } from "next-intl";

interface DisputeBreadcrumbProps {
  disputeId: string;
}

export function DisputeBreadcrumb({ disputeId }: DisputeBreadcrumbProps) {
  const t = useTranslations("ext");
  return (
    <div className="flex items-center gap-1 text-sm text-muted-foreground">
      <Link href="/admin" className="hover:text-foreground">
        {t("Admin")}
      </Link>
      <ChevronRight className="h-4 w-4" />
      <Link href="/admin/disputes" className="hover:text-foreground">
        {t("Disputes")}
      </Link>
      <ChevronRight className="h-4 w-4" />
      <span className="font-medium text-foreground">{disputeId}</span>
    </div>
  );
}
