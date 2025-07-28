"use client";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { AlignLeft, AlignCenter, AlignRight, AlignJustify } from "lucide-react";
import type { AlignmentProps } from "./types";
import { useTranslations } from "next-intl";

export function Alignment({ settings, onSettingChange }: AlignmentProps) {
  const t = useTranslations("dashboard");
  const textAlign = settings.textAlign || "left";

  const handleTextAlignChange = (align: string) => {
    onSettingChange("textAlign", align);
  };

  return (
    <div className="space-y-4">
      <div>
        <Label className="text-xs mb-2 block">{t("text_alignment")}</Label>
        <div className="flex gap-1">
          <Button
            variant={textAlign === "left" ? "default" : "outline"}
            size="sm"
            onClick={() => handleTextAlignChange("left")}
            className="p-2"
          >
            <AlignLeft className="h-4 w-4" />
          </Button>
          <Button
            variant={textAlign === "center" ? "default" : "outline"}
            size="sm"
            onClick={() => handleTextAlignChange("center")}
            className="p-2"
          >
            <AlignCenter className="h-4 w-4" />
          </Button>
          <Button
            variant={textAlign === "right" ? "default" : "outline"}
            size="sm"
            onClick={() => handleTextAlignChange("right")}
            className="p-2"
          >
            <AlignRight className="h-4 w-4" />
          </Button>
          <Button
            variant={textAlign === "justify" ? "default" : "outline"}
            size="sm"
            onClick={() => handleTextAlignChange("justify")}
            className="p-2"
          >
            <AlignJustify className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
