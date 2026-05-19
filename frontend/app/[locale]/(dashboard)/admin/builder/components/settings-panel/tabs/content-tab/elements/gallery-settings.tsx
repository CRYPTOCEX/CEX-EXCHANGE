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
  const t = useTranslations("dashboard_admin");
  const tCommon = useTranslations("common");
  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <Label className="text-xs font-medium">{tCommon("columns")}</Label>
        <Input
          type="number"
          value={settings.columns || 3}
          onChange={(e) => onSettingChange("columns", Number(e.target.value))}
          placeholder={t("number_of_columns")}
          className="h-7 text-xs"
        />
      </div>
      <div className="space-y-1">
        <Label className="text-xs font-medium">{t("gap")}</Label>
        <Input
          type="number"
          value={settings.gap || 10}
          onChange={(e) => onSettingChange("gap", Number(e.target.value))}
          placeholder={t("gap_between_images")}
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
          placeholder={t("border_radius")}
          className="h-7 text-xs"
        />
      </div>
    </div>
  );
}
