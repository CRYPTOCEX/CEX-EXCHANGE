"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Icon } from "@iconify/react";
export interface CustomField {
  name: string;
  title: string;
  type: string;
  required: boolean;
}
interface CustomFieldsFormControlProps {
  field: any; // from react-hook-form (value should be CustomField[])
  error?: string;
}
export function CustomFieldsFormControl({
  field,
  error,
}: CustomFieldsFormControlProps) {
  // Get the current value; if not an array, default to empty array.
  const value: CustomField[] = Array.isArray(field.value) ? field.value : [];

  // Use local state to manage fields (alternatively, you could use field.value directly)
  const [fields, setFields] = useState<CustomField[]>(value);

  // Update parent field when our fields change.
  const updateFields = (newFields: CustomField[]) => {
    setFields(newFields);
    field.onChange(newFields);
  };
  const addField = () => {
    updateFields([
      ...fields,
      {
        name: "",
        title: "",
        type: "input",
        required: false,
      },
    ]);
  };
  const updateField = (
    index: number,
    key: keyof CustomField,
    newValue: string | boolean
  ) => {
    const newFields = fields.map((opt, i) =>
      i === index
        ? {
            ...opt,
            [key]: newValue,
          }
        : opt
    );
    updateFields(newFields);
  };
  const removeField = (index: number) => {
    const newFields = fields.filter((_, i) => i !== index);
    updateFields(newFields);
  };
  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <h3 className="text-xl font-medium">Custom Fields</h3>
        <Button type="button" variant="outline" size="sm" onClick={addField}>
          <Icon icon="mdi:plus" className="h-4 w-4" />
          Add Field
        </Button>
      </div>
      <div className="overflow-x-auto border border-zinc-200 dark:border-zinc-700 rounded-md">
        <table className="w-full text-sm">
          <thead className="bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100">
            <tr>
              <th className="px-4 py-2 text-left">Name</th>
              <th className="px-4 py-2 text-left">Title</th>
              <th className="px-4 py-2 text-left">Type</th>
              <th className="px-4 py-2 text-center">Required</th>
              <th className="px-4 py-2 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200 dark:divide-zinc-700">
            {fields.map((field, index) => {
              return (
                <tr key={index} className="border-b last:border-none">
                  {/* Name */}
                  <td className="px-4 py-2">
                    <Input
                      type="text"
                      placeholder="Name"
                      value={field.name}
                      onChange={(e) =>
                        updateField(index, "name", e.target.value)
                      }
                      className="w-full"
                    />
                  </td>
                  {/* Title */}
                  <td className="px-4 py-2">
                    <Input
                      type="text"
                      placeholder="Title"
                      value={field.title}
                      onChange={(e) =>
                        updateField(index, "title", e.target.value)
                      }
                      className="w-full"
                    />
                  </td>
                  {/* Type */}
                  <td className="px-4 py-2">
                    <Select
                      value={field.type}
                      onValueChange={(val) => updateField(index, "type", val)}
                    >
                      <SelectTrigger className="min-w-[80px]">
                        {field.type}
                      </SelectTrigger>
                      <SelectContent className="z-[75]">
                        <SelectItem value="input">Input</SelectItem>
                        <SelectItem value="textarea">Textarea</SelectItem>
                        <SelectItem value="file">File Upload</SelectItem>
                        <SelectItem value="image">Image Upload</SelectItem>
                      </SelectContent>
                    </Select>
                  </td>
                  {/* Required */}
                  <td className="px-4 py-2 text-center">
                    <Checkbox
                      checked={field.required}
                      onCheckedChange={(checked) =>
                        updateField(index, "required", Boolean(checked))
                      }
                    />
                  </td>
                  {/* Actions */}
                  <td className="px-4 py-2 text-right">
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      onClick={() => removeField(index)}
                    >
                      <X size={14} />
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {error && <p className="text-red-500 text-sm mt-1">{error}</p>}
    </div>
  );
}
