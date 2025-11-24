"use client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  LayoutTemplate,
  LayoutList,
  Maximize2,
  Monitor,
  Tablet,
  Smartphone,
} from "lucide-react";
import type { Section } from "@/types/builder";
import { useBuilderStore } from "@/store/builder-store";
import { useTranslations } from "next-intl";

interface SectionSettingsProps {
  section: Section;
  settings: any;
  handleSettingChange: (key: string, value: any) => void;
}

export const SectionSettings = ({
  section,
  settings,
  handleSettingChange,
}: SectionSettingsProps) => {
  const t = useTranslations("dashboard");
  const { updateSection } = useBuilderStore();

  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <Label className="text-xs">{t("section_type")}</Label>
        <div className="grid grid-cols-3 gap-2">
          <Button
            variant={section.type === "regular" ? "default" : "outline"}
            size="sm"
            className="h-auto py-2 text-xs flex flex-col items-center gap-1"
            onClick={() =>
              updateSection(section.id, { ...section, type: "regular" })
            }
          >
            <LayoutTemplate className="h-4 w-4" />
            <span>{t("Regular")}</span>
          </Button>
          <Button
            variant={section.type === "specialty" ? "default" : "outline"}
            size="sm"
            className="h-auto py-2 text-xs flex flex-col items-center gap-1"
            onClick={() =>
              updateSection(section.id, { ...section, type: "specialty" })
            }
          >
            <LayoutList className="h-4 w-4" />
            <span>{t("Specialty")}</span>
          </Button>
          <Button
            variant={section.type === "fullwidth" ? "default" : "outline"}
            size="sm"
            className="h-auto py-2 text-xs flex flex-col items-center gap-1"
            onClick={() =>
              updateSection(section.id, { ...section, type: "fullwidth" })
            }
          >
            <Maximize2 className="h-4 w-4" />
            <span>{t("Fullwidth")}</span>
          </Button>
        </div>
      </div>

      <div className="space-y-1">
        <Label className="text-xs">{t("responsive_visibility")}</Label>
        <div className="flex gap-2">
          <Button
            variant={settings.visibleDesktop !== false ? "default" : "outline"}
            size="sm"
            className="flex-1 h-7 text-xs flex items-center gap-1"
            onClick={() =>
              handleSettingChange(
                "visibleDesktop",
                settings.visibleDesktop === false ? true : false
              )
            }
          >
            <Monitor className="h-3.5 w-3.5" />
            <span>{t("Desktop")}</span>
          </Button>
          <Button
            variant={settings.visibleTablet !== false ? "default" : "outline"}
            size="sm"
            className="flex-1 h-7 text-xs flex items-center gap-1"
            onClick={() =>
              handleSettingChange(
                "visibleTablet",
                settings.visibleTablet === false ? true : false
              )
            }
          >
            <Tablet className="h-3.5 w-3.5" />
            <span>{t("Tablet")}</span>
          </Button>
          <Button
            variant={settings.visibleMobile !== false ? "default" : "outline"}
            size="sm"
            className="flex-1 h-7 text-xs flex items-center gap-1"
            onClick={() =>
              handleSettingChange(
                "visibleMobile",
                settings.visibleMobile === false ? true : false
              )
            }
          >
            <Smartphone className="h-3.5 w-3.5" />
            <span>{t("Mobile")}</span>
          </Button>
        </div>
      </div>
    </div>
  );
};
