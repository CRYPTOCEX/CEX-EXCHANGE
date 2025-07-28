"use client";

import { Link } from "@/i18n/routing";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { useTranslations } from "next-intl";

export default function HeaderSection() {
  const t = useTranslations("ext");
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          {t("staking_overview")}
        </h1>
        <p className="text-muted-foreground mt-1">
          {t("monitor_performance_and_staking_platform")}
        </p>
      </div>
      <Link href="/admin/staking/pool/new">
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          {t("new_pool")}
        </Button>
      </Link>
    </div>
  );
}
