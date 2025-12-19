"use client";
import {
  LabeledInput,
  LabeledSelect,
  LabeledSlider,
  LabeledSwitch,
} from "../../structure-tab/ui-components";
import type { SettingsProps } from "../settings-map";
import { CollapsibleSection } from "../../../ui/collapsible-section";
import { useTranslations } from "next-intl";

export function TrendingMarketsSettings({
  element,
  settings,
  onSettingChange,
}: SettingsProps) {
  const t = useTranslations("dashboard_admin");
  return (
    <div className="space-y-4">
      <CollapsibleSection title={t("data_source")} isOpen={true}>
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
            label={t("link_base_url")}
            value={settings.linkBaseUrl || "/trade"}
            onChange={(e) => onSettingChange("linkBaseUrl", e.target.value)}
            placeholder="/trade"
          />

          <LabeledSlider
            id="maxItems"
            label={t("maximum_items")}
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
            label={t("auto_scroll")}
            checked={settings.autoScroll !== false}
            onCheckedChange={(checked) =>
              onSettingChange("autoScroll", checked)
            }
          />

          {settings.autoScroll !== false && (
            <>
              <LabeledSlider
                id="scrollSpeed"
                label={t("scroll_speed")}
                min={10}
                max={100}
                step={1}
                value={settings.scrollSpeed || 32}
                onChange={(value) => onSettingChange("scrollSpeed", value)}
              />

              <LabeledSelect
                id="scrollDirection"
                label={t("scroll_direction")}
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
                label={t("show_gradients")}
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
