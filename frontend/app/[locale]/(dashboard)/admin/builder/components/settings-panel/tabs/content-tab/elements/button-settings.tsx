"use client";

import { LabeledInput, LabeledSelect } from "../../structure-tab/ui-components";
import type { SettingsProps } from "../settings-map";
import { useTranslations } from "next-intl";

export function ButtonSettings({
  element,
  settings,
  onSettingChange,
  onElementUpdate,
}: SettingsProps) {
  const t = useTranslations("dashboard_admin");
  return (
    <div className="space-y-4">
      <LabeledInput
        id="buttonText"
        label={t("button_text")}
        value={element.content || "Button"}
        onChange={(e) =>
          onElementUpdate({ ...element, content: e.target.value })
        }
      />
      <LabeledInput
        id="buttonUrl"
        label={t("link_url")}
        value={settings.link || ""}
        onChange={(e) => onSettingChange("link", e.target.value)}
        placeholder="https://example.com"
      />
      <LabeledSelect
        id="buttonTarget"
        label={t("link_target")}
        value={settings.target || "_self"}
        onValueChange={(value) => onSettingChange("target", value)}
        options={[
          { value: "_self", label: "Same Window" },
          { value: "_blank", label: "New Window" },
        ]}
        placeholder={t("select_target")}
      />
    </div>
  );
}
