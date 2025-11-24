"\"use client";

import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import type { SettingsProps } from "../settings-map";
import { useTranslations } from "next-intl";

export function GallerySettings({
  element,
  settings,
  onSettingChange,
}: SettingsProps) {
  const t = useTranslations("dashboard");
  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <Label className="text-xs font-medium">{t("Columns")}</Label>
        <Input
          type="number"
          value={settings.columns || 3}
          onChange={(e) => onSettingChange("columns", Number(e.target.value))}
          placeholder="Number of columns"
          className="h-7 text-xs"
        />
      </div>
      <div className="space-y-1">
        <Label className="text-xs font-medium">{t("Gap")}</Label>
        <Input
          type="number"
          value={settings.gap || 10}
          onChange={(e) => onSettingChange("gap", Number(e.target.value))}
          placeholder="Gap between images"
          className="h-7 text-xs"
        />
      </div>
      <div className="space-y-1">
        <Label className="text-xs font-medium">{t("border_radius")}</Label>
        <Input
          type="number"
          value={settings.borderRadius || 0}
          onChange={(e) =>
            onSettingChange("borderRadius", Number(e.target.value))
          }
          placeholder="Border radius"
          className="h-7 text-xs"
        />
      </div>
    </div>
  );
}
