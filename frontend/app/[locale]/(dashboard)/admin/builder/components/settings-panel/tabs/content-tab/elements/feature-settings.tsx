"use client";

import { Label } from "@/components/ui/label";
import { IconPicker } from "@/components/ui/icon-picker";
import { ColorPicker } from "@/components/ui/color-picker";
import {
  LabeledInput,
  LabeledTextarea,
} from "../../structure-tab/ui-components";
import type { SettingsProps } from "../settings-map";
import { useTheme } from "next-themes";
import { useTranslations } from "next-intl";

// Define proper types for feature settings
interface FeatureSettings {
  title?: string;
  description?: string;
  icon?: string;
  iconColor?:
    | string
    | { light: string; dark?: string }
    | { type: "gradient"; gradient: any };
  [key: string]: any;
}

export function FeatureSettings({
  element,
  settings: rawSettings,
  onSettingChange,
}: SettingsProps) {
  const t = useTranslations("dashboard");
  const { theme } = useTheme();
  const isDarkMode = theme === "dark";

  // Cast settings to our specific type
  const settings = (rawSettings as FeatureSettings) || {};

  return (
    <div className="space-y-4">
      <LabeledInput
        id="featureTitle"
        label="Title"
        value={settings.title || ""}
        onChange={(e) => onSettingChange("title", e.target.value)}
      />
      <LabeledTextarea
        id="featureDescription"
        label="Description"
        value={settings.description || ""}
        onChange={(e) => onSettingChange("description", e.target.value)}
        rows={3}
      />
      <div className="space-y-2">
        <Label className="text-xs font-medium">{t("Icon")}</Label>
        <IconPicker
          selectedIcon={settings.icon || "star"}
          onSelectIcon={(iconName) => onSettingChange("icon", iconName)}
        />
      </div>
      <div className="space-y-2">
        <Label className="text-xs font-medium">{t("icon_color")}</Label>
        <ColorPicker
          label="Icon Color"
          colorVariable="iconColor"
          value={settings.iconColor || (isDarkMode ? "#A78BFA" : "#7c3aed")}
          onChange={(lightColor, darkColor, tailwindClass) =>
            onSettingChange("iconColor", tailwindClass)
          }
        />
      </div>
    </div>
  );
}
