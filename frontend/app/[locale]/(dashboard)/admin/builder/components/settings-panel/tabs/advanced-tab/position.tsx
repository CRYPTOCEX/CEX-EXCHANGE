"use client";

import type React from "react";

import { useState, useRef, useEffect } from "react";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { LabeledSelect, LabeledInput } from "../structure-tab/ui-components";
import {
  ArrowDown,
  ArrowUp,
  ArrowLeft,
  ArrowRight,
  Move,
  CornerRightDown,
  CornerLeftDown,
  CornerLeftUp,
  CornerRightUp,
  AlignCenter,
} from "lucide-react";
import type { ComponentProps } from "./types";
import { useTranslations } from "next-intl";

// Define position types
type PositionType = "static" | "relative" | "absolute" | "fixed" | "sticky";
type PositionPreset =
  | "top-left"
  | "top-center"
  | "top-right"
  | "middle-left"
  | "middle-center"
  | "middle-right"
  | "bottom-left"
  | "bottom-center"
  | "bottom-right";
type PositionUnit = "px" | "%" | "em" | "rem" | "vw" | "vh";
type PositionProperty = "top" | "right" | "bottom" | "left";
type TransformOrigin =
  | "top left"
  | "top center"
  | "top right"
  | "center left"
  | "center"
  | "center right"
  | "bottom left"
  | "bottom center"
  | "bottom right";

// Interface for drag state
interface DragState {
  x: number;
  y: number;
  top: number;
  left: number;
}

// Interface for position settings
interface PositionSettings {
  position?: PositionType;
  positionUnit?: PositionUnit;
  top?: string;
  right?: string;
  bottom?: string;
  left?: string;
  zIndex?: string;
  transformOrigin?: TransformOrigin;
  transform?: string;
  constrainToParent?: boolean;
  constrainToViewport?: boolean;
  responsivePosition?: boolean;
  mobilePosition?: PositionType;
  stickyOffset?: number;
  [key: string]: any;
}

const POSITION_TYPES = [
  { value: "static", label: "Static" },
  { value: "relative", label: "Relative" },
  { value: "absolute", label: "Absolute" },
  { value: "fixed", label: "Fixed" },
  { value: "sticky", label: "Sticky" },
];

const POSITION_PRESETS = [
  {
    value: "top-left",
    label: "Top Left",
    icon: <CornerLeftUp className="h-3 w-3" />,
  },
  {
    value: "top-center",
    label: "Top Center",
    icon: <ArrowUp className="h-3 w-3" />,
  },
  {
    value: "top-right",
    label: "Top Right",
    icon: <CornerRightUp className="h-3 w-3" />,
  },
  {
    value: "middle-left",
    label: "Middle Left",
    icon: <ArrowLeft className="h-3 w-3" />,
  },
  {
    value: "middle-center",
    label: "Center",
    icon: <AlignCenter className="h-3 w-3" />,
  },
  {
    value: "middle-right",
    label: "Middle Right",
    icon: <ArrowRight className="h-3 w-3" />,
  },
  {
    value: "bottom-left",
    label: "Bottom Left",
    icon: <CornerLeftDown className="h-3 w-3" />,
  },
  {
    value: "bottom-center",
    label: "Bottom Center",
    icon: <ArrowDown className="h-3 w-3" />,
  },
  {
    value: "bottom-right",
    label: "Bottom Right",
    icon: <CornerRightDown className="h-3 w-3" />,
  },
];

const TRANSFORM_ORIGIN_PRESETS = [
  { value: "top left", label: "Top Left" },
  { value: "top center", label: "Top Center" },
  { value: "top right", label: "Top Right" },
  { value: "center left", label: "Middle Left" },
  { value: "center", label: "Center" },
  { value: "center right", label: "Middle Right" },
  { value: "bottom left", label: "Bottom Left" },
  { value: "bottom center", label: "Bottom Center" },
  { value: "bottom right", label: "Bottom Right" },
];

const UNITS = [
  { value: "px", label: "px" },
  { value: "%", label: "%" },
  { value: "em", label: "em" },
  { value: "rem", label: "rem" },
  { value: "vw", label: "vw" },
  { value: "vh", label: "vh" },
];

