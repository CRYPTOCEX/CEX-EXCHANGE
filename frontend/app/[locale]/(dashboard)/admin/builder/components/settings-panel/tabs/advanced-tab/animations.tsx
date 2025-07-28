"use client";

import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ComponentProps } from "./types";
import { inputClass } from "./utils";
import { LabeledSelect, SliderWithInput } from "../structure-tab/ui-components";
import { useTranslations } from "next-intl";

export function Animations({ settings, onSettingChange }: ComponentProps) {
  const t = useTranslations("dashboard");
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <Label htmlFor="enableAnimation" className="text-xs">
            {t("enable_animation")}
          </Label>
          <p className="text-xs text-muted-foreground">
            {t("apply_animation_to_this_element")}
          </p>
        </div>
        <Switch
          id="enableAnimation"
          checked={settings.enableAnimation === true}
          onCheckedChange={(checked) =>
            onSettingChange("enableAnimation", checked)
          }
        />
      </div>

      {settings.enableAnimation && (
        <>
          <div className="space-y-1">
            <Label className="text-xs">{t("animation_type")}</Label>
            <Select
              value={settings.animationType || "fadeIn"}
              onValueChange={(value) => onSettingChange("animationType", value)}
            >
              <SelectTrigger className={inputClass}>
                <SelectValue placeholder="Select animation" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="fadeIn">{t("fade_in")}</SelectItem>
                <SelectItem value="slideUp">{t("slide_up")}</SelectItem>
                <SelectItem value="slideDown">{t("slide_down")}</SelectItem>
                <SelectItem value="slideLeft">{t("slide_left")}</SelectItem>
                <SelectItem value="slideRight">{t("slide_right")}</SelectItem>
                <SelectItem value="zoomIn">{t("zoom_in")}</SelectItem>
                <SelectItem value="zoomOut">{t("zoom_out")}</SelectItem>
                <SelectItem value="flipX">{t("flip_x")}</SelectItem>
                <SelectItem value="flipY">{t("flip_y")}</SelectItem>
                <SelectItem value="bounce">{t("Bounce")}</SelectItem>
                <SelectItem value="pulse">{t("Pulse")}</SelectItem>
                <SelectItem value="shake">{t("Shake")}</SelectItem>
                <SelectItem value="swing">{t("Swing")}</SelectItem>
                <SelectItem value="tada">{t("Tada")}</SelectItem>
                <SelectItem value="wobble">{t("Wobble")}</SelectItem>
                <SelectItem value="jello">{t("Jello")}</SelectItem>
                <SelectItem value="heartBeat">{t("heart_beat")}</SelectItem>
                <SelectItem value="rubberBand">{t("rubber_band")}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label className="text-xs">{t("Duration")}</Label>
            <SliderWithInput
              value={settings.animationDuration || 1}
              onChange={(value) => onSettingChange("animationDuration", value)}
              min={0.1}
              max={5}
              step={0.1}
              unit="s"
            />
          </div>

          <div className="space-y-1">
            <Label className="text-xs">{t("Delay")}</Label>
            <SliderWithInput
              value={settings.animationDelay || 0}
              onChange={(value) => onSettingChange("animationDelay", value)}
              min={0}
              max={5}
              step={0.1}
              unit="s"
            />
          </div>

          <div className="space-y-1">
            <Label className="text-xs">{t("Easing")}</Label>
            <LabeledSelect
              id="animationEasing"
              label=""
              value={settings.animationEasing || "ease"}
              onValueChange={(value) =>
                onSettingChange("animationEasing", value)
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

          <div className="space-y-1">
            <Label className="text-xs">{t("iteration_count")}</Label>
            <LabeledSelect
              id="animationIterationCount"
              label=""
              value={settings.animationIterationCount || "1"}
              onValueChange={(value) =>
                onSettingChange("animationIterationCount", value)
              }
              options={[
                { value: "1", label: "Once" },
                { value: "2", label: "Twice" },
                { value: "3", label: "Three times" },
                { value: "infinite", label: "Infinite" },
              ]}
              placeholder="Select count"
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="animationDirection" className="text-xs">
                {t("alternate_direction")}
              </Label>
              <p className="text-xs text-muted-foreground">
                {t("reverse_on_even_iterations")}
              </p>
            </div>
            <Switch
              id="animationDirection"
              checked={settings.animationDirection === "alternate"}
              onCheckedChange={(checked) =>
                onSettingChange(
                  "animationDirection",
                  checked ? "alternate" : "normal"
                )
              }
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="animationFillMode" className="text-xs">
                {t("keep_end_state")}
              </Label>
              <p className="text-xs text-muted-foreground">
                {t("maintain_final_animation_state")}
              </p>
            </div>
            <Switch
              id="animationFillMode"
              checked={settings.animationFillMode === "forwards"}
              onCheckedChange={(checked) =>
                onSettingChange(
                  "animationFillMode",
                  checked ? "forwards" : "none"
                )
              }
            />
          </div>

          <div className="mt-2 p-3 border rounded-md bg-gray-50 flex justify-center items-center h-24">
            <div
              className="h-10 w-10 bg-purple-500 rounded-md animation-preview"
              style={{
                animationName: settings.animationType || "fadeIn",
                animationDuration: `${settings.animationDuration || 1}s`,
                animationDelay: `${settings.animationDelay || 0}s`,
                animationTimingFunction: settings.animationEasing || "ease",
                animationIterationCount:
                  settings.animationIterationCount || "1",
                animationDirection: settings.animationDirection || "normal",
                animationFillMode: settings.animationFillMode || "none",
              }}
            />
          </div>
          <Button
            variant="outline"
            size="sm"
            className="w-full text-xs mt-1"
            onClick={() => {
              const preview = document.querySelector(
                ".animation-preview"
              ) as HTMLElement;
              if (preview) {
                preview.style.animation = "none";
                setTimeout(() => {
                  preview.style.animation = "";
                }, 10);
              }
            }}
          >
            {t("replay_animation")}
          </Button>

          <style jsx global>{`
            @keyframes fadeIn {
              from {
                opacity: 0;
              }
              to {
                opacity: 1;
              }
            }

            @keyframes slideUp {
              from {
                transform: translateY(30px);
                opacity: 0;
              }
              to {
                transform: translateY(0);
                opacity: 1;
              }
            }

            @keyframes slideDown {
              from {
                transform: translateY(-30px);
                opacity: 0;
              }
              to {
                transform: translateY(0);
                opacity: 1;
              }
            }

            @keyframes slideLeft {
              from {
                transform: translateX(30px);
                opacity: 0;
              }
              to {
                transform: translateX(0);
                opacity: 1;
              }
            }

            @keyframes slideRight {
              from {
                transform: translateX(-30px);
                opacity: 0;
              }
              to {
                transform: translateX(0);
                opacity: 1;
              }
            }

            @keyframes zoomIn {
              from {
                transform: scale(0.5);
                opacity: 0;
              }
              to {
                transform: scale(1);
                opacity: 1;
              }
            }

            @keyframes zoomOut {
              from {
                transform: scale(1.5);
                opacity: 0;
              }
              to {
                transform: scale(1);
                opacity: 1;
              }
            }

            @keyframes flipX {
              from {
                transform: perspective(400px) rotateX(90deg);
                opacity: 0;
              }
              to {
                transform: perspective(400px) rotateX(0deg);
                opacity: 1;
              }
            }

            @keyframes flipY {
              from {
                transform: perspective(400px) rotateY(90deg);
                opacity: 0;
              }
              to {
                transform: perspective(400px) rotateY(0deg);
                opacity: 1;
              }
            }

            @keyframes bounce {
              0%,
              20%,
              50%,
              80%,
              100% {
                transform: translateY(0);
              }
              40% {
                transform: translateY(-20px);
              }
              60% {
                transform: translateY(-10px);
              }
            }

            @keyframes pulse {
              0% {
                transform: scale(1);
              }
              50% {
                transform: scale(1.1);
              }
              100% {
                transform: scale(1);
              }
            }

            @keyframes shake {
              0%,
              100% {
                transform: translateX(0);
              }
              10%,
              30%,
              50%,
              70%,
              90% {
                transform: translateX(-5px);
              }
              20%,
              40%,
              60%,
              80% {
                transform: translateX(5px);
              }
            }

            @keyframes swing {
              20% {
                transform: rotate(15deg);
              }
              40% {
                transform: rotate(-10deg);
              }
              60% {
                transform: rotate(5deg);
              }
              80% {
                transform: rotate(-5deg);
              }
              100% {
                transform: rotate(0deg);
              }
            }

            @keyframes tada {
              0% {
                transform: scale(1);
              }
              10%,
              20% {
                transform: scale(0.9) rotate(-3deg);
              }
              30%,
              50%,
              70%,
              90% {
                transform: scale(1.1) rotate(3deg);
              }
              40%,
              60%,
              80% {
                transform: scale(1.1) rotate(-3deg);
              }
              100% {
                transform: scale(1) rotate(0);
              }
            }

            @keyframes wobble {
              0% {
                transform: translateX(0%);
              }
              15% {
                transform: translateX(-25%) rotate(-5deg);
              }
              30% {
                transform: translateX(20%) rotate(3deg);
              }
              45% {
                transform: translateX(-15%) rotate(-3deg);
              }
              60% {
                transform: translateX(10%) rotate(2deg);
              }
              75% {
                transform: translateX(-5%) rotate(-1deg);
              }
              100% {
                transform: translateX(0%);
              }
            }

            @keyframes jello {
              0%,
              11.1%,
              100% {
                transform: none;
              }
              22.2% {
                transform: skewX(-12.5deg) skewY(-12.5deg);
              }
              33.3% {
                transform: skewX(6.25deg) skewY(6.25deg);
              }
              44.4% {
                transform: skewX(-3.125deg) skewY(-3.125deg);
              }
              55.5% {
                transform: skewX(1.5625deg) skewY(1.5625deg);
              }
              66.6% {
                transform: skewX(-0.78125deg) skewY(-0.78125deg);
              }
              77.7% {
                transform: skewX(0.390625deg) skewY(0.390625deg);
              }
              88.8% {
                transform: skewX(-0.1953125deg) skewY(-0.1953125deg);
              }
            }

            @keyframes heartBeat {
              0% {
                transform: scale(1);
              }
              14% {
                transform: scale(1.3);
              }
              28% {
                transform: scale(1);
              }
              42% {
                transform: scale(1.3);
              }
              70% {
                transform: scale(1);
              }
            }

            @keyframes rubberBand {
              0% {
                transform: scale(1);
              }
              30% {
                transform: scaleX(1.25) scaleY(0.75);
              }
              40% {
                transform: scaleX(0.75) scaleY(1.25);
              }
              50% {
                transform: scaleX(1.15) scaleY(0.85);
              }
              65% {
                transform: scaleX(0.95) scaleY(1.05);
              }
              75% {
                transform: scaleX(1.05) scaleY(0.95);
              }
              100% {
                transform: scale(1);
              }
            }
          `}</style>
        </>
      )}
    </div>
  );
}
