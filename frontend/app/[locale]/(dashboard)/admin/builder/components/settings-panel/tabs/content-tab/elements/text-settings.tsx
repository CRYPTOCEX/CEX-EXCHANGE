"use client";

import { LabeledTextarea } from "../../structure-tab/ui-components";
import type { SettingsProps } from "../settings-map";
import { useTranslations } from "next-intl";

export function TextSettings({
  element,
  settings,
  onSettingChange,
  onElementUpdate,
}: SettingsProps) {
  const t = useTranslations("dashboard_admin");
  return (
    <div className="space-y-4">
      <LabeledTextarea
        id="paragraphText"
        label={t("text_content")}
        value={element.content || ""}
        onChange={(e) =>
          onElementUpdate({ ...element, content: e.target.value })
        }
        rows={4}
        className="resize-none"
      />
    </div>
  );
}
