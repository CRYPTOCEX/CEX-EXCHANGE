"use client";

import { useTheme } from "next-themes";
import { ColorPicker } from "@/components/ui/color-picker";
import type { GradientValue } from "@/components/ui/color-picker";
import { useToast } from "@/hooks/use-toast";
import { type AppearanceProps, TEXT_ELEMENTS } from "./types";
import { useTranslations } from "next-intl";

export function Appearance({
  settings,
  onSettingChange,
  structureType,
  elementType,
  activeGradientProperty,
  setActiveGradientProperty,
}: AppearanceProps) {
  const t = useTranslations("dashboard");
  const { theme } = useTheme();
  const { toast } = useToast();

  // Determine which property has a gradient
  const hasGradient = activeGradientProperty !== null;
  const gradientPropertyName = activeGradientProperty
    ? activeGradientProperty === "backgroundColor"
      ? "Background Color"
      : activeGradientProperty === "color"
        ? "Text Color"
        : activeGradientProperty === "borderColor"
          ? "Border Color"
          : activeGradientProperty === "boxShadowColor"
            ? "Shadow Color"
            : activeGradientProperty === "hoverBackgroundColor"
              ? "Hover Background Color"
              : activeGradientProperty === "hoverColor"
                ? "Hover Text Color"
                : activeGradientProperty === "hoverBorderColor"
                  ? "Hover Border Color"
                  : "a property"
    : "";

  const isTextElement =
    !structureType && elementType && TEXT_ELEMENTS.includes(elementType);

  // Update the handleBackgroundColorChange function to ensure hover color type consistency

  const handleBackgroundColorChange = (
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
        activeGradientProperty !== "backgroundColor" &&
        activeGradientProperty !== "hoverBackgroundColor"
      ) {
        toast({
          title: "Gradient limitation",
          description: `You already have a gradient applied to ${activeGradientProperty}. Only one gradient can be used per property type.`,
          variant: "destructive",
        });
        return;
      }

      // For gradients, store the gradient value
      onSettingChange("backgroundColor", {
        type: "gradient",
        gradient: gradientValue,
      });
      setActiveGradientProperty("backgroundColor");

      // Also update hover background color to be a gradient if it exists
      if (settings.hoverBackgroundColor) {
        onSettingChange("hoverBackgroundColor", {
          type: "gradient",
          gradient: gradientValue,
        });
      }
    }
    // For special colors like transparent, white, black, remain the same
    else if (
      tailwindClass === "transparent" ||
      tailwindClass === "white" ||
      tailwindClass === "black"
    ) {
      onSettingChange("backgroundColor", {
        light: tailwindClass,
        dark: tailwindClass,
      });

      // Also update hover background color to match type if it exists
      if (
        settings.hoverBackgroundColor &&
        settings.hoverBackgroundColor.type === "gradient"
      ) {
        onSettingChange("hoverBackgroundColor", {
          light: tailwindClass,
          dark: tailwindClass,
        });
      }

      if (activeGradientProperty === "backgroundColor") {
        setActiveGradientProperty(null);
      }
    }
    // For Tailwind classes, use the provided light and dark colors
    else if (tailwindClass.includes("-")) {
      onSettingChange("backgroundColor", {
        light: tailwindClass,
        dark: darkColor,
      });

      // Also update hover background color to match type if it exists
      if (
        settings.hoverBackgroundColor &&
        settings.hoverBackgroundColor.type === "gradient"
      ) {
        onSettingChange("hoverBackgroundColor", {
          light: settings.hoverBackgroundColor.light || tailwindClass,
          dark: settings.hoverBackgroundColor.dark || darkColor,
        });
      }

      if (activeGradientProperty === "backgroundColor") {
        setActiveGradientProperty(null);
      }
    }
    // For hex values or other formats fallback
    else {
      onSettingChange("backgroundColor", {
        light: tailwindClass,
        dark: tailwindClass,
      });

      // Also update hover background color to match type if it exists
      if (
        settings.hoverBackgroundColor &&
        settings.hoverBackgroundColor.type === "gradient"
      ) {
        onSettingChange("hoverBackgroundColor", {
          light: tailwindClass,
          dark: tailwindClass,
        });
      }

      if (activeGradientProperty === "backgroundColor") {
        setActiveGradientProperty(null);
      }
    }
  };

  // Update the handleHoverBackgroundColorChange function to ensure color type consistency

  const handleHoverBackgroundColorChange = (
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
        activeGradientProperty !== "hoverBackgroundColor" &&
        activeGradientProperty !== "backgroundColor"
      ) {
        toast({
          title: "Gradient limitation",
          description: `You already have a gradient applied to ${activeGradientProperty}. Only one gradient can be used per property type.`,
          variant: "destructive",
        });
        return;
      }

      onSettingChange("hoverBackgroundColor", {
        type: "gradient",
        gradient: gradientValue,
      });
      setActiveGradientProperty("hoverBackgroundColor");

      // Also update background color to be a gradient if it exists
      if (settings.backgroundColor) {
        onSettingChange("backgroundColor", {
          type: "gradient",
          gradient: gradientValue,
        });
      }
    } else if (
      tailwindClass === "transparent" ||
      tailwindClass === "white" ||
      tailwindClass === "black"
    ) {
      onSettingChange("hoverBackgroundColor", {
        light: tailwindClass,
        dark: tailwindClass,
      });

      // Also update background color to match type if it exists
      if (
        settings.backgroundColor &&
        settings.backgroundColor.type === "gradient"
      ) {
        onSettingChange("backgroundColor", {
          light: tailwindClass,
          dark: tailwindClass,
        });
      }

      if (activeGradientProperty === "hoverBackgroundColor") {
        setActiveGradientProperty(null);
      }
    } else if (tailwindClass.includes("-")) {
      onSettingChange("hoverBackgroundColor", {
        light: tailwindClass,
        dark: darkColor,
      });

      // Also update background color to match type if it exists
      if (
        settings.backgroundColor &&
        settings.backgroundColor.type === "gradient"
      ) {
        onSettingChange("backgroundColor", {
          light: settings.backgroundColor.light || tailwindClass,
          dark: settings.backgroundColor.dark || darkColor,
        });
      }

      if (activeGradientProperty === "hoverBackgroundColor") {
        setActiveGradientProperty(null);
      }
    } else {
      onSettingChange("hoverBackgroundColor", {
        light: tailwindClass,
        dark: tailwindClass,
      });

      // Also update background color to match type if it exists
      if (
        settings.backgroundColor &&
        settings.backgroundColor.type === "gradient"
      ) {
        onSettingChange("backgroundColor", {
          light: tailwindClass,
          dark: tailwindClass,
        });
      }

      if (activeGradientProperty === "hoverBackgroundColor") {
        setActiveGradientProperty(null);
      }
    }
  };

  // Update the handleTextColorChange function to ensure hover color type consistency

  const handleTextColorChange = (
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
        activeGradientProperty !== "color" &&
        activeGradientProperty !== "hoverColor"
      ) {
        toast({
          title: "Gradient limitation",
          description: `You already have a gradient applied to ${activeGradientProperty}. Only one gradient can be used per property type.`,
          variant: "destructive",
        });
        return;
      }

      // For gradients, store the gradient value
      onSettingChange("color", {
        type: "gradient",
        gradient: gradientValue,
      });
      setActiveGradientProperty("color");

      // Also update hover text color to be a gradient if it exists
      if (settings.hoverColor) {
        onSettingChange("hoverColor", {
          type: "gradient",
          gradient: gradientValue,
        });
      }
    }
    // For special colors like transparent, white, black, remain unchanged
    else if (
      tailwindClass === "transparent" ||
      tailwindClass === "white" ||
      tailwindClass === "black"
    ) {
      onSettingChange("color", { light: tailwindClass, dark: tailwindClass });

      // Also update hover text color to match type if it exists
      if (settings.hoverColor && settings.hoverColor.type === "gradient") {
        onSettingChange("hoverColor", {
          light: tailwindClass,
          dark: tailwindClass,
        });
      }

      if (activeGradientProperty === "color") {
        setActiveGradientProperty(null);
      }
    }
    // For Tailwind classes, use the provided light and dark colors
    else if (tailwindClass.includes("-")) {
      onSettingChange("color", {
        light: tailwindClass,
        dark: darkColor,
      });

      // Also update hover text color to match type if it exists
      if (settings.hoverColor && settings.hoverColor.type === "gradient") {
        onSettingChange("hoverColor", {
          light: settings.hoverColor.light || tailwindClass,
          dark: settings.hoverColor.dark || darkColor,
        });
      }

      if (activeGradientProperty === "color") {
        setActiveGradientProperty(null);
      }
    }
    // For other formats (hex etc.)
    else {
      onSettingChange("color", { light: tailwindClass, dark: tailwindClass });

      // Also update hover text color to match type if it exists
      if (settings.hoverColor && settings.hoverColor.type === "gradient") {
        onSettingChange("hoverColor", {
          light: tailwindClass,
          dark: tailwindClass,
        });
      }

      if (activeGradientProperty === "color") {
        setActiveGradientProperty(null);
      }
    }
  };

  // Update the handleHoverTextColorChange function to ensure color type consistency

  const handleHoverTextColorChange = (
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
        activeGradientProperty !== "hoverColor" &&
        activeGradientProperty !== "color"
      ) {
        toast({
          title: "Gradient limitation",
          description: `You already have a gradient applied to ${activeGradientProperty}. Only one gradient can be used per property type.`,
          variant: "destructive",
        });
        return;
      }

      onSettingChange("hoverColor", {
        type: "gradient",
        gradient: gradientValue,
      });
      setActiveGradientProperty("hoverColor");

      // Also update text color to be a gradient if it exists
      if (settings.color) {
        onSettingChange("color", {
          type: "gradient",
          gradient: gradientValue,
        });
      }
    } else if (
      tailwindClass === "transparent" ||
      tailwindClass === "white" ||
      tailwindClass === "black"
    ) {
      onSettingChange("hoverColor", {
        light: tailwindClass,
        dark: tailwindClass,
      });

      // Also update text color to match type if it exists
      if (settings.color && settings.color.type === "gradient") {
        onSettingChange("color", {
          light: tailwindClass,
          dark: tailwindClass,
        });
      }

      if (activeGradientProperty === "hoverColor") {
        setActiveGradientProperty(null);
      }
    } else if (tailwindClass.includes("-")) {
      onSettingChange("hoverColor", {
        light: tailwindClass,
        dark: darkColor,
      });

      // Also update text color to match type if it exists
      if (settings.color && settings.color.type === "gradient") {
        onSettingChange("color", {
          light: settings.color.light || tailwindClass,
          dark: settings.color.dark || darkColor,
        });
      }

      if (activeGradientProperty === "hoverColor") {
        setActiveGradientProperty(null);
      }
    } else {
      onSettingChange("hoverColor", {
        light: tailwindClass,
        dark: tailwindClass,
      });

      // Also update text color to match type if it exists
      if (settings.color && settings.color.type === "gradient") {
        onSettingChange("color", {
          light: tailwindClass,
          dark: tailwindClass,
        });
      }

      if (activeGradientProperty === "hoverColor") {
        setActiveGradientProperty(null);
      }
    }
  };

  // Determine if text color should be shown based on element type
  // Text color should be shown for text-based elements, not for structure types
  const showTextColor =
    !structureType && elementType && TEXT_ELEMENTS.includes(elementType);

  const canChangeBackgroundColor = true;
  const canChangeTextColor = true;

  return (
    <div className="space-y-4 max-w-full">
      {hasGradient && (
        <div className="p-2 mb-2 bg-amber-50 border border-amber-200 rounded-md text-amber-800 text-xs">
          <p>
            {t("a_gradient_is_currently_applied_to")}
            <strong>{gradientPropertyName}</strong>
            {t("you_can_only_type_(e")}. {'g'}.{" "}
            {t("text_color_background_color)")}.
          </p>
        </div>
      )}

      <div>
        <ColorPicker
          label="Background Color"
          colorVariable="background-color"
          value={settings.backgroundColor}
          onChange={handleBackgroundColorChange}
          disabled={hasGradient && activeGradientProperty !== "backgroundColor"}
        />
      </div>

      <div>
        <ColorPicker
          label="Background Color"
          colorVariable="hover-background-color"
          value={settings.hoverBackgroundColor}
          onChange={handleHoverBackgroundColorChange}
          isHover={true}
          disabled={
            hasGradient &&
            activeGradientProperty !== "hoverBackgroundColor" &&
            activeGradientProperty !== "backgroundColor"
          }
        />
      </div>

      {showTextColor && (
        <>
          <div>
            <ColorPicker
              label="Text Color"
              colorVariable="text-color"
              value={settings.color}
              onChange={handleTextColorChange}
              disabled={hasGradient && activeGradientProperty !== "color"}
            />
          </div>

          <div>
            <ColorPicker
              label="Text Color"
              colorVariable="hover-text-color"
              value={settings.hoverColor}
              onChange={handleHoverTextColorChange}
              isHover={true}
              disabled={
                hasGradient &&
                activeGradientProperty !== "hoverColor" &&
                activeGradientProperty !== "color"
              }
            />
          </div>
        </>
      )}
    </div>
  );
}
