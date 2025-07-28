"use client";
import type { Element } from "@/types/builder";
import { settingsMap } from "./settings-map";
import { useTranslations } from "next-intl";

interface ContentTabProps {
  element: Element | null;
  settings: Record<string, any>;
  onSettingChange: (key: string, value: any) => void;
  onElementUpdate: (updatedElement: Element) => void;
}

export default function ContentTab({
  element,
  settings,
  onSettingChange,
  onElementUpdate,
}: ContentTabProps) {
  const t = useTranslations("dashboard");
  // If no element is selected, show a message
  if (!element) {
    return (
      <div className="p-4 text-sm text-muted-foreground">
        {t("no_element_selected_or_element_data_is_unavailable")}.
      </div>
    );
  }

  const SettingsComponent = element.type ? settingsMap[element.type] : null;

  return SettingsComponent ? (
    <div className="p-4">
      <SettingsComponent
        element={element}
        settings={settings}
        onSettingChange={onSettingChange}
        onElementUpdate={onElementUpdate}
      />
    </div>
  ) : (
    <div className="py-4 text-sm text-muted-foreground">
      {t("no_settings_available_for_this_element_type")}.
    </div>
  );
}
