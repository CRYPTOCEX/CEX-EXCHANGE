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
  const t = useTranslations("dashboard_admin");
  const tCommon = useTranslations("common");
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
                <SelectValue placeholder={t("select_animation")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="fadeIn">{t("fade_in")}</SelectItem>
                <SelectItem value="slideUp">{t("slide_up")}</SelectItem>
                <SelectItem value="slideDown">{t("slide_down")}</SelectItem>
                <SelectItem value="slideLeft">{t("slide_left")}</SelectItem>
                <SelectItem value="slideRight">{t("slide_right")}</SelectItem>
                <SelectItem value="zoomIn">{tCommon("zoom_in")}</SelectItem>
                <SelectItem value="zoomOut">{tCommon("zoom_out")}</SelectItem>
                <SelectItem value="flipX">{t("flip_x")}</SelectItem>
                <SelectItem value="flipY">{t("flip_y")}</SelectItem>
                <SelectItem value="bounce">{t("bounce")}</SelectItem>
                <SelectItem value="pulse">{t("pulse")}</SelectItem>
                <SelectItem value="shake">{t("shake")}</SelectItem>
                <SelectItem value="swing">{tCommon("swing")}</SelectItem>
                <SelectItem value="tada">Tada</SelectItem>
                <SelectItem value="wobble">{t("wobble")}</SelectItem>
                <SelectItem value="jello">{t("jello")}</SelectItem>
                <SelectItem value="heartBeat">{t("heart_beat")}</SelectItem>
                <SelectItem value="rubberBand">{t("rubber_band")}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label className="text-xs">{tCommon("duration")}</Label>
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
            <Label className="text-xs">{t("delay")}</Label>
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
            <Label className="text-xs">{t("easing")}</Label>
            <LabeledSelect
              id="animationEasing"
              label=""
              value={settings.animationEasing || "ease"}
              onValueChange={(value) =>
                onSettingChange("animationEasing", value)
              }
              options={[
                { value: "ease", label: t("ease") },
                { value: "linear", label: t("linear") },
                { value: "ease-in", label: t("ease_in") },
                { value: "ease-out", label: t("ease_out") },
                { value: "ease-in-out", label: t("ease_in_out") },
                {
                  value: "cubic-bezier(0.175, 0.885, 0.32, 1.275)",
                  label: t("bounce_out"),
                },
                {
                  value: "cubic-bezier(0.68, -0.55, 0.265, 1.55)",
                  label: t("spring"),
                },
              ]}
              placeholder={t("select_easing")}
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
                { value: "1", label: tCommon("once") },
                { value: "2", label: t("twice") },
                { value: "3", label: t("three_times") },
                { value: "infinite", label: t("infinite") },
              ]}
              placeholder={t("select_count")}
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

          <div className="mt-2 p-3 border rounded-md bg-muted flex justify-center items-center h-24">
            <div
              className="h-10 w-10 bg-primary rounded-md animation-preview"
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

          {/* No <style jsx global> keyframes here.
              This preview swatch sets `animationName` inline exactly the way
              renderers/elements/utils.tsx does on the canvas and on published
              pages, so it must resolve those names against the SAME stylesheet.
              A styled-jsx `global` block is injected into <head> at mount and is
              unlayered, so the copy that used to live here overrode
              app/globals.css document-wide for as long as the Advanced tab was
              open — and its `fadeIn` had no translateY and its `pulse` had no
              opacity, which is precisely how the preview drifted from the
              published output. app/globals.css owns all 18 names. */}
        </>
      )}
    </div>
  );
}
