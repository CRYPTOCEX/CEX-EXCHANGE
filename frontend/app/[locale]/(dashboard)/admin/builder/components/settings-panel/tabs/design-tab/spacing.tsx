"use client";

import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { SliderWithInput } from "../structure-tab/ui-components";
import { Link2, Unlink } from "lucide-react";
import type { SpacingProps } from "./types";
import { useTranslations } from "next-intl";

export function Spacing({
  settings,
  onSettingChange,
  structureType,
  linkedPaddingVertical,
  linkedPaddingHorizontal,
  linkedMarginVertical,
  linkedMarginHorizontal,
  handlePaddingChange,
  handleMarginChange,
  togglePaddingLink,
  toggleMarginLink,
}: SpacingProps) {
  const t = useTranslations("dashboard");
  return (
    <div className="space-y-3 p-4 max-w-full">
      {/* Padding Controls */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-xs">{t("Padding")}</Label>
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
              onClick={() => togglePaddingLink("vertical")}
              title={
                linkedPaddingVertical
                  ? "Unlink vertical padding"
                  : "Link vertical padding"
              }
            >
              {linkedPaddingVertical ? (
                <Link2 className="h-3.5 w-3.5 rotate-90" />
              ) : (
                <Unlink className="h-3.5 w-3.5 rotate-90" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
              onClick={() => togglePaddingLink("horizontal")}
              title={
                linkedPaddingHorizontal
                  ? "Unlink horizontal padding"
                  : "Link horizontal padding"
              }
            >
              {linkedPaddingHorizontal ? (
                <Link2 className="h-3.5 w-3.5" />
              ) : (
                <Unlink className="h-3.5 w-3.5" />
              )}
            </Button>
          </div>
        </div>

        {/* Visual Padding Editor */}
        <div className="relative bg-gray-50 border rounded-md p-6 mb-2">
          <div className="absolute inset-x-0 top-0 h-6 bg-blue-100/30 flex items-center justify-center">
            <span className="text-xs text-blue-600">
              {settings?.paddingTop || 0}
              {t("px")}
            </span>
          </div>
          <div className="absolute inset-y-0 right-0 w-6 bg-blue-100/30 flex items-center justify-center">
            <span className="text-xs text-blue-600 transform rotate-90">
              {settings?.paddingRight || 0}
              {t("px")}
            </span>
          </div>
          <div className="absolute inset-x-0 bottom-0 h-6 bg-blue-100/30 flex items-center justify-center">
            <span className="text-xs text-blue-600">
              {settings?.paddingBottom || 0}
              {t("px")}
            </span>
          </div>
          <div className="absolute inset-y-0 left-0 w-6 bg-blue-100/30 flex items-center justify-center">
            <span className="text-xs text-blue-600 transform -rotate-90">
              {settings?.paddingLeft || 0}
              {t("px")}
            </span>
          </div>
          <div className="h-full w-full border-2 border-dashed border-gray-300 flex items-center justify-center">
            <span className="text-xs text-gray-500">{t("Content")}</span>
          </div>
        </div>

        {/* Padding Sliders */}
        <div className="grid grid-cols-2 gap-x-2 gap-y-1">
          <div className="flex items-center">
            <span className="text-xs w-8 text-muted-foreground">
              {t("Top")}
            </span>
            <SliderWithInput
              value={settings?.paddingTop || 0}
              onChange={(value) => handlePaddingChange("Top", value)}
              min={0}
              max={100}
            />
          </div>
          <div className="flex items-center">
            <span className="text-xs w-8 text-muted-foreground">
              {t("Right")}
            </span>
            <SliderWithInput
              value={settings?.paddingRight || 0}
              onChange={(value) => handlePaddingChange("Right", value)}
              min={0}
              max={100}
            />
          </div>
          <div className="flex items-center">
            <span className="text-xs w-8 text-muted-foreground">
              {t("Bottom")}
            </span>
            <SliderWithInput
              value={settings?.paddingBottom || 0}
              onChange={(value) => handlePaddingChange("Bottom", value)}
              min={0}
              max={100}
            />
          </div>
          <div className="flex items-center">
            <span className="text-xs w-8 text-muted-foreground">
              {t("Left")}
            </span>
            <SliderWithInput
              value={settings?.paddingLeft || 0}
              onChange={(value) => handlePaddingChange("Left", value)}
              min={0}
              max={100}
            />
          </div>
        </div>

        {/* Quick Presets */}
        <div className="flex gap-1 mt-1">
          <Button
            variant="outline"
            size="sm"
            className="flex-1 h-6 text-xs"
            onClick={() => {
              onSettingChange("paddingTop", 0);
              onSettingChange("paddingRight", 0);
              onSettingChange("paddingBottom", 0);
              onSettingChange("paddingLeft", 0);
            }}
          >
            {t("None")}
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="flex-1 h-6 text-xs"
            onClick={() => {
              onSettingChange("paddingTop", 16);
              onSettingChange("paddingRight", 16);
              onSettingChange("paddingBottom", 16);
              onSettingChange("paddingLeft", 16);
            }}
          >
            {t("Small")}
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="flex-1 h-6 text-xs"
            onClick={() => {
              onSettingChange("paddingTop", 32);
              onSettingChange("paddingRight", 32);
              onSettingChange("paddingBottom", 32);
              onSettingChange("paddingLeft", 32);
            }}
          >
            {t("Medium")}
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="flex-1 h-6 text-xs"
            onClick={() => {
              onSettingChange("paddingTop", 64);
              onSettingChange("paddingRight", 64);
              onSettingChange("paddingBottom", 64);
              onSettingChange("paddingLeft", 64);
            }}
          >
            {t("Large")}
          </Button>
        </div>
      </div>

      {/* Margin Controls */}
      <div className="space-y-2 mt-4">
        <div className="flex items-center justify-between">
          <Label className="text-xs">{t("Margin")}</Label>
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
              onClick={() => toggleMarginLink("vertical")}
              title={
                linkedMarginVertical
                  ? "Unlink vertical margin"
                  : "Link vertical margin"
              }
            >
              {linkedMarginVertical ? (
                <Link2 className="h-3.5 w-3.5 rotate-90" />
              ) : (
                <Unlink className="h-3.5 w-3.5 rotate-90" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
              onClick={() => toggleMarginLink("horizontal")}
              title={
                linkedMarginHorizontal
                  ? "Unlink horizontal margin"
                  : "Link horizontal margin"
              }
            >
              {linkedMarginHorizontal ? (
                <Link2 className="h-3.5 w-3.5" />
              ) : (
                <Unlink className="h-3.5 w-3.5" />
              )}
            </Button>
          </div>
        </div>

        {/* Visual Margin Editor */}
        <div className="relative bg-gray-50 border rounded-md p-6 mb-2">
          <div className="absolute inset-x-0 top-0 h-6 bg-green-100/30 flex items-center justify-center">
            <span className="text-xs text-green-600">
              {settings?.marginTop || 0}
              {t("px")}
            </span>
          </div>
          <div className="absolute inset-y-0 right-0 w-6 bg-green-100/30 flex items-center justify-center">
            <span className="text-xs text-green-600 transform rotate-90">
              {settings?.marginRight || 0}
              {t("px")}
            </span>
          </div>
          <div className="absolute inset-x-0 bottom-0 h-6 bg-green-100/30 flex items-center justify-center">
            <span className="text-xs text-green-600">
              {settings?.marginBottom || 0}
              {t("px")}
            </span>
          </div>
          <div className="absolute inset-y-0 left-0 w-6 bg-green-100/30 flex items-center justify-center">
            <span className="text-xs text-green-600 transform -rotate-90">
              {settings?.marginLeft || 0}
              {t("px")}
            </span>
          </div>
          <div className="h-full w-full border-2 border-dashed border-gray-300 flex items-center justify-center">
            <span className="text-xs text-gray-500">{t("Element")}</span>
          </div>
        </div>

        {/* Margin Sliders */}
        <div className="grid grid-cols-2 gap-x-2 gap-y-1">
          <div className="flex items-center">
            <span className="text-xs w-8 text-muted-foreground">
              {t("Top")}
            </span>
            <SliderWithInput
              value={settings?.marginTop || 0}
              onChange={(value) => handleMarginChange("Top", value)}
              min={0}
              max={100}
            />
          </div>
          <div className="flex items-center">
            <span className="text-xs w-8 text-muted-foreground">
              {t("Right")}
            </span>
            <SliderWithInput
              value={settings?.marginRight || 0}
              onChange={(value) => handleMarginChange("Right", value)}
              min={0}
              max={100}
            />
          </div>
          <div className="flex items-center">
            <span className="text-xs w-8 text-muted-foreground">
              {t("Bottom")}
            </span>
            <SliderWithInput
              value={settings?.marginBottom || 0}
              onChange={(value) => handleMarginChange("Bottom", value)}
              min={0}
              max={100}
            />
          </div>
          <div className="flex items-center">
            <span className="text-xs w-8 text-muted-foreground">
              {t("Left")}
            </span>
            <SliderWithInput
              value={settings?.marginLeft || 0}
              onChange={(value) => handleMarginChange("Left", value)}
              min={0}
              max={100}
            />
          </div>
        </div>

        {/* Quick Presets */}
        <div className="flex gap-1 mt-1">
          <Button
            variant="outline"
            size="sm"
            className="flex-1 h-6 text-xs"
            onClick={() => {
              onSettingChange("marginTop", 0);
              onSettingChange("marginRight", 0);
              onSettingChange("marginBottom", 0);
              onSettingChange("marginLeft", 0);
            }}
          >
            {t("None")}
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="flex-1 h-6 text-xs"
            onClick={() => {
              onSettingChange("marginTop", 8);
              onSettingChange("marginRight", 8);
              onSettingChange("marginBottom", 8);
              onSettingChange("marginLeft", 8);
            }}
          >
            {t("Small")}
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="flex-1 h-6 text-xs"
            onClick={() => {
              onSettingChange("marginTop", 16);
              onSettingChange("marginRight", 16);
              onSettingChange("marginBottom", 16);
              onSettingChange("marginLeft", 16);
            }}
          >
            {t("Medium")}
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="flex-1 h-6 text-xs"
            onClick={() => {
              onSettingChange("marginTop", 32);
              onSettingChange("marginRight", 32);
              onSettingChange("marginBottom", 32);
              onSettingChange("marginLeft", 32);
            }}
          >
            {t("Large")}
          </Button>
        </div>
      </div>
    </div>
  );
}
