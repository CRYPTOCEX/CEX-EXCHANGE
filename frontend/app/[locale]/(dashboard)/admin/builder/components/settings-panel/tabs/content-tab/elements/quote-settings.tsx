"use client";

import {
  LabeledInput,
  LabeledTextarea,
} from "../../structure-tab/ui-components";
import type { SettingsProps } from "../settings-map";
import { useTranslations } from "next-intl";

export function QuoteSettings({
  element,
  settings,
  onSettingChange,
  onElementUpdate,
}: SettingsProps) {
  const t = useTranslations("dashboard_admin");
  return (
    <div className="space-y-4">
      <LabeledTextarea
        id="quoteText"
        label={t("quote_text")}
        value={element.content || ""}
        onChange={(e) =>
          onElementUpdate({ ...element, content: e.target.value })
        }
        rows={4}
      />
      <LabeledInput
        id="quoteAuthor"
        label="Author"
        value={settings.author || ""}
        onChange={(e) => onSettingChange("author", e.target.value)}
        placeholder={t("quote_author")}
      />
      <LabeledInput
        id="quoteRole"
        label={t("role_source")}
        value={settings.role || ""}
        onChange={(e) => onSettingChange("role", e.target.value)}
        placeholder={t("author_role_or_source")}
      />
    </div>
  );
}
