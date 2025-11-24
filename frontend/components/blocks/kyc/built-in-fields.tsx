"use client";

import React from "react";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { useTranslations } from "next-intl";

type BuiltInOption = {
  enabled: boolean;
  required: boolean;
  level: string;
};
interface BuiltInFieldsProps {
  /** Array of field keys you want to display (e.g. ["firstName", "lastName"]) */
  fields: string[];
  /** The entire `form.options` object from your main page */
  options: Record<string, BuiltInOption>;
  /** A dictionary with field titles & descriptions, e.g. { firstName: { title, description } } */
  keyMap: Record<
    string,
    {
      title: string;
      description: string;
    }
  >;
  /** Handler to update a single field's sub-property (enabled, required, level) */
  onUpdate: (
    field: string,
    subfield: "enabled" | "required" | "level",
    value: string | boolean
  ) => void;
}

/**
 * Renders built-in fields (like firstName, lastName, etc.) in a table layout.
 */
export function KycBuiltInFields({
  fields,
  options,
  keyMap,
  onUpdate,
}: BuiltInFieldsProps) {
  const t = useTranslations("components/blocks/kyc/built-in-fields");
  return (
    <div className="space-y-3">
      <div className="overflow-x-auto border border-zinc-200 dark:border-zinc-700 rounded-md">
        <table className="w-full text-sm">
          {/* Table Header */}
          <thead className="bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100">
            <tr>
              <th className="px-4 py-2 text-left">{t("Field")}</th>
              <th className="px-4 py-2 text-center">{t("Enabled")}</th>
              <th className="px-4 py-2 text-center">{t("Required")}</th>
              <th className="px-4 py-2 text-center">{t("Level")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200 dark:divide-zinc-700">
            {fields.map((field) => {
              const fieldData = options[field];
              if (!fieldData) return null;
              return (
                <tr key={field}>
                  {/* Field Title & Description */}
                  <td className="px-4 py-3">
                    <div className="flex flex-col">
                      <span className="font-medium">
                        {keyMap[field]?.title || field}
                      </span>
                      <span className="text-xs text-zinc-500 dark:text-zinc-400">
                        {keyMap[field]?.description}
                      </span>
                    </div>
                  </td>

                  {/* Enabled Checkbox */}
                  <td className="px-4 py-3 text-center">
                    <Checkbox
                      checked={fieldData.enabled}
                      onCheckedChange={(checked) =>
                        onUpdate(field, "enabled", Boolean(checked))
                      }
                    />
                  </td>

                  {/* Required Checkbox */}
                  <td className="px-4 py-3 text-center">
                    <Checkbox
                      checked={fieldData.required}
                      onCheckedChange={(checked) =>
                        onUpdate(field, "required", Boolean(checked))
                      }
                    />
                  </td>

                  {/* Level Select */}
                  <td className="px-4 py-3 text-center">
                    <Select
                      value={fieldData.level}
                      onValueChange={(val) => onUpdate(field, "level", val)}
                    >
                      <SelectTrigger className="min-w-[60px]">
                        {fieldData.level}
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">1</SelectItem>
                        <SelectItem value="2">2</SelectItem>
                        <SelectItem value="3">3</SelectItem>
                      </SelectContent>
                    </Select>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
