"use client";

import {
  LabeledSelect,
  LabeledTextarea,
} from "../../structure-tab/ui-components";
import type { SettingsProps } from "../settings-map";
import { useTranslations } from "next-intl";

export function HeadingSettings({
  element,
  settings,
  onSettingChange,
  onElementUpdate,
}: SettingsProps) {
  const t = useTranslations("dashboard_admin");
  return (
    <div className="space-y-4">
      <LabeledTextarea
        id="headingText"
        label={t("heading_text")}
        value={element.content || ""}
        onChange={(e) =>
          onElementUpdate({ ...element, content: e.target.value })
        }
        rows={3}
        className="resize-none"
      />
      <LabeledSelect
        id="headingLevel"
        label={t("heading_level")}
        value={settings.headingLevel || "h2"}
        onValueChange={(value) => onSettingChange("headingLevel", value)}
        options={[
          { value: "h1", label: "H1" },
          { value: "h2", label: "H2" },
          { value: "h3", label: "H3" },
          { value: "h4", label: "H4" },
          { value: "h5", label: "H5" },
          { value: "h6", label: "H6" },
        ]}
      />
    </div>
  );
}
