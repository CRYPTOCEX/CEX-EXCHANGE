"use client";

import { useState } from "react";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import {
  LabeledSelect,
  SliderWithInput,
  LabeledInput,
} from "../structure-tab/ui-components";
import {
  MoveHorizontal,
  MoveVertical,
  CloudOffIcon as Opacity,
  RotateCw,
  ZoomIn,
  Palette,
  Play,
  Pause,
  RefreshCw,
} from "lucide-react";
import type { ComponentProps, ScrollEffectSettings } from "./types";
import { useTranslations } from "next-intl";

const SCROLL_EFFECT_TYPES = [
  { value: "fade", label: "Fade", icon: <Opacity className="h-4 w-4" /> },
  {
    value: "slide",
    label: "Slide",
    icon: <MoveHorizontal className="h-4 w-4" />,
  },
  { value: "zoom", label: "Zoom", icon: <ZoomIn className="h-4 w-4" /> },
  { value: "rotate", label: "Rotate", icon: <RotateCw className="h-4 w-4" /> },
  {
    value: "parallax",
    label: "Parallax",
    icon: <MoveVertical className="h-4 w-4" />,
  },
  { value: "color", label: "Color", icon: <Palette className="h-4 w-4" /> },
];

export function ScrollEffects({ settings, onSettingChange }: ComponentProps) {
  const t = useTranslations("dashboard");
  const [isAnimating, setIsAnimating] = useState(false);

  // Create a properly typed scrollSettings object with default values
  const scrollSettings: ScrollEffectSettings = {
    enableScrollEffects: settings.enableScrollEffects || false,
    scrollEffectType: settings.scrollEffectType || "fade",
    scrollTriggerPosition: settings.scrollTriggerPosition ?? 0,
    scrollEffectDuration: settings.scrollEffectDuration ?? 100,
    scrollEffectIntensity: settings.scrollEffectIntensity ?? 1,
    scrollEffectEasing: settings.scrollEffectEasing || "ease",
    scrollEffectOnce: settings.scrollEffectOnce || false,
    scrollEffectDelay: settings.scrollEffectDelay ?? 0,
    scrollEffectThreshold: settings.scrollEffectThreshold ?? 0.2,
    scrollEffectReverse: settings.scrollEffectReverse ?? true,
    scrollEffectStartValue: settings.scrollEffectStartValue ?? 0,
    scrollEffectEndValue: settings.scrollEffectEndValue ?? 1,
  };

  const handleSettingChange = (key: string, value: any) => {
    onSettingChange(key, value);
  };

  const toggleAnimation = () => {
    setIsAnimating(!isAnimating);
  };

  // Get the appropriate preview animation based on effect type
  const getPreviewAnimation = () => {
    if (!isAnimating) return {};

    const intensity = scrollSettings.scrollEffectIntensity ?? 1;
    const duration = `${(scrollSettings.scrollEffectDuration ?? 100) / 50}s`;
    const easing = scrollSettings.scrollEffectEasing || "ease";
    const delay = `${(scrollSettings.scrollEffectDelay ?? 0) / 1000}s`;
    const iterations = scrollSettings.scrollEffectOnce ? 1 : "infinite";

    switch (scrollSettings.scrollEffectType) {
      case "fade":
        return {
          animation: `fadeInOut ${duration} ${easing} ${delay} ${iterations}`,
        };
      case "slide":
        return {
          animation: `slideInOut ${duration} ${easing} ${delay} ${iterations}`,
        };
      case "zoom":
        return {
          animation: `zoomInOut ${duration} ${easing} ${delay} ${iterations}`,
        };
      case "rotate":
        return {
          animation: `rotateInOut ${duration} ${easing} ${delay} ${iterations}`,
        };
      case "parallax":
        return {
          animation: `parallaxEffect ${duration} ${easing} ${delay} ${iterations}`,
        };
      case "color":
        return {
          animation: `colorChange ${duration} ${easing} ${delay} ${iterations}`,
        };
      default:
        return {};
    }
  };

  return (
    <div className="space-y-4">
      {/* Enable Scroll Effects */}
      <div className="flex items-center justify-between">
        <div>
          <Label htmlFor="enableScrollEffects" className="text-xs">
            {t("enable_scroll_effects")}
          </Label>
          <p className="text-xs text-muted-foreground">
            {t("apply_effects_based_on_scroll_position")}
          </p>
        </div>
        <Switch
          id="enableScrollEffects"
          checked={scrollSettings.enableScrollEffects}
          onCheckedChange={(checked) =>
            handleSettingChange("enableScrollEffects", checked)
          }
        />
      </div>

      {scrollSettings.enableScrollEffects && (
        <>
          {/* Effect Type */}
          <div className="space-y-1">
            <Label className="text-xs">{t("effect_type")}</Label>
            <div className="grid grid-cols-3 gap-1">
              {SCROLL_EFFECT_TYPES.map((type) => (
                <Button
                  key={type.value}
                  variant={
                    scrollSettings.scrollEffectType === type.value
                      ? "default"
                      : "outline"
                  }
                  size="sm"
                  className="h-auto py-2 justify-start"
                  onClick={() =>
                    handleSettingChange("scrollEffectType", type.value)
                  }
                >
                  <div className="flex flex-col items-start text-left">
                    <span className="flex items-center text-xs">
                      {type.icon}
                      <span className="ml-1">{type.label}</span>
                    </span>
                  </div>
                </Button>
              ))}
            </div>
          </div>

          {/* Trigger Position */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <Label className="text-xs">{t("trigger_position")}</Label>
              <div className="flex items-center gap-1">
                <LabeledInput
                  id="trigger-position"
                  label=""
                  type="number"
                  value={(scrollSettings.scrollTriggerPosition ?? 0).toString()}
                  onChange={(e) =>
                    handleSettingChange(
                      "scrollTriggerPosition",
                      Number.parseInt(e.target.value) || 0
                    )
                  }
                  className="w-16"
                />
                <span className="text-xs">%</span>
              </div>
            </div>
            <Slider
              value={[scrollSettings.scrollTriggerPosition ?? 0]}
              min={0}
              max={100}
              step={1}
              onValueChange={(value) =>
                handleSettingChange("scrollTriggerPosition", value[0])
              }
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{t("Top")}</span>
              <span>{t("Middle")}</span>
              <span>{t("Bottom")}</span>
            </div>
          </div>

          {/* Effect Duration */}
          <div className="space-y-1">
            <Label className="text-xs">{t("effect_duration")}</Label>
            <SliderWithInput
              value={scrollSettings.scrollEffectDuration ?? 100}
              onChange={(value) =>
                handleSettingChange("scrollEffectDuration", value)
              }
              min={0}
              max={500}
              step={10}
              unit="px"
            />
            <p className="text-xs text-muted-foreground">
              {t("distance_in_pixels_to_complete_the_effect")}
            </p>
          </div>

          {/* Effect Intensity */}
          <div className="space-y-1">
            <Label className="text-xs">{t("effect_intensity")}</Label>
            <SliderWithInput
              value={scrollSettings.scrollEffectIntensity ?? 1}
              onChange={(value) =>
                handleSettingChange("scrollEffectIntensity", value)
              }
              min={0.1}
              max={3}
              step={0.1}
              unit="×"
            />
          </div>

          {/* Effect Easing */}
          <div className="space-y-1">
            <Label className="text-xs">{t("Easing")}</Label>
            <LabeledSelect
              id="scrollEffectEasing"
              label=""
              value={scrollSettings.scrollEffectEasing || "ease"}
              onValueChange={(value) =>
                handleSettingChange("scrollEffectEasing", value)
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
              placeholder="Select easing"
            />
          </div>

          {/* Advanced Options */}
          <div className="space-y-2 border-t pt-2">
            <Label className="text-xs">{t("advanced_options")}</Label>

            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="scrollEffectOnce" className="text-xs">
                  {t("play_once")}
                </Label>
                <p className="text-xs text-muted-foreground">
                  {t("only_play_effect_the_first_time")}
                </p>
              </div>
              <Switch
                id="scrollEffectOnce"
                checked={scrollSettings.scrollEffectOnce}
                onCheckedChange={(checked) =>
                  handleSettingChange("scrollEffectOnce", checked)
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="scrollEffectReverse" className="text-xs">
                  {t("reverse_on_scroll_up")}
                </Label>
                <p className="text-xs text-muted-foreground">
                  {t("reverse_effect_when_scrolling_up")}
                </p>
              </div>
              <Switch
                id="scrollEffectReverse"
                checked={scrollSettings.scrollEffectReverse}
                onCheckedChange={(checked) =>
                  handleSettingChange("scrollEffectReverse", checked)
                }
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs">{t("Delay")}</Label>
              <SliderWithInput
                value={scrollSettings.scrollEffectDelay ?? 0}
                onChange={(value) =>
                  handleSettingChange("scrollEffectDelay", value)
                }
                min={0}
                max={1000}
                step={10}
                unit="ms"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs">{t("Threshold")}</Label>
              <SliderWithInput
                value={scrollSettings.scrollEffectThreshold ?? 0.2}
                onChange={(value) =>
                  handleSettingChange("scrollEffectThreshold", value)
                }
                min={0}
                max={1}
                step={0.05}
                unit=""
              />
              <p className="text-xs text-muted-foreground">
                {t("portion_of_element_that_must_be_visible_to_trigger")}
              </p>
            </div>
          </div>

          {/* Preview */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs">{t("Preview")}</Label>
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs"
                onClick={toggleAnimation}
              >
                {isAnimating ? (
                  <>
                    <Pause className="h-3 w-3 mr-1" />
                    {t("Stop")}
                  </>
                ) : (
                  <>
                    <Play className="h-3 w-3 mr-1" />
                    {t("Play")}
                  </>
                )}
              </Button>
            </div>

            <div className="border rounded-md bg-gray-50 dark:bg-zinc-800 h-40 flex items-center justify-center p-4">
              <div
                className="bg-purple-500 text-white rounded-md p-4 w-32 h-32 flex items-center justify-center"
                style={getPreviewAnimation()}
              >
                <div className="text-sm">{scrollSettings.scrollEffectType}</div>
              </div>
            </div>

            <Button
              variant="ghost"
              size="sm"
              className="w-full text-xs"
              onClick={() => {
                setIsAnimating(false);
                setTimeout(() => setIsAnimating(true), 10);
              }}
            >
              <RefreshCw className="h-3 w-3 mr-1" />
              {t("replay_animation")}
            </Button>
          </div>

          {/* CSS Generated */}
          <div className="space-y-1">
            <Label className="text-xs">{t("generated_css")}</Label>
            <div className="bg-gray-100 dark:bg-zinc-800 p-2 rounded-md text-xs font-mono overflow-x-auto">
              {`.element {
  transition: ${
    scrollSettings.scrollEffectType === "fade"
      ? "opacity"
      : scrollSettings.scrollEffectType === "slide"
        ? "transform"
        : scrollSettings.scrollEffectType === "zoom"
          ? "transform"
          : scrollSettings.scrollEffectType === "rotate"
            ? "transform"
            : scrollSettings.scrollEffectType === "parallax"
              ? "transform"
              : scrollSettings.scrollEffectType === "color"
                ? "background-color"
                : "all"
  } 
              ${(scrollSettings.scrollEffectDuration ?? 100) / 1000}s ${scrollSettings.scrollEffectEasing || "ease"};
}`}
            </div>
          </div>

          {/* Animation Keyframes */}
          <style jsx global>{`
            @keyframes fadeInOut {
              0% {
                opacity: 0;
              }
              50% {
                opacity: 1;
              }
              100% {
                opacity: 0;
              }
            }

            @keyframes slideInOut {
              0% {
                transform: translateY(30px);
              }
              50% {
                transform: translateY(0);
              }
              100% {
                transform: translateY(-30px);
              }
            }

            @keyframes zoomInOut {
              0% {
                transform: scale(0.5);
              }
              50% {
                transform: scale(1);
              }
              100% {
                transform: scale(0.5);
              }
            }

            @keyframes rotateInOut {
              0% {
                transform: rotate(0deg);
              }
              50% {
                transform: rotate(180deg);
              }
              100% {
                transform: rotate(360deg);
              }
            }

            @keyframes parallaxEffect {
              0% {
                transform: translateY(0);
              }
              100% {
                transform: translateY(-20px);
              }
            }

            @keyframes colorChange {
              0% {
                background-color: #9333ea;
              }
              50% {
                background-color: #3b82f6;
              }
              100% {
                background-color: #9333ea;
              }
            }
          `}</style>
        </>
      )}

      {!scrollSettings.enableScrollEffects && (
        <div className="p-3 bg-gray-50 dark:bg-zinc-800 rounded-md">
          <p className="text-xs text-muted-foreground">
            {t("scroll_effects_allow_user_scrolls")}.{" "}
            {t("enable_scroll_effects_to_access_animation_controls")}.
          </p>
        </div>
      )}
    </div>
  );
}
