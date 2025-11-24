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
  const t = useTranslations("dashboard");
  return (
    <div
      ref={headerRef}
      className="py-3 px-4 border-b border-gray-200 dark:border-zinc-800 flex items-center justify-between bg-gradient-to-r from-indigo-50 via-purple-50 to-pink-50 dark:from-indigo-950/40 dark:via-purple-950/40 dark:to-pink-950/40"
    >
      <div className="flex items-center gap-2">
        <div className="bg-gradient-to-br from-indigo-500 to-purple-600 p-1.5 rounded-md shadow-sm">
          <Sliders className="h-4 w-4 text-white" />
        </div>
        <div>
          <h3 className="text-base font-medium text-gray-800 dark:text-white">
            {t("field_properties")}
          </h3>
          <p className="text-xs text-gray-500 dark:text-zinc-400">
            {t("Level")}
            {levelNumber}
            {t("Configuration")}
          </p>
        </div>
      </div>
      <Button
        variant="ghost"
        size="sm"
        onClick={onClose}
        className="text-gray-500 hover:text-gray-700 dark:text-zinc-400 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-zinc-800 h-8 w-8 rounded-full"
      >
        <PanelLeftOpen className="h-4 w-4" />
      </Button>
    </div>
  );
}
