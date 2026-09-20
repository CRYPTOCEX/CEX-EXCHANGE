"use client";

import type React from "react";

import { Button } from "@/components/ui/button";
import { PanelLeftOpen, Sliders } from "lucide-react";
import { useTranslations } from "next-intl";

interface HeaderProps {
  levelNumber: number;
  onClose: () => void;
  headerRef: React.RefObject<HTMLDivElement | null>;
}

export function Header({ levelNumber, onClose, headerRef }: HeaderProps) {
  const t = useTranslations("dashboard_admin");
  const tCommon = useTranslations("common");
  return (
    <div
      ref={headerRef}
      className="py-3 px-4 border-b border-border flex items-center justify-between bg-surface-2"
    >
      <div className="flex items-center gap-2">
        <div className="bg-primary/10 text-primary-ink p-1.5 rounded-md">
          <Sliders className="h-4 w-4" />
        </div>
        <div>
          <h3 className="text-base font-medium text-foreground">
            {t("field_properties")}
          </h3>
          <p className="text-xs text-muted-foreground">
            {tCommon("level")} {levelNumber} {tCommon("configuration")}
          </p>
        </div>
      </div>
      <Button
        variant="ghost"
        size="sm"
        onClick={onClose}
        className="text-muted-foreground hover:text-foreground hover:bg-surface-3 h-8 w-8 rounded-full"
      >
        <PanelLeftOpen className="h-4 w-4" />
      </Button>
    </div>
  );
}
