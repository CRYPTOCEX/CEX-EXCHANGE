"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ImageUpload } from "@/components/ui/image-upload";
import {
  LabeledInput,
  LabeledSelect,
  LabeledSlider,
  LabeledSwitch,
} from "../../structure-tab/ui-components";
import type { SettingsProps } from "../settings-map";
import { useTranslations } from "next-intl";

export function ImageSettings({
  element,
  settings,
  onSettingChange,
}: SettingsProps) {
  const t = useTranslations("dashboard");
  const [imageSource, setImageSource] = useState<"upload" | "url">(
    settings.src ? "url" : "upload"
  );

  const handleImageUpload = (file: File | null) => {
    if (file) {
      const imageUrl = URL.createObjectURL(file);
      onSettingChange("src", imageUrl);
    } else {
      onSettingChange("src", "");
    }
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label className="text-xs font-medium">{t("image_source")}</Label>
        <Tabs
          defaultValue={imageSource}
          onValueChange={(value) => setImageSource(value as "upload" | "url")}
        >
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="upload" className="text-xs">
              {t("Upload")}
            </TabsTrigger>
            <TabsTrigger value="url" className="text-xs">
              {t("URL")}
            </TabsTrigger>
          </TabsList>
          <TabsContent value="upload" className="mt-2">
            <ImageUpload
              value={settings.src || ""}
              onChange={handleImageUpload}
              size="sm"
            />
          </TabsContent>
          <TabsContent value="url" className="mt-2">
            <Input
              value={settings.src || ""}
              onChange={(e) => onSettingChange("src", e.target.value)}
              placeholder="https://example.com/image.jpg"
              className="h-8 text-sm"
            />
          </TabsContent>
        </Tabs>
      </div>
      <LabeledInput
        id="imageAlt"
        label="Alt Text"
        value={settings.alt || ""}
        onChange={(e) => onSettingChange("alt", e.target.value)}
        placeholder="Image description"
        className="h-8 text-sm"
      />
      <LabeledSelect
        id="objectFit"
        label="Image Fit"
        value={settings.objectFit || "cover"}
        onValueChange={(value) => onSettingChange("objectFit", value)}
        options={[
          { value: "cover", label: "Cover (Fill Container)" },
          { value: "contain", label: "Contain (Show All)" },
          { value: "fill", label: "Fill (Stretch)" },
          { value: "none", label: "None (Original Size)" },
          { value: "scale-down", label: "Scale Down" },
        ]}
      />
      <LabeledSelect
        id="objectPosition"
        label="Image Position"
        value={settings.objectPosition || "center"}
        onValueChange={(value) => onSettingChange("objectPosition", value)}
        options={[
          { value: "center", label: "Center" },
          { value: "top", label: "Top" },
          { value: "bottom", label: "Bottom" },
          { value: "left", label: "Left" },
          { value: "right", label: "Right" },
          { value: "top left", label: "Top Left" },
          { value: "top right", label: "Top Right" },
          { value: "bottom left", label: "Bottom Left" },
          { value: "bottom right", label: "Bottom Right" },
        ]}
      />
      <LabeledSwitch
        id="responsive"
        label="Responsive"
        checked={settings.responsive !== false}
        onCheckedChange={(checked) => onSettingChange("responsive", checked)}
      />
      <LabeledSlider
        id="aspectRatio"
        label="Aspect Ratio"
        min={0.1}
        max={3}
        step={0.1}
        value={settings.aspectRatio || 1.5}
        onChange={(value) => onSettingChange("aspectRatio", value)}
      />
    </div>
  );
}