export function Position({ settings, onSettingChange }: ComponentProps) {
  const t = useTranslations("dashboard");
  // Cast settings to our specific type
  const positionSettings = settings as PositionSettings;

  // State variables with proper types
  const [positionType, setPositionType] = useState<PositionType>(
    (positionSettings.position || "static") as PositionType
  );
  const [activeTab, setActiveTab] = useState<string>("basic");
  const [unit, setUnit] = useState<PositionUnit>(
    (positionSettings.positionUnit || "px") as PositionUnit
  );
  const [isDragging, setIsDragging] = useState<boolean>(false);

  // Refs with proper types
  const previewRef = useRef<HTMLDivElement>(null);
  const elementRef = useRef<HTMLDivElement>(null);
  const dragStartRef = useRef<DragState>({ x: 0, y: 0, top: 0, left: 0 });

  // Parse position values with units
  const parsePositionValue = (
    value: string | undefined
  ): { value: string; unit: string } => {
    if (!value) return { value: "", unit: "px" };
    const match = value.match(/^(-?\d*\.?\d*)(.*)$/);
    if (match) {
      return { value: match[1], unit: match[2] || "px" };
    }
    return { value: "", unit: "px" };
  };

  // Get position value as number
  const getPositionValue = (position: string | undefined): number => {
    const { value } = parsePositionValue(position);
    return value === "" ? 0 : Number.parseFloat(value);
  };

  // Get position unit as string
  const getPositionUnit = (position: string | undefined): string => {
    const { unit } = parsePositionValue(position);
    return unit;
  };

  // Initialize position values
  const [topValue, setTopValue] = useState<number>(
    getPositionValue(positionSettings.top)
  );
  const [rightValue, setRightValue] = useState<number>(
    getPositionValue(positionSettings.right)
  );
  const [bottomValue, setBottomValue] = useState<number>(
    getPositionValue(positionSettings.bottom)
  );
  const [leftValue, setLeftValue] = useState<number>(
    getPositionValue(positionSettings.left)
  );

  // Initialize units
  const [topUnit, setTopUnit] = useState<string>(
    getPositionUnit(positionSettings.top)
  );
  const [rightUnit, setRightUnit] = useState<string>(
    getPositionUnit(positionSettings.right)
  );
  const [bottomUnit, setBottomUnit] = useState<string>(
    getPositionUnit(positionSettings.bottom)
  );
  const [leftUnit, setLeftUnit] = useState<string>(
    getPositionUnit(positionSettings.left)
  );

  // Handle position type change
  const handlePositionTypeChange = (value: PositionType): void => {
    setPositionType(value);
    onSettingChange("position", value);
  };

  // Handle position value changes
  const handlePositionValueChange = (
    property: PositionProperty | string,
    value: number | string,
    unit: string
  ): void => {
    // Handle special case for "auto"
    if (value === "auto") {
      onSettingChange(property, "auto");
      return;
    }

    // Convert value to number if it's a string
    const numValue =
      typeof value === "number" ? value : Number.parseFloat(value) || 0;

    // Format the value for the setting
    const formattedValue = numValue === 0 ? "0" : `${numValue}${unit}`;
    onSettingChange(property, formattedValue);

    // Update local state
    switch (property) {
      case "top":
        setTopValue(numValue);
        setTopUnit(unit);
        break;
      case "right":
        setRightValue(numValue);
        setRightUnit(unit);
        break;
      case "bottom":
        setBottomValue(numValue);
        setBottomUnit(unit);
        break;
      case "left":
        setLeftValue(numValue);
        setLeftUnit(unit);
        break;
    }
  };

  // Apply a position preset
  const applyPositionPreset = (preset: PositionPreset): void => {
    switch (preset) {
      case "top-left":
        handlePositionValueChange("top", 0, unit);
        handlePositionValueChange("left", 0, unit);
        handlePositionValueChange("right", "auto", "");
        handlePositionValueChange("bottom", "auto", "");
        break;
      case "top-center":
        handlePositionValueChange("top", 0, unit);
        handlePositionValueChange("left", 50, "%");
        handlePositionValueChange("right", "auto", "");
        handlePositionValueChange("bottom", "auto", "");
        onSettingChange("transform", "translateX(-50%)");
        break;
      case "top-right":
        handlePositionValueChange("top", 0, unit);
        handlePositionValueChange("right", 0, unit);
        handlePositionValueChange("left", "auto", "");
        handlePositionValueChange("bottom", "auto", "");
        break;
      case "middle-left":
        handlePositionValueChange("top", 50, "%");
        handlePositionValueChange("left", 0, unit);
        handlePositionValueChange("right", "auto", "");
        handlePositionValueChange("bottom", "auto", "");
        onSettingChange("transform", "translateY(-50%)");
        break;
      case "middle-center":
        handlePositionValueChange("top", 50, "%");
        handlePositionValueChange("left", 50, "%");
        handlePositionValueChange("right", "auto", "");
        handlePositionValueChange("bottom", "auto", "");
        onSettingChange("transform", "translate(-50%, -50%)");
        break;
      case "middle-right":
        handlePositionValueChange("top", 50, "%");
        handlePositionValueChange("right", 0, unit);
        handlePositionValueChange("left", "auto", "");
        handlePositionValueChange("bottom", "auto", "");
        onSettingChange("transform", "translateY(-50%)");
        break;
      case "bottom-left":
        handlePositionValueChange("bottom", 0, unit);
        handlePositionValueChange("left", 0, unit);
        handlePositionValueChange("top", "auto", "");
        handlePositionValueChange("right", "auto", "");
        break;
      case "bottom-center":
        handlePositionValueChange("bottom", 0, unit);
        handlePositionValueChange("left", 50, "%");
        handlePositionValueChange("top", "auto", "");
        handlePositionValueChange("right", "auto", "");
        onSettingChange("transform", "translateX(-50%)");
        break;
      case "bottom-right":
        handlePositionValueChange("bottom", 0, unit);
        handlePositionValueChange("right", 0, unit);
        handlePositionValueChange("top", "auto", "");
        handlePositionValueChange("left", "auto", "");
        break;
    }
  };

  // Handle drag start
  const handleDragStart = (e: React.MouseEvent<HTMLDivElement>): void => {
    if (positionType === "static") return;

    e.preventDefault();
    setIsDragging(true);

    const element = elementRef.current;
    if (!element) return;

    const rect = element.getBoundingClientRect();
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      top: rect.top,
      left: rect.left,
    };

    document.addEventListener("mousemove", handleDragMove);
    document.addEventListener("mouseup", handleDragEnd);
  };

  // Handle drag move
  const handleDragMove = (e: MouseEvent): void => {
    if (!isDragging) return;

    const preview = previewRef.current;
    const element = elementRef.current;
    if (!preview || !element) return;

    const previewRect = preview.getBoundingClientRect();
    const deltaX = e.clientX - dragStartRef.current.x;
    const deltaY = e.clientY - dragStartRef.current.y;

    const newLeft = dragStartRef.current.left - previewRect.left + deltaX;
    const newTop = dragStartRef.current.top - previewRect.top + deltaY;

    // Update position values
    if (unit === "px") {
      handlePositionValueChange("left", newLeft, "px");
      handlePositionValueChange("top", newTop, "px");
    } else if (unit === "%") {
      const percentX = (newLeft / previewRect.width) * 100;
      const percentY = (newTop / previewRect.height) * 100;
      handlePositionValueChange("left", percentX, "%");
      handlePositionValueChange("top", percentY, "%");
    }
  };

  // Handle drag end
  const handleDragEnd = (): void => {
    setIsDragging(false);
    document.removeEventListener("mousemove", handleDragMove);
    document.removeEventListener("mouseup", handleDragEnd);
  };

  // Clean up event listeners
  useEffect(() => {
    return () => {
      document.removeEventListener("mousemove", handleDragMove);
      document.removeEventListener("mouseup", handleDragEnd);
    };
  }, []);

  return (
    <div className="space-y-4">
      {/* Position Type */}
      <div className="space-y-1">
        <Label className="text-xs">{t("position_type")}</Label>
        <div className="grid grid-cols-5 gap-1">
          {POSITION_TYPES.map((type) => (
            <Button
              key={type.value}
              variant={positionType === type.value ? "default" : "outline"}
              size="sm"
              className="h-8 text-xs"
              onClick={() =>
                handlePositionTypeChange(type.value as PositionType)
              }
            >
              {type.label}
            </Button>
          ))}
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          {positionType === "static" &&
            "Default positioning, follows document flow."}
          {positionType === "relative" &&
            "Positioned relative to its normal position."}
          {positionType === "absolute" &&
            "Positioned relative to nearest positioned ancestor."}
          {positionType === "fixed" && "Positioned relative to the viewport."}
          {positionType === "sticky" && "Positioned based on scroll position."}
        </p>
      </div>

      {/* Tabs for Basic/Advanced */}
      {positionType !== "static" && (
        <div className="flex border-b">
          <Button
            variant="ghost"
            size="sm"
            className={`rounded-none border-b-2 ${activeTab === "basic" ? "border-purple-500" : "border-transparent"}`}
            onClick={() => setActiveTab("basic")}
          >
            {t("Basic")}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className={`rounded-none border-b-2 ${
              activeTab === "advanced"
                ? "border-purple-500"
                : "border-transparent"
            }`}
            onClick={() => setActiveTab("advanced")}
          >
            {t("Advanced")}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className={`rounded-none border-b-2 ${activeTab === "visual" ? "border-purple-500" : "border-transparent"}`}
            onClick={() => setActiveTab("visual")}
          >
            {t("visual_editor")}
          </Button>
        </div>
      )}

      {/* Basic Position Controls */}
      {positionType !== "static" && activeTab === "basic" && (
        <div className="space-y-4">
          {/* Position Presets */}
          <div className="space-y-1">
            <Label className="text-xs">{t("position_presets")}</Label>
            <div className="grid grid-cols-3 gap-1">
              {POSITION_PRESETS.map((preset) => (
                <Button
                  key={preset.value}
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs"
                  onClick={() =>
                    applyPositionPreset(preset.value as PositionPreset)
                  }
                >
                  <span className="mr-1">{preset.icon}</span>
                  {preset.label}
                </Button>
              ))}
            </div>
          </div>

          {/* Unit Selector */}
          <div className="space-y-1">
            <Label className="text-xs">{t("Unit")}</Label>
            <div className="flex gap-1">
              {UNITS.map((unitOption) => (
                <Button
                  key={unitOption.value}
                  variant={unit === unitOption.value ? "default" : "outline"}
                  size="sm"
                  className="flex-1 h-7 text-xs"
                  onClick={() => setUnit(unitOption.value as PositionUnit)}
                >
                  {unitOption.label}
                </Button>
              ))}
            </div>
          </div>

          {/* Position Values */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">{t("Top")}</Label>
              <div className="flex gap-2">
                <LabeledInput
                  id="top-value"
                  label=""
                  value={topValue.toString()}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    handlePositionValueChange(
                      "top",
                      Number.parseFloat(e.target.value) || 0,
                      topUnit
                    )
                  }
                  className="flex-1"
                />
                <LabeledSelect
                  id="topUnit"
                  label=""
                  value={topUnit}
                  onValueChange={(value: string) =>
                    handlePositionValueChange("top", topValue, value)
                  }
                  options={UNITS.map((u) => ({
                    value: u.value,
                    label: u.label,
                  }))}
                  triggerClassName="h-7 text-xs w-20"
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">{t("Right")}</Label>
              <div className="flex gap-2">
                <LabeledInput
                  id="right-value"
                  label=""
                  value={rightValue.toString()}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    handlePositionValueChange(
                      "right",
                      Number.parseFloat(e.target.value) || 0,
                      rightUnit
                    )
                  }
                  className="flex-1"
                />
                <LabeledSelect
                  id="rightUnit"
                  label=""
                  value={rightUnit}
                  onValueChange={(value: string) =>
                    handlePositionValueChange("right", rightValue, value)
                  }
                  options={UNITS.map((u) => ({
                    value: u.value,
                    label: u.label,
                  }))}
                  triggerClassName="h-7 text-xs w-20"
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">{t("Bottom")}</Label>
              <div className="flex gap-2">
                <LabeledInput
                  id="bottom-value"
                  label=""
                  value={bottomValue.toString()}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    handlePositionValueChange(
                      "bottom",
                      Number.parseFloat(e.target.value) || 0,
                      bottomUnit
                    )
                  }
                  className="flex-1"
                />
                <LabeledSelect
                  id="bottomUnit"
                  label=""
                  value={bottomUnit}
                  onValueChange={(value: string) =>
                    handlePositionValueChange("bottom", bottomValue, value)
                  }
                  options={UNITS.map((u) => ({
                    value: u.value,
                    label: u.label,
                  }))}
                  triggerClassName="h-7 text-xs w-20"
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">{t("Left")}</Label>
              <div className="flex gap-2">
                <LabeledInput
                  id="left-value"
                  label=""
                  value={leftValue.toString()}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    handlePositionValueChange(
                      "left",
                      Number.parseFloat(e.target.value) || 0,
                      leftUnit
                    )
                  }
                  className="flex-1"
                />
                <LabeledSelect
                  id="leftUnit"
                  label=""
                  value={leftUnit}
                  onValueChange={(value: string) =>
                    handlePositionValueChange("left", leftValue, value)
                  }
                  options={UNITS.map((u) => ({
                    value: u.value,
                    label: u.label,
                  }))}
                  triggerClassName="h-7 text-xs w-20"
                />
              </div>
            </div>
          </div>

          {/* Z-Index */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <Label className="text-xs">{t("Z-Index")}</Label>
              <LabeledInput
                id="z-index"
                label=""
                value={positionSettings.zIndex || "0"}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  onSettingChange("zIndex", e.target.value)
                }
                className="w-20"
              />
            </div>
            <Slider
              value={[Number.parseInt(positionSettings.zIndex || "0", 10)]}
              min={-10}
              max={100}
              step={1}
              onValueChange={(value: number[]) =>
                onSettingChange("zIndex", value[0].toString())
              }
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{'-10'}</span>
              <span>{'0'}</span>
              <span>{'100'}</span>
            </div>
          </div>
        </div>
      )}

      {/* Advanced Position Controls */}
      {positionType !== "static" && activeTab === "advanced" && (
        <div className="space-y-4">
          {/* Transform Origin */}
          <div className="space-y-1">
            <Label className="text-xs">{t("transform_origin")}</Label>
            <LabeledSelect
              id="transformOrigin"
              label=""
              value={positionSettings.transformOrigin || "center"}
              onValueChange={(value: string) =>
                onSettingChange("transformOrigin", value)
              }
              options={TRANSFORM_ORIGIN_PRESETS.map((preset) => ({
                value: preset.value,
                label: preset.label,
              }))}
            />
          </div>

          {/* Constraints */}
          <div className="space-y-1">
            <Label className="text-xs">{t("Constraints")}</Label>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="constrainToParent" className="text-xs">
                    {t("constrain_to_parent")}
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    {t("keep_element_within_parent_boundaries")}
                  </p>
                </div>
                <Switch
                  id="constrainToParent"
                  checked={positionSettings.constrainToParent === true}
                  onCheckedChange={(checked: boolean) =>
                    onSettingChange("constrainToParent", checked)
                  }
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="constrainToViewport" className="text-xs">
                    {t("constrain_to_viewport")}
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    {t("keep_element_within_visible_screen")}
                  </p>
                </div>
                <Switch
                  id="constrainToViewport"
                  checked={positionSettings.constrainToViewport === true}
                  onCheckedChange={(checked: boolean) =>
                    onSettingChange("constrainToViewport", checked)
                  }
                />
              </div>
            </div>
          </div>

          {/* Responsive Behavior */}
          <div className="space-y-1">
            <Label className="text-xs">{t("responsive_behavior")}</Label>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="responsivePosition" className="text-xs">
                    {t("responsive_position")}
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    {t("adjust_position_based_on_screen_size")}
                  </p>
                </div>
                <Switch
                  id="responsivePosition"
                  checked={positionSettings.responsivePosition === true}
                  onCheckedChange={(checked: boolean) =>
                    onSettingChange("responsivePosition", checked)
                  }
                />
              </div>
              {positionSettings.responsivePosition && (
                <div className="space-y-2 border p-2 rounded-md">
                  <Label className="text-xs">
                    {t("mobile_position_(below_768px)")}
                  </Label>
                  <LabeledSelect
                    id="mobilePosition"
                    label=""
                    value={positionSettings.mobilePosition || positionType}
                    onValueChange={(value: string) =>
                      onSettingChange("mobilePosition", value)
                    }
                    options={POSITION_TYPES.map((type) => ({
                      value: type.value,
                      label: type.label,
                    }))}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Scroll Behavior for Sticky */}
          {positionType === "sticky" && (
            <div className="space-y-1">
              <Label className="text-xs">{t("sticky_behavior")}</Label>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="stickyOffset" className="text-xs">
                    {t("sticky_offset")}
                  </Label>
                  <div className="flex items-center gap-2">
                    <LabeledInput
                      id="stickyOffset"
                      label=""
                      value={positionSettings.stickyOffset?.toString() || "0"}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        onSettingChange(
                          "stickyOffset",
                          Number.parseInt(e.target.value, 10) || 0
                        )
                      }
                      className="w-20"
                    />
                    <span className="text-xs">{t("px")}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Visual Position Editor */}
      {positionType !== "static" && activeTab === "visual" && (
        <div className="space-y-4">
          <div
            ref={previewRef}
            className="relative border rounded-md bg-gray-50 dark:bg-zinc-800 h-64 overflow-hidden"
          >
            {/* Parent container representation */}
            <div className="absolute inset-4 border-2 border-dashed border-gray-300 dark:border-zinc-600 rounded-md flex items-center justify-center">
              <div className="text-xs text-muted-foreground">
                {t("parent_container")}
              </div>

              {/* Positioned element */}
              <div
                ref={elementRef}
                className={`absolute bg-purple-500 text-white rounded-md p-2 cursor-move ${
                  isDragging ? "opacity-70" : "opacity-100"
                } transition-opacity`}
                style={{
                  position: positionType,
                  top: positionSettings.top || "auto",
                  right: positionSettings.right || "auto",
                  bottom: positionSettings.bottom || "auto",
                  left: positionSettings.left || "auto",
                  zIndex: positionSettings.zIndex || "auto",
                  transformOrigin: positionSettings.transformOrigin || "center",
                  transform: positionSettings.transform || "none",
                  width: "80px",
                  height: "40px",
                }}
                onMouseDown={handleDragStart}
              >
                <div className="text-xs flex items-center justify-center h-full">
                  <Move className="h-4 w-4 mr-1" />
                  {t("drag_me")}
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-between">
            <Button
              variant="outline"
              size="sm"
              className="text-xs"
              onClick={() => {
                handlePositionValueChange("top", 0, unit);
                handlePositionValueChange("left", 0, unit);
              }}
            >
              <CornerLeftUp className="h-3 w-3 mr-1" />
              {t("top_left")}
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="text-xs"
              onClick={() => {
                handlePositionValueChange("top", 50, "%");
                handlePositionValueChange("left", 50, "%");
                onSettingChange("transform", "translate(-50%, -50%)");
              }}
            >
              <AlignCenter className="h-3 w-3 mr-1" />
              {t("Center")}
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="text-xs"
              onClick={() => {
                handlePositionValueChange("bottom", 0, unit);
                handlePositionValueChange("right", 0, unit);
              }}
            >
              <CornerRightDown className="h-3 w-3 mr-1" />
              {t("bottom_right")}
            </Button>
          </div>

          <p className="text-xs text-center text-muted-foreground">
            {t("drag_the_element_preset_buttons")}
          </p>
        </div>
      )}

      {/* Help Text */}
      {positionType === "static" && (
        <div className="p-3 bg-gray-50 dark:bg-zinc-800 rounded-md">
          <p className="text-xs text-muted-foreground">
            {t("static_positioning_is_the_default")}.{" "}
            {t("elements_appear_in_the_normal_document_flow")}.{" "}
            {t("select_a_different_positioning_controls")}.
          </p>
        </div>
      )}
    </div>
  );
}
