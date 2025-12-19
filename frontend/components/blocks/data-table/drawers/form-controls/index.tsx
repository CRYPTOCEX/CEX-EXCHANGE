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
import { WysiwygEditor } from "@/components/ui/wysiwyg";
import { RatingFormControl } from "./rating";
import { useWatch } from "react-hook-form";
import { useTranslations } from "next-intl";

interface FormControlsProps {
  column: ColumnDefinition;
  field: any; // from react-hook-form
  error?: string; // e.g. "Required"
  control: any; // react-hook-form control (required for watching values)
  title?: string;
  description?: string;
  required?: boolean;
}

export function FormControls({
  column,
  field,
  error,
  control,
  title,
  description,
  required,
}: FormControlsProps) {
  const t = useTranslations("components_blocks");
  const tCommon = useTranslations("common");
  // Watch all form values for dynamic options
  const formValues = useWatch({ control });

  // Build title with required indicator
  const displayTitle = title
    ? required
      ? `${title} *`
      : title
    : undefined;

  // Simple placeholder helper - use translated title if available
  const displayTitleForPlaceholder = title || "";
  const getPlaceholder = () =>
    ["select", "multiselect", "date", "tags"].includes(column.type)
      ? `${tCommon("select")} ${displayTitleForPlaceholder.toLowerCase()}`
      : `${t("enter")} ${displayTitleForPlaceholder.toLowerCase()}`;

  // 1) SELECT
  if (column.type === "select") {
    // Use getOptions function if available, otherwise use static options
    const options = column.getOptions
      ? column.getOptions(formValues)
      : column.options;

    return (
      <SelectFormControl
        field={field}
        error={error}
        placeholder={getPlaceholder()}
        apiEndpoint={column.apiEndpoint}
        dynamicSelect={column.dynamicSelect}
        control={control}
        options={options}
        title={displayTitle}
        description={description}
      />
    );
  }

  // 2) MULTISELECT
  if (column.type === "multiselect") {
    return (
      <MultiSelectFormControl
        field={field}
        error={error}
        placeholder={getPlaceholder()}
        options={column.options || []}
        apiEndpoint={column.apiEndpoint}
        title={displayTitle}
        description={description}
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
      <div className="w-full">
        <Input
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onKeyDown={handleInputKeyDown}
          onBlur={addTag}
          placeholder={t("type_and_press_enter_or_comma_to_add_tags")}
          error={!!error}
          errorMessage={error}
          title={displayTitle}
          description={description}
        />
        {tags.length > 0 && (
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
        )}
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
          title={displayTitle}
          description={description}
        />
      );
    case "editor":
      return (
        <div className="w-full">
          {displayTitle && (
            <label className="mb-1 text-sm font-medium block">
              {displayTitle}
            </label>
          )}
          <WysiwygEditor
            value={field.value || ""}
            onChange={(content: string) => field.onChange(content)}
            placeholder={getPlaceholder()}
            className={error ? "border-destructive" : ""}
          />
          {description && (
            <p className="mt-1 text-xs text-muted-foreground">{description}</p>
          )}
          {error && (
            <p className="text-destructive text-sm mt-1 leading-normal">
              {error}
            </p>
          )}
        </div>
      );

    case "customFields":
      return (
        <div className="w-full">
          {displayTitle && (
            <label className="mb-1 text-sm font-medium block">
              {displayTitle}
            </label>
          )}
          <CustomFieldsFormControl field={field} error={error} />
          {description && (
            <p className="mt-1 text-xs text-muted-foreground">{description}</p>
          )}
        </div>
      );
    case "date":
      return (
        <DateFormControl
          field={field}
          error={error}
          placeholder={getPlaceholder()}
          title={displayTitle}
          description={description}
        />
      );
    case "number":
      return (
        <NumberFormControl
          field={field}
          error={error}
          placeholder={getPlaceholder()}
          icon={column.icon}
          title={displayTitle}
          description={description}
        />
      );
    case "boolean":
    case "toggle":
      return (
        <SwitchFormControl
          field={field}
          error={error}
          label={title || ""}
          description={description}
        />
      );
    case "image":
      return (
        <div className="w-full">
          {displayTitle && (
            <label className="mb-1 text-sm font-medium block">
              {displayTitle}
            </label>
          )}
          <ImageUpload
            onChange={(val) => field.onChange(val)}
            value={field.value}
            error={!!error}
            errorMessage={error}
          />
          {description && (
            <p className="mt-1 text-xs text-muted-foreground">{description}</p>
          )}
        </div>
      );
    case "rating":
      return (
        <div className="w-full">
          {displayTitle && (
            <label className="mb-1 text-sm font-medium block">
              {displayTitle}
            </label>
          )}
          <RatingFormControl field={field} error={error} />
          {description && (
            <p className="mt-1 text-xs text-muted-foreground">{description}</p>
          )}
        </div>
      );
    case "email":
    case "text":
    default:
      return (
        <TextFormControl
          field={field}
          error={error}
          placeholder={getPlaceholder()}
          icon={column.icon}
          title={displayTitle}
          description={description}
        />
      );
  }
}
