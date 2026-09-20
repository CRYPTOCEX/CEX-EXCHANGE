"use client";

import { BarChart3 } from "lucide-react";
import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";

interface BuilderFooterProps {
  activeFields: KycField[];
  isEdit: boolean;
  levelNumber: number;
}

export function BuilderFooter({
  activeFields,
  isEdit,
  levelNumber,
}: BuilderFooterProps) {
  const t = useTranslations("common");
  const tDashboardAdmin = useTranslations("dashboard_admin");
  const [dateString, setDateString] = useState<string>("");

  useEffect(() => {
    // Only set the date on the client side to avoid hydration mismatch
    setDateString(new Date().toLocaleString());
  }, []);

  return (
    <div className="border-t py-1.5 px-3 bg-muted/30 border-border flex items-center justify-between text-xs text-muted-foreground">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1">
          <BarChart3 className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-muted-foreground">
            {t("level")}{" "}
            {levelNumber}: {activeFields.length}{" "}
            {t("fields")}
          </span>
        </div>
        <div>
          <span className="text-muted-foreground">
            {activeFields.filter((f) => f.required).length}{" "}
            {t("required")}
          </span>
        </div>
        <div>
          <span className="text-muted-foreground">
            {activeFields.filter((f) => f.conditional).length}{" "}
            {tDashboardAdmin("conditional")}
          </span>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <div>
          <span className="text-muted-foreground">
            {isEdit ? `${t("last_saved")}:` : `${t("created")}:`} {dateString}
          </span>
        </div>
      </div>
    </div>
  );
}
