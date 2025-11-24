"use client";

import { Label } from "@/components/ui/label";
import { SliderWithInput, LabeledSelect } from "../structure-tab/ui-components";
import { ColorPicker, GradientValue } from "@/components/ui/color-picker";
import { useToast } from "@/hooks/use-toast";
import type { BorderProps } from "./types";
import { useTranslations } from "next-intl";

export function Border({
  settings,
  onSettingChange,
  activeGradientProperty,
  setActiveGradientProperty,
}: BorderProps) {
  const t = useTranslations("dashboard");
  const { toast } = useToast();

  // Handle theme-aware color changes
  const handleBorderColorChange = (
    lightColor: string,
    darkColor: string,
    tailwindClass: string,
    isGradient = false,
    gradientValue: GradientValue | null = null
  ) => {
    if (isGradient && gradientValue) {
      // Check if another property already has a gradient
      if (
        activeGradientProperty &&
        activeGradientProperty !== "borderColor" &&
        activeGradientProperty !== "hoverBorderColor"
      ) {
        toast({
          title: "Gradient limitation",
          description: `You already have a gradient applied to ${activeGradientProperty}. Only one gradient can be used per property type.`,
          variant: "destructive",
        });
        return;
      }

      onSettingChange("borderColor", {
        type: "gradient",
        gradient: gradientValue,
      });
      setActiveGradientProperty("borderColor");

      // Also update hover border color to be a gradient if it exists
      if (settings.hoverBorderColor) {
        onSettingChange("hoverBorderColor", {
          type: "gradient",
          gradient: gradientValue,
        });
      }
    } else if (
      tailwindClass === "transparent" ||
      tailwindClass === "white" ||
      tailwindClass === "black"
    ) {
      onSettingChange("borderColor", {
        light: tailwindClass,
        dark: tailwindClass,
      });

      // Also update hover border color to match type if it exists
      if (
        settings.hoverBorderColor &&
        settings.hoverBorderColor.type === "gradient"
      ) {
        onSettingChange("hoverBorderColor", {
          light: tailwindClass,
          dark: tailwindClass,
        });
      }

      if (activeGradientProperty === "borderColor") {
        setActiveGradientProperty(null);
      }
    } else if (tailwindClass.includes("-")) {
      onSettingChange("borderColor", {
        light: tailwindClass,
        dark: darkColor,
      });

      // Also update hover border color to match type if it exists
      if (
        settings.hoverBorderColor &&
        settings.hoverBorderColor.type === "gradient"
      ) {
        onSettingChange("hoverBorderColor", {
          light: settings.hoverBorderColor.light || tailwindClass,
          dark: settings.hoverBorderColor.dark || darkColor,
        });
      }

      if (activeGradientProperty === "borderColor") {
        setActiveGradientProperty(null);
      }
    } else {
      onSettingChange("borderColor", {
        light: tailwindClass,
        dark: tailwindClass,
      });

      // Also update hover border color to match type if it exists
      if (
        settings.hoverBorderColor &&
        settings.hoverBorderColor.type === "gradient"
      ) {
        onSettingChange("hoverBorderColor", {
          light: tailwindClass,
          dark: tailwindClass,
        });
      }

      if (activeGradientProperty === "borderColor") {
        setActiveGradientProperty(null);
      }
    }
  };

  // Handle hover border color changes
  const handleHoverBorderColorChange = (
    lightColor: string,
    darkColor: string,
    tailwindClass: string,
    isGradient = false,
    gradientValue: GradientValue | null = null
  ) => {
    if (isGradient && gradientValue) {
      // Check if another property already has a gradient
      if (
        activeGradientProperty &&
        activeGradientProperty !== "hoverBorderColor" &&
        activeGradientProperty !== "borderColor"
      ) {
        toast({
          title: "Gradient limitation",
          description: `You already have a gradient applied to ${activeGradientProperty}. Only one gradient can be used per property type.`,
          variant: "destructive",
        });
        return;
      }

      onSettingChange("hoverBorderColor", {
        type: "gradient",
        gradient: gradientValue,
      });
      setActiveGradientProperty("hoverBorderColor");

      // Also update border color to be a gradient if it exists
      if (settings.borderColor) {
        onSettingChange("borderColor", {
          type: "gradient",
          gradient: gradientValue,
        });
      }
    } else if (
      tailwindClass === "transparent" ||
      tailwindClass === "white" ||
      tailwindClass === "black"
    ) {
      onSettingChange("hoverBorderColor", {
        light: tailwindClass,
        dark: tailwindClass,
      });

      // Also update border color to match type if it exists
      if (settings.borderColor && settings.borderColor.type === "gradient") {
        onSettingChange("borderColor", {
          light: tailwindClass,
          dark: tailwindClass,
        });
      }

      if (activeGradientProperty === "hoverBorderColor") {
        setActiveGradientProperty(null);
      }
    } else if (tailwindClass.includes("-")) {
      onSettingChange("hoverBorderColor", {
        light: tailwindClass,
        dark: darkColor,
      });

      // Also update border color to match type if it exists
      if (settings.borderColor && settings.borderColor.type === "gradient") {
        onSettingChange("borderColor", {
          light: settings.borderColor.light || tailwindClass,
          dark: settings.borderColor.dark || darkColor,
        });
      }

      if (activeGradientProperty === "hoverBorderColor") {
        setActiveGradientProperty(null);
      }
    } else {
      onSettingChange("hoverBorderColor", {
        light: tailwindClass,
        dark: tailwindClass,
      });

      // Also update border color to match type if it exists
      if (settings.borderColor && settings.borderColor.type === "gradient") {
        onSettingChange("borderColor", {
          light: tailwindClass,
          dark: tailwindClass,
        });
      }

      if (activeGradientProperty === "hoverBorderColor") {
        setActiveGradientProperty(null);
      }
    }
  };

  // Determine if a gradient is active on another property
  const hasGradient = activeGradientProperty !== null;
  const isBorderGradient =
    activeGradientProperty === "borderColor" ||
    activeGradientProperty === "hoverBorderColor";

  const borderPositions = ["Top", "Right", "Bottom", "Left"];

  return (
    <div className="space-y-4 max-w-full">
      {hasGradient && !isBorderGradient && (
        <div className="p-2 mb-2 bg-amber-50 border border-amber-200 rounded-md text-amber-800 text-xs">
          <p>
            {t("a_gradient_is_another_property")}.{" "}
            {t("border_color_gradients_are_disabled")}.
          </p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label className="text-xs mb-1 block">{t("Width")}</Label>
          <SliderWithInput
            value={settings.borderWidth || 0}
            onChange={(value) => onSettingChange("borderWidth", value)}
            min={0}
            max={10}
          />
        </div>
        <div>
          <Label className="text-xs mb-1 block">{t("Radius")}</Label>
          <SliderWithInput
            value={settings.borderRadius || 0}
            onChange={(value) => onSettingChange("borderRadius", value)}
            min={0}
            max={50}
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label className="text-xs mb-1 block">{t("Style")}</Label>
          <LabeledSelect
            id="borderStyle"
            label=""
            value={settings.borderStyle || "solid"}
            onValueChange={(value) => onSettingChange("borderStyle", value)}
            options={[
              { value: "solid", label: "Solid" },
              { value: "dashed", label: "Dashed" },
              { value: "dotted", label: "Dotted" },
              { value: "double", label: "Double" },
              { value: "none", label: "None" },
            ]}
            placeholder="Style"
            triggerClassName="h-7 text-xs"
          />
        </div>
      </div>

      <div>
        <ColorPicker
          label="Border Color"
          colorVariable="border-color"
          value={settings.borderColor}
          onChange={handleBorderColorChange}
          disabled={hasGradient && activeGradientProperty !== "borderColor"}
        />
      </div>

      <div>
        <ColorPicker
          label="Border Color"
          colorVariable="hover-border-color"
          value={settings.hoverBorderColor}
          onChange={handleHoverBorderColorChange}
          isHover={true}
          disabled={
            hasGradient &&
            activeGradientProperty !== "hoverBorderColor" &&
            activeGradientProperty !== "borderColor"
          }
        />
      </div>

      <div>
        <Label className="text-xs mb-1 block">{t("individual_borders")}</Label>
        <div className="grid grid-cols-4 gap-1">
          {borderPositions.map((pos) => (
            <div key={pos} className="flex flex-col items-center">
              <Label className="text-[10px] mb-1">{pos}</Label>
              <input
                type="checkbox"
                checked={settings[`border${pos}`] !== false}
                onChange={(e) =>
                  onSettingChange(`border${pos}`, e.target.checked)
                }
                className="h-4 w-4"
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
