"use client";

import { useState } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import type { ComponentProps, Attribute } from "./types";
import { RemoveButton, inputClass } from "./utils";
import { useTranslations } from "next-intl";

const AttributeRow = ({
  attr,
  index,
  onChange,
  onRemove,
}: {
  attr: Attribute;
  index: number;
  onChange: (index: number, field: "name" | "value", value: string) => void;
  onRemove: (index: number) => void;
}) => (
  <div className="flex items-center gap-2">
    <Input
      value={attr.name}
      onChange={(e) => onChange(index, "name", e.target.value)}
      placeholder="data-attribute"
      className={`${inputClass} flex-1`}
    />
    <Input
      value={attr.value}
      onChange={(e) => onChange(index, "value", e.target.value)}
      placeholder="value"
      className={`${inputClass} flex-1`}
    />
    <RemoveButton onRemove={() => onRemove(index)} />
  </div>
);

export function Attributes({ settings, onSettingChange }: ComponentProps) {
  const t = useTranslations("dashboard");
  const [attributes, setAttributes] = useState<Attribute[]>(
    settings.htmlAttributes || []
  );

  const handleAttributeChange = (
    index: number,
    field: "name" | "value",
    value: string
  ) => {
    const newAttributes = [...attributes];
    newAttributes[index][field] = value;
    setAttributes(newAttributes);
    onSettingChange("htmlAttributes", newAttributes);
  };

  const addAttribute = () => {
    const newAttributes = [...attributes, { name: "", value: "" }];
    setAttributes(newAttributes);
    onSettingChange("htmlAttributes", newAttributes);
  };

  const removeAttribute = (index: number) => {
    const newAttributes = attributes.filter((_, i) => i !== index);
    setAttributes(newAttributes);
    onSettingChange("htmlAttributes", newAttributes);
  };

  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <Label className="text-xs">{t("html_attributes")}</Label>
        <div className="space-y-2">
          {attributes.map((attr, index) => (
            <AttributeRow
              key={index}
              attr={attr}
              index={index}
              onChange={handleAttributeChange}
              onRemove={removeAttribute}
            />
          ))}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={addAttribute}
          className="mt-2 h-7 text-xs w-full"
        >
          <Plus className="h-3 w-3 mr-1" />
          {t("add_attribute")}
        </Button>
        <p className="text-xs text-muted-foreground mt-1">
          {t("add_custom_html_attributes_like_data-*_attributes")}
        </p>
      </div>
    </div>
  );
}
