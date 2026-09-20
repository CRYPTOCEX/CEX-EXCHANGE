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
  const t = useTranslations("dashboard_admin");
  const tCommon = useTranslations("common");
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
              {tCommon("upload")}
            </TabsTrigger>
            <TabsTrigger value="url" className="text-xs">
              URL
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
        label={t("alt_text")}
        value={settings.alt || ""}
        onChange={(e) => onSettingChange("alt", e.target.value)}
        placeholder={t("image_description")}
        className="h-8 text-sm"
      />
      <LabeledSelect
        id="objectFit"
        label={t("image_fit")}
        value={settings.objectFit || "cover"}
        onValueChange={(value) => onSettingChange("objectFit", value)}
        options={[
          { value: "cover", label: t("cover_fill_container") },
          { value: "contain", label: t("contain_show_all") },
          { value: "fill", label: t("fill_stretch") },
          { value: "none", label: t("none_original_size") },
          { value: "scale-down", label: t("scale_down") },
        ]}
      />
      <LabeledSelect
        id="objectPosition"
        label={t("image_position")}
        value={settings.objectPosition || "center"}
        onValueChange={(value) => onSettingChange("objectPosition", value)}
        options={[
          { value: "center", label: t("center") },
          { value: "top", label: tCommon("top") },
          { value: "bottom", label: t("bottom") },
          { value: "left", label: t("left") },
          { value: "right", label: t("right") },
          { value: "top left", label: tCommon("top_left") },
          { value: "top right", label: tCommon("top_right") },
          { value: "bottom left", label: tCommon("bottom_left") },
          { value: "bottom right", label: tCommon("bottom_right") },
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
        label={t("aspect_ratio")}
        min={0.1}
        max={3}
        step={0.1}
        value={settings.aspectRatio || 1.5}
        onChange={(value) => onSettingChange("aspectRatio", value)}
      />
    </div>
  );
}
