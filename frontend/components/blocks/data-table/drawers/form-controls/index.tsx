"use client";

import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";
import { SelectFormControl } from "./select";
import { MultiSelectFormControl } from "./multi-select-form-control";
import { DateFormControl } from "./date";
import { NumberFormControl } from "./number";
import { TextFormControl } from "./text";
import { SwitchFormControl } from "./switch";
import { ImageUpload } from "@/components/ui/image-upload";
import { CustomFieldsFormControl } from "./custom-fields";
import { TextAreaFormControl } from "./text-area";
import RichTextEditor from "../../../../ui/editor";
import { RatingFormControl } from "./rating";

interface FormControlsProps {
  column: ColumnDefinition;
  field: any; // from react-hook-form
  error?: string; // e.g. "Required"
  control: any; // react-hook-form control (required for watching values)
}

export function FormControls({
  column,
  field,
  error,
  control,
}: FormControlsProps) {
  // Simple placeholder helper
  const getPlaceholder = () =>
    ["select", "multiselect", "date", "tags"].includes(column.type)
      ? `Select ${column.title.toLowerCase()}`
      : `Enter ${column.title.toLowerCase()}`;

  // 1) SELECT
  if (column.type === "select") {
    return (
      <SelectFormControl
        field={field}
        error={error}
        placeholder={getPlaceholder()}
        // Pass down the static apiEndpoint if defined
        apiEndpoint={column.apiEndpoint}
        // Pass the dynamicSelect config if defined in the column config
        dynamicSelect={column.dynamicSelect}
        control={control}
        options={column.options} // fallback static options
      />
    );
  }

  // 2) MULTISELECT
  if (column.type === "multiselect") {
    return (
      <MultiSelectFormControl
        field={field}
        error={error}
        placeholder={`Select ${column.title.toLowerCase()}`}
        options={column.options || []}
        apiEndpoint={column.apiEndpoint}
      />
    );
  }

  // 3) TAGS (example: user can type comma‐separated tags)
  if (column.type === "tags") {
    const [inputValue, setInputValue] = useState("");
    const tags = field.value || [];

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      setInputValue(e.target.value);
    };

    const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "," || e.key === "Enter") {
        e.preventDefault();
        addTag();
      }
    };

    const addTag = () => {
      const newTags = inputValue
        .split(",")
        .map((tag) => tag.trim())
        .filter((tag) => tag !== "" && !tags.includes(tag));

      if (newTags.length > 0) {
        field.onChange([...tags, ...newTags]);
        setInputValue("");
      }
    };

    const removeTag = (tagToRemove: string) => {
      field.onChange(tags.filter((tag: string) => tag !== tagToRemove));
    };

    return (
      <div>
        <Input
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onKeyDown={handleInputKeyDown}
          onBlur={addTag}
          placeholder="Type and press Enter or comma to add tags"
          error={!!error}
          errorMessage={error}
        />
        <div className="flex flex-wrap gap-2 mt-2">
          {tags.map((tag: string) => (
            <Badge key={tag} variant="outline" className="text-sm">
              {tag}
              <button
                type="button"
                onClick={() => removeTag(tag)}
                className="ml-1 text-muted-foreground hover:text-foreground"
              >
                <X size={14} />
              </button>
            </Badge>
          ))}
        </div>
      </div>
    );
  }

  switch (column.type) {
    case "textarea":
      return (
        <TextAreaFormControl
          field={field}
          error={error}
          placeholder={getPlaceholder()}
          icon={column.icon}
        />
      );
    case "editor":
      return (
        <>
          <RichTextEditor
            value={field.value || ""}
            onChange={(content: string) => field.onChange(content)}
            placeholder={getPlaceholder()}
          />
          {error && (
            <p className="text-destructive text-sm mt-1 leading-normal">
              {error}
            </p>
          )}
        </>
      );

    case "customFields":
      return <CustomFieldsFormControl field={field} error={error} />;
    case "date":
      return (
        <DateFormControl
          field={field}
          error={error}
          placeholder={getPlaceholder()}
        />
      );
    case "number":
      return (
        <NumberFormControl
          field={field}
          error={error}
          placeholder={getPlaceholder()}
          icon={column.icon}
        />
      );
    case "boolean":
    case "toggle":
      return (
        <SwitchFormControl field={field} error={error} label={column.title} />
      );
    case "image":
      return (
        <ImageUpload
          onChange={(val) => field.onChange(val)}
          value={field.value}
          error={!!error}
          errorMessage={error}
        />
      );
    case "rating":
      return <RatingFormControl field={field} error={error} />;
    case "email":
    case "text":
    default:
      return (
        <TextFormControl
          field={field}
          error={error}
          placeholder={getPlaceholder()}
          icon={column.icon}
        />
      );
  }
}
