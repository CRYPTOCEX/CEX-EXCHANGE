"use client";

import React from "react";
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormDescription,
} from "@/components/ui/form";
import { ImageUpload } from "@/components/ui/image-upload";
import { SelectFormControl } from "./form-controls/select";
import { MultiSelectFormControl } from "./form-controls/multi-select-form-control";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";

interface CompoundFieldProps {
  column: ColumnDefinition;
  form: any;
  permissions: any;
  data: any;
}

export const CompoundField: React.FC<CompoundFieldProps> = ({
  column,
  form,
  permissions,
  data,
}) => {
  const t = useTranslations("components_blocks");
  const tCommon = useTranslations("common");
  const config = column.render?.config;
  if (!config) return null;

  // Determine if we are in edit mode (data exists) or create mode.
  const isEdit = !!data;

  // Permission check only - field visibility is controlled by formConfig in view-form
  const hasPermission = isEdit ? permissions.edit : permissions.create;
  if (!hasPermission) return null;

  // Render all configured subfields - visibility is controlled by formConfig
  const renderImage = !!config.image;
  const renderPrimary = !!config.primary;
  const renderSecondary = !!config.secondary;

  // All metadata fields
  const metadataFields = config.metadata || [];

  // Helper to get text (already human-readable)
  const getText = (text: string | undefined) => text || "";

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-5 w-full">
      {/* Image field - full width on its own row */}
      {renderImage && (
        <FormField
          control={form.control}
          name={config.image.key}
          render={({ field, fieldState: { error } }) => {
            const imageTitle = getText(config.image.title);
            const imageDescription = getText(config.image.description);
            return (
              <FormItem className="col-span-full space-y-2">
                <FormLabel
                  className={cn("text-sm font-medium", error && "text-destructive")}
                >
                  {imageTitle}
                  {config.image.required && (
                    <span className="text-destructive ml-1">*</span>
                  )}
                </FormLabel>
                <FormControl>
                  <ImageUpload
                    onChange={(val) => field.onChange(val)}
                    value={field.value}
                    error={!!error}
                    errorMessage={error?.message}
                    size={config.image.size}
                  />
                </FormControl>
                {imageDescription && (
                  <FormDescription className="text-xs text-muted-foreground">
                    {imageDescription}
                  </FormDescription>
                )}
              </FormItem>
            );
          }}
        />
      )}

      {/* Primary fields */}
      {renderPrimary && (
        <>
          {Array.isArray(config.primary.key) ? (
            config.primary.key.map((key: string, index: number) => {
              const labelText = Array.isArray(config.primary.title)
                ? getText(config.primary.title[index])
                : `${getText(config.primary.title)} ${index + 1}`;
              const descText = Array.isArray(config.primary.description)
                ? getText(config.primary.description[index])
                : getText(config.primary.description);

              return (
                <FormField
                  key={key}
                  control={form.control}
                  name={key}
                  render={({ field, fieldState: { error } }) => (
                    <FormItem className="space-y-2 w-full">
                      <FormLabel
                        className={cn(
                          "text-sm font-medium",
                          error && "text-destructive"
                        )}
                      >
                        {labelText}
                        {config.primary.required && (
                          <span className="text-destructive ml-1">*</span>
                        )}
                      </FormLabel>
                      <FormControl>
                        <Input
                          value={field.value ?? ""}
                          onChange={(e) => field.onChange(e.target.value)}
                          placeholder={`${t("enter")} ${labelText.toLowerCase()}`}
                          error={!!error}
                          errorMessage={error?.message}
                          className="w-full"
                        />
                      </FormControl>
                      {descText && (
                        <FormDescription className="text-xs text-muted-foreground">
                          {descText}
                        </FormDescription>
                      )}
                    </FormItem>
                  )}
                />
              );
            })
          ) : (
            <FormField
              control={form.control}
              name={config.primary.key}
              render={({ field, fieldState: { error } }) => {
                const primaryTitle = getText(config.primary.title);
                const primaryDescription = getText(config.primary.description);
                return (
                  <FormItem className="space-y-2 w-full">
                    <FormLabel
                      className={cn(
                        "text-sm font-medium",
                        error && "text-destructive"
                      )}
                    >
                      {primaryTitle}
                      {config.primary.required && (
                        <span className="text-destructive ml-1">*</span>
                      )}
                    </FormLabel>
                    <FormControl>
                      <Input
                        value={field.value ?? ""}
                        onChange={(e) => field.onChange(e.target.value)}
                        placeholder={`${t("enter")} ${primaryTitle.toLowerCase()}`}
                        error={!!error}
                        errorMessage={error?.message}
                        className="w-full"
                      />
                    </FormControl>
                    {primaryDescription && (
                      <FormDescription className="text-xs text-muted-foreground">
                        {primaryDescription}
                      </FormDescription>
                    )}
                  </FormItem>
                );
              }}
            />
          )}
        </>
      )}

      {/* Secondary field */}
      {renderSecondary && (
        <FormField
          control={form.control}
          name={config.secondary.key}
          render={({ field, fieldState: { error } }) => {
            const secondaryTitle = getText(config.secondary.title);
            const secondaryDescription = getText(config.secondary.description);
            return (
              <FormItem className="space-y-2 w-full">
                <FormLabel
                  className={cn("text-sm font-medium", error && "text-destructive")}
                >
                  {secondaryTitle}
                  {config.secondary.required && (
                    <span className="text-destructive ml-1">*</span>
                  )}
                </FormLabel>
                <FormControl>
                  <Input
                    value={field.value ?? ""}
                    onChange={(e) => field.onChange(e.target.value)}
                    placeholder={`${t("enter")} ${secondaryTitle.toLowerCase()}`}
                    error={!!error}
                    errorMessage={error?.message}
                    className="w-full"
                  />
                </FormControl>
                {secondaryDescription && (
                  <FormDescription className="text-xs text-muted-foreground">
                    {secondaryDescription}
                  </FormDescription>
                )}
              </FormItem>
            );
          }}
        />
      )}

      {/* Metadata fields */}
      {metadataFields.map((item: any) => {
        const itemTitle = getText(item.title);
        const itemDescription = getText(item.description);
        return (
          <FormField
            key={item.key}
            control={form.control}
            name={item.key}
            render={({ field, fieldState: { error } }) => (
              <FormItem className="space-y-2 w-full">
                <FormLabel
                  className={cn("text-sm font-medium", error && "text-destructive")}
                >
                  {itemTitle}
                  {item.required && (
                    <span className="text-destructive ml-1">*</span>
                  )}
                </FormLabel>
                <FormControl>
                  <div className="w-full">
                    {item.type === "select" ? (
                      <SelectFormControl
                        field={field}
                        placeholder={`${tCommon("select")} ${itemTitle.toLowerCase()}`}
                        options={item.options}
                        apiEndpoint={item.apiEndpoint}
                        error={error?.message}
                        control={form.control}
                      />
                    ) : item.type === "multiselect" ? (
                      <MultiSelectFormControl
                        field={field}
                        placeholder={`${tCommon("select")} ${itemTitle.toLowerCase()}`}
                        options={item.options}
                        apiEndpoint={item.apiEndpoint}
                        error={error?.message}
                      />
                    ) : (
                      <Input
                        value={field.value ?? ""}
                        onChange={(e) => field.onChange(e.target.value)}
                        placeholder={`${t("enter")} ${itemTitle.toLowerCase()}`}
                        error={!!error}
                        errorMessage={error?.message}
                        className="w-full"
                      />
                    )}
                  </div>
                </FormControl>
                {itemDescription && (
                  <FormDescription className="text-xs text-muted-foreground">
                    {itemDescription}
                  </FormDescription>
                )}
              </FormItem>
            )}
          />
        );
      })}
    </div>
  );
};
