"use client";

import { LabeledInput, LabeledSelect } from "../../structure-tab/ui-components";
import type { SettingsProps } from "../settings-map";

export function ButtonSettings({
  element,
  settings,
  onSettingChange,
  onElementUpdate,
}: SettingsProps) {
  return (
    <div className="space-y-4">
      <LabeledInput
        id="buttonText"
        label="Button Text"
        value={element.content || "Button"}
        onChange={(e) =>
          onElementUpdate({ ...element, content: e.target.value })
        }
      />
      <LabeledInput
        id="buttonUrl"
        label="Link URL"
        value={settings.link || ""}
        onChange={(e) => onSettingChange("link", e.target.value)}
        placeholder="https://example.com"
      />
      <LabeledSelect
        id="buttonTarget"
        label="Link Target"
        value={settings.target || "_self"}
        onValueChange={(value) => onSettingChange("target", value)}
        options={[
          { value: "_self", label: "Same Window" },
          { value: "_blank", label: "New Window" },
        ]}
        placeholder="Select target"
      />
    </div>
  );
}
