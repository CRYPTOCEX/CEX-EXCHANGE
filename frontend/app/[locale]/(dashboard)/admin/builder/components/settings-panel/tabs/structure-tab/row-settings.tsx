"use client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Maximize, ArrowUp, ArrowDown, Move } from "lucide-react";
import { SliderWithInput } from "./ui-components";
import { useTranslations } from "next-intl";

interface RowSettingsProps {
  settings: any;
  handleSettingChange: (key: string, value: any) => void;
}

export const RowSettings = ({
  settings,
  handleSettingChange,
}: RowSettingsProps) => {
  const t = useTranslations("dashboard_admin");
  const tCommon = useTranslations("common");
  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <Label className="text-xs">{t("max_width")}</Label>
        <div className="flex">
          <div className="flex items-center justify-center bg-muted px-2 rounded-l-md border border-r-0 border-input">
            <Maximize className="h-3.5 w-3.5 text-muted-foreground" />
          </div>
          <Input
            value={settings?.maxWidth || ""}
            onChange={(e) => handleSettingChange("maxWidth", e.target.value)}
            placeholder={t("e_g_1200px_100_etc")}
            className="h-7 text-xs rounded-l-none"
          />
        </div>
      </div>

      <div className="space-y-1">
        <Label className="text-xs">{t("vertical_alignment")}</Label>
        <div className="grid grid-cols-3 gap-2">
          <Button
            variant={settings?.verticalAlign === "top" ? "default" : "outline"}
            size="sm"
            className="h-auto py-2 text-xs flex flex-col items-center gap-1"
            onClick={() => handleSettingChange("verticalAlign", "top")}
          >
            <ArrowUp className="h-3.5 w-3.5" />
            <span>{tCommon("top")}</span>
          </Button>
          <Button
            variant={
              settings?.verticalAlign === "middle" ? "default" : "outline"
            }
            size="sm"
            className="h-auto py-2 text-xs flex flex-col items-center gap-1"
            onClick={() => handleSettingChange("verticalAlign", "middle")}
          >
            <Move className="h-3.5 w-3.5" />
            <span>{t("middle")}</span>
          </Button>
          <Button
            variant={
              settings?.verticalAlign === "bottom" ? "default" : "outline"
            }
            size="sm"
            className="h-auto py-2 text-xs flex flex-col items-center gap-1"
            onClick={() => handleSettingChange("verticalAlign", "bottom")}
          >
            <ArrowDown className="h-3.5 w-3.5" />
            <span>{t("bottom")}</span>
          </Button>
        </div>
      </div>

      <div className="space-y-1">
        <Label className="text-xs">{t("gutter_size")}</Label>
        <SliderWithInput
          value={settings?.gutter || 0}
          onChange={(value) => handleSettingChange("gutter", value)}
          min={0}
          max={50}
          unit="px"
          tooltip={t("space_between_columns")}
        />
      </div>
    </div>
  );
};
