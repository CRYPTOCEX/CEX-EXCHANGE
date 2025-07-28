"use client";

import {
  LabeledInput,
  LabeledTextarea,
} from "../../structure-tab/ui-components";
import type { SettingsProps } from "../settings-map";

export function QuoteSettings({
  element,
  settings,
  onSettingChange,
  onElementUpdate,
}: SettingsProps) {
  return (
    <div className="space-y-4">
      <LabeledTextarea
        id="quoteText"
        label="Quote Text"
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
        placeholder="Quote author"
      />
      <LabeledInput
        id="quoteRole"
        label="Role/Source"
        value={settings.role || ""}
        onChange={(e) => onSettingChange("role", e.target.value)}
        placeholder="Author role or source"
      />
    </div>
  );
}
