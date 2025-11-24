"use client";

import { LabeledInput } from "../../structure-tab/ui-components";
import type { SettingsProps } from "../settings-map";

export function LinkSettings({
  element,
  settings,
  onSettingChange,
}: SettingsProps) {
  return (
    <div className="space-y-4">
      <LabeledInput
        id="linkText"
        label="Link Text"
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
