"use client";

import React from "react";
import { Icon } from "@iconify/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { useTranslations } from "next-intl";

export interface CustomOption {
  title: string;
  required: boolean;
  type: string;
  level: string;
}

/**
 * Single row representing one CustomOption
 */
interface CustomOptionRowProps {
  option: CustomOption;
  index: number;
  onChange: (index: number, field: string, value: string | boolean) => void;
  onRemove: (index: number) => void;
}

function CustomOptionRow({
  option,
  index,
  onChange,
  onRemove,
}: CustomOptionRowProps) {
  const t = useTranslations("components/blocks/kyc/custom-options");
  return (
    <tr className="border-b last:border-none">
      {/* Option Title */}
      <td className="px-4 py-2">
        <Input
          type="text"
          placeholder="Ex: username"
          value={option.title}
          onChange={(e) => onChange(index, "title", e.target.value)}
          className="w-full"
        />
      </td>

      {/* Type */}
      <td className="px-4 py-2">
        <Select
          value={option.type}
          onValueChange={(val) => onChange(index, "type", val)}
        >
          <SelectTrigger className="min-w-[80px]">{option.type}</SelectTrigger>
          <SelectContent>
            <SelectItem value="input">{t("Input")}</SelectItem>
            <SelectItem value="textarea">{t("Textarea")}</SelectItem>
            <SelectItem value="file">{t("file_upload")}</SelectItem>
            <SelectItem value="image">{t("image_upload")}</SelectItem>
          </SelectContent>
        </Select>
      </td>

      {/* Level */}
      <td className="px-4 py-2">
        <Select
          value={option.level}
          onValueChange={(val) => onChange(index, "level", val)}
        >
          <SelectTrigger className="min-w-[60px]">{option.level}</SelectTrigger>
          <SelectContent>
            <SelectItem value="1">1</SelectItem>
            <SelectItem value="2">2</SelectItem>
            <SelectItem value="3">3</SelectItem>
          </SelectContent>
        </Select>
      </td>

      {/* Required Checkbox & Label together */}
      <td className="px-4 py-2">
        <div className="flex items-center justify-center gap-2">
          <Checkbox
            checked={option.required}
            onCheckedChange={(checked) =>
              onChange(index, "required", Boolean(checked))
            }
            id={`required-${index}`}
          />
          <label
            htmlFor={`required-${index}`}
            className="text-sm cursor-pointer select-none"
          >
            {t("Required")}
          </label>
        </div>
      </td>

      {/* Remove Button */}
      <td className="px-4 py-2 text-right">
        <Button
          type="button"
          variant="destructive"
          size="sm"
          onClick={() => onRemove(index)}
        >
          <Icon icon="mdi:close" className="h-4 w-4" />
        </Button>
      </td>
    </tr>
  );
}

/**
 * Main table component that shows all custom options
 */
interface KycCustomOptionsProps {
  customOptions: CustomOption[];
  onAdd: () => void;
  onChange: (index: number, field: string, value: string | boolean) => void;
  onRemove: (index: number) => void;
}

export function KycCustomOptions({
  customOptions,
  onAdd,
  onChange,
  onRemove,
}: KycCustomOptionsProps) {
  const t = useTranslations("components/blocks/kyc/custom-options");
  return (
    <div className="space-y-3">
      {/* Header Row: Title + Add Button */}
      <div className="flex justify-between items-center">
        <h3 className="text-xl font-medium">{t("custom_options")}</h3>
        <Button type="button" variant="outline" size="sm" onClick={onAdd}>
          <Icon icon="mdi:plus" className="h-4 w-4" />
        </Button>
      </div>

      {/* Table Container */}
      <div className="overflow-x-auto border border-zinc-200 dark:border-zinc-700 rounded-md">
        <table className="w-full text-sm">
          {/* Table Header */}
          <thead className="bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100">
            <tr>
              <th className="px-4 py-2 text-left">{t("option_title")}</th>
              <th className="px-4 py-2 text-left">{t("Type")}</th>
              <th className="px-4 py-2 text-left">{t("Level")}</th>
              <th className="px-4 py-2 text-center">{t("Required")}</th>
              <th className="px-4 py-2 text-right">{t("Actions")}</th>
            </tr>
          </thead>

          {/* Table Body */}
          <tbody className="divide-y divide-zinc-200 dark:divide-zinc-700">
            {customOptions.map((option, index) => (
              <CustomOptionRow
                key={index}
                option={option}
                index={index}
                onChange={onChange}
                onRemove={onRemove}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
