"use client";
import {
  LabeledInput,
  LabeledSelect,
  LabeledSlider,
  LabeledSwitch,
} from "../../structure-tab/ui-components";
import type { SettingsProps } from "../settings-map";
import { CollapsibleSection } from "../../../ui/collapsible-section";

export function TrendingMarketsSettings({
  element,
  settings,
  onSettingChange,
}: SettingsProps) {
  return (
    <div className="space-y-4">
      <CollapsibleSection title="Data Source" isOpen={true}>
        <div className="space-y-2">
          <LabeledInput
            id="apiEndpoint"
            label="API Endpoint"
            value={settings.apiEndpoint || "/api/markets/ticker"}
            onChange={(e) => onSettingChange("apiEndpoint", e.target.value)}
            placeholder="/api/markets/ticker"
          />

          <LabeledInput
            id="wsEndpoint"
            label="WebSocket Endpoint"
            value={settings.wsEndpoint || "/api/markets/ticker/ws"}
            onChange={(e) => onSettingChange("wsEndpoint", e.target.value)}
            placeholder="/api/markets/ticker/ws"
          />

          <LabeledInput
            id="linkBaseUrl"
            label="Link Base URL"
            value={settings.linkBaseUrl || "/trade"}
            onChange={(e) => onSettingChange("linkBaseUrl", e.target.value)}
            placeholder="/trade"
          />

          <LabeledSlider
            id="maxItems"
            label="Maximum Items"
            min={1}
            max={20}
            step={1}
            value={settings.maxItems || 10}
            onChange={(value) => onSettingChange("maxItems", value)}
          />
        </div>
      </CollapsibleSection>

      <CollapsibleSection title="Scrolling" isOpen={true}>
        <div className="space-y-2">
          <LabeledSwitch
            id="autoScroll"
            label="Auto Scroll"
            checked={settings.autoScroll !== false}
            onCheckedChange={(checked) =>
              onSettingChange("autoScroll", checked)
            }
          />

          {settings.autoScroll !== false && (
            <>
              <LabeledSlider
                id="scrollSpeed"
                label="Scroll Speed"
                min={10}
                max={100}
                step={1}
                value={settings.scrollSpeed || 32}
                onChange={(value) => onSettingChange("scrollSpeed", value)}
              />

              <LabeledSelect
                id="scrollDirection"
                label="Scroll Direction"
                value={settings.scrollDirection || "rtl"}
                onValueChange={(value) =>
                  onSettingChange("scrollDirection", value)
                }
                options={[
                  { value: "ltr", label: "Left to Right" },
                  { value: "rtl", label: "Right to Left" },
                ]}
              />

              <LabeledSwitch
                id="showGradients"
                label="Show Gradients"
                checked={settings.showGradients !== false}
                onCheckedChange={(checked) =>
                  onSettingChange("showGradients", checked)
                }
              />
            </>
          )}
        </div>
      </CollapsibleSection>
    </div>
  );
}
