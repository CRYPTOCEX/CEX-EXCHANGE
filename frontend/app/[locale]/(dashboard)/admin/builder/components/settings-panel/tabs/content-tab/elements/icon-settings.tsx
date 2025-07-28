"use client";

import { Label } from "@/components/ui/label";
import { IconPicker } from "@/components/ui/icon-picker";
import type { SettingsProps } from "../settings-map";
import { useTranslations } from "next-intl";

export function IconSettings({
  element,
  settings,
  onSettingChange,
}: SettingsProps) {
  const t = useTranslations("dashboard");
  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <Label className="text-xs font-medium">{t("Icon")}</Label>
        <IconPicker
          selectedIcon={settings.iconName || "sparkles"}
          onSelectIcon={(iconName) => onSettingChange("iconName", iconName)}
        />
      </div>
      <div className="text-xs text-muted-foreground mt-2">
        <p>{t("use_the_design_and_size")}.</p>
      </div>
    </div>
  );
}
