"use client";

import { LabeledInput } from "../../structure-tab/ui-components";
import type { SettingsProps } from "../settings-map";
import { useTranslations } from "next-intl";

export function LinkSettings({
  element,
  settings,
  onSettingChange,
}: SettingsProps) {
  const t = useTranslations("dashboard_admin");
  return (
    <div className="space-y-4">
      <LabeledInput
        id="linkText"
        label={t("link_text")}
        value={element.content || "Link"}
        onChange={(e) => onSettingChange("content", e.target.value)}
      />
      <LabeledInput
        id="linkUrl"
        label="URL"
        value={settings.url || ""}
        onChange={(e) => onSettingChange("url", e.target.value)}
        placeholder="https://example.com"
      />
    </div>
  );
}
