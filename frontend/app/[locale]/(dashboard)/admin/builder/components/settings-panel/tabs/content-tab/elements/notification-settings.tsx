"use client";

import { Label } from "@/components/ui/label";
import { IconPicker } from "@/components/ui/icon-picker";
import {
  LabeledInput,
  LabeledSelect,
  LabeledTextarea,
  LabeledSwitch,
} from "../../structure-tab/ui-components";
import type { SettingsProps } from "../settings-map";
import { useTranslations } from "next-intl";

export function NotificationSettings({
  element,
  settings,
  onSettingChange,
}: SettingsProps) {
  const t = useTranslations("dashboard");
  return (
    <div className="space-y-4">
      <LabeledSelect
        id="notificationType"
        label="Type"
        value={settings.type || "info"}
        onValueChange={(value) => onSettingChange("type", value)}
        options={[
          { value: "info", label: "Info" },
          { value: "success", label: "Success" },
          { value: "warning", label: "Warning" },
          { value: "error", label: "Error" },
        ]}
      />
      <LabeledInput
        id="notificationTitle"
        label="Title"
        value={settings.title || ""}
        onChange={(e) => onSettingChange("title", e.target.value)}
        placeholder="Notification title"
      />
      <LabeledTextarea
        id="notificationMessage"
        label="Message"
        value={settings.message || ""}
        onChange={(e) => onSettingChange("message", e.target.value)}
        placeholder="Notification message"
        rows={3}
      />
      <div className="space-y-1">
        <Label className="text-xs font-medium">{t("Icon")}</Label>
        <IconPicker
          selectedIcon={settings.icon || "info"}
          onSelectIcon={(iconName) => onSettingChange("icon", iconName)}
        />
      </div>
      <LabeledSwitch
        id="allowDismiss"
        label="Allow Dismissing"
        checked={settings.allowDismiss !== false}
        onCheckedChange={(checked) => onSettingChange("allowDismiss", checked)}
      />
      <LabeledSwitch
        id="autoHide"
        label="Auto Hide"
        checked={settings.autoHide === true}
        onCheckedChange={(checked) => onSettingChange("autoHide", checked)}
      />
      {settings.autoHide && (
        <LabeledInput
          id="hideAfter"
          label="Hide After (seconds)"
          value={String(settings.hideAfter || 5)}
          onChange={(e) => onSettingChange("hideAfter", Number(e.target.value))}
        />
      )}
    </div>
  );
}
