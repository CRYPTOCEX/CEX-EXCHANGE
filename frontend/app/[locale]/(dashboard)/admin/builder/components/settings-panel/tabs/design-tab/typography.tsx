"use client";

import { Label } from "@/components/ui/label";
import { SliderWithInput, LabeledSelect } from "../structure-tab/ui-components";
import type { TypographyProps } from "./types";
import { useTranslations } from "next-intl";

export function Typography({ settings, onSettingChange }: TypographyProps) {
  const t = useTranslations("dashboard");
  return (
    <div className="space-y-2 max-w-full">
      <div>
        <Label className="text-xs mb-1 block">{t("font_size")}</Label>
        <SliderWithInput
          value={settings.fontSize || 16}
          onChange={(value) => onSettingChange("fontSize", value)}
          min={8}
          max={48}
          unit="px"
        />
      </div>
      <div>
        <Label className="text-xs mb-1 block">{t("line_height")}</Label>
        <SliderWithInput
          value={settings.lineHeight || 1.5}
          onChange={(value) => onSettingChange("lineHeight", value)}
          min={1}
          max={3}
          step={0.1}
        />
      </div>
      <div>
        <Label className="text-xs mb-1 block">{t("letter_spacing")}</Label>
        <SliderWithInput
          value={settings.letterSpacing || 0}
          onChange={(value) => onSettingChange("letterSpacing", value)}
          min={-2}
          max={5}
          step={0.1}
          unit="px"
        />
      </div>
      <div>
        <Label className="text-xs mb-1 block">{t("font_weight")}</Label>
        <LabeledSelect
          id="fontWeight"
          label=""
          value={settings.fontWeight || "normal"}
          onValueChange={(value) => onSettingChange("fontWeight", value)}
          options={[
            { value: "normal", label: "Normal" },
            { value: "bold", label: "Bold" },
            { value: "lighter", label: "Lighter" },
            { value: "bolder", label: "Bolder" },
            { value: "100", label: "100" },
            { value: "200", label: "200" },
            { value: "300", label: "300" },
            { value: "400", label: "400" },
            { value: "500", label: "500" },
            { value: "600", label: "600" },
            { value: "700", label: "700" },
            { value: "800", label: "800" },
            { value: "900", label: "900" },
          ]}
          placeholder="Weight"
          triggerClassName="h-7 text-xs"
        />
      </div>
      <div>
        <Label className="text-xs mb-1 block">{t("text_transform")}</Label>
        <LabeledSelect
          id="textTransform"
          label=""
          value={settings.textTransform || "none"}
          onValueChange={(value) => onSettingChange("textTransform", value)}
          options={[
            { value: "none", label: "None" },
            { value: "uppercase", label: "Uppercase" },
            { value: "lowercase", label: "Lowercase" },
            { value: "capitalize", label: "Capitalize" },
          ]}
          placeholder="Transform"
          triggerClassName="h-7 text-xs"
        />
      </div>
      <div>
        <Label className="text-xs mb-1 block">{t("font_style")}</Label>
        <LabeledSelect
          id="fontStyle"
          label=""
          value={settings.fontStyle || "normal"}
          onValueChange={(value) => onSettingChange("fontStyle", value)}
          options={[
            { value: "normal", label: "Normal" },
            { value: "italic", label: "Italic" },
            { value: "oblique", label: "Oblique" },
          ]}
          placeholder="Style"
          triggerClassName="h-7 text-xs"
        />
      </div>
    </div>
  );
}
