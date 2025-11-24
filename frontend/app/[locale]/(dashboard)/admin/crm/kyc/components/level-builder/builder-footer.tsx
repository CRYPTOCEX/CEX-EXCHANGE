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
  const t = useTranslations("dashboard");
  const [dateString, setDateString] = useState<string>("");

  useEffect(() => {
    // Only set the date on the client side to avoid hydration mismatch
    setDateString(new Date().toLocaleString());
  }, []);

  return (
    <div className="border-t py-1.5 px-3 bg-muted/30 dark:bg-zinc-900 dark:border-zinc-800 flex items-center justify-between text-xs text-muted-foreground dark:text-zinc-400">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1">
          <BarChart3 className="h-3.5 w-3.5 dark:text-zinc-400" />
          <span className="dark:text-zinc-300">
            {t("Level")}{" "}
            {levelNumber}: {activeFields.length}{" "}
            {t("fields")}
          </span>
        </div>
        <div>
          <span className="dark:text-zinc-400">
            {activeFields.filter((f) => f.required).length}{" "}
            {t("required")}
          </span>
        </div>
        <div>
          <span className="dark:text-zinc-400">
            {activeFields.filter((f) => f.conditional).length}{" "}
            {t("conditional")}
          </span>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <div>
          <span className="dark:text-zinc-400">
            {isEdit ? "Last saved:" : "Created:"} {dateString}
          </span>
        </div>
      </div>
    </div>
  );
}
