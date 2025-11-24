"use client";

import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { ComponentProps } from "./types";
import { useTranslations } from "next-intl";

export function CustomCss({ settings, onSettingChange }: ComponentProps) {
  const t = useTranslations("dashboard");
  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <Label className="text-xs">{t("custom_css")}</Label>
        <Textarea
          value={settings.customCss || ""}
          onChange={(e) => onSettingChange("customCss", e.target.value)}
          placeholder="/* Add your custom CSS here */\n.my-class {\n  color: red;\n}"
          className="min-h-[150px] text-xs font-mono"
        />
        <p className="text-xs text-muted-foreground mt-1">
          {t("add_custom_css_styles_for_this_element")}.{" "}
          {t("use_the_element_id_or_classes_you_defined")}.
        </p>
      </div>
    </div>
  );
}
