"use client";

import { Label } from "@/components/ui/label";
import { SliderWithInput } from "../structure-tab/ui-components";
import type { FiltersProps } from "./types";
import { useTranslations } from "next-intl";

export function Filters({ settings, onSettingChange }: FiltersProps) {
  const t = useTranslations("dashboard");
  return (
    <div className="space-y-2 max-w-full">
      <div>
        <Label className="text-xs mb-1 block">{t("Opacity")}</Label>
        <SliderWithInput
          value={settings.opacity !== undefined ? settings.opacity * 100 : 100}
          onChange={(value) => onSettingChange("opacity", value / 100)}
          min={0}
          max={100}
          unit="%"
        />
      </div>
      <div>
        <Label className="text-xs mb-1 block">{t("Blur")}</Label>
        <SliderWithInput
          value={settings.blur || 0}
          onChange={(value) => onSettingChange("blur", value)}
          min={0}
          max={20}
          step={0.1}
        />
      </div>
      <div>
        <Label className="text-xs mb-1 block">{t("Brightness")}</Label>
        <SliderWithInput
          value={
            settings.brightness !== undefined ? settings.brightness * 100 : 100
          }
          onChange={(value) => onSettingChange("brightness", value / 100)}
          min={0}
          max={200}
          unit="%"
        />
      </div>
      <div>
        <Label className="text-xs mb-1 block">{t("Contrast")}</Label>
        <SliderWithInput
          value={
            settings.contrast !== undefined ? settings.contrast * 100 : 100
          }
          onChange={(value) => onSettingChange("contrast", value / 100)}
          min={0}
          max={200}
          unit="%"
        />
      </div>
      <div>
        <Label className="text-xs mb-1 block">{t("Grayscale")}</Label>
        <SliderWithInput
          value={settings.grayscale || 0}
          onChange={(value) => onSettingChange("grayscale", value)}
          min={0}
          max={100}
          unit="%"
        />
      </div>
      <div className="mt-1 p-2 border rounded-md bg-gray-50 flex justify-center">
        <div
          className="h-10 w-10 bg-purple-500 rounded-md"
          style={{
            filter: `
             opacity(${settings.opacity !== undefined ? settings.opacity : 1})
             blur(${settings.blur || 0}px)
             brightness(${settings.brightness !== undefined ? settings.brightness : 1})
             contrast(${settings.contrast !== undefined ? settings.contrast : 1})
             grayscale(${settings.grayscale || 0}%)
           `,
          }}
        />
      </div>
    </div>
  );
}
