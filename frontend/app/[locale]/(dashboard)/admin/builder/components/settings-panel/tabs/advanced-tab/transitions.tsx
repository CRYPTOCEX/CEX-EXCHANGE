"use client";

import type React from "react";

import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  LabeledSelect,
  SliderWithInput,
  LabeledInput,
} from "../structure-tab/ui-components";
import type { ComponentProps } from "./types";
import { useTranslations } from "next-intl";

export function Transitions({ settings, onSettingChange }: ComponentProps) {
  const t = useTranslations("dashboard");
  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <Label className="text-xs">{t("transition_property")}</Label>
        <LabeledSelect
          id="transitionProperty"
          label=""
          value={settings.transitionProperty || "all"}
          onValueChange={(value) =>
            onSettingChange("transitionProperty", value)
          }
          options={[
            { value: "all", label: "All Properties" },
            { value: "transform", label: "Transform Only" },
            { value: "opacity", label: "Opacity Only" },
            { value: "background", label: "Background Only" },
            { value: "custom", label: "Custom" },
          ]}
          placeholder="Select property"
        />
      </div>
      {settings.transitionProperty === "custom" && (
        <div className="space-y-1">
          <Label className="text-xs">{t("custom_properties")}</Label>
          <LabeledInput
            id="custom-properties"
            label=""
            value={settings.transitionCustomProperty || ""}
            onChange={(e) =>
              onSettingChange("transitionCustomProperty", e.target.value)
            }
            placeholder="opacity, transform, background"
          />
          <p className="text-xs text-muted-foreground mt-1">
            {t("comma-separated_list_of_css_properties")}
          </p>
        </div>
      )}
      <div className="space-y-1">
        <Label className="text-xs">{t("Duration")}</Label>
        <SliderWithInput
          value={settings.transitionDuration || 0.3}
          onChange={(value) => onSettingChange("transitionDuration", value)}
          min={0}
          max={5}
          step={0.1}
          unit="s"
        />
      </div>
      <div className="space-y-1">
        <Label className="text-xs">{t("timing_function")}</Label>
        <LabeledSelect
          id="transitionTimingFunction"
          label=""
          value={settings.transitionTimingFunction || "ease"}
          onValueChange={(value) =>
            onSettingChange("transitionTimingFunction", value)
          }
          options={[
            { value: "ease", label: "Ease" },
            { value: "linear", label: "Linear" },
            { value: "ease-in", label: "Ease In" },
            { value: "ease-out", label: "Ease Out" },
            { value: "ease-in-out", label: "Ease In Out" },
            {
              value: "cubic-bezier(0.175, 0.885, 0.32, 1.275)",
              label: "Bounce Out",
            },
            {
              value: "cubic-bezier(0.68, -0.55, 0.265, 1.55)",
              label: "Spring",
            },
          ]}
          placeholder="Select timing"
        />
      </div>
      <div className="space-y-1">
        <Label className="text-xs">{t("Delay")}</Label>
        <SliderWithInput
          value={settings.transitionDelay || 0}
          onChange={(value) => onSettingChange("transitionDelay", value)}
          min={0}
          max={5}
          step={0.1}
          unit="s"
        />
      </div>

      <div className="pt-3 border-t mt-3">
        <Label className="text-xs font-medium">{t("hover_effects")}</Label>
        <div className="grid grid-cols-2 gap-2 mt-2">
          <Button
            variant={settings.hoverEffect === "elevate" ? "default" : "outline"}
            size="sm"
            className="h-auto py-2 justify-start"
            onClick={() =>
              onSettingChange(
                "hoverEffect",
                settings.hoverEffect === "elevate" ? null : "elevate"
              )
            }
          >
            <div className="flex flex-col items-start text-left">
              <span className="text-xs">{t("Elevate")}</span>
              <span className="text-[10px] text-muted-foreground">
                {t("lift_on_hover")}
              </span>
            </div>
          </Button>
          <Button
            variant={settings.hoverEffect === "scale" ? "default" : "outline"}
            size="sm"
            className="h-auto py-2 justify-start"
            onClick={() =>
              onSettingChange(
                "hoverEffect",
                settings.hoverEffect === "scale" ? null : "scale"
              )
            }
          >
            <div className="flex flex-col items-start text-left">
              <span className="text-xs">{t("Scale")}</span>
              <span className="text-[10px] text-muted-foreground">
                {t("grow_on_hover")}
              </span>
            </div>
          </Button>
          <Button
            variant={settings.hoverEffect === "glow" ? "default" : "outline"}
            size="sm"
            className="h-auto py-2 justify-start"
            onClick={() =>
              onSettingChange(
                "hoverEffect",
                settings.hoverEffect === "glow" ? null : "glow"
              )
            }
          >
            <div className="flex flex-col items-start text-left">
              <span className="text-xs">{t("Glow")}</span>
              <span className="text-[10px] text-muted-foreground">
                {t("add_shadow")}
              </span>
            </div>
          </Button>
          <Button
            variant={settings.hoverEffect === "tilt" ? "default" : "outline"}
            size="sm"
            className="h-auto py-2 justify-start"
            onClick={() =>
              onSettingChange(
                "hoverEffect",
                settings.hoverEffect === "tilt" ? null : "tilt"
              )
            }
          >
            <div className="flex flex-col items-start text-left">
              <span className="text-xs">{t("Tilt")}</span>
              <span className="text-[10px] text-muted-foreground">
                {t("3d_rotation")}
              </span>
            </div>
          </Button>
        </div>

        {settings.hoverEffect && (
          <div className="mt-3 space-y-3">
            <div className="space-y-1">
              <Label className="text-xs">{t("effect_intensity")}</Label>
              <SliderWithInput
                value={settings.hoverEffectIntensity || 1}
                onChange={(value) =>
                  onSettingChange("hoverEffectIntensity", value)
                }
                min={0.1}
                max={3}
                step={0.1}
                unit="×"
              />
            </div>
          </div>
        )}
      </div>

      <div className="mt-2 p-3 border rounded-md bg-gray-50 flex justify-center items-center h-16">
        <div
          className={`h-8 w-8 bg-purple-500 rounded-md ${settings.hoverEffect ? "hover-preview" : ""}`}
          style={
            {
              transitionProperty:
                settings.transitionProperty === "custom"
                  ? settings.transitionCustomProperty
                  : settings.transitionProperty || "all",
              transitionDuration: `${settings.transitionDuration || 0.3}s`,
              transitionTimingFunction:
                settings.transitionTimingFunction || "ease",
              transitionDelay: `${settings.transitionDelay || 0}s`,
              "--hover-intensity": settings.hoverEffectIntensity || 1,
            } as React.CSSProperties
          }
          data-hover-effect={settings.hoverEffect}
        />
      </div>
      <p className="text-xs text-center text-muted-foreground">
        {t("hover_over_the_square_to_preview_transition")}
      </p>

      <style jsx global>{`
        .hover-preview[data-hover-effect="elevate"]:hover {
          transform: translateY(calc(-4px * var(--hover-intensity)));
          box-shadow: 0 calc(10px * var(--hover-intensity))
            calc(20px * var(--hover-intensity)) rgba(0, 0, 0, 0.1);
        }
        .hover-preview[data-hover-effect="scale"]:hover {
          transform: scale(calc(1 + (0.1 * var(--hover-intensity))));
        }
        .hover-preview[data-hover-effect="glow"]:hover {
          box-shadow: 0 0 calc(15px * var(--hover-intensity))
            rgba(124, 58, 237, calc(0.5 * var(--hover-intensity)));
        }
        .hover-preview[data-hover-effect="tilt"]:hover {
          transform: perspective(1000px)
            rotateX(calc(5deg * var(--hover-intensity)))
            rotateY(calc(5deg * var(--hover-intensity)));
        }
      `}</style>
    </div>
  );
}
