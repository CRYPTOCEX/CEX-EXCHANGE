"use client";

import { Label } from "@/components/ui/label";
import { ImageUpload } from "@/components/ui/image-upload";
import {
  LabeledInput,
  LabeledTextarea,
} from "../../structure-tab/ui-components";
import type { SettingsProps } from "../settings-map";
import { useTranslations } from "next-intl";

export function CardSettings({
  element,
  settings,
  onSettingChange,
}: SettingsProps) {
  const t = useTranslations("dashboard");
  const handleImageChange = (file: File | null) => {
    if (file) {
      const imageUrl = URL.createObjectURL(file);
      onSettingChange("imageSrc", imageUrl);
    } else {
      onSettingChange("imageSrc", "");
    }
  };

  return (
    <div className="space-y-4">
      <LabeledInput
        id="title"
        label="Card Title"
        value={settings.title || "Card Title"}
        onChange={(e) => onSettingChange("title", e.target.value)}
      />
      <LabeledTextarea
        id="description"
        label="Description"
        value={settings.description || "This is a card description."}
        onChange={(e) => onSettingChange("description", e.target.value)}
        rows={3}
      />
      <div className="space-y-2">
        <Label className="text-xs font-medium">{t("card_image")}</Label>
        <ImageUpload
          value={settings.imageSrc || ""}
          onChange={handleImageChange}
          size="sm"
        />
      </div>
      <LabeledInput
        id="buttonText"
        label="Button Text"
        value={settings.buttonText || "Learn More"}
        onChange={(e) => onSettingChange("buttonText", e.target.value)}
      />
    </div>
  );
}
