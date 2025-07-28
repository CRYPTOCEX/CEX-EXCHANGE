"use client";

import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import type { SizingProps } from "./types";
import { LabeledSelect } from "../structure-tab/ui-components";
import { useTranslations } from "next-intl";

export function Sizing({
  settings,
  onSettingChange,
  structureType,
  elementType,
}: SizingProps) {
  const t = useTranslations("dashboard");
  // Determine which sizing options to show based on the type
  const showWidth = true; // Width is relevant for all types
  const showHeight =
    !structureType ||
    structureType === "column" ||
    (elementType && !["spacer"].includes(elementType));
  const showMinMax =
    !structureType ||
    structureType === "column" ||
    (elementType &&
      ["image", "gallery", "container", "columns"].includes(elementType));

  return (
    <div className="space-y-2 max-w-full">
      {showWidth && (
        <div>
          <Label className="text-xs mb-1 block">{t("Width")}</Label>
          <div className="flex items-center gap-2">
            <Input
              value={(() => {
                const width = settings.width || "100%";
                const unit = settings.widthUnit || "%";

                // Extract numeric value from width string
                if (typeof width === "string") {
                  const numericValue = Number.parseFloat(width);
                  return isNaN(numericValue) ? width : numericValue.toString();
                }
                return width.toString();
              })()}
              onChange={(e) => {
                const value = e.target.value;
                const unit = settings.widthUnit || "%";

                if (value === "auto") {
                  onSettingChange("width", "auto");
                } else {
                  const numericValue = Number.parseFloat(value);
                  if (!isNaN(numericValue)) {
                    onSettingChange("width", `${numericValue}${unit}`);
                  } else {
                    onSettingChange("width", value);
                  }
                }
              }}
              className="h-7 text-xs"
            />
            <LabeledSelect
              id="widthUnit"
              label=""
              value={(() => {
                const width = settings.width || "100%";
                if (width === "auto") return "auto";

                // Extract unit from width string
                const match = width.toString().match(/[a-z%]+$/i);
                return match ? match[0] : "%";
              })()}
              onValueChange={(value) => {
                if (value === "auto") {
                  onSettingChange("width", "auto");
                  onSettingChange("widthUnit", "auto");
                } else {
                  const currentWidth = settings.width || "100%";
                  const numValue = Number.parseFloat(currentWidth) || 100;
                  onSettingChange("width", `${numValue}${value}`);
                  onSettingChange("widthUnit", value);
                }
              }}
              options={[
                { value: "%", label: "%" },
                { value: "px", label: "px" },
                { value: "em", label: "em" },
                { value: "rem", label: "rem" },
                { value: "auto", label: "auto" },
              ]}
              placeholder="Unit"
            />
          </div>
        </div>
      )}
      {showHeight && (
        <div>
          <Label className="text-xs mb-1 block">{t("Height")}</Label>
          <div className="flex items-center gap-2">
            <Input
              value={settings.height || "auto"}
              onChange={(e) => onSettingChange("height", e.target.value)}
              className="h-7 text-xs"
            />
            <LabeledSelect
              id="heightUnit"
              label=""
              value={settings.heightUnit || "auto"}
              onValueChange={(value) => {
                if (value === "auto") onSettingChange("height", "auto");
                else {
                  const numValue = Number.parseFloat(settings.height) || 100;
                  onSettingChange("height", `${numValue}${value}`);
                }
                onSettingChange("heightUnit", value);
              }}
              options={[
                { value: "auto", label: "auto" },
                { value: "px", label: "px" },
                { value: "%", label: "%" },
                { value: "em", label: "em" },
                { value: "rem", label: "rem" },
              ]}
              placeholder="Unit"
            />
          </div>
        </div>
      )}
      {showMinMax && (
        <div>
          <Label className="text-xs mb-1 block">{t("min_max_size")}</Label>
          <div className="grid grid-cols-2 gap-2">
            <Input
              placeholder="Min width"
              value={settings.minWidth || ""}
              onChange={(e) => onSettingChange("minWidth", e.target.value)}
              className="h-7 text-xs"
            />
            <Input
              placeholder="Max width"
              value={settings.maxWidth || ""}
              onChange={(e) => onSettingChange("maxWidth", e.target.value)}
              className="h-7 text-xs"
            />
            <Input
              placeholder="Min height"
              value={settings.minHeight || ""}
              onChange={(e) => onSettingChange("minHeight", e.target.value)}
              className="h-7 text-xs"
            />
            <Input
              placeholder="Max height"
              value={settings.maxHeight || ""}
              onChange={(e) => onSettingChange("maxHeight", e.target.value)}
              className="h-7 text-xs"
            />
          </div>
        </div>
      )}
    </div>
  );
}
