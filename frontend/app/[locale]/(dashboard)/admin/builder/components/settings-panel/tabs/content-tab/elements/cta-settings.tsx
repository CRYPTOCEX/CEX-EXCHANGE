"use client";

import {
  LabeledInput,
  LabeledSelect,
  LabeledTextarea,
} from "../../structure-tab/ui-components";
import type { SettingsProps } from "../settings-map";
import { useTranslations } from "next-intl";

export function CtaSettings({
  element,
  settings,
  onSettingChange,
}: SettingsProps) {
  const t = useTranslations("dashboard_admin");
  return (
    <div className="space-y-4">
      <LabeledSelect
        id="ctaLayout"
        label="Layout"
        value={settings.layout || "centered"}
        onValueChange={(value) => onSettingChange("layout", value)}
        options={[
          { value: "centered", label: "Centered" },
          { value: "split", label: "Split" },
        ]}
      />
      <LabeledInput
        id="heading"
        label="Heading"
        value={settings.heading || ""}
        onChange={(e) => onSettingChange("heading", e.target.value)}
      />
      <LabeledTextarea
        id="subheading"
        label="Subheading"
        value={settings.subheading || ""}
        onChange={(e) => onSettingChange("subheading", e.target.value)}
        rows={2}
      />
      <LabeledInput
        id="buttonText"
        label={t("button_text")}
        value={settings.buttonText || ""}
        onChange={(e) => onSettingChange("buttonText", e.target.value)}
      />
      <LabeledInput
        id="buttonLink"
        label={t("button_link")}
        value={settings.buttonLink || ""}
        onChange={(e) => onSettingChange("buttonLink", e.target.value)}
        placeholder="https://example.com"
      />
    </div>
  );
}
