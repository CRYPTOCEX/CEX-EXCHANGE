"use client";

import { Label } from "@/components/ui/label";
import { SliderWithInput } from "../structure-tab/ui-components";
import type { TransformProps } from "./types";
import { useTranslations } from "next-intl";

export function Transform({ settings, onSettingChange }: TransformProps) {
  const t = useTranslations("dashboard");
  return (
    <div className="space-y-2 max-w-full">
      <div>
        <Label className="text-xs mb-1 block">{t("Rotate")}</Label>
        <SliderWithInput
          value={settings.rotate || 0}
          onChange={(value) => onSettingChange("rotate", value)}
          min={-180}
          max={180}
          unit="deg"
        />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label className="text-xs mb-1 block">{t("scale_x")}</Label>
          <SliderWithInput
            value={settings.scaleX || 1}
            onChange={(value) => onSettingChange("scaleX", value)}
            min={0}
            max={2}
            step={0.1}
            unit="×"
          />
        </div>
        <div>
          <Label className="text-xs mb-1 block">{t("scale_y")}</Label>
          <SliderWithInput
            value={settings.scaleY || 1}
            onChange={(value) => onSettingChange("scaleY", value)}
            min={0}
            max={2}
            step={0.1}
            unit="×"
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label className="text-xs mb-1 block">{t("translate_x")}</Label>
          <SliderWithInput
            value={settings.translateX || 0}
            onChange={(value) => onSettingChange("translateX", value)}
            min={-100}
            max={100}
          />
        </div>
        <div>
          <Label className="text-xs mb-1 block">{t("translate_y")}</Label>
          <SliderWithInput
            value={settings.translateY || 0}
            onChange={(value) => onSettingChange("translateY", value)}
            min={-100}
            max={100}
          />
        </div>
      </div>
      <div>
        <Label className="text-xs mb-1 block">{t("Skew")}</Label>
        <div className="grid grid-cols-2 gap-2">
          <SliderWithInput
            value={settings.skewX || 0}
            onChange={(value) => onSettingChange("skewX", value)}
            min={-45}
            max={45}
            unit="deg"
          />
          <SliderWithInput
            value={settings.skewY || 0}
            onChange={(value) => onSettingChange("skewY", value)}
            min={-45}
            max={45}
            unit="deg"
          />
        </div>
      </div>
      <div className="mt-1 p-2 border rounded-md bg-gray-50 flex justify-center">
        <div
          className="h-10 w-10 bg-purple-500 rounded-md"
          style={{
            transform: `
             rotate(${settings.rotate || 0}deg)
             scaleX(${settings.scaleX || 1})
             scaleY(${settings.scaleY || 1})
             translateX(${settings.translateX || 0}px)
             translateY(${settings.translateY || 0}px)
             skewX(${settings.skewX || 0}deg)
             skewY(${settings.skewY || 0}deg)
           `,
          }}
        />
      </div>
    </div>
  );
}
