"use client";

import { Label } from "@/components/ui/label";
import { SliderWithInput } from "../structure-tab/ui-components";
import { ColorPicker, GradientValue } from "@/components/ui/color-picker";
import { useTheme } from "next-themes";
import { useToast } from "@/hooks/use-toast";
import type { BoxShadowProps } from "./types";
import { useTranslations } from "next-intl";

export function BoxShadow({
  settings,
  onSettingChange,
  activeGradientProperty,
  setActiveGradientProperty,
}: BoxShadowProps) {
  const t = useTranslations("dashboard");
  const { theme } = useTheme();
  const { toast } = useToast();

  // Handle theme-aware color changes
  const handleShadowColorChange = (
    lightColor: string,
    darkColor: string,
    tailwindClass: string,
    isGradient = false,
    gradientValue?: GradientValue | null
  ) => {
    if (isGradient && gradientValue) {
      // Check if another property already has a gradient
      if (
        activeGradientProperty &&
        activeGradientProperty !== "boxShadowColor"
      ) {
        toast({
          title: "Gradient limitation",
          description: `You already have a gradient applied to ${activeGradientProperty}. Only one gradient can be used per property type.`,
          variant: "destructive",
        });
        return;
      }

      // For gradients, store the gradient value
      onSettingChange("boxShadowColor", {
        type: "gradient",
        gradient: gradientValue,
      });
      setActiveGradientProperty("boxShadowColor");
    }
    // For special colors like transparent, white, black, remain the same
    else if (
      tailwindClass === "transparent" ||
      tailwindClass === "white" ||
      tailwindClass === "black"
    ) {
      onSettingChange("boxShadowColor", {
        light: tailwindClass,
        dark: tailwindClass,
      });
      if (activeGradientProperty === "boxShadowColor") {
        setActiveGradientProperty(null);
      }
    }
    // For Tailwind classes, use the provided light and dark colors
    else if (tailwindClass.includes("-")) {
      onSettingChange("boxShadowColor", {
        light: tailwindClass,
        dark: darkColor,
      });
      if (activeGradientProperty === "boxShadowColor") {
        setActiveGradientProperty(null);
      }
    }
    // For hex values or other formats fallback
    else {
      onSettingChange("boxShadowColor", {
        light: tailwindClass,
        dark: tailwindClass,
      });
      if (activeGradientProperty === "boxShadowColor") {
        setActiveGradientProperty(null);
      }
    }
  };

  // Determine if a gradient is active on another property
  const hasGradient = activeGradientProperty !== null;
  const isShadowGradient = activeGradientProperty === "boxShadowColor";

  return (
    <div className="space-y-2 max-w-full">
      {hasGradient && !isShadowGradient && (
        <div className="p-2 mb-2 bg-amber-50 border border-amber-200 rounded-md text-amber-800 text-xs">
          <p>
            {t("a_gradient_is_another_property")}.{" "}
            {t("shadow_color_gradients_are_disabled")}.
          </p>
        </div>
      )}

      <div>
        <ColorPicker
          label="Shadow Color"
          colorVariable="shadow-color"
          value={
            typeof settings.boxShadowColor === "object"
              ? settings.boxShadowColor.light
              : settings.boxShadowColor
          }
          onChange={handleShadowColorChange}
          disabled={hasGradient && activeGradientProperty !== "boxShadowColor"}
        />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label className="text-xs mb-1 block">{t("Horizontal")}</Label>
          <SliderWithInput
            value={settings.boxShadowX || 0}
            onChange={(value) => onSettingChange("boxShadowX", value)}
            min={-50}
            max={50}
          />
        </div>
        <div>
          <Label className="text-xs mb-1 block">{t("Vertical")}</Label>
          <SliderWithInput
            value={settings.boxShadowY || 0}
            onChange={(value) => onSettingChange("boxShadowY", value)}
            min={-50}
            max={50}
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label className="text-xs mb-1 block">{t("Blur")}</Label>
          <SliderWithInput
            value={settings.boxShadowBlur || 0}
            onChange={(value) => onSettingChange("boxShadowBlur", value)}
            min={0}
            max={100}
          />
        </div>
        <div>
          <Label className="text-xs mb-1 block">{t("Spread")}</Label>
          <SliderWithInput
            value={settings.boxShadowSpread || 0}
            onChange={(value) => onSettingChange("boxShadowSpread", value)}
            min={-50}
            max={50}
          />
        </div>
      </div>
      <div className="flex items-center space-x-2">
        <input
          type="checkbox"
          id="inset"
          checked={settings.boxShadowInset || false}
          onChange={(e) => onSettingChange("boxShadowInset", e.target.checked)}
          className="h-4 w-4"
        />
        <Label htmlFor="inset" className="text-xs">
          {t("inset_shadow")}
        </Label>
      </div>
      <div className="mt-1 p-2 border rounded-md bg-gray-50 flex justify-center">
        <div
          className="h-10 w-full bg-white rounded-md"
          style={{
            boxShadow: `${
              settings.boxShadowInset ? "inset " : ""
            }${settings.boxShadowX || 0}px ${settings.boxShadowY || 0}px ${settings.boxShadowBlur || 0}px ${
              settings.boxShadowSpread || 0
            }px ${typeof settings.boxShadowColor === "object" ? settings.boxShadowColor.light : settings.boxShadowColor}`,
          }}
        />
      </div>
    </div>
  );
}
