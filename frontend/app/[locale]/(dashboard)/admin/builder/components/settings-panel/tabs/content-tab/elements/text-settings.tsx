"use client";

import { LabeledTextarea } from "../../structure-tab/ui-components";
import type { SettingsProps } from "../settings-map";

export function TextSettings({
  element,
  settings,
  onSettingChange,
  onElementUpdate,
}: SettingsProps) {
  return (
    <div className="space-y-4">
      <LabeledTextarea
        id="paragraphText"
        label="Text Content"
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
