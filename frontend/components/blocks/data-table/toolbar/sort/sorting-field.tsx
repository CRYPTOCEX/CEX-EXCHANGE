import React from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useTranslations } from "next-intl";

interface SortingFieldProps {
  selectedField: string;
  sortableFields: { id: string; label: string }[];
  onFieldChange: (value: string) => void;
}

export function SortingField({
  selectedField,
  sortableFields,
  onFieldChange,
}: SortingFieldProps) {
  const t = useTranslations("common");
  const tComponentsBlocks = useTranslations("components_blocks");
  return (
    <div className="space-y-2">
      <h3 className="font-semibold">{t("sort_by")}</h3>
      <Select value={selectedField} onValueChange={onFieldChange}>
        <SelectTrigger className="w-full">
          <SelectValue placeholder={tComponentsBlocks("select_field_to_sort_by")} />
        </SelectTrigger>
        <SelectContent>
          {sortableFields.map((field) => (
            <SelectItem
              key={field.id}
              value={field.id}
              className="truncate cursor-pointer"
            >
              {field.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
