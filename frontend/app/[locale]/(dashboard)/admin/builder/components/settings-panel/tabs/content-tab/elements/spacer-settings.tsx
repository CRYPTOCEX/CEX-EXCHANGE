"use client";

import {
  LabeledSelect,
  LabeledSlider,
  LabeledSwitch,
} from "../../structure-tab/ui-components";
import type { SettingsProps } from "../settings-map";

export function SpacerSettings({
  element,
  settings,
  onSettingChange,
}: SettingsProps) {
  return (
    <div className="space-y-4">
      <LabeledSlider
        id="spacerHeight"
        label="Height"
        min={10}
        max={200}
        step={5}
        value={settings.height || 50}
        onChange={(value) => onSettingChange("height", value)}
        unit="px"
      />
      <div className="grid grid-cols-2 gap-3">
        <LabeledSelect
          id="spacerVisibility"
          label="Visibility"
          value={settings.visibility || "all"}
          onValueChange={(value) => onSettingChange("visibility", value)}
          options={[
            { value: "all", label: "All Devices" },
            { value: "desktop", label: "Desktop Only" },
            { value: "mobile", label: "Mobile Only" },
          ]}
        />
        <LabeledSwitch
          id="showInEditor"
          label="Show in Editor"
          checked={settings.showInEditor !== false}
          onCheckedChange={(checked) =>
            onSettingChange("showInEditor", checked)
          }
        />
      </div>
      <LabeledSlider
        id="mobileHeight"
        label="Mobile Height"
        min={0}
        max={200}
        step={5}
        value={settings.mobileHeight || settings.height || 50}
        onChange={(value) => onSettingChange("mobileHeight", value)}
        unit="px"
      />
    </div>
  );
}
