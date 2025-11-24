"use client";

import { LabeledSelect } from "../../structure-tab/ui-components";
import type { SettingsProps } from "../settings-map";

export function DividerSettings({
  element,
  settings,
  onSettingChange,
}: SettingsProps) {
  return (
    <div className="space-y-4">
      <LabeledSelect
        id="dividerStyle"
        label="Style"
        value={settings.style || "solid"}
        onValueChange={(value) => onSettingChange("style", value)}
        options={[
          { value: "solid", label: "Solid" },
          { value: "dashed", label: "Dashed" },
          { value: "dotted", label: "Dotted" },
          { value: "double", label: "Double" },
        ]}
      />
    </div>
  );
}
