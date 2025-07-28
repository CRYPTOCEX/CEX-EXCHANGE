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
  const t = useTranslations(
    "components/blocks/data-table/toolbar/sort/sorting-field"
  );
  return (
    <div className="space-y-2">
      <h3 className="font-semibold">{t("sort_by")}</h3>
      <Select value={selectedField} onValueChange={onFieldChange}>
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Select field to sort by" />
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
