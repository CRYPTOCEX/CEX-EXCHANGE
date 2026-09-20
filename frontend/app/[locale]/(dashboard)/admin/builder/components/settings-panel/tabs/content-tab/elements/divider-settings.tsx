"use client";

import { LabeledSelect } from "../../structure-tab/ui-components";
import type { SettingsProps } from "../settings-map";
import { useTranslations } from "next-intl";

export function DividerSettings({
  element,
  settings,
  onSettingChange,
}: SettingsProps) {
  const t = useTranslations("dashboard_admin");
  return (
    <div className="space-y-4">
      <LabeledSelect
        id="dividerStyle"
        label="Style"
        value={settings.style || "solid"}
        onValueChange={(value) => onSettingChange("style", value)}
        options={[
          { value: "solid", label: t("solid") },
          { value: "dashed", label: t("dashed") },
          { value: "dotted", label: t("dotted") },
          { value: "double", label: t("double") },
        ]}
      />
    </div>
  );
}
