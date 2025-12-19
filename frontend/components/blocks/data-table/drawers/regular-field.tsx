"use client";

import React from "react";
import { FormField } from "@/components/ui/form";
import { FormControls } from "./form-controls";
import { cn } from "@/lib/utils";

interface RegularFieldProps {
  column: ColumnDefinition;
  form: any;
  permissions: any;
  data: any;
}

export const RegularField: React.FC<RegularFieldProps> = ({
  column,
  form,
  permissions,
  data,
}) => {
  // Permission check only - field visibility is controlled by formConfig in view-form
  if (data) {
    // Edit mode: ensure the user has edit permissions
    if (!permissions.edit) return null;
  } else {
    // Create mode: ensure the user has create permissions
    if (!permissions.create) return null;
  }

  const isRequired = !!column.required;

  // Determine if field needs full width based on type
  const isFullWidth = ["image", "customFields", "textarea", "editor"].includes(
    column.type
  );

  // Use title and description directly (already human-readable)
  const fieldTitle = column.title || "";
  const fieldDescription = column.description || "";

  return (
    <FormField
      key={column.key}
      control={form.control}
      name={column.key}
      render={({ field, fieldState: { error } }) => {
        // Wrap the field onChange to support custom onChange handlers
        const enhancedField = {
          ...field,
          onChange: (value: any) => {
            field.onChange(value);
            // Call column's custom onChange if provided
            if (column.onChange) {
              column.onChange(value, form);
            }
          },
        };

        return (
          <div
            className={cn(
              "w-full",
              isFullWidth && "md:col-span-2 lg:col-span-3"
            )}
          >
            <FormControls
              column={column}
              field={enhancedField}
              error={error?.message}
              control={form.control}
              title={fieldTitle}
              description={fieldDescription}
              required={isRequired}
            />
          </div>
        );
      }}
    />
  );
};
