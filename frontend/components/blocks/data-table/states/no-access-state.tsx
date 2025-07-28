import React from "react";
import { AlertCircle } from "lucide-react";
import { useTranslations } from "next-intl";

interface NoAccessStateProps {
  children: React.ReactNode;
  title: string;
}

export function NoAccessState({ children, title }: NoAccessStateProps) {
  const t = useTranslations(
    "components/blocks/data-table/states/no-access-state"
  );
  return (
    <div className="relative p-2 -m-2">
      {/* Changed backdrop-blur-xs -> backdrop-blur-xs */}
      <div className="absolute inset-0 z-50 flex items-center justify-center bg-background/50 backdrop-blur-xs">
        <div className="text-center">
          <AlertCircle className="mx-auto h-16 w-16 text-muted-foreground" />
          <h2 className="mt-4 text-lg font-semibold">{t("access_denied")}</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {t("you_dont_have_permission_to_access")}{" "}
            {title}
          </p>
        </div>
      </div>
      <div className="opacity-50 pointer-events-none">{children}</div>
    </div>
  );
}
