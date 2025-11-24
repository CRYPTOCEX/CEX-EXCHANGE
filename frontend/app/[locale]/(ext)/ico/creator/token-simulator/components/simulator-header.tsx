"use client";

import { Download, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CardTitle, CardDescription } from "@/components/ui/card";
import { useTranslations } from "next-intl";

interface SimulatorHeaderProps {
  onExport: () => void;
}

export function SimulatorHeader({ onExport }: SimulatorHeaderProps) {
  const t = useTranslations("ext");
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div>
        <CardTitle>{t("token_economics_simulator")}</CardTitle>
        <CardDescription>
          {t("design_and_visualize_vesting_schedule")}
        </CardDescription>
      </div>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={onExport}>
          <Download className="h-4 w-4 mr-1" />
          {t("Export")}
        </Button>
      </div>
    </div>
  );
}
