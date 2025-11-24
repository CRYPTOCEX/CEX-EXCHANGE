import React from "react";
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormDescription,
} from "@/components/ui/form";
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
  if (data) {
    // Edit mode: only show field if it's marked as editable
    if (!column.editable) return null;
    // Also ensure the user has edit permissions
    if (!permissions.edit) return null;
  } else {
    // Create mode: only show field if it's marked for use in create
    if (!column.usedInCreate) return null;
    // Also ensure the user has create permissions
    if (!permissions.create) return null;
  }
  const isRequired = !!column.required;
  const isFullWidth = ["image", "customFields", "textarea", "editor"].includes(
    column.type
  );
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
          }
        };

        return (
          <FormItem className={cn(isFullWidth && "md:col-span-2")}>
            <FormLabel className={cn(error && "text-destructive")}>
              {column.title}
              {isRequired && <span className="text-destructive"> *</span>}
            </FormLabel>
            <FormControl>
              <FormControls
                column={column}
                field={enhancedField}
                error={error?.message}
                control={form.control}
              />
            </FormControl>
            {column.description &&
              !["customFields", "editor"].includes(column.type) && (
                <FormDescription>{column.description}</FormDescription>
              )}
          </FormItem>
        );
      }}
    />
  );
};
