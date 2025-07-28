"use client";

import { useState } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import type { ComponentProps } from "./types";
import { RemoveButton, inputClass } from "./utils";
import { useTranslations } from "next-intl";

export function CssIdClasses({
  settings,
  onSettingChange,
  elementId,
}: ComponentProps & { elementId: string }) {
  const t = useTranslations("dashboard");
  const [cssClasses, setCssClasses] = useState<string[]>(
    settings.cssClasses || []
  );

  const handleAddClass = () => {
    const newClasses = [...cssClasses, ""];
    setCssClasses(newClasses);
    onSettingChange("cssClasses", newClasses);
  };

  const handleClassChange = (index: number, value: string) => {
    const newClasses = [...cssClasses];
    newClasses[index] = value;
    setCssClasses(newClasses);
    onSettingChange("cssClasses", newClasses);
  };

  const handleRemoveClass = (index: number) => {
    const newClasses = cssClasses.filter((_, i) => i !== index);
    setCssClasses(newClasses);
    onSettingChange("cssClasses", newClasses);
  };

  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <Label className="text-xs">{t("element_id")}</Label>
        <Input
          value={settings.cssId || ""}
          onChange={(e) => onSettingChange("cssId", e.target.value)}
          placeholder={`element-${elementId.slice(0, 6)}`}
          className={inputClass}
        />
        <p className="text-xs text-muted-foreground mt-1">
          {t("unique_identifier_for_this_element")}
        </p>
      </div>

      <div className="space-y-1">
        <Label className="text-xs">{t("css_classes")}</Label>
        <div className="space-y-2">
          {cssClasses.map((cssClass, index) => (
            <div key={index} className="flex items-center gap-2">
              <Input
                value={cssClass}
                onChange={(e) => handleClassChange(index, e.target.value)}
                placeholder="class-name"
                className={`${inputClass} flex-1`}
              />
              <RemoveButton onRemove={() => handleRemoveClass(index)} />
            </div>
          ))}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleAddClass}
          className="mt-2 h-7 text-xs w-full"
        >
          <Plus className="h-3 w-3 mr-1" />
          {t("add_class")}
        </Button>
        <p className="text-xs text-muted-foreground mt-1">
          {t("add_css_classes_to_style_this_element")}
        </p>
      </div>
    </div>
  );
}
